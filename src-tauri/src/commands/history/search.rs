use crate::commands::validation::{validate_repo_relative_path, validate_search_term};
use crate::domain::CommitInfo;
use crate::runner::GitRunner;

const MAX_SEARCH_OUTPUT_BYTES: usize = 2 * 1024 * 1024;
const MAX_SEARCH_RESULTS: usize = 500;

const FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s";
const GRAPH_FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%P%x1f%D";

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct LogFilter {
    pub author: Option<String>,
    pub grep: Option<String>,
    pub path: Option<String>,
    pub since: Option<String>,
    pub until: Option<String>,
    pub pickaxe: Option<String>,
    pub follow: bool,
}

fn clean(value: Option<String>) -> Option<String> {
    value
        .map(|part| part.trim().to_string())
        .filter(|part| !part.is_empty())
}

fn validate_date(kind: &str, value: &str) -> Result<(), String> {
    validate_search_term(value)?;
    let all_allowed = value.chars().all(|char| {
        char.is_ascii_alphanumeric()
            || char == '-'
            || char == '+'
            || char == '.'
            || char == '/'
            || char == ':'
    }) && value.len() <= 32;
    if all_allowed {
        Ok(())
    } else {
        Err(format!("data de {kind} inválida"))
    }
}

fn build_args(filter: &LogFilter, limit: usize, decorate: bool) -> Result<Vec<String>, String> {
    let mut args: Vec<String> = vec!["log".to_string(), "--all".to_string()];
    if decorate {
        args.push("--topo-order".to_string());
    }
    args.push(format!("--max-count={limit}"));

    if let Some(author) = clean(filter.author.clone()) {
        validate_search_term(&author)?;
        args.push(format!("--author={author}"));
    }
    if let Some(grep) = clean(filter.grep.clone()) {
        validate_search_term(&grep)?;
        args.push(format!("--grep={grep}"));
    }
    if let Some(pickaxe) = clean(filter.pickaxe.clone()) {
        validate_search_term(&pickaxe)?;
        args.push(format!("-S{pickaxe}"));
    }
    if let Some(since) = clean(filter.since.clone()) {
        validate_date("since", &since)?;
        args.push(format!("--since={since}"));
    }
    if let Some(until) = clean(filter.until.clone()) {
        validate_date("until", &until)?;
        args.push(format!("--until={until}"));
    }

    let format = if decorate { GRAPH_FORMAT } else { FORMAT };
    args.push(format!("--pretty=format:{format}"));

    if let Some(path) = clean(filter.path.clone()) {
        validate_repo_relative_path(&path)?;
        if filter.follow {
            args.push("--follow".to_string());
        }
        args.push("--".to_string());
        args.push(path);
    } else if filter.follow {
        return Err("--follow exige um caminho de arquivo".to_string());
    }

    Ok(args)
}

fn parse(out: &str, decorate: bool) -> Vec<CommitInfo> {
    let mut commits = vec![];
    for line in out.lines() {
        let fields: Vec<&str> = line.split('\u{1f}').collect();
        if decorate {
            if fields.len() < 8 {
                continue;
            }
            commits.push(CommitInfo {
                hash: fields[0].to_string(),
                short: fields[1].to_string(),
                author: fields[2].to_string(),
                date: fields[4].to_string(),
                message: fields[5].to_string(),
                parents: fields[6]
                    .split_whitespace()
                    .map(|hash| hash.to_string())
                    .collect(),
                refs: fields[7]
                    .split(',')
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty())
                    .collect(),
            });
        } else {
            if fields.len() < 6 {
                continue;
            }
            commits.push(CommitInfo {
                hash: fields[0].to_string(),
                short: fields[1].to_string(),
                author: fields[2].to_string(),
                date: fields[4].to_string(),
                message: fields[5].to_string(),
                parents: vec![],
                refs: vec![],
            });
        }
    }
    commits
}

pub fn search_log(
    runner: &dyn GitRunner,
    repo_path: &str,
    filter: &LogFilter,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let mut args = build_args(filter, limit.unwrap_or(100).min(MAX_SEARCH_RESULTS), false)?;
    let skip_count = skip.unwrap_or(0).min(100_000);
    if skip_count > 0 {
        args.push(format!("--skip={skip_count}"));
    }
    let refs: Vec<&str> = args.iter().map(|arg| arg.as_str()).collect();
    let out = runner.run_limited(Some(&root), &refs, MAX_SEARCH_OUTPUT_BYTES)?;
    Ok(parse(&out, false))
}

