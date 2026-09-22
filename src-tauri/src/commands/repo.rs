use crate::runner::GitRunner;
use crate::{AppState, CliPath};
use tauri::State;

pub fn check(runner: &dyn GitRunner, path: &str) -> bool {
    runner.is_repo(path)
}

pub fn root_of(runner: &dyn GitRunner, path: &str) -> Result<String, String> {
    runner.repo_root(path)
}

pub fn init(runner: &dyn GitRunner, path: &str) -> Result<String, String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("escolha uma pasta para inicializar".to_string());
    }
    runner.run(None, &["init", "--", path])
}

#[tauri::command]
pub async fn check_repo(state: State<'_, AppState>, path: String) -> Result<bool, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || Ok(check(runner.as_ref(), &path))).await
}

#[tauri::command]
pub async fn repo_root(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || root_of(runner.as_ref(), &path)).await
}

#[tauri::command]
pub async fn init_repo(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || init(runner.as_ref(), &path)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn initializes_selected_directory() {
        let runner = MockRunner::new(&[("init -- /workspace/new-repo", "Initialized empty Git repository")], &[]);
        assert!(init(&runner, "/workspace/new-repo").is_ok());
    }
}

#[tauri::command]
pub fn take_cli_path(state: State<'_, CliPath>) -> Option<String> {
    state.0.lock().ok()?.take()
}
