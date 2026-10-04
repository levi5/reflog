use crate::commands::validation::validate_rev_spec;
use crate::domain::CommitInfo;
use crate::runner::GitRunner;

const MAX_COMPARE_BYTES: usize = 4 * 1024 * 1024;
const MAX_COMPARE_COMMITS: usize = 500;

const FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ad%x1f%s";
const GRAPH_FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%P%x1f%D";

fn parse_commits(out: &str, with_graph: bool) -> Vec<CommitInfo> {
    let mut commits = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
        if with_graph {
            if p.len() < 7 {
                continue;
            }
            commits.push(CommitInfo {
                hash: p[0].to_string(),
                short: p[1].to_string(),
                author: p[2].to_string(),
                date: p[3].to_string(),
                message: p[4].to_string(),
                parents: p[5].split_whitespace().map(|s| s.to_string()).collect(),
                refs: p[6]
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect(),
            });
        } else {
            if p.len() < 5 {
                continue;
            }
            commits.push(CommitInfo {
                hash: p[0].to_string(),
                short: p[1].to_string(),
                author: p[2].to_string(),
                date: p[3].to_string(),
                message: p[4].to_string(),
                parents: vec![],
                refs: vec![],
            });
        }
    }
    commits
}

pub fn merge_base(
    runner: &dyn GitRunner,
    repo_path: &str,
    a: &str,
    b: &str,
) -> Result<String, String> {
    validate_rev_spec(a)?;
    validate_rev_spec(b)?;
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["merge-base", a, b])?;
    let base = out.trim();
    if base.is_empty() {
        return Err("os refs não compartilham um ancestral comum".to_string());
    }
    Ok(base.to_string())
}

pub fn diff_refs(
    runner: &dyn GitRunner,
    repo_path: &str,
    base: &str,
    target: &str,
    stat_only: bool,
) -> Result<String, String> {
    validate_rev_spec(base)?;
    validate_rev_spec(target)?;
    let root = runner.repo_root(repo_path)?;
    let base_sha = merge_base(runner, &root, base, target)?;
    let range = format!("{base_sha}..{target}");
    if stat_only {
        return runner.run_limited(Some(&root), &["diff", "--stat", &range], MAX_COMPARE_BYTES);
    }
    runner.run_limited(Some(&root), &["diff", &range], MAX_COMPARE_BYTES)
}

pub fn diff_stat_files(
    runner: &dyn GitRunner,
    repo_path: &str,
    base: &str,
    target: &str,
) -> Result<Vec<(String, usize, usize)>, String> {
    validate_rev_spec(base)?;
    validate_rev_spec(target)?;
    let root = runner.repo_root(repo_path)?;
    let base_sha = merge_base(runner, &root, base, target)?;
    let range = format!("{base_sha}..{target}");
    let out = runner.run_limited(
        Some(&root),
        &["diff", "--numstat", &range],
        MAX_COMPARE_BYTES,
    )?;
    let mut files = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\t').collect();
        if p.len() < 3 {
            continue;
        }
        let added = p[0].parse::<usize>().unwrap_or(0);
        let removed = p[1].parse::<usize>().unwrap_or(0);
        let path = p[2].to_string();
        files.push((path, added, removed));
    }
    Ok(files)
}

pub fn commits_ahead(
    runner: &dyn GitRunner,
    repo_path: &str,
    base: &str,
    target: &str,
    limit: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    validate_rev_spec(base)?;
    validate_rev_spec(target)?;
    let root = runner.repo_root(repo_path)?;
    let base_sha = merge_base(runner, &root, base, target)?;
    let range = format!("{base_sha}..{target}");
    let max = limit.unwrap_or(200).min(MAX_COMPARE_COMMITS);
    let max_count = format!("--max-count={max}");
    let out = runner.run_limited(
        Some(&root),
        &[
            "log",
            "--topo-order",
            &max_count,
            &format!("--pretty=format:{FORMAT}"),
            &range,
        ],
        MAX_COMPARE_BYTES,
    )?;
    Ok(parse_commits(&out, false))
}

pub fn commits_behind(
    runner: &dyn GitRunner,
    repo_path: &str,
    base: &str,
    target: &str,
    limit: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    validate_rev_spec(base)?;
    validate_rev_spec(target)?;
    let root = runner.repo_root(repo_path)?;
    let base_sha = merge_base(runner, &root, base, target)?;
    let range = format!("{base_sha}..{base}");
    let max = limit.unwrap_or(200).min(MAX_COMPARE_COMMITS);
    let max_count = format!("--max-count={max}");
    let out = runner.run_limited(
        Some(&root),
        &[
            "log",
            "--topo-order",
            &max_count,
            &format!("--pretty=format:{FORMAT}"),
            &range,
        ],
        MAX_COMPARE_BYTES,
    )?;
    Ok(parse_commits(&out, false))
}

pub fn compare_graph(
    runner: &dyn GitRunner,
    repo_path: &str,
    base: &str,
    target: &str,
    limit: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    validate_rev_spec(base)?;
    validate_rev_spec(target)?;
    let root = runner.repo_root(repo_path)?;
    let base_sha = merge_base(runner, &root, base, target)?;
    let max = limit.unwrap_or(200).min(MAX_COMPARE_COMMITS);
    let max_count = format!("--max-count={max}");
    let out = runner.run_limited(
        Some(&root),
        &[
            "log",
            "--topo-order",
            "--graph",
            &max_count,
            &format!("--pretty=format:{GRAPH_FORMAT}"),
            &format!("{base_sha}..{target}"),
        ],
        MAX_COMPARE_BYTES,
    )?;
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
    Ok(parse_commits(&cleaned, true))
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    fn repo_root_stub(root: &str) -> String {
        format!("rev-parse --show-toplevel -> {root}")
    }

    #[test]
    fn parses_numstat_rows() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("merge-base main feat", "aaa1111"),
            (
                "diff --numstat aaa1111..feat",
                "3	1	src/a.ts
0	7	src/b.ts
-	-	assets/logo.png",
            ),
        ];
        let runner = MockRunner::new(&rows, &[]);
        let files = diff_stat_files(&runner, "/r", "main", "feat").unwrap();
        assert_eq!(files.len(), 3);
        assert_eq!(files[0], ("src/a.ts".to_string(), 3, 1));
        assert_eq!(files[2], ("assets/logo.png".to_string(), 0, 0));
    }

    #[test]
    fn rejects_when_refs_are_unrelated() {
        let rows = vec![("rev-parse --show-toplevel", "/r"), ("merge-base a b", "")];
        let runner = MockRunner::new(&rows, &[]);
        assert!(merge_base(&runner, "/r", "a", "b").is_err());
        let _ = repo_root_stub;
    }

    #[test]
    fn rejects_option_like_revisions() {
        let rows = vec![("rev-parse --show-toplevel", "/r")];
        let runner = MockRunner::new(&rows, &[]);
        assert!(merge_base(&runner, "/r", "--upload-pack=evil", "main").is_err());
        assert!(diff_refs(&runner, "/r", "main", "--hard", false).is_err());
    }

    #[test]
    fn parses_commits_ahead_with_the_merge_base_range() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("merge-base main feat", "aaa1111"),
            (
                "log --topo-order --max-count=200 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s aaa1111..feat",
                "h1\u{1f}s1\u{1f}Dev\u{1f}2026-01-01\u{1f}feat: x",
            ),
        ];
        let runner = MockRunner::new(&rows, &[]);
        let commits = commits_ahead(&runner, "/r", "main", "feat", None).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].short, "s1");
    }
}
