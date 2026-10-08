use crate::commands::validation::validate_rev_spec;
use crate::domain::{CommitInfo, CompareFileStat};
use crate::runner::GitRunner;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const MAX_COMPARE_BYTES: usize = 4 * 1024 * 1024;
const MAX_COMPARE_COMMITS: usize = 500;
const MERGE_BASE_TTL: Duration = Duration::from_secs(30);
const MERGE_BASE_CACHE_LIMIT: usize = 32;

const FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ad%x1f%s";
const GRAPH_FORMAT: &str = "%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%P%x1f%D";

fn parse_commits(out: &str, with_graph: bool) -> Vec<CommitInfo> {
    let mut commits = vec![];
    for line in out.lines() {
        let fields: Vec<&str> = line.split('\u{1f}').collect();
        if with_graph {
            if fields.len() < 7 {
                continue;
            }
            commits.push(CommitInfo {
                hash: fields[0].to_string(),
                short: fields[1].to_string(),
                author: fields[2].to_string(),
                date: fields[3].to_string(),
                message: fields[4].to_string(),
                parents: fields[5]
                    .split_whitespace()
                    .map(|hash| hash.to_string())
                    .collect(),
                refs: fields[6]
                    .split(',')
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty())
                    .collect(),
            });
        } else {
            if fields.len() < 5 {
                continue;
            }
            commits.push(CommitInfo {
                hash: fields[0].to_string(),
                short: fields[1].to_string(),
                author: fields[2].to_string(),
                date: fields[3].to_string(),
                message: fields[4].to_string(),
                parents: vec![],
                refs: vec![],
            });
        }
    }
    commits
}

type MergeBaseKey = (String, String, String);

fn merge_base_cache() -> &'static Mutex<HashMap<MergeBaseKey, (Instant, String)>> {
    static CACHE: OnceLock<Mutex<HashMap<MergeBaseKey, (Instant, String)>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn cached_merge_base(root: &str, a: &str, b: &str) -> Option<String> {
    let cache = merge_base_cache();
    let key: MergeBaseKey = (root.to_string(), a.to_string(), b.to_string());
    let mut guard = cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let now = Instant::now();
    guard.retain(|_, (at, _)| now.duration_since(*at) < MERGE_BASE_TTL);
    guard.get(&key).map(|(_, sha)| sha.clone())
}

fn store_merge_base(root: &str, a: &str, b: &str, sha: &str) {
    let cache = merge_base_cache();
    let mut guard = cache
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if guard.len() >= MERGE_BASE_CACHE_LIMIT {
        guard.clear();
    }
    guard.insert(
        (root.to_string(), a.to_string(), b.to_string()),
        (Instant::now(), sha.to_string()),
    );
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
    if let Some(hit) = cached_merge_base(&root, a, b) {
        return Ok(hit);
    }
    let out = runner.run(Some(&root), &["merge-base", a, b])?;
    let base = out.trim();
    if base.is_empty() {
        return Err("refs share no common ancestor".to_string());
    }
    store_merge_base(&root, a, b, base);
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
) -> Result<Vec<CompareFileStat>, String> {
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
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() < 3 {
            continue;
        }
        let added = fields[0].parse::<usize>().unwrap_or(0);
        let removed = fields[1].parse::<usize>().unwrap_or(0);
        let path = fields[2].to_string();
        files.push(CompareFileStat { path, added, removed });
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
        assert_eq!(files[0].path, "src/a.ts");
        assert_eq!((files[0].added, files[0].removed), (3, 1));
        assert_eq!((files[2].added, files[2].removed), (0, 0));
        assert_eq!(files[2].path, "assets/logo.png");
    }

    #[test]
    fn serializes_numstat_rows_as_named_fields() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("merge-base main feat", "aaa1111"),
            ("diff --numstat aaa1111..feat", "3\t1\tsrc/a.ts"),
        ];
        let runner = MockRunner::new(&rows, &[]);
        let files = diff_stat_files(&runner, "/r", "main", "feat").unwrap();
        let json = serde_json::to_value(&files).unwrap();
        assert_eq!(json[0]["path"], "src/a.ts");
        assert_eq!(json[0]["added"], 3);
        assert_eq!(json[0]["removed"], 1);
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
    fn resolves_the_merge_base_once_per_ref_pair() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("merge-base cached-a cached-b", "aaa1111"),
            ("diff aaa1111..cached-b", ""),
            ("diff --stat aaa1111..cached-b", ""),
            ("diff --numstat aaa1111..cached-b", ""),
            (
                "log --topo-order --max-count=200 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s aaa1111..cached-b",
                "",
            ),
            (
                "log --topo-order --max-count=200 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s aaa1111..cached-a",
                "",
            ),
            ("log --topo-order --graph --max-count=200 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%P%x1f%D aaa1111..cached-b", ""),
        ];
        let runner = MockRunner::new(&rows, &[]);

        diff_refs(&runner, "/r", "cached-a", "cached-b", false).unwrap();
        diff_refs(&runner, "/r", "cached-a", "cached-b", true).unwrap();
        diff_stat_files(&runner, "/r", "cached-a", "cached-b").unwrap();
        commits_ahead(&runner, "/r", "cached-a", "cached-b", None).unwrap();
        commits_behind(&runner, "/r", "cached-a", "cached-b", None).unwrap();
        compare_graph(&runner, "/r", "cached-a", "cached-b", None).unwrap();

        assert_eq!(runner.calls_for("merge-base cached-a cached-b"), 1);
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
