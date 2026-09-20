use crate::domain::FileStatus;

pub struct Porcelain {
    pub branch_info: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<FileStatus>,
}

fn clean_path(raw: &str) -> String {
    let renamed = raw.split(" -> ").last().unwrap_or(raw);
    match renamed
        .strip_prefix('"')
        .and_then(|s| s.strip_suffix('"'))
    {
        Some(unquoted) => unquoted.to_string(),
        None => renamed.to_string(),
    }
}

pub fn parse(porcelain: &str) -> Porcelain {
    let mut branch_info = String::new();
    let mut ahead = 0;
    let mut behind = 0;
    let mut files: Vec<FileStatus> = vec![];
    for line in porcelain.lines() {
        if line.starts_with("## ") {
            let info = line.trim_start_matches("## ").to_string();
            if let Some(b) = info.find("[") {
                for part in info[b..].split([',', '[', ']']) {
                    let p = part.trim();
                    if let Some(n) = p.strip_prefix("ahead ") {
                        ahead = n.parse().unwrap_or(0);
                    }
                    if let Some(n) = p.strip_prefix("behind ") {
                        behind = n.parse().unwrap_or(0);
                    }
                }
            }
            branch_info = info;
            continue;
        }
        if line.len() < 4 {
            continue;
        }
        let x = line[0..1].to_string();
        let y = line[1..2].to_string();
        let p = clean_path(&line[3..]);
        let unmerged =
            (x == "U" || y == "U") || (x == "A" && y == "A") || (x == "D" && y == "D");
        let staged = x != " " && x != "?" && x != "!";
        files.push(FileStatus {
            path: p,
            x,
            y,
            staged,
            unmerged,
        });
    }
    Porcelain {
        branch_info,
        ahead,
        behind,
        files,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_tracking_and_flags() {
        let parsed = parse("## main...origin/main [ahead 2, behind 1]\nM  f.tsx\nUU ola.txt\n?? new.txt");
        assert_eq!(parsed.ahead, 2);
        assert_eq!(parsed.behind, 1);
        assert!(parsed.files[0].staged);
        assert!(parsed.files[1].unmerged);
        assert!(!parsed.files[2].staged);
    }

    #[test]
    fn strips_quotes_and_rename_arrow() {
        let parsed = parse("## master\nR  \"old name\" -> \"new name\"");
        assert_eq!(parsed.files[0].path, "new name");
    }
}
