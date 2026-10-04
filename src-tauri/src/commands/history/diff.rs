use crate::commands::validation::{validate_commit_oid, validate_repo_relative_path};
use crate::domain::CommitFileChange;
use crate::runner::GitRunner;

const MAX_DIFF_OUTPUT_BYTES: usize = 2 * 1024 * 1024;
const MAX_FILE_LIST_OUTPUT_BYTES: usize = 512 * 1024;
const MAX_BLAME_OUTPUT_BYTES: usize = 2 * 1024 * 1024;

pub fn diff_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    file: &str,
    staged: bool,
) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    let mut args = vec!["diff"];
    if staged {
        args.push("--cached");
    }
    args.push("--");
    args.push(file);
    runner.run_limited(Some(&root), &args, MAX_DIFF_OUTPUT_BYTES)
}

pub fn commit_files_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
) -> Result<Vec<CommitFileChange>, String> {
    validate_commit_oid(rev)?;
    let root = runner.repo_root(repo_path)?;
    let out = runner.run_limited(
        Some(&root),
        &[
            "show",
            "--name-status",
            "--format=",
            "-z",
            "-m",
            "--first-parent",
            rev,
        ],
        MAX_FILE_LIST_OUTPUT_BYTES,
    )?;
    let mut files = vec![];
    let mut entries = out.split('\0').filter(|entry| !entry.is_empty());
    while let Some(status) = entries.next() {
        let status = status.to_string();
        let first_path = entries.next().unwrap_or("").to_string();
        let (path, old_path) = if status.starts_with('R') || status.starts_with('C') {
            (entries.next().unwrap_or("").to_string(), Some(first_path))
        } else {
            (first_path, None)
        };
        if !path.is_empty() {
            files.push(CommitFileChange {
                status,
                path,
                old_path,
            });
        }
    }
    Ok(files)
}

pub fn commit_diff_of(
    runner: &dyn GitRunner,
    repo_path: &str,
    rev: &str,
    file: Option<String>,
) -> Result<String, String> {
    validate_commit_oid(rev)?;
    let root = runner.repo_root(repo_path)?;
    match file {
        Some(f) if !f.trim().is_empty() => {
            validate_repo_relative_path(f.trim())?;
            runner.run_limited(
                Some(&root),
                &["show", "--first-parent", "--", rev, "--", f.trim()],
                MAX_DIFF_OUTPUT_BYTES,
            )
        }
        _ => runner.run_limited(
            Some(&root),
            &["show", "--first-parent", "--", rev],
            MAX_DIFF_OUTPUT_BYTES,
        ),
    }
}

pub fn blame_of(runner: &dyn GitRunner, repo_path: &str, file: &str) -> Result<String, String> {
    validate_repo_relative_path(file)?;
    let root = runner.repo_root(repo_path)?;
    runner.run_limited(
        Some(&root),
        &["blame", "--line-porcelain", "--", file],
        MAX_BLAME_OUTPUT_BYTES,
    )
}

pub fn ls_files_of(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<String>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run_limited(Some(&root), &["ls-files"], MAX_FILE_LIST_OUTPUT_BYTES)?;
    Ok(out
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect())
}

git_command!(git_diff, String, diff_of, (repo_path: String, file: String), (staged: bool));

git_command!(git_blame, String, blame_of, (repo_path: String, file: String), ());

git_command!(git_ls_files, Vec<String>, ls_files_of, (repo_path: String), ());

git_command!(git_commit_files, Vec<CommitFileChange>, commit_files_of, (repo_path: String, rev: String), ());

git_command!(git_commit_diff, String, commit_diff_of, (repo_path: String, rev: String), (file: Option<String>));

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn parses_commit_files_status_and_path() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "show --name-status --format= -z -m --first-parent abc1234",
                    "M\0src/index.ts\0A\0src/types.ts\0D\0old.txt\0",
                ),
            ],
            &[],
        );
        let files = commit_files_of(&runner, "/r", "abc1234").unwrap();
        assert_eq!(files.len(), 3);
        assert_eq!(files[0].status, "M");
        assert_eq!(files[0].path, "src/index.ts");
        assert_eq!(files[1].status, "A");
        assert_eq!(files[1].path, "src/types.ts");
        assert_eq!(files[2].status, "D");
        assert_eq!(files[2].path, "old.txt");
    }

    #[test]
    fn parses_renames_and_special_paths() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "show --name-status --format= -z -m --first-parent abc1234",
                    "R100\0old\tname\0new\tname\0",
                ),
            ],
            &[],
        );
        let files = commit_files_of(&runner, "/r", "abc1234").unwrap();
        assert_eq!(files[0].path, "new\tname");
        assert_eq!(files[0].old_path.as_deref(), Some("old\tname"));
    }

    #[test]
    fn uses_first_parent_for_merge_file_diffs() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "show --first-parent -- merge123 -- src/file.ts",
                    "diff --git a/src/file.ts b/src/file.ts",
                ),
            ],
            &[],
        );
        assert!(commit_diff_of(&runner, "/r", "merge123", Some("src/file.ts".to_string())).is_ok());
    }

    #[test]
    fn lists_commit_files_in_real_repo() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path().to_string_lossy().to_string();
        let run = |args: &[&str]| {
            let out = std::process::Command::new("git")
                .current_dir(&dir)
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
        };
        run(&["init"]);
        std::fs::write(temp.path().join("f.txt"), "1\n").unwrap();
        run(&["add", "."]);
        run(&["commit", "-m", "one"]);

        let files = commit_files_of(&crate::runner::ProcessRunner, &dir, "HEAD").unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "f.txt");
    }

    #[test]
    fn lists_files_of_a_merge_commit_in_real_repo() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path().to_string_lossy().to_string();
        let run = |args: &[&str]| {
            let out = std::process::Command::new("git")
                .current_dir(&dir)
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
        };
        run(&["init"]);
        std::fs::write(temp.path().join("base.txt"), "1\n").unwrap();
        run(&["add", "."]);
        run(&["commit", "-m", "base"]);
        run(&["checkout", "-b", "side"]);
        std::fs::write(temp.path().join("side.txt"), "2\n").unwrap();
        run(&["add", "."]);
        run(&["commit", "-m", "side"]);
        run(&["checkout", "main"]);
        run(&["merge", "--no-ff", "-m", "merge", "side"]);

        let files = commit_files_of(&crate::runner::ProcessRunner, &dir, "HEAD").unwrap();
        let paths: Vec<&str> = files.iter().map(|file| file.path.as_str()).collect();
        assert_eq!(paths, vec!["side.txt"]);
    }
}
