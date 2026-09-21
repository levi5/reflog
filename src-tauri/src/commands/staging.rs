use crate::runner::GitRunner;
use crate::commands::validation::{
    validate_ref_name, validate_commit_oid, validate_repo_relative_path, validate_patch_size,
};
use crate::AppState;
use tauri::State;

const MAX_PATCH_BYTES: usize = 5 * 1024 * 1024;

pub fn add(
    runner: &dyn GitRunner,
    repo_path: &str,
    files: &[String],
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if files.is_empty() {
        return runner.run(Some(&root), &["add", "-A"]);
    }
    for f in files {
        validate_repo_relative_path(f)?;
    }
    let mut args: Vec<&str> = vec!["add", "--"];
    args.extend(files.iter().map(|s| s.as_str()));
    runner.run(Some(&root), &args)
}

pub fn commit(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: &str,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if message.trim().is_empty() {
        return Err("mensagem de commit vazia".to_string());
    }
    let mut owned: Vec<String> =
        vec!["commit".to_string(), "-m".to_string(), message.to_string()];
    if signoff {
        owned.push("--signoff".to_string());
    }
    if sign {
        owned.push("-S".to_string());
    }
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &args)
}

pub fn amend_commit(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: &str,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if message.trim().is_empty() {
        return Err("mensagem de commit vazia".to_string());
    }
    let mut owned: Vec<String> = vec![
        "commit".to_string(),
        "--amend".to_string(),
        "-m".to_string(),
        message.to_string(),
    ];
    if signoff {
        owned.push("--signoff".to_string());
    }
    if sign {
        owned.push("-S".to_string());
    }
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &args)
}

pub fn checkout(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    create: bool,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    if create {
        return runner.run(Some(&root), &["checkout", "-b", "--", branch]);
    }
    runner.run(Some(&root), &["checkout", "--", branch])
}

pub fn unstage(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["reset", "HEAD", "--", file])
}

pub fn discard(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    match runner.run(Some(&root), &["restore", "--", file]) {
        Ok(o) => Ok(o),
        Err(_) => runner.run(Some(&root), &["checkout", "--", file]),
    }
}

pub fn apply_patch(
    runner: &dyn GitRunner,
    repo_path: &str,
    patch: &str,
    cached: bool,
    reverse: bool,
) -> Result<String, String> {
    validate_patch_size(patch, MAX_PATCH_BYTES)?;
    if patch.trim().is_empty() {
        return Err("patch vazio".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    let mut owned: Vec<String> = vec!["apply".to_string()];
    if cached {
        owned.push("--cached".to_string());
    }
    if reverse {
        owned.push("--reverse".to_string());
    }
    owned.push("--unidiff-zero".to_string());
    owned.push("-".to_string());
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run_stdin(Some(&root), &args, patch)
}

pub fn cherry_pick(runner: &dyn GitRunner, repo_path: &str, hash: &str) -> Result<String, String> {
    validate_commit_oid(hash)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", hash])
}

pub fn cherry_pick_continue(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", "--continue"])
}

pub fn cherry_pick_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", "--abort"])
}

pub fn revert(runner: &dyn GitRunner, repo_path: &str, hash: &str) -> Result<String, String> {
    validate_commit_oid(hash)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--no-edit", hash])
}

pub fn revert_continue(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--continue"])
}

pub fn revert_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--abort"])
}

pub fn reset(runner: &dyn GitRunner, repo_path: &str, target: &str, mode: &str) -> Result<String, String> {
    validate_commit_oid(target)?;
    let flag = match mode {
        "soft" => "--soft",
        "hard" => "--hard",
        "mixed" => "--mixed",
        _ => return Err("modo de reset inválido".to_string()),
    };
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["reset", flag, target])
}


use crate::commands::run_blocking;

#[tauri::command]
pub async fn git_add(
    state: State<'_, AppState>,
    repo_path: String,
    files: Vec<String>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || add(runner.as_ref(), &repo_path, &files)).await
}

#[tauri::command]
pub async fn git_commit(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || commit(runner.as_ref(), &repo_path, &message, signoff, sign)).await
}

#[tauri::command]
pub async fn git_amend_commit(
    state: State<'_, AppState>,
    repo_path: String,
    message: String,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || amend_commit(runner.as_ref(), &repo_path, &message, signoff, sign)).await
}

#[tauri::command]
pub async fn git_checkout(
    state: State<'_, AppState>,
    repo_path: String,
    branch: String,
    create: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || checkout(runner.as_ref(), &repo_path, &branch, create)).await
}

#[tauri::command]
pub async fn git_unstage(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || unstage(runner.as_ref(), &repo_path, &file)).await
}

#[tauri::command]
pub async fn git_discard(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || discard(runner.as_ref(), &repo_path, &file)).await
}

#[tauri::command]
pub async fn git_apply_patch(
    state: State<'_, AppState>,
    repo_path: String,
    patch: String,
    cached: bool,
    reverse: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || apply_patch(runner.as_ref(), &repo_path, &patch, cached, reverse)).await
}

#[tauri::command]
pub async fn git_cherry_pick(
    state: State<'_, AppState>,
    repo_path: String,
    hash: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || cherry_pick(runner.as_ref(), &repo_path, &hash)).await
}

#[tauri::command]
pub async fn git_cherry_pick_continue(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || cherry_pick_continue(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_cherry_pick_abort(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || cherry_pick_abort(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_revert(
    state: State<'_, AppState>,
    repo_path: String,
    hash: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || revert(runner.as_ref(), &repo_path, &hash)).await
}

#[tauri::command]
pub async fn git_revert_continue(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || revert_continue(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_revert_abort(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || revert_abort(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_reset(
    state: State<'_, AppState>,
    repo_path: String,
    target: String,
    mode: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    run_blocking(move || reset(runner.as_ref(), &repo_path, &target, &mode)).await
}