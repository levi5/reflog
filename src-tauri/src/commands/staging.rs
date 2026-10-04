use crate::commands::validation::{
    validate_commit_oid, validate_patch_size, validate_ref_name, validate_repo_relative_path,
    validate_rev_spec,
};
use crate::runner::GitRunner;

const MAX_PATCH_BYTES: usize = 5 * 1024 * 1024;

pub fn add(runner: &dyn GitRunner, repo_path: &str, files: &[String]) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if files.is_empty() {
        return runner.run(Some(&root), &["add", "-A"]);
    }
    for f in files {
        validate_repo_relative_path(f)?;
    }
    let mut args: Vec<&str> = vec!["add", "--"];
    args.extend(files.iter().map(|s| s.as_str()));
    runner.run(Some(&root), &args)
}

pub fn commit(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: &str,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if message.trim().is_empty() {
        return Err("mensagem de commit vazia".to_string());
    }
    let mut owned: Vec<String> = vec!["commit".to_string(), "-m".to_string(), message.to_string()];
    if signoff {
        owned.push("--signoff".to_string());
    }
    if sign {
        owned.push("-S".to_string());
    }
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &args)
}

pub fn amend_commit(
    runner: &dyn GitRunner,
    repo_path: &str,
    message: &str,
    signoff: bool,
    sign: bool,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    if message.trim().is_empty() {
        return Err("mensagem de commit vazia".to_string());
    }
    let mut owned: Vec<String> = vec![
        "commit".to_string(),
        "--amend".to_string(),
        "-m".to_string(),
        message.to_string(),
    ];
    if signoff {
        owned.push("--signoff".to_string());
    }
    if sign {
        owned.push("-S".to_string());
    }
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &args)
}

pub fn checkout(
    runner: &dyn GitRunner,
    repo_path: &str,
    branch: &str,
    create: bool,
    from: Option<String>,
) -> Result<String, String> {
    validate_ref_name(branch)?;
    let root = runner.repo_root(repo_path)?;
    if create {
        let start = match from.as_deref() {
            Some(rev) if !rev.trim().is_empty() => {
                validate_rev_spec(rev)?;
                Some(rev)
            }
            _ => None,
        };
        return match start {
            Some(rev) => runner.run(Some(&root), &["checkout", "-b", branch, "--", rev]),
            None => runner.run(Some(&root), &["checkout", "-b", branch]),
        };
    }
    runner.run(Some(&root), &["checkout", branch])
}

pub fn unstage(runner: &dyn GitRunner, repo_path: &str, file: &str) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["reset", "HEAD", "--", file])
}

pub fn discard(runner: &dyn GitRunner, repo_path: &str, file: &str) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    match runner.run(Some(&root), &["restore", "--", file]) {
        Ok(o) => Ok(o),
        Err(_) => runner.run(Some(&root), &["checkout", "--", file]),
    }
}

pub fn discard_untracked(
    runner: &dyn GitRunner,
    repo_path: &str,
    files: &[String],
) -> Result<String, String> {
    if files.is_empty() {
        return Ok(String::new());
    }
    for f in files {
        validate_repo_relative_path(f)?;
    }
    let root = runner.repo_root(repo_path)?;
    let mut args: Vec<String> = vec![
        "clean".to_string(),
        "-f".to_string(),
        "-d".to_string(),
        "--".to_string(),
    ];
    args.extend(files.iter().cloned());
    let borrowed: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner.run(Some(&root), &borrowed)
}

pub fn apply_patch(
    runner: &dyn GitRunner,
    repo_path: &str,
    patch: &str,
    cached: bool,
    reverse: bool,
) -> Result<String, String> {
    validate_patch_size(patch, MAX_PATCH_BYTES)?;
    if patch.trim().is_empty() {
        return Err("patch vazio".to_string());
    }
    let root = runner.repo_root(repo_path)?;
    let mut owned: Vec<String> = vec!["apply".to_string()];
    if cached {
        owned.push("--cached".to_string());
    }
    if reverse {
        owned.push("--reverse".to_string());
    }
    owned.push("--unidiff-zero".to_string());
    owned.push("-".to_string());
    let args: Vec<&str> = owned.iter().map(|s| s.as_str()).collect();
    runner.run_stdin(Some(&root), &args, patch)
}

pub fn cherry_pick(runner: &dyn GitRunner, repo_path: &str, hash: &str) -> Result<String, String> {
    validate_commit_oid(hash)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", "--", hash])
}

pub fn cherry_pick_continue(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", "--continue"])
}

pub fn cherry_pick_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["cherry-pick", "--abort"])
}

pub fn revert(runner: &dyn GitRunner, repo_path: &str, hash: &str) -> Result<String, String> {
    validate_commit_oid(hash)?;
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--no-edit", "--", hash])
}

pub fn revert_continue(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--continue"])
}

pub fn revert_abort(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["revert", "--abort"])
}

