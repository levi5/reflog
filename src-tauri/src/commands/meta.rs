use crate::runner::{GitRunner, NETWORK_TIMEOUT};
use crate::commands::validation::{
    validate_clone_url, validate_clone_path, validate_config_key, validate_config_value,
};
use crate::AppState;
use tauri::State;

pub fn version(runner: &dyn GitRunner) -> Result<String, String> {
    runner.run(None, &["--version"]).map(|s| s.trim().to_string())
}

pub fn remote_url(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    Ok(runner
        .run(Some(&root), &["remote", "get-url", "origin"])
        .unwrap_or_default()
        .trim()
        .to_string())
}

pub fn gpg(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner
        .run(Some(&root), &["log", "-1", "--pretty=%G?"])
        .map(|s| s.trim().to_string())
}

pub fn clone(runner: &dyn GitRunner, url: &str, path: &str) -> Result<String, String> {
    validate_clone_url(url)?;
    validate_clone_path(path)?;
    runner.run_with_timeout(None, &["clone", "--", url, path], NETWORK_TIMEOUT)
}



fn get_key(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    global: bool,
) -> String {
    let scoped = if global || repo_path.trim().is_empty() {
        runner.run(None, &["config", "--global", "--get", key])
    } else {
        match runner.repo_root(repo_path) {
            Ok(root) => runner.run(Some(&root), &["config", "--get", key]),
            Err(_) => return String::new(),
        }
    };
    scoped.map(|s| s.trim().to_string()).unwrap_or_default()
}

pub fn config_get(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    global: bool,
) -> Result<String, String> {
    Ok(get_key(runner, repo_path, key, global))
}

pub fn config_set(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    value: &str,
    global: bool,
) -> Result<String, String> {
    validate_config_key(key)?;
    validate_config_value(value)?;
    let scoped_global = global || repo_path.trim().is_empty();
    if value.trim().is_empty() {
        return unset_key(runner, repo_path, key, scoped_global);
    }
    if scoped_global {
        return runner.run(None, &["config", "--global", key, value]);
    }
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["config", key, value])
}

fn unset_key(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    global: bool,
) -> Result<String, String> {
    if global {
        return runner
            .run(None, &["config", "--global", "--unset", key])
            .map(|_| String::new());
    }
    let root = runner.repo_root(repo_path)?;
    runner
        .run(Some(&root), &["config", "--unset", key])
        .map(|_| String::new())
}

pub fn identity_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<crate::domain::Identity, String> {
    let mut name = get_key(runner, repo_path, "user.name", false);
    if name.is_empty() {
        name = get_key(runner, repo_path, "user.name", true);
    }
    let mut email = get_key(runner, repo_path, "user.email", false);
    if email.is_empty() {
        email = get_key(runner, repo_path, "user.email", true);
    }
    Ok(crate::domain::Identity { name, email })
}

#[tauri::command]
pub async fn git_version(state: State<'_, AppState>) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || version(runner.as_ref())).await
}

#[tauri::command]
pub async fn git_remote_url(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || remote_url(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_gpg(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || gpg(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_clone(
    state: State<'_, AppState>,
    url: String,
    path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || clone(runner.as_ref(), &url, &path)).await
}

#[tauri::command]
pub async fn git_config_get(
    state: State<'_, AppState>,
    repo_path: String,
    key: String,
    global: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || config_get(runner.as_ref(), &repo_path, &key, global)).await
}

#[tauri::command]
pub async fn git_config_set(
    state: State<'_, AppState>,
    repo_path: String,
    key: String,
    value: String,
    global: bool,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || config_set(runner.as_ref(), &repo_path, &key, &value, global)).await
}

#[tauri::command]
pub async fn git_identity(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<crate::domain::Identity, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || identity_of(runner.as_ref(), &repo_path)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn returns_empty_url_when_origin_is_not_configured() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);

        assert_eq!(remote_url(&runner, "/r").unwrap(), "");
    }
}
