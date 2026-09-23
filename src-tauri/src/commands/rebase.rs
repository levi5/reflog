use crate::commands::validation::validate_commit_oid;
use crate::domain::CommitInfo;
use crate::runner::GitRunner;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::State;

const MAX_REBASE_OUTPUT_BYTES: usize = 512 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RebaseAction {
    Pick,
    Squash,
    Fixup,
    Drop,
}

impl RebaseAction {
    fn todo_verb(self) -> &'static str {
        match self {
            RebaseAction::Pick => "pick",
            RebaseAction::Squash => "squash",
            RebaseAction::Fixup => "fixup",
            RebaseAction::Drop => "drop",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseOp {
    pub hash: String,
    pub action: RebaseAction,
}

pub fn rebase_commits(
    runner: &dyn GitRunner,
    repo_path: &str,
    onto: &str,
) -> Result<Vec<CommitInfo>, String> {
    validate_commit_oid(onto)?;
    let root = runner.repo_root(repo_path)?;
    let verify = format!("{onto}^{{commit}}");
    if runner
        .run(Some(&root), &["rev-parse", "--verify", &verify])
        .is_err()
    {
        return Err(format!("base inválida para rebase: {onto}"));
    }
    let range = format!("{onto}..HEAD");
    let out = runner.run_limited(
        Some(&root),
        &[
            "log",
            &range,
            "--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s",
            "--date=short",
        ],
        MAX_REBASE_OUTPUT_BYTES,
    )?;
    let mut commits = vec![];
    for line in out.lines() {
        let p: Vec<&str> = line.split('\u{1f}').collect();
        if p.len() < 5 {
            continue;
        }
        commits.push(CommitInfo {
            hash: p[0].to_string(),
            short: p[1].to_string(),
            author: p[2].to_string(),
            date: p[3].to_string(),
            message: p[4].to_string(),
            parents: vec![],
            refs: vec![],
        });
    }
    Ok(commits)
}

fn first_line(message: &str) -> String {
    message
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string()
}

fn build_todo(ops: &[RebaseOp], subjects: &std::collections::HashMap<String, String>) -> String {
    let mut todo = String::new();
    for op in ops {
        let subject = subjects.get(&op.hash).map(|s| s.as_str()).unwrap_or("");
        todo.push_str(&format!("{} {} {}\n", op.action.todo_verb(), op.hash, subject));
    }
    todo
}

#[cfg(unix)]
fn write_sequence_editor(todo_path: &std::path::Path) -> Result<std::path::PathBuf, String> {
    let script_path = todo_path.with_extension("sh");
    let script = format!("#!/bin/sh\ncat \"{}\" > \"$1\"\n", todo_path.to_string_lossy());
    std::fs::write(&script_path, script).map_err(|e| e.to_string())?;
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o700))
        .map_err(|e| e.to_string())?;
    Ok(script_path)
}

pub fn rebase_start(
    runner: &dyn GitRunner,
    repo_path: &str,
    onto: &str,
    ops: Vec<RebaseOp>,
) -> Result<String, String> {
    validate_commit_oid(onto)?;
    if ops.is_empty() {
        return Err("nenhum commit para o rebase".to_string());
    }
    let mut seen = HashSet::new();
    for op in &ops {
        validate_commit_oid(&op.hash)?;
        if !seen.insert(op.hash.clone()) {
            return Err("commit duplicado nas instruções".to_string());
        }
    }
    if ops.iter().all(|op| op.action == RebaseAction::Drop) {
        return Err("nada para aplicar: todos os commits seriam descartados".to_string());
    }

    let commits = rebase_commits(runner, repo_path, onto)?;
    let expected: HashSet<&str> = commits.iter().map(|c| c.hash.as_str()).collect();
    let given: HashSet<&str> = ops.iter().map(|op| op.hash.as_str()).collect();
    if expected != given {
        return Err("instruções divergem dos commits atuais; recarregue a lista".to_string());
    }
    let subjects: std::collections::HashMap<String, String> = commits
        .iter()
        .map(|c| (c.hash.clone(), first_line(&c.message)))
        .collect();

    let root = runner.repo_root(repo_path)?;
    let stem = format!(
        "reflog-rebase-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let todo_path = std::env::temp_dir().join(format!("{stem}.todo"));
    std::fs::write(&todo_path, build_todo(&ops, &subjects)).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    let script_path = write_sequence_editor(&todo_path)?;
    #[cfg(not(unix))]
    {
        let _ = std::fs::remove_file(&todo_path);
        return Err("rebase interativo não suportado nesta plataforma".to_string());
    }

    let editor = script_path.to_string_lossy().to_string();
    let result = runner.run_env(
        Some(&root),
        &["rebase", "-i", onto],
        &[("GIT_SEQUENCE_EDITOR", editor.as_str())],
    );
    let _ = std::fs::remove_file(&todo_path);
    let _ = std::fs::remove_file(&script_path);
    result
}

pub fn rebase_continue(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["rebase", "--continue"])
}

pub fn rebase_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["rebase", "--abort"])
}

#[tauri::command]
pub async fn git_rebase_commits(
    state: State<'_, AppState>,
    repo_path: String,
    onto: String,
) -> Result<Vec<CommitInfo>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || rebase_commits(runner.as_ref(), &repo_path, &onto)).await
}

