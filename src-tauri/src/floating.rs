use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Mutex,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const LABEL: &str = "floating";
const SHORTCUT: &str = "Ctrl+Shift+Space";
const EXPANDED: f64 = 300.0;
const TRAY: &str = "floating-tray";

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
struct Anchor {
    x: f64,
    y: f64,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
struct Preferences {
    enabled: bool,
    anchor: Option<Anchor>,
    panel_sizes: HashMap<WorkspaceKind, PanelSize>,
}

#[derive(Clone, Copy, Debug, Default, Eq, Hash, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WorkspaceKind {
    #[default]
    Commit,
    Merge,
    Stash,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
struct PanelSize {
    width: f64,
    height: f64,
}

impl WorkspaceKind {
    fn default_size(self) -> PanelSize {
        match self {
            Self::Commit => PanelSize {
                width: 520.0,
                height: 700.0,
            },
            Self::Merge => PanelSize {
                width: 480.0,
                height: 620.0,
            },
            Self::Stash => PanelSize {
                width: 500.0,
                height: 640.0,
            },
        }
    }
}

impl PanelSize {
    fn bounded(self) -> Self {
        Self {
            width: if self.width.is_finite() {
                self.width.clamp(360.0, 1400.0)
            } else {
                520.0
            },
            height: if self.height.is_finite() {
                self.height.clamp(400.0, 1200.0)
            } else {
                640.0
            },
        }
    }
}

#[derive(Default)]
struct Geometry {
    anchor: Option<Anchor>,
    manual_move: bool,
    expanded: bool,
    panel: bool,
    initialized: bool,
    scale: f64,
    render_scale: Option<f64>,
    manual_resize: bool,
    workspace: WorkspaceKind,
    panel_sizes: HashMap<WorkspaceKind, PanelSize>,
}

#[derive(Default)]
pub struct FloatingState {
    enabled: AtomicBool,
    exiting: AtomicBool,
    geometry: Mutex<Geometry>,
    saving: Mutex<()>,
    startup_error: Mutex<Option<String>>,
    pointer_monitor_started: AtomicBool,
    pointer_epoch: AtomicU64,
}

#[derive(Default)]
struct PointerTracking {
    epoch: u64,
    ignore: Option<bool>,
    leaving_since: Option<std::time::Instant>,
}

impl PointerTracking {
    fn reset(&mut self) {
        self.ignore = None;
        self.leaving_since = None;
    }

    fn synchronize(&mut self, epoch: u64) {
        if self.epoch != epoch {
            self.epoch = epoch;
            self.reset();
        }
    }
}

fn show_floating_window(window: &WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    // Re-map first, then restore the native input region. A hidden window can
    // retain its click-through shape even though it is visible again.
    let result = window.set_ignore_cursor_events(false);
    // Invalidate the monitor's cache even on a failed native reset, so it retries.
    // A rapid hide/show may happen entirely between the monitor's 40 ms ticks.
    window
        .state::<FloatingState>()
        .pointer_epoch
        .fetch_add(1, Ordering::SeqCst);
    result.map_err(|e| e.to_string())
}

fn preference_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("floating-mode.json"))
}

