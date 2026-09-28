/**
 * Logging Module - Unified structured logging for Flare
 *
 * Provides:
 * - tracing-subscriber with JSON output and file appender
 * - Daily log rotation at $APPDATA/.flare/logs/
 * - NDJSON format for easy grep/parse
 * - Correlation ID support for request tracing
 */

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use tauri::Manager;
use tracing::Level;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub category: String,
    #[serde(rename = "correlation_id")]
    pub correlation_id: Option<String>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct LogFilters {
    pub level: Option<String>,
    pub category: Option<String>,
    pub correlation_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub limit: Option<usize>,
}

impl Default for LogFilters {
    fn default() -> Self {
        Self {
            level: None,
            category: None,
            correlation_id: None,
            start_time: None,
            end_time: None,
            limit: Some(1000),
        }
    }
}

// ============================================================================
// Logging Initialization
// ============================================================================

/// Initialize the tracing subscriber with file and console output
pub fn init_logging(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let log_dir = app_data_dir.join(".flare").join("logs");

    // Create log directory if it doesn't exist
    fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log directory: {}", e))?;

    // Create rolling file appender (daily rotation)
    let file_appender = RollingFileAppender::new(Rotation::DAILY, &log_dir, "flare.log");

    // Create non-blocking writer
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    // Build the subscriber with:
    // 1. EnvFilter layer - controlled by RUST_LOG env var
    // 2. JSON file layer - structured NDJSON output
    // 3. Pretty console layer - human-readable stdout output
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    let subscriber = tracing_subscriber::registry()
        .with(env_filter)
        .with(
            fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .json()
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true),
        )
        .with(
            fmt::layer()
                .with_writer(std::io::stderr)
                .with_ansi(true)
                .pretty(),
        );

    tracing::subscriber::set_global_default(subscriber)
        .map_err(|e| format!("Failed to set global default subscriber: {}", e))?;

    // Log initialization success
    tracing::info!(
        log_dir = %log_dir.display(),
        "Logging subsystem initialized"
    );

    Ok(())
}

/// Generate a new correlation ID (UUID v4)
pub fn generate_correlation_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// ============================================================================
// Frontend Log Handler
// ============================================================================

/// Handle log events from the frontend
pub fn handle_frontend_log(entry: LogEntry) {
    let level = match entry.level.to_lowercase().as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" | "warning" => Level::WARN,
        "error" => Level::ERROR,
        "critical" | "fatal" => Level::ERROR,
        _ => Level::INFO,
    };

    let message = entry.message.as_str();
    let category = entry.category.as_str();

    // Create span with correlation ID if present
    if let Some(cid) = &entry.correlation_id {
        let _span = tracing::info_span!(
            "frontend_log",
            message,
            category,
            correlation_id = %cid
        );
        let _ = _span;
    }

    // Log with structured fields
    match level {
        Level::TRACE => tracing::trace!(message, category, frontend = true),
        Level::DEBUG => tracing::debug!(message, category, frontend = true),
        Level::INFO => tracing::info!(message, category, frontend = true),
        Level::WARN => tracing::warn!(message, category, frontend = true),
        Level::ERROR => tracing::error!(message, category, frontend = true),
        _ => tracing::info!(message, category, frontend = true),
    }
}

// ============================================================================
// Log Query
// ============================================================================

/// Query logs from today's log file with filters
pub fn query_logs_from_file(
    log_dir: &PathBuf,
    filters: &LogFilters,
) -> Result<Vec<LogEntry>, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let log_file = log_dir.join(format!("flare-{}.log", today));

    if !log_file.exists() {
        return Ok(Vec::new());
    }

    let file = File::open(&log_file)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    let reader = BufReader::new(file);
    let mut entries = Vec::new();
    let limit = filters.limit.unwrap_or(1000);

    for line in reader.lines().take(limit) {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(entry) = serde_json::from_str::<serde_json::Value>(&line) {
            if filter_entry(&entry, filters) {
                let timestamp = entry
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let level = entry
                    .get("level")
                    .and_then(|v| v.as_str())
                    .unwrap_or("info")
                    .to_string();
                let message = entry
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let category = entry
                    .get("target")
                    .and_then(|v| v.as_str())
                    .unwrap_or("app")
                    .to_string();
                let correlation_id = entry
                    .get("correlation_id")
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let data = entry.get("data").cloned();

                entries.push(LogEntry {
                    timestamp,
                    level,
                    message,
                    category,
                    correlation_id,
                    data,
                });
            }
        }
    }

    Ok(entries)
}

fn filter_entry(entry: &serde_json::Value, filters: &LogFilters) -> bool {
    // Level filter
    if let Some(ref level) = filters.level {
        let entry_level = entry.get("level").and_then(|v| v.as_str()).unwrap_or("");
        if !entry_level.eq_ignore_ascii_case(level) {
            return false;
        }
    }

    // Category filter
    if let Some(ref category) = filters.category {
        let entry_target = entry.get("target").and_then(|v| v.as_str()).unwrap_or("");
        if !entry_target.contains(category) {
            return false;
        }
    }

    // Correlation ID filter
    if let Some(ref cid) = filters.correlation_id {
        let entry_cid = entry.get("correlation_id").and_then(|v| v.as_str());
        if entry_cid != Some(cid.as_str()) {
            return false;
        }
    }

    true
}

// ============================================================================
// IPC Command Helpers
// ============================================================================

/// Get the log directory path
pub fn get_log_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join(".flare").join("logs"))
}