pub fn search_graph(
    runner: &dyn GitRunner,
    repo_path: &str,
    filter: &LogFilter,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let mut args = build_args(filter, limit.unwrap_or(100).min(MAX_SEARCH_RESULTS), true)?;
    let skip_count = skip.unwrap_or(0).min(100_000);
    if skip_count > 0 {
        args.push(format!("--skip={skip_count}"));
    }
    let refs: Vec<&str> = args.iter().map(|arg| arg.as_str()).collect();
    let out = runner.run_limited(Some(&root), &refs, MAX_SEARCH_OUTPUT_BYTES)?;
    let cleaned: String = out
        .lines()
        .map(|line| match line.find(|c: char| c.is_ascii_hexdigit()) {
            Some(idx) => line[idx..].to_string(),
            None => line
                .trim_start_matches(['*', '|', '/', ' ', '\\'])
                .to_string(),
        })
        .collect::<Vec<String>>()
        .join("\n");
    Ok(parse(&cleaned, true))
}

pub fn file_history(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    limit: Option<usize>,
    follow: bool,
) -> Result<Vec<CommitInfo>, String> {
    search_log(
        runner,
        repo_path,
        &LogFilter {
            path: Some(file.to_string()),
            follow,
            ..Default::default()
        },
        limit,
        None,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn builds_author_and_message_filters() {
        let args = build_args(
            &LogFilter {
                author: Some("Dev".into()),
                grep: Some("fix".into()),
                ..Default::default()
            },
            50,
            false,
        )
        .unwrap();
        assert!(args.iter().any(|a| a == "--author=Dev"));
        assert!(args.iter().any(|a| a == "--grep=fix"));
        assert!(args.iter().any(|a| a == "--max-count=50"));
        assert!(!args
            .iter()
            .any(|a| a.starts_with("--pretty") && a.contains("%P")));
    }

    #[test]
    fn puts_the_pathspec_after_the_separator() {
        let args = build_args(
            &LogFilter {
                path: Some("src/a.ts".into()),
                follow: true,
                ..Default::default()
            },
            10,
            false,
        )
        .unwrap();
        let sep = args.iter().position(|a| a == "--").unwrap();
        assert_eq!(args[sep + 1], "src/a.ts");
        assert!(args.iter().any(|a| a == "--follow"));
        assert!(!args.iter().any(|a| a.starts_with("--src")));
    }

    #[test]
    fn rejects_paths_that_try_to_escape_the_repo() {
        assert!(build_args(
            &LogFilter {
                path: Some("../outside".into()),
                ..Default::default()
            },
            10,
            false
        )
        .is_err());
        assert!(build_args(
            &LogFilter {
                path: Some("/etc/passwd".into()),
                ..Default::default()
            },
            10,
            false
        )
        .is_err());
    }

    #[test]
    fn rejects_follow_without_a_path() {
        assert!(build_args(
            &LogFilter {
                follow: true,
                ..Default::default()
            },
            10,
            false
        )
        .is_err());
    }

    #[test]
    fn rejects_option_like_filters() {
        assert!(build_args(
            &LogFilter {
                grep: Some("--output=/tmp/x".into()),
                ..Default::default()
            },
            10,
            false
        )
        .is_ok());
        assert!(validate_date("since", "--upload-pack=x").is_err());
        assert!(validate_date("since", "2 weeks ago").is_err());
    }

    #[test]
    fn parses_search_rows_including_email() {
        let out = "h1\u{1f}s1\u{1f}Dev\u{1f}dev@x.io\u{1f}2026-02-02\u{1f}feat: y";
        let commits = parse(out, false);
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].author, "Dev");
        assert_eq!(commits[0].message, "feat: y");
    }

    #[test]
    fn searches_with_the_runner() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            (
                "log --all --max-count=10 --grep=fix --pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s -- src/a.ts",
                "h1\u{1f}s1\u{1f}Dev\u{1f}d@x\u{1f}2026-01-01\u{1f}fix: z",
            ),
        ];
        let runner = MockRunner::new(&rows, &[]);
        let commits = search_log(
            &runner,
            "/r",
            &LogFilter {
                grep: Some("fix".into()),
                path: Some("src/a.ts".into()),
                ..Default::default()
            },
            Some(10),
            None,
        )
        .unwrap();
        assert_eq!(commits.len(), 1);
    }
}
