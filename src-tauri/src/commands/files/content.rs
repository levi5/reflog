use crate::commands::validation::validate_repo_relative_path;
use crate::runner::GitRunner;
use crate::AppState;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

fn is_safe_repo_path(file: &str) -> bool {
    validate_repo_relative_path(file).is_ok()
}

fn resolve_repo_file(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<PathBuf, String> {
    if !is_safe_repo_path(file) {
        return Err("caminho do arquivo inválido".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    let canonical_root = fs::canonicalize(&root).map_err(|e| e.to_string())?;
    let full = Path::new(&root).join(file);
    let canonical_target = fs::canonicalize(&full).map_err(|e| e.to_string())?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err("caminho fora do repositório".to_string());
    }
    Ok(canonical_target)
}

fn resolve_repo_file_write(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
) -> Result<PathBuf, String> {
    if !is_safe_repo_path(file) {
        return Err("caminho do arquivo inválido".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    let canonical_root = fs::canonicalize(&root).map_err(|e| e.to_string())?;
    let full = Path::new(&root).join(file);
    if full.exists() {
        let canonical_target = fs::canonicalize(&full).map_err(|e| e.to_string())?;
        if !canonical_target.starts_with(&canonical_root) {
            return Err("caminho fora do repositório".to_string());
        }
    } else if let Some(parent) = full.parent() {
        let canonical_parent = fs::canonicalize(parent).map_err(|e| e.to_string())?;
        if !canonical_parent.starts_with(&canonical_root) {
            return Err("caminho fora do repositório".to_string());
        }
    }
    Ok(full)
}

pub fn content_of(runner: &dyn GitRunner, repo_path: &str, file: &str) -> Result<String, String> {
    let target = resolve_repo_file(runner, repo_path, file)?;
    runner
        .read_file(&target)
        .map_err(|e| format!("erro ao ler {file}: {e}"))
}

pub fn save_content(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    content: &str,
) -> Result<(), String> {
    let target = resolve_repo_file_write(runner, repo_path, file)?;
    runner
        .write_file(&target, content)
        .map_err(|e| format!("erro ao salvar {file}: {e}"))?;
    Ok(())
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
