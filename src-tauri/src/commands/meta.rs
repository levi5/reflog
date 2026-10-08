use crate::commands::validation::{
    validate_clone_path, validate_clone_url, validate_config_key, validate_config_value,
    ALLOWED_CONFIG_KEYS,
};
use crate::domain::ConfigEntry;
use crate::runner::{GitRunner, NETWORK_TIMEOUT};

pub fn version(runner: &dyn GitRunner) -> Result<String, String> {
    runner
        .run(None, &["--version"])
        .map(|s| s.trim().to_string())
}

pub fn remote_url(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    Ok(runner
        .run(Some(&root), &["remote", "get-url", "origin"])
        .unwrap_or_default()
        .trim()
        .to_string())
}

pub fn gpg(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner
        .run(Some(&root), &["log", "-1", "--pretty=%G?"])
        .map(|s| s.trim().to_string())
}

pub fn clone(
    runner: &dyn GitRunner,
    url: &str,
    path: &str,
    depth: Option<u32>,
    branch: Option<String>,
    recurse_submodules: bool,
) -> Result<String, String> {
    validate_clone_url(url)?;
    validate_clone_path(path)?;
    let mut cmd: Vec<String> = vec!["clone".to_string(), "--progress".to_string()];
    if let Some(d) = depth {
        if d == 0 || d > 1_000_000 {
            return Err("invalid clone depth".to_string());
        }
        cmd.push("--depth".to_string());
        cmd.push(d.to_string());
    }
    if let Some(b) = branch {
        let name = b.trim().to_string();
        if !name.is_empty() {
            crate::commands::validation::validate_ref_name(&name)?;
            cmd.push("--branch".to_string());
            cmd.push(name);
        }
    }
    if recurse_submodules {
        cmd.push("--recurse-submodules".to_string());
    }
    cmd.push("--".to_string());
    cmd.push(url.to_string());
    cmd.push(path.to_string());
    let refs: Vec<&str> = cmd.iter().map(|s| s.as_str()).collect();
    runner.run_with_timeout(None, &refs, NETWORK_TIMEOUT)
}

fn get_key(runner: &dyn GitRunner, repo_path: &str, key: &str, global: bool) -> String {
    let scoped = if global || repo_path.trim().is_empty() {
        runner.run(None, &["config", "--global", "--get", "--", key])
    } else {
        match runner.repo_root(repo_path) {
            Ok(root) => runner.run(Some(&root), &["config", "--get", "--", key]),
            Err(_) => return String::new(),
        }
    };
    scoped.map(|s| s.trim().to_string()).unwrap_or_default()
}

pub fn config_get(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    global: bool,
) -> Result<String, String> {
    validate_config_key(key)?;
    Ok(get_key(runner, repo_path, key, global))
}

pub fn config_set(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    value: &str,
    global: bool,
) -> Result<String, String> {
    validate_config_key(key)?;
    validate_config_value(value)?;
    let scoped_global = global || repo_path.trim().is_empty();
    if value.trim().is_empty() {
        return unset_key(runner, repo_path, key, scoped_global);
    }
    if scoped_global {
        return runner.run(None, &["config", "--global", "--", key, value]);
    }
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["config", "--", key, value])
}

pub fn config_snapshot(
    runner: &dyn GitRunner,
    repo_path: &str,
    global: bool,
) -> Result<Vec<ConfigEntry>, String> {
    let mut entries = vec![];
    for key in ALLOWED_CONFIG_KEYS {
        let value = get_key(runner, repo_path, key, global);
        entries.push(ConfigEntry {
            key: (*key).to_string(),
            value,
            allowed: true,
        });
    }
    Ok(entries)
}

fn unset_key(
    runner: &dyn GitRunner,
    repo_path: &str,
    key: &str,
    global: bool,
) -> Result<String, String> {
    if global {
        return runner
            .run(None, &["config", "--global", "--unset", "--", key])
            .map(|_| String::new());
    }
    let root = runner.repo_root(repo_path)?;
    runner
        .run(Some(&root), &["config", "--unset", "--", key])
        .map(|_| String::new())
}

pub fn identity_of(
    runner: &dyn GitRunner,
    repo_path: &str,
) -> Result<crate::domain::Identity, String> {
    let mut name = get_key(runner, repo_path, "user.name", false);
    if name.is_empty() {
        name = get_key(runner, repo_path, "user.name", true);
    }
    let mut email = get_key(runner, repo_path, "user.email", false);
    if email.is_empty() {
        email = get_key(runner, repo_path, "user.email", true);
    }
    Ok(crate::domain::Identity { name, email })
}

git_command!(git_version, String, version, (), ());

git_command!(git_remote_url, String, remote_url, (repo_path: String), ());

git_command!(git_gpg, String, gpg, (repo_path: String), ());

git_command!(git_clone, String, clone, (url: String, path: String), (depth: Option<u32>, branch: Option<String>, recurse_submodules: bool));

git_command!(git_config_get, String, config_get, (repo_path: String, key: String), (global: bool));

git_command!(git_config_snapshot, Vec<ConfigEntry>, config_snapshot, (repo_path: String), (global: bool));

git_command!(git_config_set, String, config_set, (repo_path: String, key: String, value: String), (global: bool));

git_command!(git_identity, crate::domain::Identity, identity_of, (repo_path: String), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn returns_empty_url_when_origin_is_not_configured() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);

        assert_eq!(remote_url(&runner, "/r").unwrap(), "");
    }

    #[test]
    fn snapshot_only_reports_allowlisted_keys() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        let entries = config_snapshot(&runner, "/r", false).unwrap();
        assert_eq!(entries.len(), ALLOWED_CONFIG_KEYS.len());
        for entry in &entries {
            assert!(ALLOWED_CONFIG_KEYS.contains(&entry.key.as_str()));
            assert!(entry.allowed);
        }
    }

    #[test]
    fn rejects_setting_a_key_outside_the_allowlist() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("config -- user.name Dev", ""),
            ],
            &[],
        );
        assert!(config_set(&runner, "/r", "core.sshCommand", "sh -c evil", false).is_err());
        assert!(config_set(&runner, "/r", "credential.helper", "store", false).is_err());
        assert!(config_set(&runner, "/r", "user.name", "Dev", false).is_ok());
    }

    #[test]
    fn clone_supports_depth_branch_and_recurse() {
        let runner = MockRunner::new(
            &[(
                "clone --progress --depth 1 --branch main --recurse-submodules -- https://x/y.git /tmp/y",
                "cloned",
            )],
            &[],
        );
        assert_eq!(
            clone(
                &runner,
                "https://x/y.git",
                "/tmp/y",
                Some(1),
                Some("main".into()),
                true
            )
            .unwrap(),
            "cloned"
        );

        let runner = MockRunner::new(
            &[("clone --progress -- https://x/y.git /tmp/y", "cloned")],
            &[],
        );
        assert_eq!(clone(&runner, "https://x/y.git", "/tmp/y", None, None, false).unwrap(), "cloned");

        let runner = MockRunner::new(&[], &[]);
        assert!(clone(&runner, "https://x/y.git", "/tmp/y", Some(0), None, false).is_err());
        assert!(clone(&runner, "https://x/y.git", "/tmp/y", None, Some("--evil".into()), false).is_err());
        assert!(clone(&runner, "ext::sh -c evil", "/tmp/y", None, None, false).is_err());
    }
}
