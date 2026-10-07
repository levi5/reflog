use crate::commands::validation::{
    validate_ref_name, validate_remote_name, validate_repo_relative_path,
    validate_stash_message,
};
use crate::domain::StashItem;
use crate::runner::{GitRunner, NETWORK_TIMEOUT};

pub fn merge_opts(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    squash: bool,
    no_ff: bool,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    if squash {
        return runner.run(Some(&root), &["merge", "--squash", "--", branch]);
    }
    if no_ff {
        return runner.run(
            Some(&root),
            &["merge", "--no-ff", "--no-edit", "--", branch],
        );
    }
    runner.run(Some(&root), &["merge", "--", branch])
}

pub fn fetch(runner: &dyn GitRunner, repo_path: &str, prune: bool) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if prune {
        return runner.run_with_timeout(
            Some(&root),
            &["fetch", "--all", "--prune", "--jobs=4", "--progress"],
            NETWORK_TIMEOUT,
        );
    }
    runner.run_with_timeout(
        Some(&root),
        &["fetch", "--all", "--jobs=4", "--progress"],
        NETWORK_TIMEOUT,
    )
}

pub fn merge_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["merge", "--abort"])
}

pub fn pull(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match runner.run_with_timeout(Some(&root), &["pull", "--progress"], NETWORK_TIMEOUT) {
        Ok(output) => Ok(output),
        Err(err) => {
            if err.contains("no tracking information")
                || err.contains("Please specify which branch")
                || err.contains("no upstream")
            {
                if let Ok(branch_out) =
                    runner.run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
                {
                    let branch = branch_out.trim();
                    if !branch.is_empty() && branch != "HEAD" {
                        validate_ref_name(branch)?;
                        let _ = runner.run(
                            Some(&root),
                            &[
                                "branch",
                                "--set-upstream-to",
                                &format!("origin/{branch}"),
                                branch,
                            ],
                        );
                        return runner.run_with_timeout(
                            Some(&root),
                            &["pull", "--progress", "origin", branch],
                            NETWORK_TIMEOUT,
                        );
                    }
                }
            }
            Err(err)
        }
    }
}

pub fn push(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match runner.run_with_timeout(Some(&root), &["push", "--progress"], NETWORK_TIMEOUT) {
        Ok(output) => Ok(output),
        Err(err) => {
            if err.contains("has no upstream branch")
                || err.contains("--set-upstream")
                || err.contains("no upstream")
            {
                if let Ok(branch_out) =
                    runner.run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])
                {
                    let branch = branch_out.trim();
                    if !branch.is_empty() && branch != "HEAD" {
                        validate_ref_name(branch)?;
                        return runner.run_with_timeout(
                            Some(&root),
                            &["push", "--progress", "-u", "origin", branch],
                            NETWORK_TIMEOUT,
                        );
                    }
                }
            }
            Err(err)
        }
    }
}

pub fn push_with(
    runner: &dyn GitRunner,
    repo_path: &str,
    force: bool,
    push_tags: bool,
    delete_remote_branch: Option<String>,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;

    if let Some(branch) = delete_remote_branch {
        let remote = branch.split_once('/').map(|(r, _)| r).unwrap_or("origin");
        let name = branch
            .split_once('/')
            .map(|(_, b)| b.to_string())
            .unwrap_or_else(|| branch.clone());
        validate_ref_name(name.as_str())?;
        validate_remote_name(remote)?;
        return runner.run_with_timeout(
            Some(&root),
            &["push", remote, "--delete", name.as_str()],
            NETWORK_TIMEOUT,
        );
    }

    if push_tags {
        return runner.run_with_timeout(
            Some(&root),
            &["push", "--tags", "--progress"],
            NETWORK_TIMEOUT,
        );
    }

    let branch_out = runner.run(Some(&root), &["rev-parse", "--abbrev-ref", "HEAD"])?;
    let branch = branch_out.trim().to_string();
    if branch.is_empty() || branch == "HEAD" || branch.contains(' ') {
        return runner.run_with_timeout(Some(&root), &["push", "--progress"], NETWORK_TIMEOUT);
    }
    validate_ref_name(branch.as_str())?;

    let args: Vec<String> = if force {
        vec![
            "push".to_string(),
            "--force-with-lease".to_string(),
            "--progress".to_string(),
            branch.clone(),
        ]
    } else {
        vec!["push".to_string(), "--progress".to_string(), branch.clone()]
    };
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    match runner.run_with_timeout(Some(&root), &refs, NETWORK_TIMEOUT) {
        Ok(output) => Ok(output),
        Err(err) => {
            if err.contains("has no upstream branch")
                || err.contains("--set-upstream")
                || err.contains("no upstream")
            {
                let mut with_set_upstream =
                    vec!["push".to_string(), "-u".to_string(), "origin".to_string()];
                if force {
                    with_set_upstream.insert(1, "--force-with-lease".to_string());
                }
                with_set_upstream.push(branch.clone());
                with_set_upstream.push("--progress".to_string());
                let refs: Vec<&str> = with_set_upstream.iter().map(|s| s.as_str()).collect();
                return runner.run_with_timeout(Some(&root), &refs, NETWORK_TIMEOUT);
            }
            Err(err)
        }
    }
}

