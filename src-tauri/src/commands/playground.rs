use crate::runner::{GitRunner, NETWORK_TIMEOUT};
use crate::AppState;
use tauri::State;

const ALLOWED: &[&str] = &[
    "log", "status", "branch", "checkout", "switch", "merge", "commit", "tag",
    "fetch", "pull", "push", "show", "rev-parse", "diff", "stash", "reset",
    "rebase", "revert", "cherry-pick", "reflog", "submodule", "add",
];

const DENIED: &[&str] = &[
    "--hard", "--force", "--force-with-lease", "--upload-pack", "--receive-pack", "--exec",
    "--output", "-c", "credential", "-i", "--interactive", "--config", "-C",
];

const DENIED_PREFIXES: &[&str] = &[
    "--output", "--upload-pack", "--receive-pack", "--exec", "--config",
];

const DENIED_EXACT: &[&str] = &["-f", "-c", "-i", "-C"];

const SUBMODULE_ALLOWED: &[&str] =
    &["status", "summary", "sync", "update", "init", "foreach"];

const FOREACH_VERBS: &[&str] = &[
    "pull", "fetch", "status", "log", "diff", "checkout", "merge", "branch",
    "rev-parse", "show",
];

const FOREACH_FLAGS: &[&str] = &["--quiet", "--recursive"];

const NO_HANG_ENV: [(&str, &str); 3] = [
    ("GIT_EDITOR", "true"),
    ("GIT_PAGER", "cat"),
    ("GIT_TERMINAL_PROMPT", "0"),
];

fn split_shell_words(s: &str) -> Option<Vec<String>> {
    let mut out = vec![];
    let mut cur = String::new();
    let mut quote: Option<char> = None;
    let mut pushed = false;
    for ch in s.chars() {
        if let Some(q) = quote {
            if ch == q {
                quote = None;
            } else {
                cur.push(ch);
            }
            continue;
        }
        if ch == '"' || ch == '\'' {
            quote = Some(ch);
            pushed = true;
            continue;
        }
        if ch.is_whitespace() {
            if !cur.is_empty() || pushed {
                out.push(std::mem::take(&mut cur));
                pushed = false;
            }
            continue;
        }
        cur.push(ch);
    }
    if quote.is_some() {
        return None;
    }
    if !cur.is_empty() || pushed {
        out.push(cur);
    }
    Some(out)
}

fn safe_token(token: &str) -> bool {
    if token.is_empty()
        || DENIED.contains(&token)
        || DENIED_EXACT.contains(&token)
        || DENIED_PREFIXES.iter().any(|p| token == *p || token.starts_with(&format!("{p}=")))
    {
        return false;
    }
    let stripped = token.strip_prefix('-').unwrap_or(token);
    let stripped = stripped.strip_prefix('-').unwrap_or(stripped);
    !stripped.is_empty()
        && stripped
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_./@:".contains(c))
}

fn validate_submodule_foreach(args: &[String]) -> Result<(), String> {
    let mut idx = 1;
    while idx < args.len() && args[idx].starts_with("--") {
        if !FOREACH_FLAGS.contains(&args[idx].as_str()) {
            return Err(format!("flag não permitida: {}", args[idx]));
        }
        idx += 1;
    }
    if idx >= args.len() || args[idx] != "foreach" {
        return Err("submódulo precisa de subcomando".to_string());
    }
    idx += 1;
    while idx < args.len() && args[idx].starts_with("--") {
        if !FOREACH_FLAGS.contains(&args[idx].as_str()) {
            return Err(format!("flag não permitida: {}", args[idx]));
        }
        idx += 1;
    }
    if idx + 1 != args.len() {
        return Err("foreach precisa de um único comando entre aspas".to_string());
    }
    let inner = split_shell_words(&args[idx])
        .ok_or_else(|| "aspas desbalanceadas no comando interno".to_string())?;
    if inner.is_empty() || inner[0] != "git" {
        return Err("comando interno precisa começar com git".to_string());
    }
    if inner.len() < 2 || !FOREACH_VERBS.contains(&inner[1].as_str()) {
        return Err(format!(
            "verbo interno não permitido: {}",
            inner.get(1).cloned().unwrap_or_default()
        ));
    }
    for token in inner.iter().skip(2) {
        if !safe_token(token) {
            return Err(format!("argumento interno não permitido: {token}"));
        }
    }
    Ok(())
}

fn validate_submodule(args: &[String]) -> Result<(), String> {
    let mut idx = 1;
    while idx < args.len() && args[idx].starts_with("--") {
        if !FOREACH_FLAGS.contains(&args[idx].as_str()) {
            return Err(format!("flag não permitida: {}", args[idx]));
        }
        idx += 1;
    }
    if idx >= args.len() {
        return Err("submódulo precisa de subcomando".to_string());
    }
    if !SUBMODULE_ALLOWED.contains(&args[idx].as_str()) {
        return Err(format!("subcomando não permitido: {}", args[idx]));
    }
    if args[idx] == "foreach" {
        return validate_submodule_foreach(args);
    }
    Ok(())
}