fn save_preferences(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<FloatingState>();
    let _saving = state.saving.lock().map_err(|e| e.to_string())?;
    let (anchor, panel_sizes) = {
        let geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        (geometry.anchor, geometry.panel_sizes.clone())
    };
    let preferences = Preferences {
        enabled: state.enabled.load(Ordering::SeqCst),
        anchor,
        panel_sizes,
    };
    let path = preference_path(app)?;
    let parent = path.parent().ok_or("Invalid settings directory")?;
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = path.with_extension("json.tmp");
    std::fs::write(
        &temporary,
        serde_json::to_vec_pretty(&preferences).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    std::fs::rename(temporary, path).map_err(|e| e.to_string())
}

pub fn restore(app: &AppHandle) {
    let result = preference_path(app).and_then(|path| match std::fs::read(path) {
        Ok(bytes) => serde_json::from_slice::<Preferences>(&bytes).map_err(|e| e.to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Preferences::default()),
        Err(e) => Err(e.to_string()),
    });
    match result {
        Ok(preferences) => {
            if let Ok(mut geometry) = app.state::<FloatingState>().geometry.lock() {
                geometry.anchor = preferences.anchor;
                geometry.panel_sizes = preferences
                    .panel_sizes
                    .into_iter()
                    .map(|(kind, size)| (kind, size.bounded()))
                    .collect();
            }
            if preferences.enabled {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    match apply_mode(&app, true) {
                        Ok(()) => {
                            let _ = app.emit("floating-mode-changed", true);
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.hide();
                            }
                        }
                        Err(error) => {
                            let _ = apply_mode(&app, false);
                            if let Ok(mut stored) =
                                app.state::<FloatingState>().startup_error.lock()
                            {
                                *stored = Some(error);
                            }
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                            }
                        }
                    }
                });
            }
        }
        Err(error) => {
            if let Ok(mut stored) = app.state::<FloatingState>().startup_error.lock() {
                *stored = Some(error);
            }
        }
    }
}

#[tauri::command]
pub fn floating_enabled(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<FloatingState>();
    if let Some(error) = state
        .startup_error
        .lock()
        .map_err(|e| e.to_string())?
        .as_ref()
    {
        return Err(error.clone());
    }
    Ok(state.enabled.load(Ordering::SeqCst))
}

// Window creation must not block the webview's IPC thread on Windows.
#[tauri::command]
pub async fn set_floating_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    let previous = app.state::<FloatingState>().enabled.load(Ordering::SeqCst);
    if let Err(error) = apply_mode(&app, enabled) {
        let _ = apply_mode(&app, previous);
        return Err(error);
    }
    if let Err(error) = save_preferences(&app) {
        let _ = apply_mode(&app, previous);
        return Err(error);
    }
    *app.state::<FloatingState>()
        .startup_error
        .lock()
        .map_err(|e| e.to_string())? = None;
    app.emit("floating-mode-changed", enabled)
        .map_err(|e| e.to_string())
}

fn apply_mode(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if !enabled {
        // Windows returns an error when releasing a hotkey that was never
        // registered, which would leave the mode half-disabled.
        if app.global_shortcut().is_registered(SHORTCUT) {
            app.global_shortcut()
                .unregister(SHORTCUT)
                .map_err(|e| e.to_string())?;
        }
        app.state::<FloatingState>()
            .enabled
            .store(false, Ordering::SeqCst);
        if let Some(window) = app.get_webview_window(LABEL) {
            let _ = window.emit("floating-hidden", ());
            window.hide().map_err(|e| e.to_string())?;
        }
        app.remove_tray_by_id(TRAY);
        return Ok(());
    }
    let window = match app.get_webview_window(LABEL) {
        Some(window) => window,
        None => tauri::WebviewWindowBuilder::new(
            app,
            LABEL,
            WebviewUrl::App("index.html#/floating".into()),
        )
        .title("Reflog — Floating")
        .inner_size(EXPANDED, EXPANDED)
        .position(160.0, 160.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?,
    };
    if !app.global_shortcut().is_registered(SHORTCUT) {
        app.global_shortcut()
            .on_shortcut(SHORTCUT, |app, _, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = toggle_visibility(app);
                }
            })
            .map_err(|e| format!("Could not register {SHORTCUT}: {e}"))?;
    }
    ensure_tray(app)?;
    resize_window(&window, false, false)?;
    show_floating_window(&window)?;
    app.state::<FloatingState>()
        .enabled
        .store(true, Ordering::SeqCst);
    start_pointer_monitor(app);
    Ok(())
}

