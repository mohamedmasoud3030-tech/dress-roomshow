#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DressRecord {
  id: String,
  code: String,
  name: String,
  description: String,
  category: String,
  color: String,
  size: String,
  purchase_price: f64,
  rental_price: f64,
  sale_price: f64,
  deposit_amount: f64,
  status: String,
  is_for_rent: bool,
  is_for_sale: bool,
  main_image_url: Option<String>,
  times_rented: i64,
  notes: Option<String>,
  created_at: String,
  updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReservationRecord {
  id: String,
  reservation_number: String,
  customer_name: String,
  customer_phone: String,
  dress_code: String,
  dress_name: String,
  pickup_date: String,
  return_date: String,
  status: String,
  rental_price: f64,
  deposit_amount: f64,
  total_amount: f64,
  paid_amount: f64,
  remaining_amount: f64,
  notes: Option<String>,
  created_at: String,
  updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRecord {
  id: String,
  payment_number: String,
  reservation_number: String,
  customer_name: String,
  dress_code: String,
  dress_name: String,
  payment_date: String,
  payment_type: String,
  method: String,
  direction: String,
  amount: f64,
  reservation_total: f64,
  notes: Option<String>,
  created_at: String,
  updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpenseRecord {
  id: String,
  expense_number: String,
  expense_date: String,
  title: String,
  category: String,
  amount: f64,
  payment_method: String,
  related_dress_code: Option<String>,
  related_dress_name: Option<String>,
  notes: Option<String>,
  created_at: String,
  updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeliveryReturnRecord {
  id: String,
  reservation_number: String,
  customer_name: String,
  customer_phone: Option<String>,
  dress_code: String,
  dress_name: String,
  delivery_date_time: Option<String>,
  delivery_condition: Option<String>,
  return_date_time: Option<String>,
  return_condition: Option<String>,
  status: String,
  deposit_amount: f64,
  late_fee: f64,
  damage_fee: f64,
  deposit_refund_amount: f64,
  notes: Option<String>,
  created_at: String,
  updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalDocumentRecord {
  id: String,
  collection: String,
  payload: Value,
  created_at: String,
  updated_at: String,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|err| format!("failed to resolve app data dir: {err}"))?;

  fs::create_dir_all(&dir).map_err(|err| format!("failed to create app data dir: {err}"))?;
  let new_path = dir.join("lena.sqlite3");
  let legacy_path = dir.join("dress_roomshow.db");
  if !new_path.exists() && legacy_path.exists() {
    fs::copy(&legacy_path, &new_path)
      .map_err(|err| format!("failed to migrate legacy sqlite database path: {err}"))?;
  }
  Ok(new_path)
}

fn validate_document_collection(collection: &str) -> Result<(), String> {
  match collection {
    "sales-invoices" | "sales-returns" | "service-tasks" => Ok(()),
    _ => Err(format!("unsupported local document collection: {collection}")),
  }
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
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'أخرى',
      color TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      purchase_price REAL NOT NULL DEFAULT 0,
      rental_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      deposit_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available',
      is_for_rent INTEGER NOT NULL DEFAULT 1,
      is_for_sale INTEGER NOT NULL DEFAULT 0,
      main_image_url TEXT,
      times_rented INTEGER NOT NULL DEFAULT 0,
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
      reservation_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      dress_code TEXT NOT NULL,
      dress_name TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      status TEXT NOT NULL,
      rental_price REAL NOT NULL DEFAULT 0,
      deposit_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS delivery_returns (
      id TEXT PRIMARY KEY,
      reservation_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      dress_code TEXT NOT NULL,
      dress_name TEXT NOT NULL,
      delivery_date_time TEXT,
      delivery_condition TEXT,
      return_date_time TEXT,
      return_condition TEXT,
      status TEXT NOT NULL,
      deposit_amount REAL NOT NULL DEFAULT 0,
      late_fee REAL NOT NULL DEFAULT 0,
      damage_fee REAL NOT NULL DEFAULT 0,
      deposit_refund_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT NOT NULL,
      reservation_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      dress_code TEXT NOT NULL,
      dress_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      method TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount REAL NOT NULL,
      reservation_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      related_dress_code TEXT,
      related_dress_name TEXT,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only',
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS local_documents (
      id TEXT NOT NULL,
      collection TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection, id)
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
  let mut stmt = conn.prepare("SELECT id,name,phone,address,measurements,notes,status,total_reservations,active_reservations,total_paid,remaining_balance,last_reservation_date,created_at,updated_at FROM customers ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare customer list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(CustomerRecord { id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?, address: row.get(3)?, measurements: row.get(4)?, notes: row.get(5)?, status: row.get(6)?, total_reservations: row.get(7)?, active_reservations: row.get(8)?, total_paid: row.get(9)?, remaining_balance: row.get(10)?, last_reservation_date: row.get(11)?, created_at: row.get(12)?, updated_at: row.get(13)? })).map_err(|err| format!("failed to query customers: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse customers: {err}"))
}

#[tauri::command]
fn insert_customer(app: AppHandle, customer: CustomerRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO customers (id,name,phone,address,measurements,notes,status,total_reservations,active_reservations,total_paid,remaining_balance,last_reservation_date,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)", params![customer.id, customer.name, customer.phone, customer.address, customer.measurements, customer.notes, customer.status, customer.total_reservations, customer.active_reservations, customer.total_paid, customer.remaining_balance, customer.last_reservation_date, customer.created_at, customer.updated_at]).map_err(|err| format!("failed to insert customer: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_dresses(app: AppHandle) -> Result<Vec<DressRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn.prepare("SELECT id,code,name,description,category,color,size,purchase_price,rental_price,sale_price,deposit_amount,status,is_for_rent,is_for_sale,main_image_url,times_rented,notes,created_at,updated_at FROM dresses ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare dress list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(DressRecord { id: row.get(0)?, code: row.get(1)?, name: row.get(2)?, description: row.get(3)?, category: row.get(4)?, color: row.get(5)?, size: row.get(6)?, purchase_price: row.get(7)?, rental_price: row.get(8)?, sale_price: row.get(9)?, deposit_amount: row.get(10)?, status: row.get(11)?, is_for_rent: row.get(12)?, is_for_sale: row.get(13)?, main_image_url: row.get(14)?, times_rented: row.get(15)?, notes: row.get(16)?, created_at: row.get(17)?, updated_at: row.get(18)? })).map_err(|err| format!("failed to query dresses: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse dresses: {err}"))
}

#[tauri::command]
fn insert_dress(app: AppHandle, dress: DressRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO dresses (id,code,name,description,category,color,size,purchase_price,rental_price,sale_price,deposit_amount,status,is_for_rent,is_for_sale,main_image_url,times_rented,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)", params![dress.id, dress.code, dress.name, dress.description, dress.category, dress.color, dress.size, dress.purchase_price, dress.rental_price, dress.sale_price, dress.deposit_amount, dress.status, dress.is_for_rent, dress.is_for_sale, dress.main_image_url, dress.times_rented, dress.notes, dress.created_at, dress.updated_at]).map_err(|err| format!("failed to insert dress: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_reservations(app: AppHandle) -> Result<Vec<ReservationRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn.prepare("SELECT id,reservation_number,customer_name,customer_phone,dress_code,dress_name,pickup_date,return_date,status,rental_price,deposit_amount,total_amount,paid_amount,remaining_amount,notes,created_at,updated_at FROM reservations ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare reservation list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(ReservationRecord { id: row.get(0)?, reservation_number: row.get(1)?, customer_name: row.get(2)?, customer_phone: row.get(3)?, dress_code: row.get(4)?, dress_name: row.get(5)?, pickup_date: row.get(6)?, return_date: row.get(7)?, status: row.get(8)?, rental_price: row.get(9)?, deposit_amount: row.get(10)?, total_amount: row.get(11)?, paid_amount: row.get(12)?, remaining_amount: row.get(13)?, notes: row.get(14)?, created_at: row.get(15)?, updated_at: row.get(16)? })).map_err(|err| format!("failed to query reservations: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse reservations: {err}"))
}

#[tauri::command]
fn insert_reservation(app: AppHandle, reservation: ReservationRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO reservations (id,reservation_number,customer_name,customer_phone,dress_code,dress_name,pickup_date,return_date,status,rental_price,deposit_amount,total_amount,paid_amount,remaining_amount,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)", params![reservation.id, reservation.reservation_number, reservation.customer_name, reservation.customer_phone, reservation.dress_code, reservation.dress_name, reservation.pickup_date, reservation.return_date, reservation.status, reservation.rental_price, reservation.deposit_amount, reservation.total_amount, reservation.paid_amount, reservation.remaining_amount, reservation.notes, reservation.created_at, reservation.updated_at]).map_err(|err| format!("failed to insert reservation: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_payments(app: AppHandle) -> Result<Vec<PaymentRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn.prepare("SELECT id,payment_number,reservation_number,customer_name,dress_code,dress_name,payment_date,payment_type,method,direction,amount,reservation_total,notes,created_at,updated_at FROM payments ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare payment list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(PaymentRecord { id: row.get(0)?, payment_number: row.get(1)?, reservation_number: row.get(2)?, customer_name: row.get(3)?, dress_code: row.get(4)?, dress_name: row.get(5)?, payment_date: row.get(6)?, payment_type: row.get(7)?, method: row.get(8)?, direction: row.get(9)?, amount: row.get(10)?, reservation_total: row.get(11)?, notes: row.get(12)?, created_at: row.get(13)?, updated_at: row.get(14)? })).map_err(|err| format!("failed to query payments: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse payments: {err}"))
}

#[tauri::command]
fn insert_payment(app: AppHandle, payment: PaymentRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO payments (id,payment_number,reservation_number,customer_name,dress_code,dress_name,payment_date,payment_type,method,direction,amount,reservation_total,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)", params![payment.id, payment.payment_number, payment.reservation_number, payment.customer_name, payment.dress_code, payment.dress_name, payment.payment_date, payment.payment_type, payment.method, payment.direction, payment.amount, payment.reservation_total, payment.notes, payment.created_at, payment.updated_at]).map_err(|err| format!("failed to insert payment: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_expenses(app: AppHandle) -> Result<Vec<ExpenseRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn.prepare("SELECT id,expense_number,expense_date,title,category,amount,payment_method,related_dress_code,related_dress_name,notes,created_at,updated_at FROM expenses ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare expense list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(ExpenseRecord { id: row.get(0)?, expense_number: row.get(1)?, expense_date: row.get(2)?, title: row.get(3)?, category: row.get(4)?, amount: row.get(5)?, payment_method: row.get(6)?, related_dress_code: row.get(7)?, related_dress_name: row.get(8)?, notes: row.get(9)?, created_at: row.get(10)?, updated_at: row.get(11)? })).map_err(|err| format!("failed to query expenses: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse expenses: {err}"))
}

#[tauri::command]
fn insert_expense(app: AppHandle, expense: ExpenseRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO expenses (id,expense_number,expense_date,title,category,amount,payment_method,related_dress_code,related_dress_name,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)", params![expense.id, expense.expense_number, expense.expense_date, expense.title, expense.category, expense.amount, expense.payment_method, expense.related_dress_code, expense.related_dress_name, expense.notes, expense.created_at, expense.updated_at]).map_err(|err| format!("failed to insert expense: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_delivery_returns(app: AppHandle) -> Result<Vec<DeliveryReturnRecord>, String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn.prepare("SELECT id,reservation_number,customer_name,customer_phone,dress_code,dress_name,delivery_date_time,delivery_condition,return_date_time,return_condition,status,deposit_amount,late_fee,damage_fee,deposit_refund_amount,notes,created_at,updated_at FROM delivery_returns ORDER BY datetime(created_at) DESC").map_err(|err| format!("failed to prepare delivery return list query: {err}"))?;
  let rows = stmt.query_map([], |row| Ok(DeliveryReturnRecord { id: row.get(0)?, reservation_number: row.get(1)?, customer_name: row.get(2)?, customer_phone: row.get(3)?, dress_code: row.get(4)?, dress_name: row.get(5)?, delivery_date_time: row.get(6)?, delivery_condition: row.get(7)?, return_date_time: row.get(8)?, return_condition: row.get(9)?, status: row.get(10)?, deposit_amount: row.get(11)?, late_fee: row.get(12)?, damage_fee: row.get(13)?, deposit_refund_amount: row.get(14)?, notes: row.get(15)?, created_at: row.get(16)?, updated_at: row.get(17)? })).map_err(|err| format!("failed to query delivery returns: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>().map_err(|err| format!("failed to parse delivery returns: {err}"))
}

#[tauri::command]
fn insert_delivery_return(app: AppHandle, record: DeliveryReturnRecord) -> Result<(), String> {
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  conn.execute("INSERT OR REPLACE INTO delivery_returns (id,reservation_number,customer_name,customer_phone,dress_code,dress_name,delivery_date_time,delivery_condition,return_date_time,return_condition,status,deposit_amount,late_fee,damage_fee,deposit_refund_amount,notes,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)", params![record.id, record.reservation_number, record.customer_name, record.customer_phone, record.dress_code, record.dress_name, record.delivery_date_time, record.delivery_condition, record.return_date_time, record.return_condition, record.status, record.deposit_amount, record.late_fee, record.damage_fee, record.deposit_refund_amount, record.notes, record.created_at, record.updated_at]).map_err(|err| format!("failed to insert delivery return: {err}"))?;
  Ok(())
}

#[tauri::command]
fn list_local_documents(app: AppHandle, collection: String) -> Result<Vec<LocalDocumentRecord>, String> {
  validate_document_collection(&collection)?;
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let mut stmt = conn
    .prepare("SELECT id,collection,payload,created_at,updated_at FROM local_documents WHERE collection = ?1 ORDER BY datetime(created_at) DESC")
    .map_err(|err| format!("failed to prepare local document list query: {err}"))?;
  let rows = stmt
    .query_map(params![collection], |row| {
      let payload_text: String = row.get(2)?;
      let payload = serde_json::from_str::<Value>(&payload_text).map_err(|err| {
        rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(err))
      })?;
      Ok(LocalDocumentRecord {
        id: row.get(0)?,
        collection: row.get(1)?,
        payload,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
      })
    })
    .map_err(|err| format!("failed to query local documents: {err}"))?;
  rows.collect::<Result<Vec<_>, _>>()
    .map_err(|err| format!("failed to parse local documents: {err}"))
}

#[tauri::command]
fn insert_local_document(app: AppHandle, document: LocalDocumentRecord) -> Result<(), String> {
  validate_document_collection(&document.collection)?;
  let conn = open_db(&app)?;
  initialize_schema(&conn)?;
  let payload = serde_json::to_string(&document.payload)
    .map_err(|err| format!("failed to serialize local document payload: {err}"))?;
  conn.execute(
    "INSERT OR REPLACE INTO local_documents (id,collection,payload,created_at,updated_at) VALUES (?1,?2,?3,?4,?5)",
    params![document.id, document.collection, payload, document.created_at, document.updated_at],
  )
  .map_err(|err| format!("failed to insert local document: {err}"))?;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      init_local_database,
      list_customers,
      insert_customer,
      list_dresses,
      insert_dress,
      list_reservations,
      insert_reservation,
      list_payments,
      insert_payment,
      list_expenses,
      insert_expense,
      list_delivery_returns,
      insert_delivery_return,
      list_local_documents,
      insert_local_document
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