#[tauri::command]
pub async fn git_rebase_start(
    state: State<'_, AppState>,
    repo_path: String,
    onto: String,
    ops: Vec<RebaseOp>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || rebase_start(runner.as_ref(), &repo_path, &onto, ops)).await
}

#[tauri::command]
pub async fn git_rebase_continue(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || rebase_continue(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_rebase_abort(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || rebase_abort(runner.as_ref(), &repo_path)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;
    use crate::runner::ProcessRunner;
    use std::collections::HashMap;
    use std::process::Command;

    fn mock() -> MockRunner {
        MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("rev-parse --verify main^{commit}", "aaa"),
                (
                    "log main..HEAD --pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s --date=short",
                    "ccc\x1fccc\x1fA\x1f2026-01-01\x1fthird\nbbb\x1fbbb\x1fA\x1f2026-01-01\x1fsecond",
                ),
            ],
            &[],
        )
    }

    fn op(hash: &str, action: RebaseAction) -> RebaseOp {
        RebaseOp {
            hash: hash.to_string(),
            action,
        }
    }

    #[test]
    fn lists_commits_in_onto_range() {
        let commits = rebase_commits(&mock(), "/r", "main").unwrap();
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].hash, "ccc");
    }

    #[test]
    fn rejects_invalid_onto_and_empty_ops() {
        assert!(rebase_commits(&mock(), "/r", "--hard").is_err());
        assert!(rebase_start(&mock(), "/r", "main", vec![]).is_err());
    }

    #[test]
    fn rejects_unknown_onto_with_friendly_error() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(rebase_start(&runner, "/r", "nope", vec![op("bbb", RebaseAction::Pick)]).is_err());
        assert_eq!(
            rebase_commits(&runner, "/r", "nope").unwrap_err(),
            "base inválida para rebase: nope"
        );
    }

    #[test]
    fn rejects_duplicate_all_drop_and_stale_ops() {
        assert!(rebase_start(&mock(), "/r", "main", vec![op("bbb", RebaseAction::Drop)]).is_err());
        assert!(
            rebase_start(
                &mock(),
                "/r",
                "main",
                vec![op("bbb", RebaseAction::Pick), op("bbb", RebaseAction::Pick)]
            )
            .is_err()
        );
        assert!(
            rebase_start(
                &mock(),
                "/r",
                "main",
                vec![op("bbb", RebaseAction::Pick), op("zzz", RebaseAction::Pick)]
            )
            .is_err()
        );
    }

    #[test]
    fn builds_todo_lines_with_subjects() {
        let subjects: HashMap<String, String> =
            [("bbb".to_string(), "second".to_string())].into_iter().collect();
        let todo = build_todo(&[op("bbb", RebaseAction::Squash)], &subjects);
        assert_eq!(todo, "squash bbb second\n");
    }

    fn git(dir: &str, args: &[&str]) {
        let out = Command::new("git")
            .current_dir(dir)
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .arg("-c")
            .arg("user.name=demo")
            .arg("-c")
            .arg("user.email=demo@demo")
            .arg("-c")
            .arg("init.defaultBranch=main")
            .arg("-c")
            .arg("commit.gpgsign=false")
            .args(args)
            .output()
            .expect("git binary missing");
        assert!(
            out.status.success(),
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&out.stderr)
        );
    }

    fn git_out(dir: &str, args: &[&str]) -> String {
        let out = Command::new("git")
            .current_dir(dir)
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("GIT_CONFIG_GLOBAL", "/dev/null")
            .args(args)
            .output()
            .expect("git binary missing");
        String::from_utf8_lossy(&out.stdout).to_string()
    }

    #[test]
    fn reorders_and_drops_commits_in_real_repo() {
        let base = std::env::temp_dir().join(format!(
            "reflog-rebase-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).unwrap();
        let dir = base.to_string_lossy().to_string();
        git(&dir, &["init"]);
        git(&dir, &["config", "user.name", "demo"]);
        git(&dir, &["config", "user.email", "demo@demo"]);
        for (name, file, content) in [
            ("base", "base.txt", "0\n"),
            ("one", "a.txt", "1\n"),
            ("two", "b.txt", "2\n"),
            ("three", "c.txt", "3\n"),
        ] {
            std::fs::write(base.join(file), content).unwrap();
            git(&dir, &["add", "."]);
            git(&dir, &["commit", "-m", name]);
        }

        let runner = ProcessRunner;
        let base_hash = git_out(&dir, &["rev-parse", "main~3"]).trim().to_string();
        let commits = rebase_commits(&runner, &dir, "main~3").unwrap();
        assert_eq!(commits.len(), 3);
        let hashes: HashMap<&str, &str> = commits
            .iter()
            .map(|c| {
                let subject = c.message.lines().next().unwrap_or("");
                (subject, c.hash.as_str())
            })
            .collect();

        let ops = vec![
            op(hashes["three"], RebaseAction::Pick),
            op(hashes["one"], RebaseAction::Pick),
            op(hashes["two"], RebaseAction::Drop),
        ];
        rebase_start(&runner, &dir, "main~3", ops).unwrap();

        let log = git_out(&dir, &["log", "--pretty=format:%s", &format!("{base_hash}..HEAD")]);
        let subjects: Vec<&str> = log.lines().collect();
        assert_eq!(subjects, vec!["one", "three"]);

        let _ = std::fs::remove_dir_all(&base);
    }
}
