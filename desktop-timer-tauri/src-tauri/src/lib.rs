use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    LogicalSize, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

const NORMAL_WIDTH: u32 = 430;
const NORMAL_HEIGHT: u32 = 740;
const COMPACT_WIDTH: u32 = 292;
const COMPACT_HEIGHT: u32 = 92;

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
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            set_compact_mode,
            minimize_window,
            hide_window
        ])
        .setup(|app| {
            let open_item = MenuItem::with_id(app, "open", "Apri timer", true, None::<&str>)?;
            let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
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

            if !autostart_enabled {
                let _ = app.autolaunch().enable();
                let _ = autostart_item.set_checked(true);
            }

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
                        if app.autolaunch().is_enabled().unwrap_or(false) {
                            let _ = app.autolaunch().disable();
                        } else {
                            let _ = app.autolaunch().enable();
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
