use crate::runner::{GitRunner, NETWORK_TIMEOUT};

const MAX_CONSOLE_OUTPUT_BYTES: usize = 4 * 1024 * 1024;

const ALLOWED: &[&str] = &[
    "log",
    "status",
    "branch",
    "checkout",
    "switch",
    "merge",
    "commit",
    "tag",
    "fetch",
    "pull",
    "push",
    "show",
    "rev-parse",
    "diff",
    "stash",
    "reset",
    "rebase",
    "revert",
    "cherry-pick",
    "reflog",
    "submodule",
    "add",
];

const DENIED: &[&str] = &[
    "--hard",
    "--force",
    "--upload-pack",
    "--receive-pack",
    "--exec",
    "--output",
    "-c",
    "credential",
    "-i",
    "--interactive",
    "--config",
    "-C",
];

const CONSOLE_SAFE_FORCE: &str = "--force-with-lease";

const DENIED_PREFIXES: &[&str] = &[
    "--output",
    "--upload-pack",
    "--receive-pack",
    "--exec",
    "--config",
];

const DENIED_EXACT: &[&str] = &["-f", "-c", "-i", "-C"];

const SUBMODULE_ALLOWED: &[&str] = &["status", "summary", "sync", "update", "init", "foreach"];

const FOREACH_VERBS: &[&str] = &[
    "pull",
    "fetch",
    "status",
    "log",
    "diff",
    "checkout",
    "merge",
    "branch",
    "rev-parse",
    "show",
];

const FOREACH_FLAGS: &[&str] = &["--quiet", "--recursive"];

const PATCH_MODE_VERBS: &[&str] = &[
    "add", "checkout", "switch", "reset", "restore", "stash", "grep",
];

const PATCH_MODE_FLAGS: &[&str] = &["-p", "--patch"];

const NO_HANG_ENV: [(&str, &str); 3] = [
    ("GIT_EDITOR", "true"),
    ("GIT_PAGER", "cat"),
    ("GIT_TERMINAL_PROMPT", "0"),
];

fn split_shell_words(input: &str) -> Option<Vec<String>> {
    let mut out = vec![];
    let mut cur = String::new();
    let mut quote: Option<char> = None;
    let mut pushed = false;
    for char in input.chars() {
        if let Some(quote_char) = quote {
            if char == quote_char {
                quote = None;
            } else {
                cur.push(char);
            }
            continue;
        }
        if char == '"' || char == '\'' {
            quote = Some(char);
            pushed = true;
            continue;
        }
        if char.is_whitespace() {
            if !cur.is_empty() || pushed {
                out.push(std::mem::take(&mut cur));
                pushed = false;
            }
            continue;
        }
        cur.push(char);
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
    if token == CONSOLE_SAFE_FORCE {
        return true;
    }
    if token.is_empty()
        || DENIED.contains(&token)
        || DENIED_EXACT.contains(&token)
        || DENIED_PREFIXES
            .iter()
            .any(|prefix| token == *prefix || token.starts_with(&format!("{prefix}=")))
    {
        return false;
    }
    let stripped = token.strip_prefix('-').unwrap_or(token);
    let stripped = stripped.strip_prefix('-').unwrap_or(stripped);
    !stripped.is_empty()
        && stripped
            .chars()
            .all(|char| char.is_ascii_alphanumeric() || "-_./@:".contains(char))
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

pub fn run_git(runner: &dyn GitRunner, repo_path: &str, args: &[String]) -> Result<String, String> {
    crate::commands::validation::validate_repo_path(repo_path)?;
    if args.is_empty() {
        return Err("comando vazio".to_string());
    }
    if !ALLOWED.contains(&args[0].as_str()) {
        return Err(format!("comando não permitido: {}", args[0]));
    }
    for arg in args {
        if arg.contains('\n')
            || arg.contains('\0')
            || arg.contains(';')
            || arg.contains('|')
            || arg.contains('&')
            || arg.contains('`')
            || arg.contains('$')
            || (arg != CONSOLE_SAFE_FORCE
                && (DENIED.contains(&arg.as_str())
                    || DENIED_EXACT.contains(&arg.as_str())
                    || DENIED_PREFIXES
                        .iter()
                        .any(|prefix| arg == *prefix || arg.starts_with(&format!("{prefix}=")))))
        {
            return Err(format!("argumento não permitido: {arg}"));
        }
    }
    if args[0] == "commit"
        && !args
            .iter()
            .any(|arg| arg == "-m" || arg == "--allow-empty-message")
    {
        return Err("commit precisa de -m \"mensagem\"".to_string());
    }
    if args[0] == "tag"
        && args.iter().any(|arg| arg == "-a" || arg == "-s")
        && !args.iter().any(|arg| arg == "-m")
    {
        return Err("tag anotada precisa de -m \"mensagem\"".to_string());
    }
    if args[0] == "submodule" {
        validate_submodule(args)?;
    }
    if PATCH_MODE_VERBS.contains(&args[0].as_str())
        && args.iter().any(|a| PATCH_MODE_FLAGS.contains(&a.as_str()))
    {
        return Err(format!(
            "{} não aceita modo interativo (-p) no console: use a visão Staging",
            args[0]
        ));
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
        && args
            .iter()
            .any(|a| a == "pull" || a == "fetch" || a == "push");
    if is_submodule_foreach_network {
        runner.run_env_limited_with_timeout(
            Some(&root),
            &refs,
            &NO_HANG_ENV,
            NETWORK_TIMEOUT,
            MAX_CONSOLE_OUTPUT_BYTES,
        )
    } else {
        runner.run_env_limited(Some(&root), &refs, &NO_HANG_ENV, MAX_CONSOLE_OUTPUT_BYTES)
    }
}

git_command!(git_run, String, run_git, (repo_path: String, args: Vec<String>), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    fn runner() -> MockRunner {
        MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("log --oneline -5", "abc x"),
                ("log -p", "patch"),
                ("show --patch", "patch"),
                ("diff -p", "patch"),
                ("reset --soft HEAD~1", ""),
                ("add -A", ""),
                ("push --force-with-lease", "ok"),
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
        assert!(run_git(&r, "/r", &args(&["submodule", "foreach", "rm -rf /"])).is_err());
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

    #[test]
    fn blocks_interactive_patch_mode_with_a_clear_error() {
        let r = runner();
        for verb in ["add", "checkout", "reset", "stash"] {
            let err = run_git(&r, "/r", &args(&[verb, "-p"]))
                .expect_err("interactive patch mode must be refused");
            assert!(err.contains("Staging"), "unexpected error: {err}");
            assert!(run_git(&r, "/r", &args(&[verb, "--patch"])).is_err());
        }
    }

    #[test]
    fn keeps_patch_output_flags_for_read_only_verbs() {
        let r = runner();
        assert!(run_git(&r, "/r", &args(&["log", "-p"])).is_ok());
        assert!(run_git(&r, "/r", &args(&["show", "--patch"])).is_ok());
        assert!(run_git(&r, "/r", &args(&["diff", "-p"])).is_ok());
    }

    #[test]
    fn allows_force_with_lease_but_still_blocks_bare_force() {
        let r = runner();
        assert_eq!(
            run_git(&r, "/r", &args(&["push", "--force-with-lease"])).unwrap(),
            "ok"
        );
        assert!(run_git(&r, "/r", &args(&["push", "--force"])).is_err());
        assert!(run_git(&r, "/r", &args(&["reset", "--hard", "HEAD~1"])).is_err());
    }
}
