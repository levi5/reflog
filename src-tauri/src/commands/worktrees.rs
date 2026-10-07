use crate::domain::WorktreeInfo;
use crate::runner::GitRunner;

pub fn parse_worktree_list(out: &str) -> Vec<WorktreeInfo> {
    let mut list = vec![];
    let mut current: Option<WorktreeInfo> = None;
    let mut first = true;
    let flush = |current: &mut Option<WorktreeInfo>, list: &mut Vec<WorktreeInfo>| {
        if let Some(entry) = current.take() {
            if !entry.path.is_empty() {
                list.push(entry);
            }
        }
    };
    for line in out.lines() {
        if let Some(path) = line.strip_prefix("worktree ") {
            flush(&mut current, &mut list);
            current = Some(WorktreeInfo {
                path: path.trim().to_string(),
                head: String::new(),
                branch: None,
                detached: false,
                bare: false,
                main: first,
            });
            first = false;
        } else if let Some(entry) = current.as_mut() {
            if let Some(head) = line.strip_prefix("HEAD ") {
                entry.head = head.trim().to_string();
            } else if let Some(branch) = line.strip_prefix("branch ") {
                entry.branch = Some(branch.trim().to_string());
            } else if line.trim() == "detached" {
                entry.detached = true;
            } else if line.trim() == "bare" {
                entry.bare = true;
            }
        }
    }
    flush(&mut current, &mut list);
    list
}

fn validate_worktree_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\0') || path.contains('\n') || path.len() > 4096 {
        return Err("caminho do worktree inválido".to_string());
    }
    if path.starts_with('-') {
        return Err("caminho do worktree inválido".to_string());
    }
    Ok(())
}

pub fn worktree_list(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<WorktreeInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(Some(&root), &["worktree", "list", "--porcelain"])?;
    Ok(parse_worktree_list(&out))
}

pub fn worktree_add(
    runner: &dyn GitRunner,
    repo_path: &str,
    path: &str,
    branch: Option<String>,
    detach: bool,
) -> Result<String, String> {
    let trimmed = path.trim();
    validate_worktree_path(trimmed)?;
    let root = runner.repo_root(repo_path)?;
    let owned_path = trimmed.to_string();
    if detach {
        return runner.run(
            Some(&root),
            &["worktree", "add", "--detach", "--", &owned_path],
        );
    }
    match branch {
        Some(name) if !name.trim().is_empty() => {
            let branch_name = name.trim().to_string();
            crate::commands::validation::validate_ref_name(&branch_name)?;
            runner.run(
                Some(&root),
                &["worktree", "add", "--", &owned_path, "-b", &branch_name],
            )
        }
        _ => runner.run(Some(&root), &["worktree", "add", "--", &owned_path]),
    }
}

pub fn worktree_remove(
    runner: &dyn GitRunner,
    repo_path: &str,
    path: &str,
    force: bool,
) -> Result<String, String> {
    let trimmed = path.trim();
    validate_worktree_path(trimmed)?;
    let root = runner.repo_root(repo_path)?;
    let owned = trimmed.to_string();
    if force {
        runner.run(Some(&root), &["worktree", "remove", "--force", "--", &owned])
    } else {
        runner.run(Some(&root), &["worktree", "remove", "--", &owned])
    }
}

git_command!(git_worktree_list, Vec<WorktreeInfo>, worktree_list, (repo_path: String), ());
git_command!(git_worktree_add, String, worktree_add, (repo_path: String, path: String), (branch: Option<String>, detach: bool));
git_command!(git_worktree_remove, String, worktree_remove, (repo_path: String, path: String), (force: bool));

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_porcelain_with_branch_and_detached() {
        let out = "worktree /r\nHEAD abc1234\nbranch refs/heads/main\n\nworktree /r-wt\nHEAD def5678\ndetached\n\nworktree /r-bare\nHEAD 0000000\nbare\n";
        let list = parse_worktree_list(out);
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].path, "/r");
        assert!(list[0].main);
        assert_eq!(list[0].branch.as_deref(), Some("refs/heads/main"));
        assert!(list[1].detached);
        assert!(!list[1].main);
        assert!(list[2].bare);
    }

    #[test]
    fn lists_via_runner() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("worktree list --porcelain", "worktree /r\nHEAD abc\nbranch refs/heads/main\n"),
            ],
            &[],
        );
        let list = worktree_list(&runner, "/r").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].path, "/r");
    }

    #[test]
    fn rejects_option_like_paths_and_bad_branch() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(worktree_add(&runner, "/r", "-evil", None, false).is_err());
        assert!(worktree_add(&runner, "/r", "/tmp/wt", Some("-bad".to_string()), false).is_err());
        assert!(worktree_remove(&runner, "/r", "", false).is_err());
    }
}
