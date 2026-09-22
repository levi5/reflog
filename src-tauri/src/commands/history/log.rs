use crate::domain::{CommitInfo, ReflogEntry};
use crate::runner::GitRunner;
use crate::AppState;
use tauri::State;

pub fn log_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let n = limit.unwrap_or(50).to_string();
    let max_count = format!("--max-count={n}");
    let mut args: Vec<String> = vec![
        "log".to_string(),
        "--all".to_string(),
        max_count,
        "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s".to_string(),
        "--date=short".to_string(),
    ];
    if let Some(s) = skip {
        if s > 0 {
            args.push(format!("--skip={s}"));
        }
    }
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = runner.run(Some(&root), &args_ref)?;
    let mut commits = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
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
    Ok(commits)
}

pub fn graph_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let n = limit.unwrap_or(100).to_string();
    let max_count = format!("--max-count={n}");
    let mut args: Vec<String> = vec![
        "log".to_string(),
        "--all".to_string(),
        "--decorate".to_string(),
        "--topo-order".to_string(),
        max_count,
        "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%P%x1f%D".to_string(),
        "--date=short".to_string(),
    ];
    if let Some(s) = skip {
        if s > 0 {
            args.push(format!("--skip={s}"));
        }
    }
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = runner.run(Some(&root), &args_ref)?;
    let mut commits = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
        if p.len() < 7 {
            continue;
        }
        let parents = p[5]
            .split_whitespace()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        let refs = p[6]
            .split(", ")
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>();
        commits.push(CommitInfo {
            hash: p[0].to_string(),
            short: p[1].to_string(),
            author: p[2].to_string(),
            date: p[3].to_string(),
            message: p[4].to_string(),
            parents,
            refs,
        });
    }
    Ok(commits)
}

pub fn reflog_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<ReflogEntry>, String> {
    let root = runner.repo_root(repo_path)?;
    let n = limit.unwrap_or(50).to_string();
    let max_count = format!("--max-count={n}");
    let skip_arg = skip.unwrap_or(0).to_string();
    let skip_flag = format!("--skip={skip_arg}");
    let mut cmd: Vec<&str> = vec![
        "log",
        "-g",
        &max_count,
        "--format=%H\x1f%h\x1f%gd\x1f%gs\x1f%an\x1f%cs",
    ];
    if skip.unwrap_or(0) > 0 {
        cmd.push(&skip_flag);
    }
    let out = runner.run(Some(&root), &cmd)?;
    let mut entries = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
        if p.len() < 6 {
            continue;
        }
        entries.push(ReflogEntry {
            hash: p[0].to_string(),
            short: p[1].to_string(),
            selector: p[2].to_string(),
            action: p[3].to_string(),
            author: p[4].to_string(),
            date: p[5].to_string(),
        });
    }
    Ok(entries)
}


pub fn count_of(runner: &dyn GitRunner, repo_path: &str) -> Result<usize, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["rev-list", "--all", "--count"])?;
    out.trim()
        .parse::<usize>()
        .map_err(|_| "invalid commit count".to_string())
}

#[tauri::command]
pub async fn git_count(state: State<'_, AppState>, repo_path: String) -> Result<usize, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || count_of(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_log(
    state: State<'_, AppState>,
    repo_path: String,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || log_of(runner.as_ref(), &repo_path, limit, skip)).await
}

#[tauri::command]
pub async fn git_graph(
    state: State<'_, AppState>,
    repo_path: String,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || graph_of(runner.as_ref(), &repo_path, limit, skip)).await
}

#[tauri::command]
pub async fn git_reflog(
    state: State<'_, AppState>,
    repo_path: String,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<ReflogEntry>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || reflog_of(runner.as_ref(), &repo_path, limit, skip)).await
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_reflog_entries() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "log -g --max-count=50 --format=%H\x1f%h\x1f%gd\x1f%gs\x1f%an\x1f%cs",
                    "hash1\x1fshort1\x1fHEAD@{0}\x1fcommit: message 1\x1fAuthor 1\x1f2026-09-18\nhash2\x1fshort2\x1fHEAD@{1}\x1fcheckout: to dev\x1fAuthor 2\x1f2026-09-17",
                ),
            ],
            &[],
        );
        let list = reflog_of(&runner, "/r", None, None).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].hash, "hash1");
        assert_eq!(list[0].short, "short1");
        assert_eq!(list[0].selector, "HEAD@{0}");
        assert_eq!(list[0].action, "commit: message 1");
        assert_eq!(list[0].author, "Author 1");
        assert_eq!(list[0].date, "2026-09-18");
    }

    #[test]
    fn parses_log_commits_with_all_flag() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "log --all --max-count=50 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s --date=short",
                    "hash1\x1fshort1\x1fAuthor 1\x1f2026-09-18\x1fcommit message 1\nhash2\x1fshort2\x1fAuthor 2\x1f2023-05-12\x1fcommit message 2",
                ),
            ],
            &[],
        );
        let list = log_of(&runner, "/r", None, None).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].hash, "hash1");
        assert_eq!(list[0].short, "short1");
        assert_eq!(list[0].author, "Author 1");
        assert_eq!(list[0].date, "2026-09-18");
        assert_eq!(list[0].message, "commit message 1");
        assert_eq!(list[1].hash, "hash2");
        assert_eq!(list[1].date, "2023-05-12");
    }

    #[test]
    fn counts_all_commits() {
        let runner = MockRunner::new(
            &[("rev-parse --show-toplevel", "/r"), ("rev-list --all --count", "108\n")],
            &[],
        );
        assert_eq!(count_of(&runner, "/r").unwrap(), 108);
    }

    #[test]
    fn paginates_log_with_skip() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "log --all --max-count=50 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s --date=short --skip=50",
                    "hash3\x1fshort3\x1fAuthor 3\x1f2026-09-17\x1fcommit message 3",
                ),
            ],
            &[],
        );
        let list = log_of(&runner, "/r", Some(50), Some(50)).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].hash, "hash3");
    }

    #[test]
    fn parses_graph_commits_with_all_flag() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "log --all --decorate --topo-order --max-count=100 --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%P%x1f%D --date=short",
                    "hash1\x1fshort1\x1fAuthor 1\x1f2026-09-18\x1fcommit 1\x1fparent1\x1fHEAD -> main, tag: v2.0\nhash2\x1fshort2\x1fAuthor 2\x1f2023-01-10\x1fcommit 2\x1f\x1ftag: v1.0",
                ),
            ],
            &[],
        );
        let list = graph_of(&runner, "/r", None, None).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].hash, "hash1");
        assert_eq!(list[0].parents, vec!["parent1"]);
        assert_eq!(list[0].refs, vec!["HEAD -> main", "tag: v2.0"]);
        assert_eq!(list[1].hash, "hash2");
        assert_eq!(list[1].date, "2023-01-10");
        assert_eq!(list[1].refs, vec!["tag: v1.0"]);
    }
}