// The radial surface never resizes on hover. Transparent pixels must not steal
// clicks from other applications, including while the surface is collapsed.
fn start_pointer_monitor(app: &AppHandle) {
    if app
        .state::<FloatingState>()
        .pointer_monitor_started
        .swap(true, Ordering::SeqCst)
    {
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || {
        let mut pointer = PointerTracking::default();
        // Hover expansion crosses the IPC boundary: give it a couple of monitor
        // ticks before turning the window click-through, otherwise a fast move
        // from the center to an outer slice can be mistaken for leaving.
        loop {
            std::thread::sleep(std::time::Duration::from_millis(40));
            let state = app.state::<FloatingState>();
            if state.exiting.load(Ordering::SeqCst) {
                break;
            }
            pointer.synchronize(state.pointer_epoch.load(Ordering::SeqCst));
            if !state.enabled.load(Ordering::SeqCst) {
                pointer.reset();
                continue;
            }
            let Some(window) = app.get_webview_window(LABEL) else {
                continue;
            };
            if !window.is_visible().unwrap_or(false) {
                pointer.reset();
                continue;
            }
            let (expanded, panel, dragging, scale) = {
                let Ok(geometry) = state.geometry.lock() else {
                    continue;
                };
                (
                    geometry.expanded,
                    geometry.panel,
                    geometry.manual_move,
                    geometry.scale,
                )
            };
            // The saved anchor is a positioning preference, not the current
            // native bounds: a window manager may move a window when re-mapping
            // it. Hit-test the actual visible surface or it can stay click-through
            // even with the pointer directly over its center.
            let Ok(position) = window.outer_position() else {
                continue;
            };
            let Ok(size) = window.inner_size() else {
                continue;
            };
            let center = radial_center(position, size);
            let Ok(cursor) = app.cursor_position() else {
                continue;
            };
            let outside =
                !panel && !dragging && !inside_radial(cursor.x, cursor.y, center, expanded, scale);
            if !outside {
                pointer.leaving_since = None;
                if pointer.ignore != Some(false) {
                    match window.set_ignore_cursor_events(false) {
                        Ok(()) => pointer.ignore = Some(false),
                        Err(error) => {
                            let _ = window.emit("floating-pointer-error", error.to_string());
                        }
                    }
                }
            } else if pointer.ignore != Some(true) {
                let since = *pointer
                    .leaving_since
                    .get_or_insert_with(std::time::Instant::now);
                if since.elapsed() >= std::time::Duration::from_millis(160) {
                    pointer.leaving_since = None;
                    match window.set_ignore_cursor_events(true) {
                        Ok(()) => pointer.ignore = Some(true),
                        Err(error) => {
                            let _ = window.emit("floating-pointer-error", error.to_string());
                        }
                    }
                    if expanded {
                        let _ = window.emit("floating-pointer-outside", ());
                    }
                }
            }
        }
    });
}

fn inside_radial(x: f64, y: f64, anchor: Anchor, expanded: bool, scale: f64) -> bool {
    let radius = if expanded { 140.0 } else { 36.0 } * scale;
    (x - anchor.x).hypot(y - anchor.y) <= radius
}

