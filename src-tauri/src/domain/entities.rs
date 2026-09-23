use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StatusResult {
    pub root: String,
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub files: Vec<FileStatus>,
    pub merging: bool,
    pub cherry_picking: bool,
    pub reverting: bool,
    #[serde(default)]
    pub rebasing: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct FileStatus {
    pub path: String,
    pub x: String,
    pub y: String,
    pub staged: bool,
    pub unmerged: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: bool,
    #[serde(default)]
    pub ahead: usize,
    #[serde(default)]
    pub behind: usize,
    #[serde(default)]
    pub upstream: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub short: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct ReflogEntry {
    pub hash: String,
    pub short: String,
    pub selector: String,
    pub action: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct StashItem {
    pub index: usize,
    pub hash: String,
    pub selector: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommitFileChange {
    pub status: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_path: Option<String>,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictBlock {
    pub id: usize,
    pub start_line: usize,
    pub mid_line: Option<usize>,
    pub base_start: Option<usize>,
    pub base_end: Option<usize>,
    pub end_line: usize,
    pub current_label: String,
    pub incoming_label: String,
    pub current: Vec<String>,
    pub base: Vec<String>,
    pub incoming: Vec<String>,
    pub is_diff3: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictFile {
    pub path: String,
    pub abs_path: String,
    pub content: String,
    pub conflicts: Vec<ConflictBlock>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Identity {
    pub name: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubmoduleInfo {
  pub name: String,
  pub path: String,
  pub url: String,
  pub branch: String,
  pub hash: String,
  pub state: String,
}
