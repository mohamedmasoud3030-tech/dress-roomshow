#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use std::{collections::HashMap, fs, path::PathBuf};
use tauri::Manager;

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
  fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
  Ok(directory.join("lena.sqlite3"))
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
  let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
  connection
    .execute(
      "CREATE TABLE IF NOT EXISTS app_snapshot (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
      [],
    )
    .map_err(|error| error.to_string())?;
  Ok(connection)
}

#[tauri::command]
fn load_desktop_snapshot(app: tauri::AppHandle) -> Result<Option<HashMap<String, String>>, String> {
  let connection = open_database(&app)?;
  let mut statement = connection
    .prepare("SELECT key, value FROM app_snapshot ORDER BY key")
    .map_err(|error| error.to_string())?;
  let rows = statement
    .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
    .map_err(|error| error.to_string())?;
  let mut entries = HashMap::new();
  for row in rows {
    let (key, value) = row.map_err(|error| error.to_string())?;
    entries.insert(key, value);
  }
  Ok((!entries.is_empty()).then_some(entries))
}

#[tauri::command]
fn save_desktop_snapshot(app: tauri::AppHandle, entries: HashMap<String, String>) -> Result<(), String> {
  let mut connection = open_database(&app)?;
  let transaction = connection.transaction().map_err(|error| error.to_string())?;
  transaction.execute("DELETE FROM app_snapshot", []).map_err(|error| error.to_string())?;
  {
    let mut statement = transaction
      .prepare("INSERT INTO app_snapshot (key, value) VALUES (?1, ?2)")
      .map_err(|error| error.to_string())?;
    for (key, value) in entries {
      statement.execute(params![key, value]).map_err(|error| error.to_string())?;
    }
  }
  transaction.commit().map_err(|error| error.to_string())?;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![load_desktop_snapshot, save_desktop_snapshot])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
