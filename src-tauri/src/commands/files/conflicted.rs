use crate::domain::{parse_conflict_text, ConflictBlock, ConflictFile};
use crate::runner::GitRunner;
use crate::AppState;
use std::path::Path;
use tauri::State;

fn is_safe_repo_path(file: &str) -> bool {
    if file.is_empty()
        || file.starts_with('/')
        || file.contains("..")
        || file.contains('\0')
    {
        return false;
    }
    true
}

pub fn conflicted_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<Vec<ConflictFile>, String> {
    let root = runner.repo_root(repo_path)?;
    let canonical_root = std::fs::canonicalize(&root).map_err(|e| e.to_string())?;
    let out = runner.run(Some(&root), &["diff", "--name-only", "--diff-filter=U"])?;
    let mut files = vec![];
    for line in out.lines() {
        let rel = line.trim();
        if rel.is_empty() || !is_safe_repo_path(rel) {
            continue;
        }
        let full = Path::new(&root).join(rel);
        let canonical_target = std::fs::canonicalize(&full).map_err(|e| e.to_string())?;
        if !canonical_target.starts_with(&canonical_root) {
            continue;
        }
        let content = runner
            .read_file(&full)
            .map_err(|e| format!("erro ao ler {rel}: {e}"))?;
        let conflicts = parse_conflict_text(&content);
        files.push(ConflictFile {
            path: rel.to_string(),
            abs_path: full.to_string_lossy().to_string(),
            content,
            conflicts,
        });
    }
    Ok(files)
}

#[tauri::command]
pub fn get_conflicted_files(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<ConflictFile>, String> {
    conflicted_of(state.runner.as_ref(), &repo_path)
}

#[tauri::command]
pub fn parse_conflicts(content: String) -> Vec<ConflictBlock> {
    parse_conflict_text(&content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn lists_conflicted_files_with_parsed_hunks() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().to_string_lossy().to_string();
        let file = temp.path().join("ola.txt").to_string_lossy().to_string();
        std::fs::write(&file, "").unwrap();
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", &root),
                ("diff --name-only --diff-filter=U", "ola.txt\n"),
            ],
            &[(
                file.as_str(),
                "<<<<<<< HEAD\nteste b\n=======\nteste a\n>>>>>>> master\n",
            )],
        );
        let files = conflicted_of(&runner, &root).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "ola.txt");
        assert_eq!(files[0].conflicts.len(), 1);
        assert_eq!(files[0].conflicts[0].incoming_label, "master");
    }
}