pub fn reset(
    runner: &dyn GitRunner,
    repo_path: &str,
    target: &str,
    mode: &str,
) -> Result<String, String> {
    validate_commit_oid(target)?;
    let flag = match mode {
        "soft" => "--soft",
        "hard" => "--hard",
        "mixed" => "--mixed",
        _ => return Err("modo de reset inválido".to_string()),
    };
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["reset", flag, target])
}

git_command!(git_add, String, add, (repo_path: String, files: Vec<String>), ());

git_command!(git_commit, String, commit, (repo_path: String, message: String), (signoff: bool, sign: bool));

git_command!(
    git_amend_commit,
    String,
    amend_commit,
    (repo_path: String, message: String),
    (signoff: bool, sign: bool)
);

git_command!(
    git_checkout,
    String,
    checkout,
    (repo_path: String, branch: String),
    (create: bool, from: Option<String>)
);

git_command!(git_unstage, String, unstage, (repo_path: String, file: String), ());

git_command!(git_discard, String, discard, (repo_path: String, file: String), ());

git_command!(git_discard_untracked, String, discard_untracked, (repo_path: String, files: Vec<String>), ());

git_command!(git_apply_patch, String, apply_patch, (repo_path: String, patch: String), (cached: bool, reverse: bool));

git_command!(git_cherry_pick, String, cherry_pick, (repo_path: String, hash: String), ());

git_command!(git_cherry_pick_continue, String, cherry_pick_continue, (repo_path: String), ());

git_command!(git_cherry_pick_abort, String, cherry_pick_abort, (repo_path: String), ());

git_command!(git_revert, String, revert, (repo_path: String, hash: String), ());

git_command!(git_revert_continue, String, revert_continue, (repo_path: String), ());

git_command!(git_revert_abort, String, revert_abort, (repo_path: String), ());

git_command!(git_reset, String, reset, (repo_path: String, target: String, mode: String), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;
    use crate::runner::ProcessRunner;
    use crate::test_support::git;

    #[test]
    fn checks_out_existing_and_new_branches_as_refs() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("checkout fix/c", "Switched to branch 'fix/c'"),
                (
                    "checkout -b feature/new",
                    "Switched to a new branch 'feature/new'",
                ),
            ],
            &[],
        );

        assert!(checkout(&runner, "/r", "fix/c", false, None).is_ok());
        assert!(checkout(&runner, "/r", "feature/new", true, None).is_ok());
    }

    fn fixture() -> (tempfile::TempDir, String) {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path().to_string_lossy().to_string();
        git(&dir, &["init"]);
        std::fs::write(temp.path().join("f.txt"), "1\n").unwrap();
        git(&dir, &["add", "."]);
        git(&dir, &["commit", "-m", "one"]);
        (temp, dir)
    }

    #[test]
    fn switches_and_creates_branches_in_real_repo() {
        let (_temp, dir) = fixture();
        let runner = ProcessRunner;
        git(&dir, &["branch", "side"]);

        checkout(&runner, &dir, "side", false, None).unwrap();
        assert_eq!(
            git(&dir, &["rev-parse", "--abbrev-ref", "HEAD"]).trim(),
            "side"
        );

        checkout(&runner, &dir, "feature/new", true, None).unwrap();
        assert_eq!(
            git(&dir, &["rev-parse", "--abbrev-ref", "HEAD"]).trim(),
            "feature/new"
        );
    }

    #[test]
    fn soft_resets_to_previous_commit_in_real_repo() {
        let (_temp, dir) = fixture();
        let runner = ProcessRunner;
        std::fs::write(format!("{dir}/g.txt"), "2\n").unwrap();
        git(&dir, &["add", "."]);
        git(&dir, &["commit", "-m", "two"]);

        reset(&runner, &dir, "HEAD~1", "soft").unwrap();
        assert_eq!(git(&dir, &["rev-list", "--count", "HEAD"]).trim(), "1");
        assert!(git(&dir, &["status", "--porcelain"]).contains("g.txt"));
    }

    #[test]
    fn clean_removes_untracked_files_in_real_repo() {
        let (temp, dir) = fixture();
        let runner = ProcessRunner;
        std::fs::write(temp.path().join("new.txt"), "x\n").unwrap();
        std::fs::create_dir_all(temp.path().join("scratch/deep")).unwrap();
        std::fs::write(temp.path().join("scratch/deep/a.txt"), "x\n").unwrap();
        std::fs::write(temp.path().join("f.txt"), "changed\n").unwrap();

        discard_untracked(
            &runner,
            &dir,
            &["new.txt".to_string(), "scratch".to_string()],
        )
        .unwrap();

        assert!(!temp.path().join("new.txt").exists());
        assert!(!temp.path().join("scratch").exists());
        assert!(temp.path().join("f.txt").exists());
        assert_eq!(
            std::fs::read_to_string(temp.path().join("f.txt")).unwrap(),
            "changed\n"
        );
    }

    #[test]
    fn clean_never_removes_tracked_files() {
        let (_temp, dir) = fixture();
        let runner = ProcessRunner;

        discard_untracked(&runner, &dir, &["f.txt".to_string()]).unwrap();

        assert!(std::path::Path::new(&dir).join("f.txt").exists());
    }
}
