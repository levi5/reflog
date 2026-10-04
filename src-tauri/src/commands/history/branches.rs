use crate::domain::BranchInfo;
use crate::runner::GitRunner;

pub fn branches_of(runner: &dyn GitRunner, repo_path: &str) -> Result<Vec<BranchInfo>, String> {
    let root = runner.repo_root(repo_path)?;
    let out = runner.run(
        Some(&root),
        &[
            "branch",
            "--all",
            "--format=%(refname)|%(refname:short)|%(HEAD)|%(upstream:track,nobracket)|%(upstream:short)",
        ],
    )?;
    let mut list = vec![];
    for line in out.lines() {
        let mut it = line.split('|');
        let refname = it.next().unwrap_or("").trim();
        let name = it.next().unwrap_or("").trim().to_string();
        if name.is_empty() || name.contains("HEAD detached") {
            continue;
        }
        let head = it.next().unwrap_or("").trim();
        let track = it.next().unwrap_or("").trim();
        let upstream_raw = it.next().unwrap_or("").trim();

        let mut ahead = 0;
        let mut behind = 0;
        if !track.is_empty() {
            for part in track.split(',') {
                let p = part.trim();
                if let Some(n) = p.strip_prefix("ahead ") {
                    ahead = n.parse().unwrap_or(0);
                }
                if let Some(n) = p.strip_prefix("behind ") {
                    behind = n.parse().unwrap_or(0);
                }
            }
        }

        let upstream = if upstream_raw.is_empty() {
            None
        } else {
            Some(upstream_raw.to_string())
        };

        list.push(BranchInfo {
            current: head == "*",
            remote: refname.starts_with("refs/remotes/"),
            name,
            ahead,
            behind,
            upstream,
        });
    }
    Ok(list)
}

git_command!(git_branches, Vec<BranchInfo>, branches_of, (repo_path: String), ());

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runner::mock::MockRunner;

    #[test]
    fn slash_branches_are_local_and_remotes_are_remote() {
        let runner = MockRunner::new(
            &[
                ("rev-parse --show-toplevel", "/r"),
                (
                    "branch --all --format=%(refname)|%(refname:short)|%(HEAD)|%(upstream:track,nobracket)|%(upstream:short)",
                    "refs/heads/feat/a|feat/a|*|behind 2|origin/feat/a\nrefs/heads/master|master| |ahead 1, behind 3|origin/master\nrefs/heads/local|local| ||\nrefs/remotes/origin/main|origin/main| ||",
                ),
            ],
            &[],
        );
        let list = branches_of(&runner, "/r").unwrap();
        let feat = list.iter().find(|b| b.name == "feat/a").unwrap();
        assert!(!feat.remote);
        assert!(feat.current);
        assert_eq!(feat.behind, 2);
        assert_eq!(feat.ahead, 0);
        assert_eq!(feat.upstream.as_deref(), Some("origin/feat/a"));

        let master = list.iter().find(|b| b.name == "master").unwrap();
        assert!(!master.remote);
        assert!(!master.current);
        assert_eq!(master.ahead, 1);
        assert_eq!(master.behind, 3);
        assert_eq!(master.upstream.as_deref(), Some("origin/master"));

        let local = list.iter().find(|b| b.name == "local").unwrap();
        assert!(!local.remote);
        assert_eq!(local.ahead, 0);
        assert_eq!(local.behind, 0);
        assert_eq!(local.upstream, None);

        let origin = list.iter().find(|b| b.name == "origin/main").unwrap();
        assert!(origin.remote);
        assert!(!origin.current);
    }
}
