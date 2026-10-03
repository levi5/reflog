use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;

mod commands;
mod domain;
mod runner;

use runner::{GitRunner, ProcessRunner};

pub struct AppState {
    pub runner: Arc<dyn GitRunner>,
}

pub struct CliPath(pub Mutex<Option<String>>);

fn resolve_cli_path(value: &str) -> String {
    let trimmed = value.trim();
    let path = PathBuf::from(if trimmed.is_empty() { "." } else { trimmed });
    let joined = if path.is_absolute() {
        path
    } else {
        std::env::current_dir().unwrap_or_default().join(path)
    };
    if let Ok(canonical) = std::fs::canonicalize(&joined) {
        return canonical.to_string_lossy().into_owned();
    }
    let mut out = PathBuf::new();
    for comp in joined.components() {
        use std::path::Component;
        match comp {
            Component::CurDir => {},
            Component::ParentDir => {
                out.pop();
            },
            other => out.push(other.as_os_str()),
        }
    }
    out.to_string_lossy().into_owned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            unsafe { std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1") };
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            runner: Arc::new(ProcessRunner),
        })
        .manage(CliPath(Mutex::new(None)))
        .setup(|app| {
            if let Ok(matches) = app.cli().matches() {
                if let Some(path_arg) = matches.args.get("path") {
                    if let Some(value) = path_arg.value.as_str() {
                        let path = resolve_cli_path(value);
                        if let Some(cli_path) = app.try_state::<CliPath>() {
                            if let Ok(mut stored_path) = cli_path.0.lock() {
                                *stored_path = Some(path.clone());
                            }
                        }
                        let _ = app.emit("cli-open-path", path);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::repo::check_repo,
            commands::repo::repo_root,
            commands::repo::init_repo,
            commands::repo::take_cli_path,
            commands::status::git_status,
            commands::history::branches::git_branches,
            commands::history::log::git_count,
            commands::history::log::git_log,
            commands::history::log::git_graph,
            commands::history::log::git_reflog,
            commands::history::diff::git_commit_files,
            commands::history::diff::git_commit_diff,

            commands::history::diff::git_diff,
            commands::history::diff::git_show,
            commands::files::content::get_file_content,
            commands::files::content::save_file_content,
            
            commands::files::conflicted::get_conflicted_files,
            commands::files::conflicted::parse_conflicts,
            commands::staging::git_add,
            commands::staging::git_commit,
            commands::staging::git_amend_commit,
            commands::staging::git_checkout,
            commands::sync::git_merge_abort,
            commands::sync::git_pull,
            commands::sync::git_push,
            commands::sync::git_stash,
            commands::sync::git_stash_pop,
            commands::sync::git_stash_list,
            commands::sync::git_stash_drop,
            commands::sync::git_stash_show,
            commands::sync::git_stash_apply,
            commands::staging::git_cherry_pick,
            commands::staging::git_cherry_pick_continue,
            commands::staging::git_cherry_pick_abort,
            commands::staging::git_revert,
            commands::staging::git_revert_continue,
            commands::staging::git_revert_abort,
            commands::staging::git_reset,

            commands::staging::git_unstage,
            commands::staging::git_discard,
            commands::staging::git_apply_patch,
            commands::history::diff::git_blame,
            commands::history::diff::git_ls_files,
            commands::sync::git_merge_opts,
            commands::sync::git_fetch,
            commands::refs::git_branch_delete,
            commands::refs::git_branch_rename,
            commands::refs::git_tag_list,
            commands::refs::git_tag_create,
            commands::refs::git_tag_delete,
            commands::refs::git_remote_list,
            commands::refs::git_remote_add,
            commands::refs::git_remote_remove,
            commands::meta::git_config_get,
            commands::meta::git_config_set,
            commands::meta::git_identity,
            commands::templates::git_template_list,
            commands::templates::git_template_read,
            commands::templates::git_template_write,
            commands::templates::git_template_delete,
            commands::playground::git_run,
            commands::submodules::git_submodule_list,
            commands::submodules::git_superproject_chain,
            commands::meta::git_version,
            commands::meta::git_remote_url,
            commands::meta::git_gpg,
            commands::submodules::git_submodule_update,
            commands::rebase::git_rebase_commits,
            commands::rebase::git_rebase_start,
            commands::rebase::git_rebase_continue,
            commands::rebase::git_rebase_abort,

            commands::meta::git_clone,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
