pub mod porcelain;

use crate::domain::StatusResult;
use crate::runner::GitRunner;
use crate::AppState;
use std::path::Path;
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

pub fn status_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<StatusResult, String> {
    let root = runner.repo_root(repo_path)?;
    let porcelain =
        runner.run(Some(&root), &["status", "--porcelain=v1", "-b", "-uall"])?;
    let parsed = porcelain::parse(&porcelain);
    let branch = match parsed.branch_info.is_empty() {
        true => runner
            .run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
            .unwrap_or_default()
            .trim()
            .to_string(),
        false => resolve_branch(runner, &parsed.branch_info, &root),
    };

    let root_path = Path::new(&root);
    let merging = runner.path_exists(&root_path.join(".git/MERGE_HEAD"));
    let cherry = runner.path_exists(&root_path.join(".git/CHERRY_PICK_HEAD"));
    let revert = runner.path_exists(&root_path.join(".git/REVERT_HEAD"));

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
                (
                    "status --porcelain=v1 -b -uall",
                    "## main...origin/main [ahead 2, behind 1]\nM  f.tsx\nUU ola.txt\n?? new.txt",
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
