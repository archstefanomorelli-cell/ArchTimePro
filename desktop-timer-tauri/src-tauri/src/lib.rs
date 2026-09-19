use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    LogicalSize, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_autostart::ManagerExt;

#[cfg(target_os = "windows")]
use winreg::{
    enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE, REG_BINARY},
    RegKey, RegValue,
};

const NORMAL_WIDTH: u32 = 430;
const NORMAL_HEIGHT: u32 = 740;
const COMPACT_WIDTH: u32 = 292;
const COMPACT_HEIGHT: u32 = 92;
const AUTOSTART_NAME: &str = "Arch Time Mini Timer";
const AUTOSTART_MARKER: &str = ".autostart-v2-initialized";

#[cfg(target_os = "windows")]
const RUN_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";

#[cfg(target_os = "windows")]
const APPROVED_KEY: &str =
    "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run";

#[cfg(target_os = "windows")]
const STORE_APP_ID: &str =
    "shell:AppsFolder\\ArchTimePro.ArchTimeMiniTimer_z2hka7dx6kfwt!ArchTimeMiniTimer";

#[cfg(target_os = "windows")]
const STARTUP_ENABLED: [u8; 12] = [
    0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

#[cfg(target_os = "windows")]
fn remove_legacy_autostart_entries() -> bool {
    const LEGACY_NAMES: [&str; 2] = ["it.archtimepro.timer", "electron.app.Arch Time Mini Timer"];

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let mut removed = false;

    if let Ok(run) = hkcu.open_subkey_with_flags(RUN_KEY, KEY_READ | KEY_SET_VALUE) {
        for name in LEGACY_NAMES {
            if run.get_raw_value(name).is_ok() {
                removed = true;
                let _ = run.delete_value(name);
            }
        }
    }

    if let Ok(approved) = hkcu.open_subkey_with_flags(APPROVED_KEY, KEY_READ | KEY_SET_VALUE) {
        for name in LEGACY_NAMES {
            let _ = approved.delete_value(name);
        }
    }

    removed
}

#[cfg(not(target_os = "windows"))]
fn remove_legacy_autostart_entries() -> bool {
    false
}

#[cfg(target_os = "windows")]
fn windows_autostart_command() -> Result<String, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let executable_text = executable.to_string_lossy();

    if executable_text
        .to_ascii_lowercase()
        .contains("\\windowsapps\\archtimepro.archtimeminitimer_")
    {
        Ok(format!("explorer.exe {STORE_APP_ID}"))
    } else {
        Ok(format!("\"{executable_text}\""))
    }
}

