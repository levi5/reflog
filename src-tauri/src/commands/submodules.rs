use crate::domain::SubmoduleInfo;
use crate::runner::{GitRunner, NETWORK_TIMEOUT};
use std::collections::HashMap;

pub fn parse_submodule_status(out: &str) -> Vec<(String, String, String)> {
    let mut rows = vec![];
    for line in out.lines() {
        let bytes = line.as_bytes();
        if bytes.len() < 42 {
            continue;
        }
        let (Some(state), Some(hash), Some(rest)) =
            (bytes.get(0..1), bytes.get(1..41), bytes.get(41..))
        else {
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
        let path = rest
            .trim()
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_string();
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

fn config_value(runner: &dyn GitRunner, root: &str, key: &str) -> String {
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
            &[
                "config",
                "-f",
                ".gitmodules",
                "--get-regexp",
                "^submodule\\..*\\.path$",
            ],
        )
        .unwrap_or_default();
    let names = parse_config_paths(&config_out);
    let mut list = vec![];
    for (state, hash, path) in parse_submodule_status(&out) {
        let name = names.get(&path).cloned().unwrap_or_else(|| path.clone());
        let url = config_value(runner, &root, &format!("submodule.{name}.url"));
        let branch = config_value(runner, &root, &format!("submodule.{name}.branch"));
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
                &[
                    "submodule",
                    "update",
                    "--init",
                    "--recursive",
                    "--progress",
                    "--",
                    &owned,
                ],
                NETWORK_TIMEOUT,
            )
        }
        _ => runner.run_with_timeout(
            Some(&root),
            &[
                "submodule",
                "update",
                "--init",
                "--recursive",
                "--jobs",
                "4",
                "--progress",
            ],
            NETWORK_TIMEOUT,
        ),
    }
}

pub fn superproject_chain(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<String>, String> {
    let superproject_args = ["rev-parse", "--show-superproject-working-tree"];
    let root = runner.repo_root(repo_path)?;
    let mut chain = vec![root.clone()];
    let mut cursor = root;
    while let Ok(parent) = runner.run(Some(&cursor), &superproject_args) {
        let parent = parent.trim().to_string();
        if parent.is_empty() || chain.contains(&parent) {
            break;
        }
        chain.push(parent.clone());
        cursor = parent;
    }
    chain.reverse();
    Ok(chain)
}

git_command!(git_submodule_list, Vec<SubmoduleInfo>, submodule_list, (repo_path: String), ());

git_command!(git_submodule_update, String, submodule_update, (repo_path: String), (submodule_path: Option<String>));

git_command!(git_superproject_chain, Vec<String>, superproject_chain, (repo_path: String), ());

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
        let map = parse_config_paths("submodule.libs/a.path libs/a\nsubmodule.other.path libs/b");
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
                (
                    "config -f .gitmodules --get submodule.libs/a.branch",
                    "main",
                ),
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

    #[test]
    fn chain_is_only_the_root_when_not_a_submodule() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);

        assert_eq!(superproject_chain(&runner, "/r").unwrap(), vec!["/r"]);
    }

    #[test]
    fn chain_starts_at_the_outermost_superproject() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("rev-parse --show-superproject-working-tree", "/super"),
            ],
            &[],
        );

        assert_eq!(
            superproject_chain(&runner, "/r").unwrap(),
            vec!["/super", "/r"]
        );
    }

    mod demo {
        use super::*;
        use crate::commands::playground::run_git;
        use crate::runner::ProcessRunner;
        use crate::test_support::git;

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

        fn owned(values: &[&str]) -> Vec<String> {
            values.iter().map(|value| value.to_string()).collect()
        }

        fn canonical(path: &str) -> String {
            std::fs::canonicalize(path)
                .unwrap()
                .to_string_lossy()
                .to_string()
        }

        #[test]
        fn demo_submodule_chain_on_real_repos() {
            let (sup, _lib) = fixture();
            let sub = canonical(
                &std::path::Path::new(&sup)
                    .join("libs/lib")
                    .to_string_lossy(),
            );
            let runner = ProcessRunner;

            assert_eq!(
                superproject_chain(&runner, &sub).unwrap(),
                vec![canonical(&sup), sub.clone()]
            );
            assert_eq!(
                superproject_chain(&runner, &sup).unwrap(),
                vec![canonical(&sup)]
            );
        }

        #[test]
        fn demo_nested_submodule_chain_on_real_repos() {
            let (sup, _lib) = fixture();
            let sub_dir = std::path::Path::new(&sup).join("libs/lib");
            let sub_s = sub_dir.to_string_lossy().to_string();
            let base = std::path::Path::new(&sup)
                .parent()
                .unwrap()
                .join("nested-lib");
            let base_s = base.to_string_lossy().to_string();
            std::fs::create_dir_all(&base).unwrap();
            git(&base_s, &["init"]);
            std::fs::write(base.join("nested.txt"), "deep\n").unwrap();
            git(&base_s, &["add", "."]);
            git(&base_s, &["commit", "-m", "nested init"]);
            git(&sub_s, &["submodule", "add", &base_s, "vendor/nested"]);
            git(&sub_s, &["commit", "-m", "add nested"]);
            let runner = ProcessRunner;

            let deep = canonical(
                &std::path::Path::new(&sup)
                    .join("libs/lib/vendor/nested")
                    .to_string_lossy(),
            );
            assert_eq!(
                superproject_chain(&runner, &deep).unwrap(),
                vec![canonical(&sup), canonical(&sub_s), deep]
            );
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
            let out = run_git(&runner, &sup, &owned(&["log", "--oneline", "-1"])).unwrap();
            assert!(out.contains(head.trim()));

            let branch = run_git(
                &runner,
                &sup,
                &owned(&["rev-parse", "--verify", "--quiet", "refs/heads/main"]),
            );
            assert!(branch.is_ok());

            let missing = run_git(
                &runner,
                &sup,
                &owned(&["rev-parse", "--verify", "--quiet", "refs/heads/release"]),
            );
            assert!(missing.is_err());

            let clean = run_git(&runner, &sup, &owned(&["status", "--porcelain"])).unwrap();
            assert!(clean.trim().is_empty());

            let pulled = run_git(
                &runner,
                &sup,
                &owned(&["submodule", "foreach", "git rev-parse --short HEAD"]),
            )
            .unwrap();
            assert!(pulled.contains("Entering 'libs/lib'"));
            assert!(pulled
                .split_whitespace()
                .any(|w| w.len() == 7 && w.chars().all(|c| c.is_ascii_hexdigit())));

            let blocked = run_git(
                &runner,
                &sup,
                &owned(&["submodule", "foreach", "git push --force"]),
            );
            assert!(blocked.is_err());
        }
    }
}
