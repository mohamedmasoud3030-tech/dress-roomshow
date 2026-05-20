#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CustomerRecord {
  id: String,
  name: String,
  phone: String,
  address: String,
  measurements: String,
  notes: Option<String>,
  status: String,
  total_reservations: i64,
  active_reservations: i64,
  total_paid: f64,
  remaining_balance: f64,
  last_reservation_date: Option<String>,
  created_at: String,
  updated_at: String,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|err| format!("failed to resolve app data dir: {err}"))?;

  fs::create_dir_all(&dir).map_err(|err| format!("failed to create app data dir: {err}"))?;
  Ok(dir.join("dress_roomshow.db"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
  let path = db_path(app)?;
  Connection::open(path).map_err(|err| format!("failed to open sqlite database: {err}"))
}

fn initialize_schema(conn: &Connection) -> Result<(), String> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS dresses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      size TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      rental_price REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT 'غير محدد',
      measurements TEXT NOT NULL DEFAULT 'غير مسجل',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      total_reservations INTEGER NOT NULL DEFAULT 0,
      active_reservations INTEGER NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      last_reservation_date TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      dress_id TEXT NOT NULL,
      reserved_from TEXT NOT NULL,
      reserved_to TEXT NOT NULL,
      status TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS delivery_returns (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_date TEXT NOT NULL,
      condition_notes TEXT,
      fee_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      reservation_id TEXT,
      customer_id TEXT,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      spent_on TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    ",
  )
  .map_err(|err| format!("failed to initialize schema: {err}"))
}

#[tauri::command]
fn init_local_database(app: AppHandle) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)
}

#[tauri::command]
fn list_customers(app: AppHandle) -> Result<Vec<CustomerRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;

  let mut stmt = conn
    .prepare(
      "SELECT id,name,phone,address,measurements,notes,status,total_reservations,active_reservations,total_paid,remaining_balance,last_reservation_date,created_at,updated_at
      FROM customers ORDER BY datetime(created_at) DESC",
    )
    .map_err(|err| format!("failed to prepare customer list query: {err}"))?;

  let rows = stmt
    .query_map([], |row| {
      Ok(CustomerRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        address: row.get(3)?,
        measurements: row.get(4)?,
        notes: row.get(5)?,
        status: row.get(6)?,
        total_reservations: row.get(7)?,
        active_reservations: row.get(8)?,
        total_paid: row.get(9)?,
        remaining_balance: row.get(10)?,
        last_reservation_date: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
      })
    })
    .map_err(|err| format!("failed to query customers: {err}"))?;

  rows
    .collect::<Result<Vec<_>, _>>()
    .map_err(|err| format!("failed to parse customers: {err}"))
}

#[tauri::command]
fn insert_customer(app: AppHandle, customer: CustomerRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;

  conn
    .execute(
      "INSERT INTO customers (id,name,phone,address,measurements,notes,status,total_reservations,active_reservations,total_paid,remaining_balance,last_reservation_date,created_at,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
      params![
        customer.id,
        customer.name,
        customer.phone,
        customer.address,
        customer.measurements,
        customer.notes,
        customer.status,
        customer.total_reservations,
        customer.active_reservations,
        customer.total_paid,
        customer.remaining_balance,
        customer.last_reservation_date,
        customer.created_at,
        customer.updated_at,
      ],
    )
    .map_err(|err| format!("failed to insert customer: {err}"))?;

  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![init_local_database, list_customers, insert_customer])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