pub fn set_upstream(
    runner: &dyn GitRunner,
    repo_path: &str,
    remote: &str,
    branch: &str,
) -> Result<String, String> {
    validate_remote_name(remote)?;
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(
        Some(&root),
        &[
            "branch",
            "--set-upstream-to",
            &format!("{remote}/{branch}"),
            branch,
        ],
    )
}

pub fn unset_upstream(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["branch", "--unset-upstream", branch])
}

pub fn fetch_ref(
    runner: &dyn GitRunner,
    repo_path: &str,
    remote: &str,
    prune: bool,
    tags: bool,
) -> Result<String, String> {
    validate_remote_name(remote)?;
    let root = runner.repo_root(repo_path)?;
    let mut args: Vec<String> = vec![
        "fetch".to_string(),
        remote.to_string(),
        "--progress".to_string(),
    ];
    if prune {
        args.push("--prune".to_string());
    }
    if tags {
        args.push("--tags".to_string());
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner.run_with_timeout(Some(&root), &refs, NETWORK_TIMEOUT)
}

pub fn stash(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: Option<String>,
    keep_index: bool,
    staged_only: bool,
    paths: Vec<String>,
) -> Result<String, String> {
    if let Some(ref m) = message {
        validate_stash_message(m)?;
    }
    if keep_index && staged_only {
        return Err("opções --keep-index e --staged são mutuamente exclusivas".to_string());
    }
    for p in &paths {
        validate_repo_relative_path(p)?;
    }
    let root = runner.repo_root(repo_path)?;
    let mut cmd: Vec<String> = vec!["stash".to_string(), "push".to_string()];
    if staged_only {
        cmd.push("--staged".to_string());
    } else {
        if keep_index {
            cmd.push("--keep-index".to_string());
        }
        cmd.push("--include-untracked".to_string());
    }
    if let Some(m) = message {
        if !m.trim().is_empty() {
            cmd.push("-m".to_string());
            cmd.push(m);
        }
    }
    if !paths.is_empty() {
        cmd.push("--".to_string());
        cmd.extend(paths);
    }
    let refs: Vec<&str> = cmd.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &refs)
}

pub fn stash_pop(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["stash", "pop"])
}

pub fn stash_list(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<StashItem>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(
        Some(&root),
        &["stash", "list", "--format=%H\x1f%gd\x1f%gs\x1f%an\x1f%cs"],
    )?;
    let mut items = vec![];
    for (idx, line) in out.lines().enumerate() {
        let fields: Vec<&str> = line.split('\u{1f}').collect();
        if fields.len() < 5 {
            continue;
        }
        items.push(StashItem {
            index: idx,
            hash: fields[0].to_string(),
            selector: fields[1].to_string(),
            message: fields[2].to_string(),
            author: fields[3].to_string(),
            date: fields[4].to_string(),
        });
    }
    Ok(items)
}

pub fn stash_show(runner: &dyn GitRunner, repo_path: &str, index: usize) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(
        Some(&root),
        &["stash", "show", "-p", &format!("stash@{{{index}}}")],
    )
}

pub fn stash_drop(runner: &dyn GitRunner, repo_path: &str, index: usize) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(
        Some(&root),
        &["stash", "drop", &format!("stash@{{{index}}}")],
    )
}

pub fn stash_apply(
    runner: &dyn GitRunner,
    repo_path: &str,
    index: usize,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(
        Some(&root),
        &["stash", "apply", &format!("stash@{{{index}}}")],
    )
}

pub fn stash_branch(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    index: Option<usize>,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    match index {
        Some(i) => runner.run(
            Some(&root),
            &["stash", "branch", branch, &format!("stash@{{{i}}}")],
        ),
        None => runner.run(Some(&root), &["stash", "branch", branch]),
    }
}

