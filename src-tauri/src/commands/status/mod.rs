pub mod porcelain;

use crate::domain::StatusResult;
use crate::runner::GitRunner;
use crate::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

fn short_head(runner: &dyn GitRunner, root: &str) -> String {
    runner
        .run(Some(root), &["rev-parse", "--short", "HEAD"])
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn resolve_branch(runner: &dyn GitRunner, info: &str, root: &str) -> String {
    const DETACHED: &str = "HEAD (no branch)";
    let name = match info.find("...") {
        Some(dot) => info[..dot].to_string(),
        None => info.split(' ').next().unwrap_or("").to_string(),
    };
    match name.as_str() {
        DETACHED => short_head(runner, root),
        _ => name,
    }
}

fn git_state_path(runner: &dyn GitRunner, root: &str, name: &str) -> PathBuf {
    let path = runner
        .run(Some(root), &["rev-parse", "--git-path", name])
        .unwrap_or_else(|_| format!(".git/{name}"));
    let path = PathBuf::from(path.trim());
    if path.is_absolute() {
        path
    } else {
        Path::new(root).join(path)
    }
}

pub fn status_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<StatusResult, String> {
    let root = runner.repo_root(repo_path)?;
    let porcelain =
        runner.run(Some(&root), &["status", "--porcelain=v1", "-z", "-b", "-uall"])?;
    let parsed = porcelain::parse(&porcelain);
    let branch = match parsed.branch_info.is_empty() {
        true => runner
            .run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
            .unwrap_or_default()
            .trim()
            .to_string(),
        false => resolve_branch(runner, &parsed.branch_info, &root),
    };

    let merging = runner.path_exists(&git_state_path(runner, &root, "MERGE_HEAD"));
    let cherry = runner.path_exists(&git_state_path(runner, &root, "CHERRY_PICK_HEAD"));
    let revert = runner.path_exists(&git_state_path(runner, &root, "REVERT_HEAD"));

    Ok(StatusResult {
        root,
        branch,
        ahead: parsed.ahead,
        behind: parsed.behind,
        files: parsed.files,
        merging,
        cherry_picking: cherry,
        reverting: revert,
    })
}

#[tauri::command]
pub async fn git_status(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<StatusResult, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || status_of(runner.as_ref(), &repo_path)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    fn runner() -> MockRunner {
        MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("rev-parse --abbrev-ref HEAD", "main"),
                ("rev-parse --git-path MERGE_HEAD", "/r/.git/MERGE_HEAD"),
                ("rev-parse --git-path CHERRY_PICK_HEAD", "/r/.git/CHERRY_PICK_HEAD"),
                ("rev-parse --git-path REVERT_HEAD", "/r/.git/REVERT_HEAD"),
                (
                    "status --porcelain=v1 -z -b -uall",
                    "## main...origin/main [ahead 2, behind 1]\0M  f.tsx\0UU ola.txt\0?? new.txt\0",
                ),
            ],
            &[],
        )
        .with_existing(&["/r/.git/MERGE_HEAD"])
    }

    #[test]
    fn detects_branch_ahead_behind_and_unmerged() {
        let v = status_of(&runner(), "/r").unwrap();
        assert_eq!(v.root, "/r");
        assert_eq!(v.branch, "main");
        assert_eq!(v.ahead, 2);
        assert_eq!(v.behind, 1);
        assert_eq!(v.merging, true);
        assert_eq!(v.files[0].staged, true);
        assert_eq!(v.files[1].unmerged, true);
        assert_eq!(v.files[2].staged, false);
    }
}
