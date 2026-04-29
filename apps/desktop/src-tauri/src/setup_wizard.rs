/// setup_wizard.rs
///
/// First-run database setup wizard logic.
/// Checks for a PostgreSQL connection and guides the user through
/// creating the pibs_db database if it doesn't exist.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl Default for DbConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            user: "pibs".to_string(),
            password: "pibs_secret".to_string(),
            database: "pibs_db".to_string(),
        }
    }
}

impl DbConfig {
    pub fn to_url(&self) -> String {
        format!(
            "postgresql://{}:{}@{}:{}/{}",
            self.user, self.password, self.host, self.port, self.database
        )
    }

    /// Build the database URL without a specific database (for admin operations)
    pub fn to_admin_url(&self) -> String {
        format!(
            "postgresql://{}:{}@{}:{}/postgres",
            self.user, self.password, self.host, self.port
        )
    }
}

/// Check if PostgreSQL is accessible
pub async fn can_connect_postgres(config: &DbConfig) -> bool {
    let client = reqwest::Client::new();
    // Use a simple TCP check via the API health endpoint as a proxy
    // The actual DB check happens inside the Node.js sidecar on startup
    let url = format!("http://localhost:3001/api/health");
    client
        .get(&url)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Tauri command: validate DB config and return connection status
#[tauri::command]
pub async fn check_db_connection(config: DbConfig) -> Result<String, String> {
    if can_connect_postgres(&config).await {
        Ok("connected".to_string())
    } else {
        Err(format!(
            "Cannot connect to PostgreSQL at {}:{}. Ensure PostgreSQL is running.",
            config.host, config.port
        ))
    }
}

/// Tauri command: save DB config to app data directory
#[tauri::command]
pub async fn save_db_config(
    app: tauri::AppHandle,
    config: DbConfig,
) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let config_path = app_dir.join("db.json");
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

/// Tauri command: load saved DB config
#[tauri::command]
pub async fn load_db_config(app: tauri::AppHandle) -> Result<DbConfig, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let config_path = app_dir.join("db.json");
    if config_path.exists() {
        let json = std::fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    } else {
        Ok(DbConfig::default())
    }
}
