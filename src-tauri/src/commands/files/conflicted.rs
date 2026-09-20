use crate::domain::{parse_conflict_text, ConflictBlock, ConflictFile};
use crate::runner::GitRunner;
use crate::AppState;
use std::path::Path;
use tauri::State;

pub fn conflicted_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<Vec<ConflictFile>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["diff", "--name-only", "--diff-filter=U"])?;
    let mut files = vec![];
    for line in out.lines() {
        let rel = line.trim();
        if rel.is_empty() {
            continue;
        }
        let full = Path::new(&root).join(rel);
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
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("diff --name-only --diff-filter=U", "ola.txt\n"),
            ],
            &[(
                "/r/ola.txt",
                "<<<<<<< HEAD\nteste b\n=======\nteste a\n>>>>>>> master\n",
            )],
        );
        let files = conflicted_of(&runner, "/r").unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "ola.txt");
        assert_eq!(files[0].conflicts.len(), 1);
        assert_eq!(files[0].conflicts[0].incoming_label, "master");
    }
}