pub fn stash_apply_file(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    index: usize,
) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    let selector = format!("stash@{{{index}}}");
    let source = format!("--source={selector}");
    // `restore --source` is the modern spelling; fall back to `checkout <stash> --`
    // for older Git versions (same pattern as `discard`).
    match runner.run(Some(&root), &["restore", &source, "--", file]) {
        Ok(o) => Ok(o),
        Err(_) => runner.run(Some(&root), &["checkout", &selector, "--", file]),
    }
}

git_command!(git_merge_opts, String, merge_opts, (repo_path: String, branch: String), (squash: bool, no_ff: bool));

git_command!(git_fetch, String, fetch, (repo_path: String), (prune: bool));

git_command!(git_merge_abort, String, merge_abort, (repo_path: String), ());

git_command!(git_pull, String, pull, (repo_path: String), ());

git_command!(git_push, String, push, (repo_path: String), ());

git_command!(
    git_push_with,
    String,
    push_with,
    (repo_path: String),
    (force: bool, push_tags: bool, delete_remote_branch: Option<String>)
);

git_command!(git_set_upstream, String, set_upstream, (repo_path: String, remote: String, branch: String), ());

git_command!(git_unset_upstream, String, unset_upstream, (repo_path: String, branch: String), ());

git_command!(git_fetch_ref, String, fetch_ref, (repo_path: String, remote: String), (prune: bool, tags: bool));

git_command!(git_stash, String, stash, (repo_path: String), (message: Option<String>, keep_index: bool, staged_only: bool, paths: Vec<String>));

git_command!(git_stash_pop, String, stash_pop, (repo_path: String), ());

git_command!(git_stash_list, Vec<StashItem>, stash_list, (repo_path: String), ());

git_command!(git_stash_show, String, stash_show, (repo_path: String), (index: usize));

git_command!(git_stash_drop, String, stash_drop, (repo_path: String), (index: usize));

git_command!(git_stash_apply, String, stash_apply, (repo_path: String), (index: usize));

git_command!(git_stash_branch, String, stash_branch, (repo_path: String, branch: String), (index: Option<usize>));

