pub mod files;
pub mod history;
pub mod meta;
pub mod playground;
pub mod rebase;
pub mod refs;
pub mod repo;
pub mod staging;
pub mod status;
pub mod submodules;
pub mod sync;
pub mod templates;
pub mod validation;

pub(crate) async fn run_blocking<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}
