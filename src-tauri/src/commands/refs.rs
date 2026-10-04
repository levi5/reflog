use crate::commands::validation::{validate_clone_url, validate_ref_name, validate_remote_name};
use crate::domain::RemoteInfo;
use crate::runner::GitRunner;

pub fn branch_delete(
    runner: &dyn GitRunner,
    repo_path: &str,
    name: &str,
    force: bool,
) -> Result<String, String> {
    validate_ref_name(name)?;
    let root = runner.repo_root(repo_path)?;
    if force {
        return runner.run(Some(&root), &["branch", "-D", "--", name]);
    }
    runner.run(Some(&root), &["branch", "-d", "--", name])
}

pub fn branch_rename(
    runner: &dyn GitRunner,
    repo_path: &str,
    old: &str,
    new: &str,
) -> Result<String, String> {
    validate_ref_name(old)?;
    validate_ref_name(new)?;
    if new.trim().is_empty() {
        return Err("nome da branch vazio".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["branch", "-m", "--", old, new])
}

pub fn tag_list(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<String>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["tag", "--list", "--sort=-creatordate"])?;
    Ok(out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect())
}

pub fn tag_create(
    runner: &dyn GitRunner,
    repo_path: &str,
    name: &str,
    message: Option<String>,
) -> Result<String, String> {
    validate_ref_name(name)?;
    let root = runner.repo_root(repo_path)?;
    match message {
        Some(m) if !m.trim().is_empty() => runner.run(Some(&root), &["tag", "-a", name, "-m", &m]),
        _ => runner.run(Some(&root), &["tag", "--", name]),
    }
}

pub fn tag_delete(runner: &dyn GitRunner, repo_path: &str, name: &str) -> Result<String, String> {
    validate_ref_name(name)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["tag", "-d", "--", name])
}

pub fn remote_list(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<RemoteInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["remote", "-v"])?;
    let mut seen = std::collections::HashSet::new();
    let mut list = vec![];
    for line in out.lines() {
        if !line.trim_end().ends_with("(fetch)") {
            continue;
        }
        let mut it = line.split_whitespace();
        let name = it.next().unwrap_or("").to_string();
        let url = it.next().unwrap_or("").to_string();
        if name.is_empty() || !seen.insert(name.clone()) {
            continue;
        }
        list.push(RemoteInfo { name, url });
    }
    Ok(list)
}

pub fn remote_add(
    runner: &dyn GitRunner,
    repo_path: &str,
    name: &str,
    url: &str,
) -> Result<String, String> {
    validate_remote_name(name)?;
    validate_clone_url(url)?;
    if name.trim().is_empty() || url.trim().is_empty() {
        return Err("nome ou URL do remoto vazio".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["remote", "add", "--", name, url])
}

pub fn remote_remove(
    runner: &dyn GitRunner,
    repo_path: &str,
    name: &str,
) -> Result<String, String> {
    validate_remote_name(name)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["remote", "remove", "--", name])
}

git_command!(git_branch_delete, String, branch_delete, (repo_path: String, name: String), (force: bool));

git_command!(git_branch_rename, String, branch_rename, (repo_path: String, old: String, new: String), ());

git_command!(git_tag_list, Vec<String>, tag_list, (repo_path: String), ());

git_command!(git_tag_create, String, tag_create, (repo_path: String, name: String), (message: Option<String>));

git_command!(git_tag_delete, String, tag_delete, (repo_path: String, name: String), ());

git_command!(git_remote_list, Vec<RemoteInfo>, remote_list, (repo_path: String), ());

git_command!(git_remote_add, String, remote_add, (repo_path: String, name: String, url: String), ());

git_command!(git_remote_remove, String, remote_remove, (repo_path: String, name: String), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;
    use crate::runner::ProcessRunner;
    use crate::test_support::git;

    #[test]
    fn remote_list_keeps_fetch_urls_once() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "remote -v",
                    "origin\tgit@github.com:x/y.git (fetch)\norigin\tgit@github.com:x/y.git (push)\nupstream\thttps://x.git (fetch)\nupstream\thttps://x.git (push)",
                ),
            ],
            &[],
        );
        let list = remote_list(&runner, "/r").unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].name, "origin");
        assert_eq!(list[0].url, "git@github.com:x/y.git");
    }

    #[test]
    fn tag_list_skips_blank_lines() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("tag --list --sort=-creatordate", "v2.0\nv1.0\n"),
            ],
            &[],
        );
        assert_eq!(tag_list(&runner, "/r").unwrap(), vec!["v2.0", "v1.0"]);
    }

    #[test]
    fn creates_lightweight_and_annotated_tags_in_real_repo() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path().to_string_lossy().to_string();
        git(&dir, &["init"]);
        git(&dir, &["config", "user.name", "demo"]);
        git(&dir, &["config", "user.email", "demo@demo"]);
        std::fs::write(temp.path().join("f.txt"), "1\n").unwrap();
        git(&dir, &["add", "."]);
        git(&dir, &["commit", "-m", "one"]);

        let runner = ProcessRunner;
        tag_create(&runner, &dir, "v1.0", None).unwrap();
        tag_create(&runner, &dir, "v2.0", Some("release".to_string())).unwrap();
        let tags = tag_list(&runner, &dir).unwrap();
        assert!(tags.contains(&"v1.0".to_string()));
        assert!(tags.contains(&"v2.0".to_string()));
    }
}