#[cfg(target_os = "windows")]
fn enable_autostart(_app: &tauri::AppHandle) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run = hkcu
        .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        .map_err(|error| error.to_string())?;
    run.set_value(AUTOSTART_NAME, &windows_autostart_command()?)
        .map_err(|error| error.to_string())?;

    if let Ok(approved) = hkcu.open_subkey_with_flags(APPROVED_KEY, KEY_SET_VALUE) {
        approved
            .set_raw_value(
                AUTOSTART_NAME,
                &RegValue {
                    vtype: REG_BINARY,
                    bytes: STARTUP_ENABLED.to_vec(),
                },
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn enable_autostart(app: &tauri::AppHandle) -> Result<(), String> {
    app.autolaunch().enable().map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn disable_autostart(_app: &tauri::AppHandle) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run = hkcu
        .open_subkey_with_flags(RUN_KEY, KEY_SET_VALUE)
        .map_err(|error| error.to_string())?;

    if run.get_raw_value(AUTOSTART_NAME).is_ok() {
        run.delete_value(AUTOSTART_NAME)
            .map_err(|error| error.to_string())?;
    }

    if let Ok(approved) = hkcu.open_subkey_with_flags(APPROVED_KEY, KEY_SET_VALUE) {
        let _ = approved.delete_value(AUTOSTART_NAME);
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn disable_autostart(app: &tauri::AppHandle) -> Result<(), String> {
    app.autolaunch()
        .disable()
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn is_autostart_enabled(_app: &tauri::AppHandle) -> bool {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_enabled = hkcu
        .open_subkey_with_flags(RUN_KEY, KEY_READ)
        .and_then(|run| run.get_value::<String, _>(AUTOSTART_NAME))
        .is_ok();
    let task_manager_enabled = hkcu
        .open_subkey_with_flags(APPROVED_KEY, KEY_READ)
        .ok()
        .and_then(|approved| approved.get_raw_value(AUTOSTART_NAME).ok())
        .and_then(|value| value.bytes.first().copied())
        .map(|status| status == 0x02)
        .unwrap_or(true);

    run_enabled && task_manager_enabled
}

#[cfg(not(target_os = "windows"))]
fn is_autostart_enabled(app: &tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

fn initialize_autostart(app: &tauri::AppHandle) {
    let legacy_removed = remove_legacy_autostart_entries();
    let marker = app
        .path()
        .app_config_dir()
        .ok()
        .map(|directory| directory.join(AUTOSTART_MARKER));
    let first_initialization = marker.as_ref().is_some_and(|path| !path.exists());

    // Enable startup once for new installs and while migrating the legacy Electron client.
    // The marker preserves any later opt-out selected from the tray menu.
    if legacy_removed || first_initialization {
        if enable_autostart(app).is_ok() {
            if let Some(path) = marker {
                if let Some(directory) = path.parent() {
                    let _ = std::fs::create_dir_all(directory);
                }
                let _ = std::fs::write(path, b"initialized");
            }
        }
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn hide_main_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_skip_taskbar(true)
        .map_err(|error| error.to_string())?;
    window.hide().map_err(|error| error.to_string())
}

#[tauri::command]
fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
fn hide_window(window: WebviewWindow) -> Result<(), String> {
    hide_main_window(&window)
}

#[tauri::command]
fn set_compact_mode(window: WebviewWindow, compact: bool) -> Result<(), String> {
    let (width, height) = if compact {
        (COMPACT_WIDTH, COMPACT_HEIGHT)
    } else {
        (NORMAL_WIDTH, NORMAL_HEIGHT)
    };

    let size = LogicalSize::new(f64::from(width), f64::from(height));

    // Clear the previous fixed bounds first, then apply the new logical size.
    // Logical units keep the widget stable with Windows display scaling enabled.
    window
        .set_min_size(Option::<LogicalSize<f64>>::None)
        .map_err(|error| error.to_string())?;
    window
        .set_max_size(Option::<LogicalSize<f64>>::None)
        .map_err(|error| error.to_string())?;
    window.set_size(size).map_err(|error| error.to_string())?;
    window
        .set_min_size(Some(size))
        .map_err(|error| error.to_string())?;
    window
        .set_max_size(Some(size))
        .map_err(|error| error.to_string())?;

    if compact {
        if let (Ok(Some(monitor)), Ok(window_size)) =
            (window.current_monitor(), window.outer_size())
        {
            let area = monitor.work_area();
            let x = area.position.x + area.size.width as i32 - window_size.width as i32 - 18;
            let y = area.position.y + area.size.height as i32 - window_size.height as i32 - 18;
            window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(|error| error.to_string())?;
        }
    } else {
        window.center().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name(AUTOSTART_NAME)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_compact_mode,
            minimize_window,
            hide_window
        ])
        .setup(|app| {
            initialize_autostart(app.handle());

            let open_item = MenuItem::with_id(app, "open", "Apri timer", true, None::<&str>)?;
            let autostart_enabled = is_autostart_enabled(app.handle());
            let autostart_item = CheckMenuItem::with_id(
                app,
                "autostart",
                "Avvia con Windows",
                true,
                autostart_enabled,
                None::<&str>,
            )?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Esci da Arch Time", true, None::<&str>)?;
            let menu =
                Menu::with_items(app, &[&open_item, &autostart_item, &separator, &quit_item])?;

            TrayIconBuilder::with_id("main")
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("app icon missing"),
                )
                .tooltip("Arch Time Mini Timer")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "autostart" => {
                        if is_autostart_enabled(app) {
                            let _ = disable_autostart(app);
                        } else {
                            let _ = enable_autostart(app);
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.set_skip_taskbar(true);
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Arch Time Mini Timer");
}