git_command!(git_stash_apply_file, String, stash_apply_file, (repo_path: String, file: String), (index: usize));
#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_stash_list_items() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "stash list --format=%H\x1f%gd\x1f%gs\x1f%an\x1f%cs",
                    "hashA\x1fstash@{0}\x1fWIP on main: 1234 feat\x1fDev\x1f2026-09-18\nhashB\x1fstash@{1}\x1fOn feat: test\x1fDev2\x1f2026-09-17",
                ),
            ],
            &[],
        );
        let list = stash_list(&runner, "/r").unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].index, 0);
        assert_eq!(list[0].hash, "hashA");
        assert_eq!(list[0].selector, "stash@{0}");
        assert_eq!(list[0].message, "WIP on main: 1234 feat");
        assert_eq!(list[1].index, 1);
        assert_eq!(list[1].selector, "stash@{1}");
        assert_eq!(list[1].message, "On feat: test");
    }

    #[test]
    fn uses_valid_stash_selectors_for_indexed_actions() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash show -p stash@{2}", "patch"),
                ("stash apply stash@{1}", "applied"),
                ("stash drop stash@{0}", "dropped"),
            ],
            &[],
        );

        assert_eq!(stash_show(&runner, "/r", 2).unwrap(), "patch");
        assert_eq!(stash_apply(&runner, "/r", 1).unwrap(), "applied");
        assert_eq!(stash_drop(&runner, "/r", 0).unwrap(), "dropped");
    }

    #[test]
    fn force_push_uses_force_with_lease_and_never_bare_force() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("rev-parse --abbrev-ref HEAD", "feat"),
            ("push --force-with-lease --progress feat", "forced"),
        ];
        let runner = MockRunner::new(&rows, &[]);
        assert_eq!(
            push_with(&runner, "/r", true, false, None).unwrap(),
            "forced"
        );
    }

    #[test]
    fn push_tags_targets_tag_refs() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("push --tags --progress", "tags pushed"),
        ];
        let runner = MockRunner::new(&rows, &[]);
        assert_eq!(
            push_with(&runner, "/r", false, true, None).unwrap(),
            "tags pushed"
        );
    }

    #[test]
    fn deletes_a_remote_branch_through_its_remote() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("push origin --delete feat", "deleted"),
        ];
        let runner = MockRunner::new(&rows, &[]);
        assert_eq!(
            push_with(&runner, "/r", false, false, Some("origin/feat".into())).unwrap(),
            "deleted"
        );
    }

    #[test]
    fn rejects_option_like_remote_branch_on_delete() {
        let rows = vec![("rev-parse --show-toplevel", "/r")];
        let runner = MockRunner::new(&rows, &[]);
        assert!(push_with(&runner, "/r", false, false, Some("origin/--force".into())).is_err());
    }

    #[test]
    fn falls_back_to_setting_upstream_when_publishing() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("rev-parse --abbrev-ref HEAD", "feat"),
            ("push -u origin feat --progress", "published"),
        ];
        let runner = MockRunner::with_failures(
            &[(
                "push --progress feat",
                "fatal: The current branch feat has no upstream branch",
            )],
            &rows,
        );
        assert_eq!(
            push_with(&runner, "/r", false, false, None).unwrap(),
            "published"
        );
    }

    #[test]
    fn fetches_a_single_remote_with_flags() {
        let rows = vec![
            ("rev-parse --show-toplevel", "/r"),
            ("fetch upstream --progress --prune --tags", "done"),
        ];
        let runner = MockRunner::new(&rows, &[]);
        assert_eq!(
            fetch_ref(&runner, "/r", "upstream", true, true).unwrap(),
            "done"
        );
        assert!(fetch_ref(&runner, "/r", "--upload-pack=x", false, false).is_err());
    }

    #[test]
    fn stashes_untracked_files() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash push --include-untracked -m before-checkout", "Saved"),
            ],
            &[],
        );

        assert_eq!(
            stash(&runner, "/r", Some("before-checkout".into()), false, false, vec![]).unwrap(),
            "Saved"
        );
    }

    #[test]
    fn stash_push_supports_keep_index_staged_and_pathspec() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash push --keep-index --include-untracked -m wip", "Saved"),
            ],
            &[],
        );
        assert_eq!(
            stash(&runner, "/r", Some("wip".into()), true, false, vec![]).unwrap(),
            "Saved"
        );

        let runner = MockRunner::new(
            &[("rev-parse --show-toplevel", "/r"), ("stash push --staged -m wip", "Saved")],
            &[],
        );
        assert_eq!(
            stash(&runner, "/r", Some("wip".into()), false, true, vec![]).unwrap(),
            "Saved"
        );

        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash push --include-untracked -- src/a.ts", "Saved"),
            ],
            &[],
        );
        assert_eq!(
            stash(&runner, "/r", None, false, false, vec!["src/a.ts".to_string()]).unwrap(),
            "Saved"
        );

        // mutually exclusive + path traversal rejected
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(stash(&runner, "/r", None, true, true, vec![]).is_err());
        assert!(stash(&runner, "/r", None, false, false, vec!["../evil".to_string()]).is_err());
        assert!(stash(&runner, "/r", None, false, false, vec!["--help".to_string()]).is_err());
    }

    #[test]
    fn stash_branch_validates_ref_and_targets_selector() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("stash branch fix/conflict stash@{1}", "branched"),
            ],
            &[],
        );
        assert_eq!(stash_branch(&runner, "/r", "fix/conflict", Some(1)).unwrap(), "branched");

        let runner = MockRunner::new(
            &[("rev-parse --show-toplevel", "/r"), ("stash branch hotfix", "branched")],
            &[],
        );
        assert_eq!(stash_branch(&runner, "/r", "hotfix", None).unwrap(), "branched");

        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(stash_branch(&runner, "/r", "--evil", Some(0)).is_err());
        assert!(stash_branch(&runner, "/r", "a..b", Some(0)).is_err());
    }

    #[test]
    fn stash_apply_file_restores_single_path_with_fallback() {
        // Modern git: restore --source works
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("restore --source=stash@{0} -- src/a.ts", "restored"),
            ],
            &[],
        );
        assert_eq!(stash_apply_file(&runner, "/r", "src/a.ts", 0).unwrap(), "restored");

        // Old git: restore fails -> fallback to checkout
        let runner = MockRunner::with_failures(
            &[("restore --source=stash@{2} -- src/b.ts", "unknown option")],
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("checkout stash@{2} -- src/b.ts", "checked out"),
            ],
        );
        assert_eq!(stash_apply_file(&runner, "/r", "src/b.ts", 2).unwrap(), "checked out");

        // traversal rejected
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(stash_apply_file(&runner, "/r", "../evil", 0).is_err());
    }
}
