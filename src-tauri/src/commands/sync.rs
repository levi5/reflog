use crate::runner::GitRunner;
use crate::domain::StashItem;
use crate::commands::validation::{validate_ref_name, validate_stash_message};
use crate::AppState;
use tauri::State;

pub fn merge_opts(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    squash: bool,
    no_ff: bool,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    if squash {
        return runner.run(Some(&root), &["merge", "--squash", "--", branch]);
    }
    if no_ff {
        return runner.run(Some(&root), &["merge", "--no-ff", "--no-edit", "--", branch]);
    }
    runner.run(Some(&root), &["merge", "--", branch])
}

pub fn fetch(
    runner: &dyn GitRunner,
    repo_path: &str,
    prune: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if prune {
        return runner.run(Some(&root), &["fetch", "--all", "--prune"]);
    }
    runner.run(Some(&root), &["fetch", "--all"])
}

pub fn merge_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["merge", "--abort"])
}

pub fn pull(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match runner.run(Some(&root), &["pull"]) {
        Ok(output) => Ok(output),
        Err(err) => {
            if err.contains("no tracking information")
                || err.contains("Please specify which branch")
                || err.contains("no upstream")
            {
                if let Ok(branch_out) =
                    runner.run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
                {
                    let branch = branch_out.trim();
                    if !branch.is_empty() && branch != "HEAD" {
                        validate_ref_name(branch)?;
                        let _ = runner.run(
                            Some(&root),
                            &[
                                "branch",
                                "--set-upstream-to",
                                &format!("origin/{branch}"),
                                branch,
                            ],
                        );
                        return runner.run(Some(&root), &["pull", "origin", branch]);
                    }
                }
            }
            Err(err)
        }
    }
}

pub fn push(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match runner.run(Some(&root), &["push"]) {
        Ok(output) => Ok(output),
        Err(err) => {
            if err.contains("has no upstream branch")
                || err.contains("--set-upstream")
                || err.contains("no upstream")
            {
                if let Ok(branch_out) =
                    runner.run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
                {
                    let branch = branch_out.trim();
                    if !branch.is_empty() && branch != "HEAD" {
                        validate_ref_name(branch)?;
                        return runner.run(Some(&root), &["push", "-u", "origin", branch]);
                    }
                }
            }
            Err(err)
        }
    }
}

pub fn stash(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: Option<String>,
) -> Result<String, String> {
    if let Some(ref m) = message {
        validate_stash_message(m)?;
    }
    let root = runner.repo_root(repo_path)?;
    match message {
        Some(m) if !m.trim().is_empty() => {
            runner.run(Some(&root), &["stash", "push", "--include-untracked", "-m", &m])
        }
        _ => runner.run(Some(&root), &["stash", "push", "--include-untracked"]),
    }
}

pub fn stash_pop(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["stash", "pop"])
}

pub fn stash_list(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<StashItem>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["stash", "list", "--format=%H\x1f%gd\x1f%gs\x1f%an\x1f%cs"])?;
    let mut items = vec![];
    for (idx, line) in out.lines().enumerate() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
        if p.len() < 5 {
            continue;
        }
        items.push(StashItem {
            index: idx,
            hash: p[0].to_string(),
            selector: p[1].to_string(),
            message: p[2].to_string(),
            author: p[3].to_string(),
            date: p[4].to_string(),
        });
    }
    Ok(items)
}

pub fn stash_show(runner: &dyn GitRunner, repo_path: &str, index: usize) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["stash", "show", "-p", &format!("stash@{{{index}}}")])
}

pub fn stash_drop(runner: &dyn GitRunner, repo_path: &str, index: usize) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["stash", "drop", &format!("stash@{{{index}}}")])
}

pub fn stash_apply(runner: &dyn GitRunner, repo_path: &str, index: usize) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["stash", "apply", &format!("stash@{{{index}}}")])
}

use crate::commands::run_blocking;

#[tauri::command]
pub async fn git_merge_opts(
    state: State<'_, AppState>,
    repo_path: String,
    branch: String,
    squash: bool,
    no_ff: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || merge_opts(runner.as_ref(), &repo_path, &branch, squash, no_ff)).await
}

#[tauri::command]
pub async fn git_fetch(
    state: State<'_, AppState>,
    repo_path: String,
    prune: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || fetch(runner.as_ref(), &repo_path, prune)).await
}

#[tauri::command]
pub async fn git_merge_abort(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || merge_abort(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_pull(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || pull(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_push(state: State<'_, AppState>, repo_path: String) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || push(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_stash(
    state: State<'_, AppState>,
    repo_path: String,
    message: Option<String>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash(runner.as_ref(), &repo_path, message)).await
}

#[tauri::command]
pub async fn git_stash_pop(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash_pop(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_stash_list(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<StashItem>, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash_list(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_stash_show(
    state: State<'_, AppState>,
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash_show(runner.as_ref(), &repo_path, index)).await
}

#[tauri::command]
pub async fn git_stash_drop(
    state: State<'_, AppState>,
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash_drop(runner.as_ref(), &repo_path, index)).await
}

#[tauri::command]
pub async fn git_stash_apply(
    state: State<'_, AppState>,
    repo_path: String,
    index: usize,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || stash_apply(runner.as_ref(), &repo_path, index)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_stash_list_items() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "stash list --format=%H\x1f%gd\x1f%gs\x1f%an\x1f%cs",
                    "hashA\x1fstash@{0}\x1fWIP on main: 1234 feat\x1fDev\x1f2026-09-18\nhashB\x1fstash@{1}\x1fOn feat: test\x1fDev2\x1f2026-09-17",
                ),
            ],
            &[],
        );
        let list = stash_list(&runner, "/r").unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].index, 0);
        assert_eq!(list[0].hash, "hashA");
        assert_eq!(list[0].selector, "stash@{0}");
        assert_eq!(list[0].message, "WIP on main: 1234 feat");
        assert_eq!(list[1].index, 1);
        assert_eq!(list[1].selector, "stash@{1}");
        assert_eq!(list[1].message, "On feat: test");
    }

    #[test]
    fn uses_valid_stash_selectors_for_indexed_actions() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash show -p stash@{2}", "patch"),
                ("stash apply stash@{1}", "applied"),
                ("stash drop stash@{0}", "dropped"),
            ],
            &[],
        );

        assert_eq!(stash_show(&runner, "/r", 2).unwrap(), "patch");
        assert_eq!(stash_apply(&runner, "/r", 1).unwrap(), "applied");
        assert_eq!(stash_drop(&runner, "/r", 0).unwrap(), "dropped");
    }

    #[test]
    fn stashes_untracked_files() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash push --include-untracked -m before-checkout", "Saved"),
            ],
            &[],
        );

        assert_eq!(stash(&runner, "/r", Some("before-checkout".into())).unwrap(), "Saved");
    }
}