fn radial_center(position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> Anchor {
    Anchor {
        x: position.x as f64 + size.width as f64 / 2.0,
        y: position.y as f64 + size.height as f64 / 2.0,
    }
}

fn toggle_visibility(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(LABEL) {
        if window.is_visible().map_err(|e| e.to_string())? {
            let _ = window.emit("floating-hidden", ());
            window.hide().map_err(|e| e.to_string())?;
        } else {
            show_floating_window(&window)?;
        }
    }
    Ok(())
}

fn ensure_tray(app: &AppHandle) -> Result<(), String> {
    if app.tray_by_id(TRAY).is_some() {
        return Ok(());
    }
    let portuguese = std::env::var("LANG").unwrap_or_default().starts_with("pt");
    let open = MenuItem::with_id(
        app,
        "floating-open",
        if portuguese {
            "Abrir Reflog"
        } else {
            "Open Reflog"
        },
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let settings = MenuItem::with_id(
        app,
        "floating-settings",
        if portuguese {
            "Configurações"
        } else {
            "Settings"
        },
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let toggle = MenuItem::with_id(
        app,
        "floating-toggle",
        if portuguese {
            "Mostrar / esconder botão"
        } else {
            "Show / hide floating button"
        },
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(
        app,
        "floating-quit",
        if portuguese {
            "Encerrar Reflog"
        } else {
            "Quit Reflog"
        },
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let menu = Menu::with_items(app, &[&open, &settings, &toggle, &quit_item])
        .map_err(|e| e.to_string())?;
    let mut builder = TrayIconBuilder::with_id(TRAY)
        .tooltip("Reflog")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "floating-open" => {
                let _ = floating_action(app.clone(), "panel".into());
            }
            "floating-settings" => {
                let _ = floating_action(app.clone(), "settings".into());
            }
            "floating-toggle" => {
                let _ = toggle_visibility(app);
            }
            "floating-quit" => quit(app.clone()),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app).map_err(|e| e.to_string())?;
    Ok(())
}

// Closing the panel must preserve its webview: it owns the active repository bridge.
pub fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if window.label() == LABEL {
        if let tauri::WindowEvent::Resized(size) = event {
            let state = window.state::<FloatingState>();
            // Programmatic set_size may dispatch this event while geometry is
            // locked. Only deliberate native resize drags should be remembered.
            if let Ok(mut geometry) = state.geometry.try_lock() {
                if geometry.panel && geometry.manual_resize && geometry.scale > 0.0 {
                    let panel_size = PanelSize {
                        width: size.width as f64 / geometry.scale,
                        height: size.height as f64 / geometry.scale,
                    }
                    .bounded();
                    let workspace = geometry.workspace;
                    geometry.panel_sizes.insert(workspace, panel_size);
                }
            };
        }
    }
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let state = window.state::<FloatingState>();
        if state.exiting.load(Ordering::SeqCst) {
            return;
        }
        if state.enabled.load(Ordering::SeqCst) {
            api.prevent_close();
            let _ = window.hide();
            if window.label() == "main" {
                if let Some(floating) = window.app_handle().get_webview_window(LABEL) {
                    let _ = show_floating_window(&floating);
                }
            }
        } else if window.label() == "main" {
            quit(window.app_handle().clone());
        }
    }
}

#[tauri::command]
pub fn quit(app: AppHandle) {
    if app.state::<FloatingState>().enabled.load(Ordering::SeqCst) {
        let _ = save_preferences(&app);
    }
    app.state::<FloatingState>()
        .exiting
        .store(true, Ordering::SeqCst);
    app.exit(0);
}

#[tauri::command]
pub fn drag_floating(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can drag itself".into());
    }
    window
        .state::<FloatingState>()
        .geometry
        .lock()
        .map_err(|e| e.to_string())?
        .manual_move = true;
    if let Err(error) = window.start_dragging() {
        window
            .state::<FloatingState>()
            .geometry
            .lock()
            .map_err(|e| e.to_string())?
            .manual_move = false;
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn finish_floating_drag(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can finish its drag".into());
    }
    let (expanded, panel) = {
        let state = window.state::<FloatingState>();
        let geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        if !geometry.manual_move {
            return Ok(());
        }
        (geometry.expanded, geometry.panel)
    };
    resize_window(&window, expanded, panel)?;
    save_preferences(window.app_handle())
}

#[tauri::command]
pub fn resize_floating(
    window: WebviewWindow,
    expanded: bool,
    panel: Option<bool>,
    workspace: Option<WorkspaceKind>,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can resize itself".into());
    }
    if let Some(workspace) = workspace {
        window
            .state::<FloatingState>()
            .geometry
            .lock()
            .map_err(|e| e.to_string())?
            .workspace = workspace;
    }
    resize_window(&window, expanded, panel.unwrap_or(false))
}

#[tauri::command]
pub fn start_floating_resize(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can resize itself".into());
    }
    {
        let state = window.state::<FloatingState>();
        let mut geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        if !geometry.panel {
            return Err("The radial button has a fixed size".into());
        }
        geometry.manual_resize = true;
    }
    if let Err(error) = window
        .as_ref()
        .window()
        .start_resize_dragging(tauri_runtime::ResizeDirection::SouthEast)
    {
        window
            .state::<FloatingState>()
            .geometry
            .lock()
            .map_err(|e| e.to_string())?
            .manual_resize = false;
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn finish_floating_resize(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can resize itself".into());
    }
    let size = window.inner_size().map_err(|e| e.to_string())?;
    {
        let state = window.state::<FloatingState>();
        let mut geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        if !geometry.manual_resize {
            return Ok(());
        }
        geometry.manual_resize = false;
        let panel_size = PanelSize {
            width: size.width as f64 / geometry.scale,
            height: size.height as f64 / geometry.scale,
        }
        .bounded();
        let workspace = geometry.workspace;
        geometry.panel_sizes.insert(workspace, panel_size);
    }
    save_preferences(window.app_handle())
}

#[tauri::command]
pub fn reset_floating_panel_size(window: WebviewWindow) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can resize itself".into());
    }
    {
        let state = window.state::<FloatingState>();
        let mut geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        if !geometry.panel {
            return Err("No compact workspace is open".into());
        }
        let workspace = geometry.workspace;
        geometry.panel_sizes.remove(&workspace);
        geometry.manual_resize = false;
    }
    resize_window(&window, true, true)?;
    save_preferences(window.app_handle())
}

