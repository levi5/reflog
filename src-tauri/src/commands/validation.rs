pub fn validate_repo_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty()
        || path.starts_with('/')
        || path.contains("..")
        || path.contains('\0')
    {
        return Err("caminho relativo inválido".to_string());
    }
    Ok(())
}

pub fn validate_ref_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.starts_with('-')
        || name.contains(' ')
        || name.contains('\0')
        || name.contains('\n')
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
        || oid.len() > 64
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
    if key.is_empty()
        || key.starts_with('-')
        || key.contains('\0')
        || key.contains('\n')
    {
        return Err("chave de configuração inválida".to_string());
    }
    if !ALLOWED_CONFIG_KEYS.contains(&key) {
        return Err("chave de configuração não permitida".to_string());
    }
    Ok(())
}

pub fn validate_config_value(value: &str) -> Result<(), String> {
    if value.contains('\0') || value.contains('\n') {
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