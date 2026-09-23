use crate::domain::SubmoduleInfo;
use crate::runner::{GitRunner, NETWORK_TIMEOUT};
use crate::AppState;
use std::collections::HashMap;
use tauri::State;

pub fn parse_submodule_status(out: &str) -> Vec<(String, String, String)> {
    let mut rows = vec![];
    for line in out.lines() {
        let bytes = line.as_bytes();
        if bytes.len() < 42 {
            continue;
        }
        let (Some(state), Some(hash), Some(rest)) = (
            bytes.get(0..1),
            bytes.get(1..41),
            bytes.get(41..),
        ) else {
            continue;
        };
        let (Ok(state), Ok(hash), Ok(rest)) = (
            std::str::from_utf8(state),
            std::str::from_utf8(hash),
            std::str::from_utf8(rest),
        ) else {
            continue;
        };
        let hash = hash.trim().to_string();
        let path = rest.trim().split_whitespace().next().unwrap_or("").to_string();
        if hash.is_empty() || path.is_empty() {
            continue;
        }
        rows.push((state.to_string(), hash, path));
    }
    rows
}

pub fn parse_config_paths(out: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for line in out.lines() {
        let mut parts = line.splitn(2, ' ');
        let key = parts.next().unwrap_or("");
        let path = parts.next().unwrap_or("").trim().to_string();
        if let Some(name) = key
            .strip_prefix("submodule.")
            .and_then(|s| s.strip_suffix(".path"))
        {
            if !path.is_empty() {
                map.insert(path, name.to_string());
            }
        }
    }
    map
}

fn config_value(
    runner: &dyn GitRunner,
    root: &str,
    key: &str,
) -> String {
    runner
        .run(Some(root), &["config", "-f", ".gitmodules", "--get", key])
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

pub fn submodule_list(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<Vec<SubmoduleInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["submodule", "status"])?;
    let config_out = runner
        .run(
            Some(&root),
            &["config", "-f", ".gitmodules", "--get-regexp", "^submodule\\..*\\.path$"],
        )
        .unwrap_or_default();
    let names = parse_config_paths(&config_out);
    let mut list = vec![];
    for (state, hash, path) in parse_submodule_status(&out) {
        let name = names.get(&path).cloned().unwrap_or_else(|| path.clone());
        let url = config_value(runner, &root, &format!("submodule.{name}.url"));
        let branch =
            config_value(runner, &root, &format!("submodule.{name}.branch"));
        list.push(SubmoduleInfo {
            name,
            path,
            url,
            branch,
            hash,
            state,
        });
    }
    Ok(list)
}

pub fn submodule_update(
    runner: &dyn GitRunner,
    repo_path: &str,
    submodule_path: Option<String>,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match submodule_path {
        Some(p) if !p.trim().is_empty() => {
            crate::commands::validation::validate_repo_relative_path(p.trim())?;
            let owned = p.trim().to_string();
            runner.run_with_timeout(
                Some(&root),
                &["submodule", "update", "--init", "--recursive", "--progress", "--", &owned],
                NETWORK_TIMEOUT,
            )
        }
        _ => {
            runner.run_with_timeout(
                Some(&root),
                &["submodule", "update", "--init", "--recursive", "--jobs", "4", "--progress"],
                NETWORK_TIMEOUT,
            )
        }
    }
}


#[tauri::command]
pub async fn git_submodule_list(
    state: State<'_, AppState>,
    repo_path: String,
) -> Result<Vec<SubmoduleInfo>, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || submodule_list(runner.as_ref(), &repo_path)).await
}