#[tauri::command]
pub fn sync_floating_viewport(
    window: WebviewWindow,
    css_width: f64,
    css_height: f64,
) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can synchronize its viewport".into());
    }
    let physical = window.inner_size().map_err(|e| e.to_string())?;
    // A ResizeObserver event may race an explicit panel resize. Ignore that
    // transitional measurement; the following layout reports the settled size.
    let Ok(scale) = viewport_scale(physical.width, physical.height, css_width, css_height) else {
        return Ok(());
    };
    let (expanded, panel) = {
        let state = window.state::<FloatingState>();
        let mut geometry = state.geometry.lock().map_err(|e| e.to_string())?;
        if geometry.manual_move
            || geometry.manual_resize
            || geometry
                .render_scale
                .is_some_and(|previous| (previous - scale).abs() < 0.01)
        {
            return Ok(());
        }
        geometry.render_scale = Some(scale);
        geometry.initialized = false;
        (geometry.expanded, geometry.panel)
    };
    resize_window(&window, expanded, panel)
}

fn viewport_scale(width: u32, height: u32, css_width: f64, css_height: f64) -> Result<f64, String> {
    if !css_width.is_finite() || !css_height.is_finite() || css_width < 1.0 || css_height < 1.0 {
        return Err("Invalid WebView viewport".into());
    }
    let horizontal = width as f64 / css_width;
    let vertical = height as f64 / css_height;
    if !(0.25..=8.0).contains(&horizontal) || (horizontal - vertical).abs() > 0.05 {
        return Err("Inconsistent WebView viewport scale".into());
    }
    Ok(horizontal)
}

