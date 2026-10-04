use std::process::Command;

fn command(dir: &str, args: &[&str]) -> Command {
    let mut command = Command::new("git");
    command
        .current_dir(dir)
        .env("GIT_CONFIG_NOSYSTEM", "1")
        .env("GIT_CONFIG_GLOBAL", "/dev/null")
        .arg("-c")
        .arg("user.name=demo")
        .arg("-c")
        .arg("user.email=demo@demo")
        .arg("-c")
        .arg("init.defaultBranch=main")
        .arg("-c")
        .arg("protocol.file.allow=always")
        .arg("-c")
        .arg("commit.gpgsign=false")
        .args(args);
    command
}

pub fn git(dir: &str, args: &[&str]) -> String {
    let out = command(dir, args).output().expect("git binary missing");
    assert!(
        out.status.success(),
        "git {} failed: {}",
        args.join(" "),
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8_lossy(&out.stdout).to_string()
}