#[tauri::command]
pub async fn git_submodule_update(
    state: State<'_, AppState>,
    repo_path: String,
    submodule_path: Option<String>,
) -> Result<String, String> {
    let runner = state.runner.clone();
    crate::commands::run_blocking(move || submodule_update(runner.as_ref(), &repo_path, submodule_path)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_status_flags_paths_and_hashes() {
        let rows = parse_submodule_status(
            " 1111111111111111111111111111111111111111 libs/a\n-2222222222222222222222222222222222222222 libs/b\n+3333333333333333333333333333333333333333 libs/c\nU4444444444444444444444444444444444444444 libs/d",
        );
        assert_eq!(rows.len(), 4);
        assert_eq!(rows[0].0, " ");
        assert_eq!(rows[1].0, "-");
        assert_eq!(rows[2].0, "+");
        assert_eq!(rows[3].0, "U");
        assert_eq!(rows[0].2, "libs/a");
    }

    #[test]
    fn maps_config_paths_to_names() {
        let map = parse_config_paths(
            "submodule.libs/a.path libs/a\nsubmodule.other.path libs/b",
        );
        assert_eq!(map.get("libs/a").unwrap(), "libs/a");
        assert_eq!(map.get("libs/b").unwrap(), "other");
    }

    #[test]
    fn lists_with_url_and_branch() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "submodule status",
                    " 1111111111111111111111111111111111111111 libs/a",
                ),
                (
                    "config -f .gitmodules --get-regexp ^submodule\\..*\\.path$",
                    "submodule.libs/a.path libs/a",
                ),
                (
                    "config -f .gitmodules --get submodule.libs/a.url",
                    "https://x/y.git",
                ),
                ("config -f .gitmodules --get submodule.libs/a.branch", "main"),
            ],
            &[],
        );
        let list = submodule_list(&runner, "/r").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "libs/a");
        assert_eq!(list[0].url, "https://x/y.git");
        assert_eq!(list[0].branch, "main");
        assert_eq!(list[0].state, " ");
    }

    mod demo {
        use crate::commands::playground::run_git;
        use super::*;
        use crate::runner::ProcessRunner;
        use std::process::Command;

        fn git(dir: &str, args: &[&str]) -> String {
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
                .arg("protocol.file.allow=always")
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
            String::from_utf8_lossy(&out.stdout).to_string()
        }

        fn fixture() -> (String, String) {
            let base = std::env::temp_dir().join(format!(
                "reflog-demo-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let _ = std::fs::remove_dir_all(&base);
            let lib = base.join("lib");
            let sup = base.join("super");
            std::fs::create_dir_all(&lib).unwrap();
            std::fs::create_dir_all(&sup).unwrap();
            let lib_s = lib.to_string_lossy().to_string();
            let sup_s = sup.to_string_lossy().to_string();
            git(&lib_s, &["init"]);
            std::fs::write(lib.join("lib.txt"), "v1\n").unwrap();
            git(&lib_s, &["add", "."]);
            git(&lib_s, &["commit", "-m", "lib init"]);
            git(&sup_s, &["init"]);
            std::fs::write(sup.join("app.txt"), "app\n").unwrap();
            git(&sup_s, &["add", "."]);
            git(&sup_s, &["commit", "-m", "super init"]);
            git(&sup_s, &["submodule", "add", &lib_s, "libs/lib"]);
            git(&sup_s, &["commit", "-m", "add lib"]);
            (sup_s, lib_s)
        }

        fn s(v: &[&str]) -> Vec<String> {
            v.iter().map(|s| s.to_string()).collect()
        }

        #[test]
        fn demo_conditional_automation_on_real_repos() {
            let (sup, _lib) = fixture();
            let runner = ProcessRunner;

            let list = submodule_list(&runner, &sup).unwrap();
            assert_eq!(list.len(), 1);
            assert_eq!(list[0].path, "libs/lib");
            assert_eq!(list[0].state, " ");

            let head = git(&sup, &["rev-parse", "--short", "HEAD"]);
            let out = run_git(&runner, &sup, &s(&["log", "--oneline", "-1"]))
                .unwrap();
            assert!(out.contains(head.trim()));

            let branch = run_git(
                &runner,
                &sup,
                &s(&["rev-parse", "--verify", "--quiet", "refs/heads/main"]),
            );
            assert!(branch.is_ok());

            let missing = run_git(
                &runner,
                &sup,
                &s(&["rev-parse", "--verify", "--quiet", "refs/heads/release"]),
            );
            assert!(missing.is_err());

            let clean = run_git(&runner, &sup, &s(&["status", "--porcelain"])).unwrap();
            assert!(clean.trim().is_empty());

            let pulled = run_git(
                &runner,
                &sup,
                &s(&["submodule", "foreach", "git rev-parse --short HEAD"]),
            )
            .unwrap();
            assert!(pulled.contains("Entering 'libs/lib'"));
            assert!(pulled.split_whitespace().any(|w| w.len() == 7 && w.chars().all(|c| c.is_ascii_hexdigit())));

            let blocked = run_git(
                &runner,
                &sup,
                &s(&["submodule", "foreach", "git push --force"]),
            );
            assert!(blocked.is_err());
        }
    }
}
