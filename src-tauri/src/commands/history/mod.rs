pub mod branches;
pub mod compare;
pub mod diff;
pub mod log;
pub mod search;

use crate::AppState;
use tauri::State;

use compare::{
    commits_ahead, commits_behind, compare_graph, diff_refs, diff_stat_files, merge_base,
};
use search::{file_history, search_graph, search_log, LogFilter};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterPayload {
    author: Option<String>,
    grep: Option<String>,
    path: Option<String>,
    since: Option<String>,
    until: Option<String>,
    pickaxe: Option<String>,
    follow: Option<bool>,
}

impl From<FilterPayload> for LogFilter {
    fn from(p: FilterPayload) -> Self {
        LogFilter {
            author: p.author,
            grep: p.grep,
            path: p.path,
            since: p.since,
            until: p.until,
            pickaxe: p.pickaxe,
            follow: p.follow.unwrap_or(false),
        }
    }
}

git_command!(git_merge_base, String, merge_base, (repo_path: String, base: String, target: String), ());

#[tauri::command]
pub async fn git_diff_refs(
    state: State<'_, AppState>,
    repo_path: String,
    base: String,
    target: String,
    stat_only: Option<bool>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    let stat_only = stat_only.unwrap_or(false);
    crate::commands::run_blocking(move || {
        diff_refs(runner.as_ref(), &repo_path, &base, &target, stat_only)
    })
    .await
}

git_command!(
    git_diff_stat_files,
    Vec<(String, usize, usize)>,
    diff_stat_files,
    (repo_path: String, base: String, target: String),
    ()
);

git_command!(
    git_commits_ahead,
    Vec<crate::domain::CommitInfo>,
    commits_ahead,
    (repo_path: String, base: String, target: String),
    (limit: Option<usize>)
);

git_command!(
    git_commits_behind,
    Vec<crate::domain::CommitInfo>,
    commits_behind,
    (repo_path: String, base: String, target: String),
    (limit: Option<usize>)
);

git_command!(
    git_compare_graph,
    Vec<crate::domain::CommitInfo>,
    compare_graph,
    (repo_path: String, base: String, target: String),
    (limit: Option<usize>)
);

#[tauri::command]
pub async fn git_search_log(
    state: State<'_, AppState>,
    repo_path: String,
    filter: FilterPayload,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<crate::domain::CommitInfo>, String> {
    let runner = state.runner.clone();
    let filter: LogFilter = filter.into();
    crate::commands::run_blocking(move || {
        search_log(runner.as_ref(), &repo_path, &filter, limit, skip)
    })
    .await
}

#[tauri::command]
pub async fn git_search_graph(
    state: State<'_, AppState>,
    repo_path: String,
    filter: FilterPayload,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<crate::domain::CommitInfo>, String> {
    let runner = state.runner.clone();
    let filter: LogFilter = filter.into();
    crate::commands::run_blocking(move || {
        search_graph(runner.as_ref(), &repo_path, &filter, limit, skip)
    })
    .await
}

#[tauri::command]
pub async fn git_file_history(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
    limit: Option<usize>,
    follow: Option<bool>,
) -> Result<Vec<crate::domain::CommitInfo>, String> {
    let runner = state.runner.clone();
    let follow = follow.unwrap_or(true);
    crate::commands::run_blocking(move || {
        file_history(runner.as_ref(), &repo_path, &file, limit, follow)
    })
    .await
}
