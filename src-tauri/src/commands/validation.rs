pub fn validate_repo_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\0') || path.contains('\n') || path.len() > 4096 {
        return Err("caminho do repositório inválido".to_string());
    }
    Ok(())
}

pub fn has_parent_traversal(path: &str) -> bool {
    path.split(['/', '\\']).any(|segment| segment == "..")
}

pub fn validate_repo_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty()
        || path.starts_with('/')
        || path.starts_with('\\')
        || has_parent_traversal(path)
        || path.contains('\0')
        || path.contains('\n')
        || path.len() > 4096
    {
        return Err("caminho relativo inválido".to_string());
    }
    Ok(())
}

pub fn validate_ref_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.starts_with('-')
        || name.starts_with('.')
        || name.contains(' ')
        || name.contains('\0')
        || name.contains('\n')
        || name.contains("..")
        || name.contains('~')
        || name.contains('^')
        || name.contains(':')
        || name.contains('?')
        || name.contains('*')
        || name.contains('[')
        || name.contains('@')
        || name.contains('\\')
        || name.ends_with('.')
        || name.ends_with(".lock")
        || name.contains("//")
        || name.len() > 256
    {
        return Err("nome de ref inválido".to_string());
    }
    Ok(())
}

pub fn validate_commit_oid(oid: &str) -> Result<(), String> {
    if oid.is_empty()
        || oid.starts_with('-')
        || oid.contains(' ')
        || oid.contains('\0')
        || oid.contains('\n')
        || oid.len() > 64
        || !oid.chars().all(|c| {
            c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '/' || c == '~' || c == '^'
        })
    {
        return Err("OID de commit inválido".to_string());
    }
    Ok(())
}

pub fn validate_remote_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.starts_with('-')
        || name.contains(' ')
        || name.contains('\0')
        || name.contains('\n')
    {
        return Err("nome de remoto inválido".to_string());
    }
    Ok(())
}

pub fn validate_clone_url(url: &str) -> Result<(), String> {
    if url.is_empty()
        || url.starts_with('-')
        || url.contains('\0')
        || url.contains('\n')
        || url.len() > 2048
    {
        return Err("URL de clone inválida".to_string());
    }
    let lower = url.to_ascii_lowercase();
    if lower.starts_with("ext::")
        || lower.starts_with("fd::")
        || lower.starts_with("ext ")
        || url.starts_with(';')
        || url.starts_with('|')
    {
        return Err("URL de clone inválida".to_string());
    }
    Ok(())
}

pub fn validate_clone_path(path: &str) -> Result<(), String> {
    if path.is_empty() || path.contains('\0') || path.contains('\n') {
        return Err("caminho de destino inválido".to_string());
    }
    Ok(())
}

pub const ALLOWED_CONFIG_KEYS: &[&str] = &[
    "user.name",
    "user.email",
    "commit.gpgsign",
    "commit.template",
    "push.default",
    "pull.rebase",
    "core.autocrlf",
    "core.safecrlf",
    "core.eol",
    "diff.algorithm",
    "merge.ff",
    "init.defaultBranch",
];

pub fn validate_config_key(key: &str) -> Result<(), String> {
    if key.is_empty() || key.starts_with('-') || key.contains('\0') || key.contains('\n') {
        return Err("chave de configuração inválida".to_string());
    }
    if !ALLOWED_CONFIG_KEYS.contains(&key) {
        return Err("chave de configuração não permitida".to_string());
    }
    Ok(())
}

pub fn validate_config_value(value: &str) -> Result<(), String> {
    if value.contains('\0') || value.contains('\n') || value.starts_with('-') {
        return Err("valor de configuração inválido".to_string());
    }
    Ok(())
}

pub fn validate_stash_message(message: &str) -> Result<(), String> {
    if message.contains('\0') || message.len() > 1024 {
        return Err("mensagem de stash inválida".to_string());
    }
    Ok(())
}

pub fn validate_patch_size(patch: &str, max_bytes: usize) -> Result<(), String> {
    if patch.as_bytes().len() > max_bytes {
        return Err("patch excede tamanho máximo".to_string());
    }
    Ok(())
}
pub fn validate_rev_spec(rev: &str) -> Result<(), String> {
    if rev.is_empty()
        || rev.starts_with('-')
        || rev.contains(' ')
        || rev.contains('\0')
        || rev.contains('\n')
        || rev.len() > 512
    {
        return Err("revisão inválida".to_string());
    }
    Ok(())
}

pub fn validate_search_term(term: &str) -> Result<(), String> {
    if term.contains('\0') || term.contains('\n') || term.len() > 512 {
        return Err("termo de busca inválido".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_relative_paths_that_only_look_like_traversal() {
        assert!(validate_repo_relative_path("a..b.txt").is_ok());
        assert!(validate_repo_relative_path("notes..2024/readme.md").is_ok());
        assert!(validate_repo_relative_path("..hidden").is_ok());
        assert!(validate_repo_relative_path("dir/..name/file.txt").is_ok());
    }

    #[test]
    fn rejects_actual_parent_traversal_and_absolute_paths() {
        assert!(validate_repo_relative_path("..").is_err());
        assert!(validate_repo_relative_path("../secrets").is_err());
        assert!(validate_repo_relative_path("src/../../etc/passwd").is_err());
        assert!(validate_repo_relative_path("src\\..\\..\\windows").is_err());
        assert!(validate_repo_relative_path("/etc/passwd").is_err());
        assert!(validate_repo_relative_path("").is_err());
        assert!(validate_repo_relative_path("a\0b").is_err());
        assert!(validate_repo_relative_path("a\nb").is_err());
    }

    #[test]
    fn detects_parent_traversal_per_segment() {
        assert!(has_parent_traversal("a/../b"));
        assert!(has_parent_traversal("..\\b"));
        assert!(has_parent_traversal(".."));
        assert!(!has_parent_traversal("a/..b/c"));
        assert!(!has_parent_traversal("a..b/..c"));
    }

    #[test]
    fn config_keys_are_allow_listed() {
        assert!(validate_config_key("user.name").is_ok());
        assert!(validate_config_key("commit.gpgsign").is_ok());
        assert!(validate_config_key("credential.helper").is_err());
        assert!(validate_config_key("core.sshCommand").is_err());
        assert!(validate_config_key("--global").is_err());
    }

    #[test]
    fn ref_names_reject_option_like_and_shell_unsafe_input() {
        assert!(validate_ref_name("feature/ok-1").is_ok());
        assert!(validate_ref_name("-force").is_err());
        assert!(validate_ref_name("has space").is_err());
        assert!(validate_ref_name("a..b").is_err());
        assert!(validate_ref_name("trailing.").is_err());
        assert!(validate_ref_name("main.lock").is_err());
    }

    #[test]
    fn patch_size_is_capped() {
        assert!(validate_patch_size("ok", 4).is_ok());
        assert!(validate_patch_size("toolong", 4).is_err());
    }
}