pub fn run_git(
    runner: &dyn GitRunner,
    repo_path: &str,
    args: &[String],
) -> Result<String, String> {
    crate::commands::validation::validate_repo_path(repo_path)?;
    if args.is_empty() {
        return Err("comando vazio".to_string());
    }
    if !ALLOWED.contains(&args[0].as_str()) {
        return Err(format!("comando não permitido: {}", args[0]));
    }
    for a in args {
        if a.contains('\n')
            || a.contains('\0')
            || a.contains(';')
            || a.contains('|')
            || a.contains('&')
            || a.contains('`')
            || a.contains('$')
            || DENIED.contains(&a.as_str())
            || DENIED_EXACT.contains(&a.as_str())
            || DENIED_PREFIXES.iter().any(|p| a == *p || a.starts_with(&format!("{p}=")))
        {
            return Err(format!("argumento não permitido: {a}"));
        }
    }
    if args[0] == "commit"
        && !args.iter().any(|a| a == "-m" || a == "--allow-empty-message")
    {
        return Err("commit precisa de -m \"mensagem\"".to_string());
    }
    if args[0] == "tag"
        && args.iter().any(|a| a == "-a" || a == "-s")
        && !args.iter().any(|a| a == "-m")
    {
        return Err("tag anotada precisa de -m \"mensagem\"".to_string());
    }
    if args[0] == "submodule" {
        validate_submodule(args)?;
    }
    if args[0] == "branch" && args.iter().any(|a| a == "-D" || a == "--delete") {
        let has_branch_name = args.iter().skip(1).any(|a| !a.starts_with("-"));
        if !has_branch_name {
            return Err("branch -D precisa de um nome de branch".to_string());
        }
    }
    let root = runner.repo_root(repo_path)?;
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    let is_submodule_foreach_network = args[0] == "submodule"
        && args.iter().any(|a| a == "foreach")
        && args.iter().any(|a| a == "pull" || a == "fetch" || a == "push");
    if is_submodule_foreach_network {
        runner.run_env_with_timeout(Some(&root), &refs, &NO_HANG_ENV, NETWORK_TIMEOUT)
    } else {
        runner.run_env(Some(&root), &refs, &NO_HANG_ENV)
    }
}

#[tauri::command]
pub async fn git_run(
    state: State<'_, AppState>,
    repo_path: String,
    args: Vec<String>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    tauri::async_runtime::spawn_blocking(move || run_git(runner.as_ref(), &repo_path, &args))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    fn runner() -> MockRunner {
        MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("log --oneline -5", "abc x"),
                ("reset --soft HEAD~1", ""),
                ("add -A", ""),
            ],
            &[],
        )
    }

    fn args(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn allows_listed_commands() {
        let out = run_git(&runner(), "/r", &args(&["log", "--oneline", "-5"])).unwrap();
        assert_eq!(out, "abc x");
    }

    #[test]
    fn allows_add_for_staging() {
        let r = runner();
        assert!(run_git(&r, "/r", &args(&["add", "-A"])).is_ok());
    }

    #[test]
    fn blocks_unknown_and_dangerous_args() {
        let r = runner();
        assert!(run_git(&r, "/r", &args(&["reset", "--hard"])).is_err());
        assert!(run_git(&r, "/r", &args(&["push", "--force"])).is_err());
        assert!(run_git(&r, "/r", &args(&["log", "--oneline;rm"])).is_err());
        assert!(run_git(&r, "/r", &[]).is_err());
    }

    #[test]
    fn blocks_editor_hangs_and_allows_soft_reset() {
        let r = runner();
        assert!(run_git(&r, "/r", &args(&["commit"])).is_err());
        assert!(run_git(&r, "/r", &args(&["tag", "-a", "v1"])).is_err());
        assert!(run_git(&r, "/r", &args(&["rebase", "-i", "main"])).is_err());
        assert!(run_git(&r, "/r", &args(&["reset", "--soft", "HEAD~1"])).is_ok());
    }

    #[test]
    fn allows_foreach_pull_and_blocks_abuse() {
        let r = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("submodule foreach git pull origin master", "ok"),
                ("submodule status", ""),
            ],
            &[],
        );
        assert!(run_git(
            &r,
            "/r",
            &args(&["submodule", "foreach", "git pull origin master"])
        )
        .is_ok());
        assert!(run_git(
            &r,
            "/r",
            &args(&["submodule", "foreach", "rm -rf /"])
        )
        .is_err());
        assert!(run_git(
            &r,
            "/r",
            &args(&["submodule", "foreach", "git push --force"])
        )
        .is_err());
        assert!(run_git(&r, "/r", &args(&["submodule", "add", "x"])).is_err());
        assert!(run_git(
            &r,
            "/r",
            &args(&["submodule", "foreach", "git pull origin master; rm"])
        )
        .is_err());
        assert!(run_git(&r, "/r", &args(&["submodule", "status"])).is_ok());
    }
}