fn resize_window(window: &WebviewWindow, expanded: bool, panel: bool) -> Result<(), String> {
    if window.label() != LABEL {
        return Err("Only the floating window can resize itself".into());
    }
    let state = window.state::<FloatingState>();
    let mut geometry = state.geometry.lock().map_err(|e| e.to_string())?;
    if geometry.initialized && !geometry.manual_move && !panel && !geometry.panel {
        // Hover only changes the input radius, never the OS window bounds.
        geometry.expanded = expanded;
        return Ok(());
    }
    // Never derive the next hover position from the preceding resize: only a real
    // user drag may change the anchor. Work in physical pixels to avoid DPI drift.
    if geometry.anchor.is_none() || geometry.manual_move {
        let position = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.inner_size().map_err(|e| e.to_string())?;
        geometry.anchor = Some(Anchor {
            x: position.x as f64 + size.width as f64 / 2.0,
            y: position.y as f64 + size.height as f64 / 2.0,
        });
        geometry.manual_move = false;
    }
    let mut anchor = geometry.anchor.ok_or("Missing floating anchor")?;
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let area = monitor.work_area();
            anchor.x >= area.position.x as f64
                && anchor.x < area.position.x as f64 + area.size.width as f64
                && anchor.y >= area.position.y as f64
                && anchor.y < area.position.y as f64 + area.size.height as f64
        })
        .cloned()
        .or(window.current_monitor().map_err(|e| e.to_string())?);
    let native_scale = monitor
        .as_ref()
        .map(|m| m.scale_factor())
        .unwrap_or(window.scale_factor().map_err(|e| e.to_string())?);
    let scale = geometry.render_scale.unwrap_or(native_scale);
    let (width, height) = if panel {
        let size = geometry
            .panel_sizes
            .get(&geometry.workspace)
            .copied()
            .unwrap_or_else(|| geometry.workspace.default_size())
            .bounded();
        (size.width, size.height)
    } else {
        (EXPANDED, EXPANDED)
    };
    let mut width = physical_dimension(width, scale);
    let mut height = physical_dimension(height, scale);
    anchor.x = anchor.x.round();
    anchor.y = anchor.y.round();
    if let Some(monitor) = monitor.as_ref() {
        let area = monitor.work_area();
        let radius = physical_dimension(EXPANDED, scale) / 2.0;
        anchor.x = fit_anchor(
            anchor.x,
            area.position.x as f64,
            area.size.width as f64,
            radius,
        );
        anchor.y = fit_anchor(
            anchor.y,
            area.position.y as f64,
            area.size.height as f64,
            radius,
        );
        width = width.min(area.size.width as f64);
        height = height.min(area.size.height as f64);
    }
    let mut x = anchor.x - width / 2.0;
    let mut y = anchor.y - height / 2.0;
    // Panels can be clamped without changing the saved radial button anchor.
    if panel {
        if let Some(monitor) = monitor.as_ref() {
            let area = monitor.work_area();
            x = fit_axis(x, area.position.x as f64, area.size.width as f64, width);
            y = fit_axis(y, area.position.y as f64, area.size.height as f64, height);
        }
    }
    geometry.anchor = Some(anchor);
    geometry.expanded = expanded;
    geometry.panel = panel;
    geometry.scale = scale;
    geometry.manual_resize = false;
    window.set_resizable(panel).map_err(|e| e.to_string())?;
    // Remove panel constraints before restoring the smaller radial surface.
    window
        .set_min_size(None::<PhysicalSize<u32>>)
        .map_err(|e| e.to_string())?;
    if panel {
        window
            .set_min_size(Some(PhysicalSize::new(
                physical_dimension(360.0, scale).min(width) as u32,
                physical_dimension(400.0, scale).min(height) as u32,
            )))
            .map_err(|e| e.to_string())?;
    }
    window
        .set_size(PhysicalSize::new(width as u32, height as u32))
        .map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32))
        .map_err(|e| e.to_string())?;
    if panel {
        window
            .set_ignore_cursor_events(false)
            .map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    geometry.initialized = true;
    Ok(())
}

fn fit_axis(position: f64, origin: f64, extent: f64, size: f64) -> f64 {
    position.clamp(origin, (origin + extent - size).max(origin))
}

