use std::path::Path;
use std::process::Command;

pub trait GitRunner: Send + Sync {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String>;
    fn run_stdin(
        &self,
        repo: Option<&str>,
        args: &[&str],
        input: &str,
    ) -> Result<String, String>;
    fn run_env(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
    ) -> Result<String, String> {
        let _ = env;
        self.run(repo, args)
    }
    fn read_file(&self, path: &Path) -> Result<String, String>;
    fn write_file(&self, path: &Path, content: &str) -> Result<(), String>;
    fn path_exists(&self, path: &Path) -> bool;

    fn repo_root(&self, repo_path: &str) -> Result<String, String> {
        self.run(Some(repo_path), &["rev-parse", "--show-toplevel"])
            .map(|s| s.trim().to_string())
    }

    fn is_repo(&self, path: &str) -> bool {
        self.path_exists(&Path::new(path).join(".git"))
            || self.run(Some(path), &["rev-parse", "--git-dir"]).is_ok()
    }
}

pub struct ProcessRunner;

fn failure_message(stdout: &[u8], stderr: &[u8]) -> String {
    let err = String::from_utf8_lossy(stderr).trim().to_string();
    if !err.is_empty() {
        return err;
    }
    String::from_utf8_lossy(stdout).trim().to_string()
}

fn base_command(repo: Option<&str>) -> Command {
    let mut cmd = Command::new("git");
    if let Some(dir) = repo {
        cmd.arg("-C").arg(dir);
    }
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.env("GIT_PAGER", "cat");
    cmd.env("GIT_EDITOR", "true");
    cmd
}

impl GitRunner for ProcessRunner {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String> {
        let mut cmd = base_command(repo);
        let out = cmd
            .args(args)
            .output()
            .map_err(|e| format!("falha ao executar git: {e}"))?;
        match out.status.success() {
            true => Ok(String::from_utf8_lossy(&out.stdout).to_string()),
            false => Err(failure_message(&out.stdout, &out.stderr)),
        }
    }

    fn run_stdin(
        &self,
        repo: Option<&str>,
        args: &[&str],
        input: &str,
    ) -> Result<String, String> {
        use std::io::Write;
        let mut cmd = base_command(repo);
        let mut child = cmd
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("falha ao executar git: {e}"))?;
        child
            .stdin
            .as_mut()
            .ok_or_else(|| "sem stdin".to_string())?
            .write_all(input.as_bytes())
            .map_err(|e| e.to_string())?;
        let out = child.wait_with_output().map_err(|e| e.to_string())?;
        match out.status.success() {
            true => Ok(String::from_utf8_lossy(&out.stdout).to_string()),
            false => Err(failure_message(&out.stdout, &out.stderr)),
        }
    }

    fn run_env(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
    ) -> Result<String, String> {
        let mut cmd = base_command(repo);
        for (k, v) in env {
            cmd.env(k, v);
        }
        let out = cmd
            .args(args)
            .output()
            .map_err(|e| format!("falha ao executar git: {e}"))?;
        match out.status.success() {
            true => Ok(String::from_utf8_lossy(&out.stdout).to_string()),
            false => Err(failure_message(&out.stdout, &out.stderr)),
        }
    }

    fn read_file(&self, path: &Path) -> Result<String, String> {
        std::fs::read_to_string(path).map_err(|e| e.to_string())
    }

    fn write_file(&self, path: &Path, content: &str) -> Result<(), String> {
        std::fs::write(path, content).map_err(|e| e.to_string())
    }

    fn path_exists(&self, path: &Path) -> bool {
        path.exists()
    }
}

#[cfg(test)]
pub mod mock {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::Mutex;

    pub struct MockRunner {
        pub outputs: HashMap<String, Result<String, String>>,
        pub files: Mutex<HashMap<PathBuf, String>>,
        pub existing: Vec<PathBuf>,
    }

    impl MockRunner {
        pub fn new(outputs: &[(&str, &str)], files: &[(&str, &str)]) -> Self {
            Self {
                outputs: outputs
                    .iter()
                    .map(|(k, v)| (k.to_string(), Ok(v.to_string())))
                    .collect(),
                files: Mutex::new(
                    files
                        .iter()
                        .map(|(k, v)| (PathBuf::from(k), v.to_string()))
                        .collect(),
                ),
                existing: vec![],
            }
        }

        pub fn with_existing(mut self, paths: &[&str]) -> Self {
            self.existing = paths.iter().map(PathBuf::from).collect();
            self
        }
    }

    impl GitRunner for MockRunner {
        fn run(&self, _repo: Option<&str>, args: &[&str]) -> Result<String, String> {
            self.outputs
                .get(&args.join(" "))
                .cloned()
                .unwrap_or(Err("unexpected command".to_string()))
        }

        fn run_stdin(
            &self,
            _repo: Option<&str>,
            args: &[&str],
            _input: &str,
        ) -> Result<String, String> {
            self.outputs
                .get(&args.join(" "))
                .cloned()
                .unwrap_or(Err("unexpected command".to_string()))
        }

        fn read_file(&self, path: &Path) -> Result<String, String> {
            self.files
                .lock()
                .unwrap()
                .get(path)
                .cloned()
                .ok_or_else(|| "file not found".to_string())
        }

        fn write_file(&self, path: &Path, content: &str) -> Result<(), String> {
            self.files
                .lock()
                .unwrap()
                .insert(path.to_path_buf(), content.to_string());
            Ok(())
        }

        fn path_exists(&self, path: &Path) -> bool {
            self.existing.contains(&path.to_path_buf())
        }
    }
}
