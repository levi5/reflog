use std::io::{Read, Write};
use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use wait_timeout::ChildExt;

pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(60);
pub const NETWORK_TIMEOUT: Duration = Duration::from_secs(300);
pub const OUTPUT_LIMIT_ERROR: &str = "saída do git excede o limite permitido";

pub trait GitRunner: Send + Sync {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String>;
    fn run_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        _timeout: Duration,
    ) -> Result<String, String> {
        self.run(repo, args)
    }
    fn run_env_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
        _timeout: Duration,
    ) -> Result<String, String> {
        self.run_env(repo, args, env)
    }
    fn run_limited(&self, repo: Option<&str>, args: &[&str], max_bytes: usize) -> Result<String, String> {
        self.run(repo, args).and_then(|output| {
            if output.len() > max_bytes {
                Err(OUTPUT_LIMIT_ERROR.to_string())
            } else {
                Ok(output)
            }
        })
    }
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

fn drain_pipe<R: Read>(
    mut pipe: R,
    max_bytes: Option<usize>,
    activity: Arc<AtomicBool>,
) -> Result<(Vec<u8>, bool), String> {
    let mut output = Vec::new();
    let mut exceeded = false;
    let mut buffer = [0; 8192];
    loop {
        let read = pipe.read(&mut buffer).map_err(|e| e.to_string())?;
        if read == 0 {
            return Ok((output, exceeded));
        }
        activity.store(true, Ordering::Relaxed);
        if let Some(limit) = max_bytes {
            let remaining = limit.saturating_sub(output.len());
            let captured = remaining.min(read);
            output.extend_from_slice(&buffer[..captured]);
            exceeded |= captured < read;
        } else {
            output.extend_from_slice(&buffer[..read]);
        }
    }
}

fn base_command(repo: Option<&str>) -> Command {
    let mut cmd = Command::new("git");
    if let Some(dir) = repo {
        cmd.arg("-C").arg(dir);
    }
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    if std::env::var("GIT_SSH_COMMAND").is_err() {
        cmd.env("GIT_SSH_COMMAND", "ssh -o BatchMode=yes");
    }
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
        exec_timeout: Duration,
        max_output_bytes: Option<usize>,
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

        let stdout = child.stdout.take().ok_or_else(|| "stdout indisponível".to_string())?;
        let stderr = child.stderr.take().ok_or_else(|| "stderr indisponível".to_string())?;
        let activity = Arc::new(AtomicBool::new(false));
        let stdout_activity = Arc::clone(&activity);
        let stderr_activity = Arc::clone(&activity);
        let stdout_reader = std::thread::spawn(move || drain_pipe(stdout, max_output_bytes, stdout_activity));
        let stderr_reader = std::thread::spawn(move || drain_pipe(stderr, max_output_bytes, stderr_activity));

        if let Some(input) = stdin_input {
            if let Some(mut stdin) = child.stdin.take() {
                stdin
                    .write_all(input.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
        }

        let poll_interval = Duration::from_millis(200);
        let start_time = Instant::now();
        let mut last_activity = Instant::now();
        let max_absolute_timeout = exec_timeout.saturating_mul(10).max(Duration::from_secs(1800));

        let status = loop {
            match child.wait_timeout(poll_interval).map_err(|e| e.to_string())? {
                Some(status) => break status,
                None => {
                    if activity.swap(false, Ordering::Relaxed) {
                        last_activity = Instant::now();
                    }

                    let idle_duration = last_activity.elapsed();
                    let total_duration = start_time.elapsed();

                    if idle_duration >= exec_timeout || total_duration >= max_absolute_timeout {
                        let _ = child.kill();
                        let _ = child.wait();
                        drop(stdout_reader);
                        drop(stderr_reader);
                        return Err("git excedeu o tempo limite".to_string());
                    }
                }
            }
        };
        let (stdout, stdout_exceeded) = stdout_reader
            .join()
            .map_err(|_| "falha ao ler stdout do git".to_string())??;
        let (stderr, stderr_exceeded) = stderr_reader
            .join()
            .map_err(|_| "falha ao ler stderr do git".to_string())??;
        if stdout_exceeded || stderr_exceeded {
            return Err(OUTPUT_LIMIT_ERROR.to_string());
        }
        if status.success() {
            Ok(String::from_utf8_lossy(&stdout).to_string())
        } else {
            Err(failure_message(&stdout, &stderr))
        }
    }
}

impl GitRunner for ProcessRunner {
    fn run(&self, repo: Option<&str>, args: &[&str]) -> Result<String, String> {
        self.execute(repo, args, None, None, DEFAULT_TIMEOUT, None)
    }

    fn run_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        timeout: Duration,
    ) -> Result<String, String> {
        self.execute(repo, args, None, None, timeout, None)
    }

    fn run_limited(&self, repo: Option<&str>, args: &[&str], max_bytes: usize) -> Result<String, String> {
        self.execute(repo, args, None, None, DEFAULT_TIMEOUT, Some(max_bytes))
    }

    fn run_stdin(
        &self,
        repo: Option<&str>,
        args: &[&str],
        input: &str,
    ) -> Result<String, String> {
        self.execute(repo, args, Some(input), None, DEFAULT_TIMEOUT, None)
    }

    fn run_env(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
    ) -> Result<String, String> {
        self.execute(repo, args, None, Some(env), DEFAULT_TIMEOUT, None)
    }

    fn run_env_with_timeout(
        &self,
        repo: Option<&str>,
        args: &[&str],
        env: &[(&str, &str)],
        timeout: Duration,
    ) -> Result<String, String> {
        self.execute(repo, args, None, Some(env), timeout, None)
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
mod tests {
    use super::*;

    #[test]
    fn drains_large_git_output_before_waiting_for_exit() {
        let dir = tempfile::tempdir().unwrap();
        let before = dir.path().join("before.txt");
        let after = dir.path().join("after.txt");
        std::fs::write(&before, "").unwrap();
        std::fs::write(&after, "x".repeat(128 * 1024)).unwrap();

        let result = ProcessRunner.run(
            None,
            &[
                "diff",
                "--no-index",
                "--",
                before.to_str().unwrap(),
                after.to_str().unwrap(),
            ],
        );

        // git diff exits with 1 when it finds a difference; receiving the full
        // diff here proves its output pipe was drained while the process ran.
        assert!(result.unwrap_err().contains("diff --git"));
    }

    #[test]
    fn rejects_output_larger_than_limit_without_blocking_the_process() {
        let dir = tempfile::tempdir().unwrap();
        let before = dir.path().join("before.txt");
        let after = dir.path().join("after.txt");
        std::fs::write(&before, "").unwrap();
        std::fs::write(&after, "x".repeat(128 * 1024)).unwrap();

        let result = ProcessRunner.run_limited(
            None,
            &[
                "diff",
                "--no-index",
                "--",
                before.to_str().unwrap(),
                after.to_str().unwrap(),
            ],
            1024,
        );

        assert_eq!(result.unwrap_err(), OUTPUT_LIMIT_ERROR);
    }

    #[test]
    fn times_out_on_unresponsive_command() {
        let result = ProcessRunner.execute(
            None,
            &["check-ignore", "--stdin"],
            None,
            None,
            Duration::from_millis(250),
            None,
        );
        assert_eq!(result.unwrap_err(), "git excedeu o tempo limite");
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
