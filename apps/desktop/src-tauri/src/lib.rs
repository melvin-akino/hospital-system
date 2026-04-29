use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

// ── App state ────────────────────────────────────────────────────────────────

struct ApiState {
    process_id: Arc<Mutex<Option<u32>>>,
    api_url: Arc<Mutex<String>>,
    ready: Arc<Mutex<bool>>,
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Returns the API base URL (default: http://localhost:3001/api)
#[tauri::command]
fn get_api_url(state: State<ApiState>) -> String {
    state.api_url.lock().unwrap().clone()
}

/// Returns whether the API server is ready
#[tauri::command]
fn is_api_ready(state: State<ApiState>) -> bool {
    *state.ready.lock().unwrap()
}

/// Open the system default browser at a URL
#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

/// Get app version
#[tauri::command]
fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Trigger a manual database backup.
/// Runs pg_dump against the embedded PostgreSQL and saves a .sql dump to the
/// backups/ folder inside the app data directory.
/// Returns the path to the created backup file.
#[tauri::command]
async fn backup_database(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let backup_dir = app_data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let ts = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("pibs_db_{}.sql", ts);
    let backup_path = backup_dir.join(&filename);

    // pg_dump from the embedded PostgreSQL (port 5433)
    let output = std::process::Command::new("pg_dump")
        .env("PGPASSWORD", "pibs_secret")
        .args([
            "-h", "localhost",
            "-p", "5433",
            "-U", "pibs",
            "-d", "pibs_db",
            "-f", backup_path.to_str().unwrap_or(""),
        ])
        .output()
        .map_err(|e| format!("pg_dump not found or failed: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("pg_dump error: {}", err));
    }

    println!("[PIBS] Backup saved: {}", backup_path.display());
    Ok(backup_path.to_string_lossy().to_string())
}

/// List existing backup files (newest first)
#[tauri::command]
async fn list_backups(app: AppHandle) -> Result<Vec<String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let backup_dir = app_data_dir.join("backups");
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut files: Vec<(std::time::SystemTime, String)> = std::fs::read_dir(&backup_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.extension()?.to_str()? == "sql" {
                let modified = entry.metadata().ok()?.modified().ok()?;
                Some((modified, path.to_string_lossy().to_string()))
            } else {
                None
            }
        })
        .collect();

    files.sort_by(|a, b| b.0.cmp(&a.0)); // newest first
    Ok(files.into_iter().map(|(_, p)| p).collect())
}

// ── API health polling ────────────────────────────────────────────────────────

async fn wait_for_api(api_url: String, state: Arc<Mutex<bool>>, app: AppHandle) {
    let client = reqwest::Client::new();
    let health_url = format!("{}/health", api_url.trim_end_matches("/api"));

    for attempt in 0..60 {
        tokio::time::sleep(std::time::Duration::from_millis(if attempt == 0 { 500 } else { 1000 })).await;

        match client.get(&health_url).timeout(std::time::Duration::from_secs(2)).send().await {
            Ok(resp) if resp.status().is_success() => {
                *state.lock().unwrap() = true;
                let _ = app.emit("api-ready", true);
                println!("[PIBS] API server ready at {}", api_url);
                return;
            }
            _ => {
                let _ = app.emit("api-loading", attempt);
            }
        }
    }

    eprintln!("[PIBS] WARNING: API did not become ready after 60s");
    let _ = app.emit("api-timeout", true);
}

// ── Sidecar launcher ──────────────────────────────────────────────────────────

fn launch_api_sidecar(app: &AppHandle, api_state: &ApiState) {
    let api_url = api_state.api_url.lock().unwrap().clone();
    let ready_flag = Arc::clone(&api_state.ready);
    let app_handle = app.clone();

    // Resolve the app data directory so the sidecar can store
    // embedded PostgreSQL data there
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| String::new());

    // Spawn Node.js API as a sidecar
    // The sidecar binary is bundled at: src-tauri/binaries/api-server-{target}
    match app.shell().sidecar("api-server") {
        Ok(sidecar) => {
            let env_vars = vec![
                ("NODE_ENV",    "production"),
                ("PORT",        "3001"),
                ("JWT_SECRET",  "pibs-desktop-secret-2025"),
                ("EMBEDDED_DB", "true"),
                ("APP_DATA_DIR", app_data_dir.as_str()),
            ];

            match sidecar
                .envs(env_vars)
                .spawn()
            {
                Ok((mut rx, child)) => {
                    let pid = child.pid();
                    *api_state.process_id.lock().unwrap() = Some(pid);
                    println!("[PIBS] API sidecar started (PID: {})", pid);

                    // Spawn output reader
                    let app_for_output = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        while let Some(event) = rx.recv().await {
                            match event {
                                CommandEvent::Stdout(line) => {
                                    let text = String::from_utf8_lossy(&line).to_string();
                                    let _ = app_for_output.emit("api-log", text);
                                }
                                CommandEvent::Stderr(line) => {
                                    let text = String::from_utf8_lossy(&line).to_string();
                                    eprintln!("[API] {}", text);
                                }
                                _ => {}
                            }
                        }
                    });

                    // Wait for API to become ready
                    tauri::async_runtime::spawn(wait_for_api(api_url, ready_flag, app_handle));
                }
                Err(e) => {
                    eprintln!("[PIBS] Failed to start API sidecar: {}", e);
                    // Fall back to assuming external API is running
                    tauri::async_runtime::spawn(wait_for_api(api_url, ready_flag, app_handle));
                }
            }
        }
        Err(_) => {
            // No sidecar bundled — assume external API running on port 3001
            println!("[PIBS] No API sidecar found — expecting external API on port 3001");
            tauri::async_runtime::spawn(wait_for_api(api_url, ready_flag, app_handle));
        }
    }
}

// ── System tray ──────────────────────────────────────────────────────────────

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Open iHIMS", true, None::<&str>)?;
    let portal_item = MenuItem::with_id(app, "portal", "Patient Portal", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_item, &portal_item, &separator, &quit_item])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("iHIMS — Hospital Information System")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "portal" => {
                if let Some(window) = app.get_webview_window("portal") {
                    let _ = window.show();
                    let _ = window.set_focus();
                } else {
                    let _ = tauri::WebviewWindowBuilder::new(app, "portal", tauri::WebviewUrl::App("/portal".into()))
                        .title("iHIMS Patient Portal")
                        .inner_size(1024.0, 768.0)
                        .build();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ── App entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let api_state = ApiState {
        process_id: Arc::new(Mutex::new(None)),
        api_url: Arc::new(Mutex::new("http://localhost:3001/api".to_string())),
        ready: Arc::new(Mutex::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(api_state)
        .setup(|app| {
            // Launch bundled API sidecar
            let api_state = app.state::<ApiState>();
            launch_api_sidecar(app.handle(), &api_state);

            // Setup system tray
            #[cfg(desktop)]
            setup_tray(app.handle())?;

            // Hide to tray on close (don't quit)
            let main_window = app.get_webview_window("main").unwrap();
            let app_handle = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Main window destroyed = app is actually quitting
                if window.label() == "main" {
                    // Clean up sidecar process
                    let state = window.state::<ApiState>();
                    let pid_opt = *state.process_id.lock().unwrap();
                    if let Some(pid) = pid_opt {
                        println!("[PIBS] Shutting down API sidecar (PID: {})", pid);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_api_url,
            is_api_ready,
            open_external,
            get_app_version,
            backup_database,
            list_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
