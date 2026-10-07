macro_rules! git_command {
    ($name:ident, $ret:ty, $inner:ident, ($($borrowed:ident: $bty:ty),* $(,)?), ($($owned:ident: $oty:ty),* $(,)?)) => {
        #[tauri::command]
        pub async fn $name(
            state: tauri::State<'_, $crate::AppState>,
            $($borrowed: $bty,)*
            $($owned: $oty,)*
        ) -> Result<$ret, String> {
            let runner = state.runner.clone();
            $crate::commands::run_blocking(move || $inner(runner.as_ref(), $(&$borrowed,)* $($owned,)*)).await
        }
    };
    ($name:ident, $ret:ty, $inner:ident, ($($borrowed:ident: $bty:ty),* $(,)?)) => {
        git_command!($name, $ret, $inner, ($($borrowed: $bty),*), ());
    };
}

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
pub mod worktrees;

pub(crate) async fn run_blocking<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}