// Both native sizes must have the same pixel parity at fractional DPI settings.
fn physical_dimension(logical: f64, scale: f64) -> f64 {
    ((logical * scale / 2.0).round().max(1.0)) * 2.0
}

fn fit_anchor(position: f64, origin: f64, extent: f64, radius: f64) -> f64 {
    let margin = radius.min(extent / 2.0);
    position.clamp(origin + margin, origin + extent - margin)
}

#[tauri::command]
pub fn floating_action(app: AppHandle, action: String) -> Result<(), String> {
    if action == "hide" {
        if let Some(window) = app.get_webview_window(LABEL) {
            window.hide().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    if !matches!(
        action.as_str(),
        "merge" | "commit" | "panel" | "settings" | "graph" | "compare"
    ) {
        return Err("Unknown floating action".into());
    }
    let main = app
        .get_webview_window("main")
        .ok_or("Main window is unavailable")?;
    main.unminimize().map_err(|e| e.to_string())?;
    main.show().map_err(|e| e.to_string())?;
    main.set_focus().map_err(|e| e.to_string())?;
    main.emit("floating-action", action)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::{fit_anchor, fit_axis, inside_radial, physical_dimension, Anchor, Preferences};

    #[test]
    fn showing_again_invalidates_cached_input_shape_and_leave_delay() {
        for ignore in [true, false] {
            let mut pointer = super::PointerTracking {
                epoch: 1,
                ignore: Some(ignore),
                leaving_since: Some(std::time::Instant::now()),
            };
            // No hidden-window tick is needed: showing always advances the epoch.
            pointer.synchronize(2);
            assert_eq!(pointer.ignore, None);
            assert!(pointer.leaving_since.is_none());
            assert_eq!(pointer.epoch, 2);
        }
    }

    #[test]
    fn hiding_clears_the_pending_click_through_delay() {
        let mut pointer = super::PointerTracking {
            epoch: 1,
            ignore: Some(true),
            leaving_since: Some(std::time::Instant::now()),
        };
        pointer.reset();
        assert_eq!(pointer.ignore, None);
        assert!(pointer.leaving_since.is_none());
    }

    #[test]
    fn normal_pointer_ticks_preserve_the_cached_input_shape() {
        let mut pointer = super::PointerTracking {
            epoch: 1,
            ignore: Some(true),
            leaving_since: None,
        };
        pointer.synchronize(1);
        assert_eq!(pointer.ignore, Some(true));
    }

    #[test]
    fn remapped_window_is_interactive_at_its_actual_center_not_the_saved_anchor() {
        let saved = Anchor { x: 605.0, y: 758.0 };
        for (x, y) in [(0, 0), (130, 52), (-1800, 200)] {
            let center = super::radial_center(
                tauri::PhysicalPosition::new(x, y),
                tauri::PhysicalSize::new(330, 330),
            );
            assert!(!inside_radial(center.x, center.y, saved, false, 1.1));
            assert!(inside_radial(center.x, center.y, center, false, 1.1));
            assert!(!inside_radial(x as f64, y as f64, center, false, 1.1));
        }
    }

    #[test]
    fn keeps_radial_menu_inside_monitor_work_area() {
        assert_eq!(fit_axis(-106.0, 0.0, 1920.0, 300.0), 0.0);
        assert_eq!(fit_axis(1800.0, 0.0, 1920.0, 300.0), 1620.0);
        assert_eq!(fit_axis(600.0, 0.0, 1920.0, 300.0), 600.0);
    }

    #[test]
    fn anchor_does_not_drift_across_hover_cycles() {
        for scale in [1.0, 1.25, 1.5, 2.0] {
            let mut center = (205.0_f64 * scale).round();
            for _ in 0..100 {
                center = fit_anchor(center, 0.0, 1920.0 * scale, 150.0 * scale);
                for _expanded in [true, false] {
                    let dimension = physical_dimension(super::EXPANDED, scale);
                    let origin = (center - dimension / 2.0).round();
                    assert_eq!(origin + dimension / 2.0, (205.0 * scale).round());
                }
            }
        }
    }

    #[test]
    fn handles_negative_monitors_and_small_screens() {
        assert_eq!(fit_anchor(-1900.0, -1920.0, 1920.0, 150.0), -1770.0);
        assert_eq!(fit_anchor(0.0, 0.0, 200.0, 150.0), 100.0);
    }

    #[test]
    fn preference_round_trip_retains_enabled_mode_and_position() {
        let original = Preferences {
            enabled: true,
            anchor: Some(Anchor { x: 412.0, y: 335.0 }),
            panel_sizes: Default::default(),
        };
        let restored: Preferences =
            serde_json::from_slice(&serde_json::to_vec(&original).unwrap()).unwrap();
        assert!(restored.enabled);
        assert_eq!(restored.anchor, original.anchor);
        assert!(!serde_json::from_str::<Preferences>("{}").unwrap().enabled);
    }

    #[test]
    fn transparent_corners_and_collapsed_ring_do_not_intercept_clicks() {
        let center = Anchor { x: 300.0, y: 300.0 };
        assert!(inside_radial(300.0, 300.0, center, false, 1.0));
        assert!(!inside_radial(350.0, 300.0, center, false, 1.0));
        assert!(inside_radial(430.0, 300.0, center, true, 1.0));
        assert!(!inside_radial(435.0, 435.0, center, true, 1.0));
        assert!(inside_radial(560.0, 300.0, center, true, 2.0));
    }

    #[test]
    fn uses_effective_webkit_scale_instead_of_assuming_monitor_scale() {
        let scale = super::viewport_scale(300, 300, 250.0, 250.0).unwrap();
        assert_eq!(scale, 1.2);
        let surface = physical_dimension(super::EXPANDED, scale);
        assert_eq!(surface, 360.0);
        assert!(280.0 * scale < surface);
        assert_eq!(super::viewport_scale(552, 768, 460.0, 640.0).unwrap(), 1.2);
        assert!(super::viewport_scale(300, 300, 0.0, 250.0).is_err());
        assert!(super::viewport_scale(300, 300, 250.0, 400.0).is_err());
    }

    #[test]
    fn each_workspace_has_its_own_sensible_default_dimensions() {
        assert_eq!(
            super::WorkspaceKind::Commit.default_size(),
            super::PanelSize {
                width: 520.0,
                height: 700.0
            }
        );
        assert_eq!(
            super::WorkspaceKind::Merge.default_size(),
            super::PanelSize {
                width: 480.0,
                height: 620.0
            }
        );
        assert_eq!(
            super::WorkspaceKind::Stash.default_size(),
            super::PanelSize {
                width: 500.0,
                height: 640.0
            }
        );
        let bounded = super::PanelSize {
            width: 50.0,
            height: 9999.0,
        }
        .bounded();
        assert_eq!(
            bounded,
            super::PanelSize {
                width: 360.0,
                height: 1200.0
            }
        );
    }

    #[test]
    fn persists_custom_sizes_without_changing_other_workspaces() {
        let mut preferences = Preferences::default();
        preferences.panel_sizes.insert(
            super::WorkspaceKind::Merge,
            super::PanelSize {
                width: 610.0,
                height: 720.0,
            },
        );
        let restored: Preferences =
            serde_json::from_slice(&serde_json::to_vec(&preferences).unwrap()).unwrap();
        assert_eq!(
            restored.panel_sizes.get(&super::WorkspaceKind::Merge),
            Some(&super::PanelSize {
                width: 610.0,
                height: 720.0
            })
        );
        assert!(!restored
            .panel_sizes
            .contains_key(&super::WorkspaceKind::Commit));
        assert!(serde_json::from_str::<Preferences>("{\"enabled\":true}")
            .unwrap()
            .panel_sizes
            .is_empty());
    }
}
