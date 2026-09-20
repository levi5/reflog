use super::entities::ConflictBlock;

pub fn parse_conflict_text(content: &str) -> Vec<ConflictBlock> {
    let lines: Vec<&str> = content.lines().collect();
    let mut out: Vec<ConflictBlock> = vec![];
    let mut i = 0usize;
    let mut id = 0usize;
    while i < lines.len() {
        if let Some(marks) = lines[i].strip_prefix("<<<<<<< ") {
            let current_label = marks.to_string();
            let start_line = i + 1;
            let mut current: Vec<String> = vec![];
            let mut base: Vec<String> = vec![];
            let mut incoming: Vec<String> = vec![];
            let mid_line: Option<usize>;
            let mut base_start: Option<usize> = None;
            let mut base_end: Option<usize> = None;
            let mut is_diff3 = false;
            i += 1;
            while i < lines.len()
                && !lines[i].starts_with("=======")
                && !lines[i].starts_with("||||||| ")
                && !lines[i].starts_with(">>>>>>> ")
            {
                current.push(lines[i].to_string());
                i += 1;
            }
            if i < lines.len() && lines[i].starts_with("||||||| ") {
                is_diff3 = true;
                base_start = Some(i + 1);
                i += 1;
                while i < lines.len()
                    && !lines[i].starts_with("=======")
                    && !lines[i].starts_with(">>>>>>> ")
                {
                    base.push(lines[i].to_string());
                    i += 1;
                }
                base_end = Some(i);
            }
            if i < lines.len() && lines[i].starts_with("=======") {
                mid_line = Some(i + 1);
                i += 1;
            } else {
                continue;
            }
            while i < lines.len() && !lines[i].starts_with(">>>>>>> ") {
                incoming.push(lines[i].to_string());
                i += 1;
            }
            if i < lines.len() && lines[i].starts_with(">>>>>>> ") {
                let incoming_label = match lines[i].len() > 8 {
                    true => lines[i][8..].to_string(),
                    false => String::new(),
                };
                let end_line = i + 1;
                out.push(ConflictBlock {
                    id,
                    start_line,
                    mid_line,
                    base_start,
                    base_end,
                    end_line,
                    current_label,
                    incoming_label,
                    current,
                    base,
                    incoming,
                    is_diff3,
                });
                id += 1;
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_conflict() {
        let blocks = parse_conflict_text("<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feat\n");
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].current, vec!["a".to_string()]);
        assert_eq!(blocks[0].incoming, vec!["b".to_string()]);
        assert_eq!(blocks[0].incoming_label, "feat");
        assert!(!blocks[0].is_diff3);
    }

    #[test]
    fn parses_diff3_with_base() {
        let content = "<<<<<<< HEAD\na\n||||||| base\nx\n=======\nb\n>>>>>>> feat\n";
        let blocks = parse_conflict_text(content);
        assert_eq!(blocks.len(), 1);
        assert!(blocks[0].is_diff3);
        assert_eq!(blocks[0].base, vec!["x".to_string()]);
    }

    #[test]
    fn ignores_clean_content() {
        assert!(parse_conflict_text("plain\ncontent\n").is_empty());
    }
}
