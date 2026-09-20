use crate::runner::GitRunner;
use crate::AppState;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

pub fn content_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    let full: PathBuf = Path::new(&root).join(file);
    runner
        .read_file(&full)
        .map_err(|e| format!("erro ao ler {file}: {e}"))
}

pub fn save_content(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    content: &str,
) -> Result<(), String> {
    let root = runner.repo_root(repo_path)?;
    let full: PathBuf = Path::new(&root).join(file);
    runner
        .write_file(&full, content)
        .map_err(|e| format!("erro ao salvar {file}: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("erro ao salvar arquivo: {e}"))
}

#[tauri::command]
pub fn get_file_content(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
) -> Result<String, String> {
    content_of(state.runner.as_ref(), &repo_path, &file)
}

#[tauri::command]
pub fn save_file_content(
    state: State<'_, AppState>,
    repo_path: String,
    file: String,
    content: String,
) -> Result<(), String> {
    save_content(state.runner.as_ref(), &repo_path, &file, &content)
}
