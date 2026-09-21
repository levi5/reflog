use std::io::Write;
use std::path::Path;
use std::process::Command;
use std::time::Duration;
use wait_timeout::ChildExt;

pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

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
    ) -> Result<String, String>;
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

impl ProcessRunner {
    fn execute(
        &self,
        repo: Option<&str>,
        args: &[&str],
        stdin_input: Option<&str>,
        env_vars: Option<&[(&str, &str)]>,
        timeout: Duration,
    ) -> Result<String, String> {
        let mut cmd = base_command(repo);
        cmd.args(args);

        if let Some(env) = env_vars {
            for (k, v) in env {
                cmd.env(k, v);
            }
        }

        if stdin_input.is_some() {
            cmd.stdin(std::process::Stdio::piped());
        }
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("falha ao executar git: {e}"))?;

        if let Some(input) = stdin_input {
            if let Some(mut stdin) = child.stdin.take() {
                stdin
                    .write_all(input.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
        }

        match child.wait_timeout(timeout).map_err(|e| e.to_string())? {
            Some(status) => {
                let out = child.wait_with_output().map_err(|e| e.to_string())?;
                if status.success() {
                    Ok(String::from_utf8_lossy(&out.stdout).to_string())
                } else {
                    Err(failure_message(&out.stdout, &out.stderr))
                }
            }
            None => {
                let _ = child.kill();
                let _ = child.wait();
                Err("git excedeu o tempo limite".to_string())
            }
        }
    }
}

impl GitRunner for ProcessRunner {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String> {
        self.execute(repo, args, None, None, DEFAULT_TIMEOUT)
    }

    fn run_stdin(
        &self,
        repo: Option<&str>,
        args: &[&str],
        input: &str,
    ) -> Result<String, String> {
        self.execute(repo, args, Some(input), None, DEFAULT_TIMEOUT)
    }

    fn run_env(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
    ) -> Result<String, String> {
        self.execute(repo, args, None, Some(env), DEFAULT_TIMEOUT)
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

        fn run_env(
            &self,
            _repo: Option<&str>,
            args: &[&str],
            _env: &[(&str, &str)],
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