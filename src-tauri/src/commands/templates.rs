use crate::runner::GitRunner;
use crate::AppState;
use tauri::State;

const DEFAULT_TEMPLATE_FOLDER: &str = ".reflog/templates";

fn clean_folder(folder: &str) -> Option<String> {
    let cleaned = folder.trim().trim_end_matches('/').to_string();
    if cleaned.is_empty()
        || cleaned.starts_with('/')
        || cleaned.contains('\\')
        || cleaned
            .split('/')
            .any(|segment| segment.is_empty() || segment == "..")
    {
        return None;
    }
    Some(cleaned)
}

fn resolve_template_dir(
    runner: &dyn GitRunner,
    repo_path: &str,
    folder: &str,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    let relative = match folder.trim() {
        "" => DEFAULT_TEMPLATE_FOLDER.to_string(),
        value => clean_folder(value).ok_or_else(|| "pasta de template inválida".to_string())?,
    };
    Ok(format!("{root}/{relative}"))
}

fn check_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() || name.contains("..") || name.contains('/') || name.contains('\\') {
        return Err("nome de template inválido".to_string());
    }
    if !name.ends_with(".md") {
        return Err("template precisa terminar com .md".to_string());
    }
    Ok(())
}

pub fn template_list(
    runner: &dyn GitRunner,
    repo_path: &str,
    folder: &str,
) -> Result<Vec<String>, String> {
    let dir = resolve_template_dir(runner, repo_path, folder)?;
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(vec![]),
    };
    let mut names = vec![];
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            names.push(name.to_string());
        }
    }
    names.sort();
    Ok(names)
}

pub fn template_read(
    runner: &dyn GitRunner,
    repo_path: &str,
    folder: &str,
    name: &str,
) -> Result<String, String> {
    check_name(name)?;
    let dir = resolve_template_dir(runner, repo_path, folder)?;
    std::fs::read_to_string(format!("{dir}/{name}")).map_err(|e| e.to_string())
}

pub fn template_write(
    runner: &dyn GitRunner,
    repo_path: &str,
    folder: &str,
    name: &str,
    content: &str,
) -> Result<String, String> {
    check_name(name)?;
    let dir = resolve_template_dir(runner, repo_path, folder)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(format!("{dir}/{name}"), content).map_err(|e| e.to_string())?;
    Ok(String::new())
}

pub fn template_delete(
    runner: &dyn GitRunner,
    repo_path: &str,
    folder: &str,
    name: &str,
) -> Result<String, String> {
    check_name(name)?;
    let dir = resolve_template_dir(runner, repo_path, folder)?;
    std::fs::remove_file(format!("{dir}/{name}")).map_err(|e| e.to_string())?;
    Ok(String::new())
}

#[tauri::command]
pub fn git_template_list(
    state: State<'_, AppState>,
    repo_path: String,
    folder: String,
) -> Result<Vec<String>, String> {
    template_list(state.runner.as_ref(), &repo_path, &folder)
}

#[tauri::command]
pub fn git_template_read(
    state: State<'_, AppState>,
    repo_path: String,
    folder: String,
    name: String,
) -> Result<String, String> {
    template_read(state.runner.as_ref(), &repo_path, &folder, &name)
}

#[tauri::command]
pub fn git_template_write(
    state: State<'_, AppState>,
    repo_path: String,
    folder: String,
    name: String,
    content: String,
) -> Result<String, String> {
    template_write(state.runner.as_ref(), &repo_path, &folder, &name, &content)
}

#[tauri::command]
pub fn git_template_delete(
    state: State<'_, AppState>,
    repo_path: String,
    folder: String,
    name: String,
) -> Result<String, String> {
    template_delete(state.runner.as_ref(), &repo_path, &folder, &name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    fn runner_for(dir: &str) -> MockRunner {
        MockRunner::new(&[("rev-parse --show-toplevel", dir)], &[])
    }

    fn tempdir() -> String {
        let dir = std::env::temp_dir().join(format!(
            "reflog-tpl-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir.to_string_lossy().to_string()
    }

    #[test]
    fn writes_lists_and_reads_templates() {
        let dir = tempdir();
        let runner = runner_for(&dir);
        assert_eq!(
            template_list(&runner, &dir, DEFAULT_TEMPLATE_FOLDER).unwrap(),
            Vec::<String>::new()
        );
        template_write(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "jira.md", "# hi").unwrap();
        assert_eq!(
            template_list(&runner, &dir, DEFAULT_TEMPLATE_FOLDER).unwrap(),
            vec!["jira.md"]
        );
        assert_eq!(
            template_read(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "jira.md").unwrap(),
            "# hi"
        );
    }

    #[test]
    fn rejects_path_traversal() {
        let dir = tempdir();
        let runner = runner_for(&dir);
        assert!(template_read(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "../x.md").is_err());
        assert!(template_write(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "x.txt", "x").is_err());
    }

    #[test]
    fn deletes_template() {
        let dir = tempdir();
        let runner = runner_for(&dir);
        template_write(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "del.md", "# hi").unwrap();
        template_delete(&runner, &dir, DEFAULT_TEMPLATE_FOLDER, "del.md").unwrap();
        assert_eq!(
            template_list(&runner, &dir, DEFAULT_TEMPLATE_FOLDER).unwrap(),
            Vec::<String>::new()
        );
    }

    #[test]
    fn custom_folder_stores_templates_and_rejects_traversal() {
        let dir = tempdir();
        let runner = runner_for(&dir);
        let folder = "docs/templates";
        assert_eq!(template_list(&runner, &dir, folder).unwrap(), Vec::<String>::new());
        template_write(&runner, &dir, folder, "api.md", "# api").unwrap();
        assert_eq!(template_list(&runner, &dir, folder).unwrap(), vec!["api.md"]);
        assert_eq!(template_read(&runner, &dir, folder, "api.md").unwrap(), "# api");
        assert!(template_write(&runner, &dir, "../escape", "api.md", "x").is_err());
        assert!(template_write(&runner, &dir, "/abs", "api.md", "x").is_err());
        assert!(template_write(&runner, &dir, "a\\\\b", "api.md", "x").is_err());
    }
}
