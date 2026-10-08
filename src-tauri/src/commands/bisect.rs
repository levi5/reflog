use crate::commands::validation::validate_rev_spec;
use crate::runner::GitRunner;

pub fn bisect_start(
    runner: &dyn GitRunner,
    repo_path: &str,
    bad: &str,
    good: &str,
) -> Result<String, String> {
    let bad_rev = bad.trim();
    let good_rev = good.trim();
    if bad_rev.is_empty() || good_rev.is_empty() {
        return Err("bisect needs a bad and a good commit".to_string());
    }
    validate_rev_spec(bad_rev)?;
    validate_rev_spec(good_rev)?;
    let root = runner.repo_root(repo_path)?;
    let mut out = runner.run(Some(&root), &["bisect", "start"])?;
    for (label, rev) in [("bad", bad_rev), ("good", good_rev)] {
        match runner.run(Some(&root), &["bisect", label, rev]) {
            Ok(step) => {
                out.push('\n');
                out.push_str(&step);
            }
            Err(e) => {
                let _ = runner.run(Some(&root), &["bisect", "reset"]);
                return Err(e);
            }
        }
    }
    Ok(out)
}

pub fn bisect_good(runner: &dyn GitRunner, repo_path: &str, rev: Option<String>) -> Result<String, String> {
    mark(runner, repo_path, "good", rev)
}

pub fn bisect_bad(runner: &dyn GitRunner, repo_path: &str, rev: Option<String>) -> Result<String, String> {
    mark(runner, repo_path, "bad", rev)
}

fn mark(
    runner: &dyn GitRunner,
    repo_path: &str,
    label: &str,
    rev: Option<String>,
) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    match rev {
        Some(r) if !r.trim().is_empty() => {
            validate_rev_spec(r.trim())?;
            let owned = r.trim().to_string();
            runner.run(Some(&root), &["bisect", label, &owned])
        }
        _ => runner.run(Some(&root), &["bisect", label]),
    }
}

pub fn bisect_skip(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["bisect", "skip"])
}

pub fn bisect_reset(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["bisect", "reset"])
}

pub fn bisect_log(runner: &dyn GitRunner, repo_path: &str) -> Result<String, String> {
    let root = runner.repo_root(repo_path)?;
    runner.run(Some(&root), &["bisect", "log"])
}

git_command!(git_bisect_start, String, bisect_start, (repo_path: String, bad: String, good: String), ());

git_command!(git_bisect_good, String, bisect_good, (repo_path: String), (rev: Option<String>));

git_command!(git_bisect_bad, String, bisect_bad, (repo_path: String), (rev: Option<String>));

git_command!(git_bisect_skip, String, bisect_skip, (repo_path: String), ());

git_command!(git_bisect_reset, String, bisect_reset, (repo_path: String), ());

git_command!(git_bisect_log, String, bisect_log, (repo_path: String), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;
    use crate::runner::ProcessRunner;
    use crate::test_support::git;

    #[test]
    fn starts_with_bad_and_good_revs() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("bisect start", "started"),
                ("bisect bad HEAD", "bad marked"),
                ("bisect good v1.0", "good marked"),
            ],
            &[],
        );
        let out = bisect_start(&runner, "/r", "HEAD", "v1.0").unwrap();
        assert!(out.contains("started"));
        assert!(out.contains("good marked"));
    }

    #[test]
    fn resets_when_marking_fails() {
        let runner = MockRunner::with_failures(
            &[("bisect good nope", "unknown revision")],
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("bisect start", "started"),
                ("bisect bad HEAD", "bad marked"),
                ("bisect reset", "reset"),
            ],
        );
        assert!(bisect_start(&runner, "/r", "HEAD", "nope").is_err());
        assert_eq!(runner.calls_for("bisect reset"), 1);
    }

    #[test]
    fn rejects_empty_and_option_like_revs() {
        let runner = MockRunner::new(&[("rev-parse --show-toplevel", "/r")], &[]);
        assert!(bisect_start(&runner, "/r", "", "v1.0").is_err());
        assert!(bisect_start(&runner, "/r", "HEAD", "--evil").is_err());
        assert!(bisect_good(&runner, "/r", Some("--evil".into())).is_err());
    }

    #[test]
    fn marks_current_or_given_rev() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("bisect good", "good"),
                ("bisect skip", "skipped"),
                ("bisect reset", "reset"),
                ("bisect log", "log"),
            ],
            &[],
        );
        assert_eq!(bisect_good(&runner, "/r", None).unwrap(), "good");
        assert_eq!(bisect_skip(&runner, "/r").unwrap(), "skipped");
        assert_eq!(bisect_reset(&runner, "/r").unwrap(), "reset");
        assert_eq!(bisect_log(&runner, "/r").unwrap(), "log");

        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                ("bisect bad abc123", "bad"),
            ],
            &[],
        );
        assert_eq!(
            bisect_bad(&runner, "/r", Some("abc123".into())).unwrap(),
            "bad"
        );
    }

    #[test]
    fn bisects_a_real_repo_end_to_end() {
        let base = std::env::temp_dir().join(format!(
            "reflog-bisect-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).unwrap();
        let dir = base.to_string_lossy().to_string();
        git(&dir, &["init"]);
        git(&dir, &["config", "user.name", "demo"]);
        git(&dir, &["config", "user.email", "demo@demo"]);
        for (name, file, content) in [
            ("commit-1", "a.txt", "1\n"),
            ("commit-2", "b.txt", "2\n"),
            ("commit-3", "c.txt", "3\n"),
            ("commit-4", "d.txt", "4\n"),
            ("commit-5", "e.txt", "5\n"),
            ("commit-6", "f.txt", "6\n"),
            ("commit-7", "g.txt", "7\n"),
        ] {
            std::fs::write(base.join(file), content).unwrap();
            git(&dir, &["add", "."]);
            git(&dir, &["commit", "-m", name]);
        }
        let runner = ProcessRunner;
        let good = git(&dir, &["rev-parse", "HEAD~6"]).trim().to_string();
        let out = bisect_start(&runner, &dir, "HEAD", &good).unwrap();
        assert!(!out.trim().is_empty());

        let log = bisect_log(&runner, &dir).unwrap();
        assert!(log.contains("# bad:"));
        assert!(log.contains("# good:"));

        let state = std::path::Path::new(&dir).join(".git/BISECT_LOG");
        let gitdir = git(&dir, &["rev-parse", "--git-dir"]).trim().to_string();
        let log_path = std::path::Path::new(&dir).join(gitdir).join("BISECT_LOG");
        assert!(state.exists() || log_path.exists());

        bisect_reset(&runner, &dir).unwrap();
        assert!(!log_path.exists());
        let _ = std::fs::remove_dir_all(&base);
    }
}
