use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use url::Url;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
    Emitter,
};

mod logging;
mod capture_server;

const EXPORT_TYPE_FULL: &str = "flare-full-export";

// --- Data Structures ---

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiInfo {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiDetails {
    pub name: String,
    pub spec: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestResult {
    pub success: bool,
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub size: usize,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FetchResult {
    pub success: bool,
    pub status: u16,
    pub body: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub auth_items: Vec<AuthItem>,
    pub sync_interval_minutes: u32,
    pub last_sync: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthItem {
    pub location: String,
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    pub environments: Vec<EnvEnvironment>,
    pub selected: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvEnvironment {
    pub name: String,
    pub variables: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedRequest {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub params: Vec<KeyValuePair>,
    pub headers: Vec<KeyValuePair>,
    pub body_type: String,
    pub req_body: Option<String>,
    pub urlencoded_body: Option<Vec<KeyValuePair>>,
    pub form_data: Option<Vec<KeyValuePair>>,
    pub graphql_variables: Option<String>,
    pub auth_type: String,
    pub auth_config: HashMap<String, String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedResponse {
    pub id: String,
    pub request_id: String,
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub size: usize,
    pub time: u64,
    pub created_at: String,
    pub endpoint_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyValuePair {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedFlow {
    pub id: String,
    pub name: String,
    pub nodes: serde_json::Value,
    pub edges: serde_json::Value,
    pub variables: serde_json::Value,
    pub version: u32,
    pub created_at: String,
    pub updated_at: String,
}

// --- Helper Functions ---

fn get_flare_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    let flare_dir = app_data_dir.join(".flare").join("apis");
    if !flare_dir.exists() {
        fs::create_dir_all(&flare_dir).expect("Failed to create .flare/apis directory");
    }
    flare_dir
}

fn get_configs_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    let configs_dir = app_data_dir.join(".flare").join("configs");
    if !configs_dir.exists() {
        fs::create_dir_all(&configs_dir).expect("Failed to create .flare/configs directory");
    }
    configs_dir
}

fn get_env_config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let configs_dir = get_configs_dir(app_handle);
    configs_dir.join("environments.json")
}

fn get_env_config(app_handle: &tauri::AppHandle) -> EnvConfig {
    let path = get_env_config_path(app_handle);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    // Default config
    EnvConfig {
        environments: vec![
            EnvEnvironment {
                name: "Development".to_string(),
                variables: [
                    ("baseUrl".to_string(), "http://localhost:3000".to_string()),
                    ("apiKey".to_string(), "".to_string()),
                ].into_iter().collect(),
            },
            EnvEnvironment {
                name: "Production".to_string(),
                variables: [
                    ("baseUrl".to_string(), "https://api.example.com".to_string()),
                    ("apiKey".to_string(), "".to_string()),
                ].into_iter().collect(),
            },
        ],
        selected: "Development".to_string(),
    }
}

fn save_env_config(app_handle: &tauri::AppHandle, config: &EnvConfig) -> Result<(), String> {
    // Ensure git repo exists
    ensure_git_repo(app_handle)?;

    let path = get_env_config_path(app_handle);
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize env config: {}", e))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to save env config: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(app_handle);
    git_add_file(&git_dir, "configs/environments.json")?;

    Ok(())
}

fn get_requests_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    let requests_dir = app_data_dir.join(".flare").join("requests");
    if !requests_dir.exists() {
        fs::create_dir_all(&requests_dir).expect("Failed to create .flare/requests directory");
    }
    requests_dir
}

fn get_responses_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    let responses_dir = app_data_dir.join(".flare").join("responses");
    if !responses_dir.exists() {
        fs::create_dir_all(&responses_dir).expect("Failed to create .flare/responses directory");
    }
    responses_dir
}

fn get_flows_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    let flows_dir = app_data_dir.join(".flare").join("flows");
    if !flows_dir.exists() {
        fs::create_dir_all(&flows_dir).expect("Failed to create .flare/flows directory");
    }
    flows_dir
}

// Generate request ID based on method and URL path
fn generate_request_id(method: &str, url: &str) -> String {
    // Extract path from URL, e.g., "https://api.example.com/users/123" -> "/users/123"
    let path = url.split('?').next().unwrap_or(url);
    let path = if path.starts_with("http") {
        // Extract path from full URL
        match Url::parse(path) {
            Ok(parsed) => {
                let p = parsed.path().to_string();
                p
            }
            Err(_) => path.to_string(),
        }
    } else {
        path.to_string()
    };

    // Sanitize path: replace non-alphanumeric with underscore, remove leading/trailing underscores
    let sanitized: String = path
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect();
    let sanitized = sanitized.trim_matches('_').to_string();

    let timestamp = chrono_now()
        .replace(['-', ':', 'T', 'Z', ' '], "")
        .chars()
        .take(14)
        .collect::<String>();

    format!("req_{}_{}_{}", method.to_lowercase(), sanitized, timestamp)
}

// Generate response ID based on request_id
fn generate_response_id(request_id: &str) -> String {
    let timestamp = chrono_now()
        .replace(['-', ':', 'T', 'Z', ' '], "")
        .chars()
        .take(14)
        .collect::<String>();
    format!("resp_{}_{}", request_id, timestamp)
}

// --- IPC Command Handlers ---

#[tauri::command]
fn get_apis(app_handle: tauri::AppHandle) -> Result<Vec<ApiInfo>, String> {
    let apis_dir = get_flare_dir(&app_handle);
    let mut apis = Vec::new();

    // Read both .yaml and .json files
    if let Ok(entries) = fs::read_dir(&apis_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext == "yaml" || ext == "yml" || ext == "json" {
                if let Some(name) = path.file_stem() {
                    apis.push(ApiInfo {
                        name: name.to_string_lossy().to_string(),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    Ok(apis)
}

#[tauri::command]
fn get_api(app_handle: tauri::AppHandle, name: String) -> Result<ApiDetails, String> {
    let apis_dir = get_flare_dir(&app_handle);

    // Try .yaml first (default format from CLI), then .json
    let yaml_path = apis_dir.join(format!("{}.yaml", name));
    let json_path = apis_dir.join(format!("{}.json", name));

    let (content, is_yaml) = if yaml_path.exists() {
        (fs::read_to_string(&yaml_path).map_err(|e| format!("Failed to read API file: {}", e))?, true)
    } else if json_path.exists() {
        (fs::read_to_string(&json_path).map_err(|e| format!("Failed to read API file: {}", e))?, false)
    } else {
        return Err(format!("API not found: {}", name));
    };

    let spec: serde_json::Value = if is_yaml {
        serde_yaml::from_str(&content)
            .map_err(|e| format!("Failed to parse YAML: {}", e))?
    } else {
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?
    };

    Ok(ApiDetails {
        name,
        spec,
    })
}

// Read file and return base64 encoded content
#[tauri::command]
async fn read_file_base64(path: String) -> Result<String, String> {
    let content = fs::read(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))?;
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &content))
}

// Load client certificate and key from base64 encoded PEM content
fn load_client_identity(cert_b64: &str, key_b64: &str) -> Result<reqwest::Identity, String> {
    let cert_bytes = base64_decode(cert_b64)?;
    let key_bytes = base64_decode(key_b64)?;

    reqwest::Identity::from_pkcs8_pem(&cert_bytes, &key_bytes)
        .map_err(|e| format!("Invalid PEM data: {}", e))
}

// Base64 decode helper
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Remove any whitespace
    let cleaned: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    // Use standard base64 alphabet
    match base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &cleaned) {
        Ok(bytes) => Ok(bytes),
        Err(e) => Err(format!("Failed to decode base64: {}", e)),
    }
}

#[tauri::command]
async fn execute_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    query_params: Option<HashMap<String, String>>,
    ssl_verify: Option<bool>,
    signal: Option<bool>,
    client_cert: Option<String>,
    client_key: Option<String>,
    ca_cert: Option<String>,
    timeout_ms: Option<u64>,
    follow_redirects: Option<bool>,
) -> Result<RequestResult, String> {
    let timeout_secs = timeout_ms.unwrap_or(30000) / 1000;
    let follow = follow_redirects.unwrap_or(true);

    // Build URL with query params appended
    let final_url = if let Some(params) = query_params {
        if params.is_empty() {
            url.clone()
        } else {
            let query_string: String = params
                .iter()
                .map(|(k, v)| {
                    // Simple percent encoding for query parameters
                    let encode = |s: &str| {
                        s.chars()
                            .map(|c| match c {
                                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
                                _ => format!("%{:02X}", c as u8),
                            })
                            .collect::<String>()
                    };
                    format!("{}={}", encode(k), encode(v))
                })
                .collect::<Vec<_>>()
                .join("&");
            if url.contains('?') {
                format!("{}&{}", url, query_string)
            } else {
                format!("{}?{}", url, query_string)
            }
        }
    } else {
        url.clone()
    };

    let mut client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .danger_accept_invalid_certs(ssl_verify == Some(false))
        .redirect(if follow { reqwest::redirect::Policy::default() } else { reqwest::redirect::Policy::none() });

    // Add client certificate if provided (mTLS)
    if let (Some(cert), Some(key)) = (&client_cert, &client_key) {
        match load_client_identity(cert, key) {
            Ok(identity) => {
                client_builder = client_builder.identity(identity);
            }
            Err(e) => {
                return Err(format!("Failed to load client certificate: {}", e));
            }
        }
    }

    // Note: CA certificate support requires rustls-tls with custom TLS connector configuration
    // For now, CA cert is logged but not applied (system CA certs are used by default)
    if let Some(_cert) = &ca_cert {
        tracing::debug!("CA certificate configured (using system default CAs for server verification)");
    }

    let client = client_builder
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut request_builder = match method.to_uppercase().as_str() {
        "GET" => client.get(&final_url),
        "POST" => client.post(&final_url),
        "PUT" => client.put(&final_url),
        "DELETE" => client.delete(&final_url),
        "PATCH" => client.patch(&final_url),
        "HEAD" => client.head(&final_url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &final_url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    for (key, value) in headers {
        request_builder = request_builder.header(&key, &value);
    }

    if let Some(body_content) = body {
        request_builder = request_builder.body(body_content);
    }

    // Check if request was cancelled before sending
    if signal == Some(false) {
        return Ok(RequestResult {
            success: false,
            status: 0,
            status_text: String::new(),
            headers: HashMap::new(),
            body: String::new(),
            size: 0,
            error: Some("Request cancelled".to_string()),
        });
    }

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let status_text = response.status().canonical_reason().unwrap_or("").to_string();
            let success = response.status().is_success();
            let resp_headers: HashMap<String, String> = response
                .headers()
                .iter()
                .filter_map(|(k, v)| v.to_str().ok().map(|s| (k.to_string(), s.to_string())))
                .collect();
            let body_text = response.text().await.unwrap_or_default();
            let size = body_text.len();

            Ok(RequestResult {
                success,
                status,
                status_text,
                headers: resp_headers,
                body: body_text,
                size,
                error: None,
            })
        }
        Err(e) => {
            // Check if it's an abort error
            if e.is_timeout() {
                Ok(RequestResult {
                    success: false,
                    status: 0,
                    status_text: String::new(),
                    headers: HashMap::new(),
                    body: String::new(),
                    size: 0,
                    error: Some("Request timeout".to_string()),
                })
            } else {
                Ok(RequestResult {
                    success: false,
                    status: 0,
                    status_text: String::new(),
                    headers: HashMap::new(),
                    body: String::new(),
                    size: 0,
                    error: Some(e.to_string()),
                })
            }
        }
    }
}

#[tauri::command]
async fn save_response_to_file(app_handle: tauri::AppHandle, body: String, default_name: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app_handle.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("All Files", &["*"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            fs::write(&path_str, &body)
                .map_err(|e| format!("Failed to save file: {}", e))?;
            Ok(path_str)
        }
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
async fn save_backup_file(app_handle: tauri::AppHandle, base64_data: String, default_name: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app_handle.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("ZIP Archive", &["zip"])
        .add_filter("All Files", &["*"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            // Decode base64 to bytes
            let zip_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &base64_data)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;
            fs::write(&path_str, &zip_bytes)
                .map_err(|e| format!("Failed to save file: {}", e))?;
            Ok(path_str)
        }
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
fn save_api(app_handle: tauri::AppHandle, name: String, data: String) -> Result<(), String> {
    let apis_dir = get_flare_dir(&app_handle);

    // Ensure git repo exists
    ensure_git_repo(&app_handle)?;

    // Validate JSON before saving
    let _: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let file_path = apis_dir.join(format!("{}.json", name));
    fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to save API: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(&app_handle);
    git_add_file(&git_dir, &format!("apis/{}.json", name))?;

    Ok(())
}

#[tauri::command]
async fn fetch_url(url: String, headers: HashMap<String, String>) -> Result<FetchResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut request_builder = client.get(&url);

    for (key, value) in headers {
        request_builder = request_builder.header(&key, &value);
    }

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let success = response.status().is_success();
            let body_text = response.text().await.unwrap_or_default();

            Ok(FetchResult {
                success,
                status,
                body: body_text,
                error: None,
            })
        }
        Err(e) => Ok(FetchResult {
            success: false,
            status: 0,
            body: String::new(),
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
fn save_import_config(app_handle: tauri::AppHandle, config: ImportConfig) -> Result<(), String> {
    // Ensure git repo exists
    ensure_git_repo(&app_handle)?;

    let configs_dir = get_configs_dir(&app_handle);
    let file_path = configs_dir.join(format!("{}.json", config.id));

    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(&app_handle);
    git_add_file(&git_dir, &format!("configs/{}.json", config.id))?;

    Ok(())
}

#[tauri::command]
fn get_import_configs(app_handle: tauri::AppHandle) -> Result<Vec<ImportConfig>, String> {
    let configs_dir = get_configs_dir(&app_handle);
    let mut configs = Vec::new();

    if let Ok(entries) = fs::read_dir(&configs_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(config) = serde_json::from_str::<ImportConfig>(&content) {
                        configs.push(config);
                    }
                }
            }
        }
    }

    Ok(configs)
}

#[tauri::command]
fn delete_import_config(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let configs_dir = get_configs_dir(&app_handle);
    let file_path = configs_dir.join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete config: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn get_env_config_cmd(app_handle: tauri::AppHandle) -> Result<EnvConfig, String> {
    Ok(get_env_config(&app_handle))
}

#[tauri::command]
fn save_env_config_cmd(app_handle: tauri::AppHandle, config: EnvConfig) -> Result<(), String> {
    save_env_config(&app_handle, &config)
}

#[tauri::command]
fn switch_env_cmd(app_handle: tauri::AppHandle, env_name: String) -> Result<EnvConfig, String> {
    let mut config = get_env_config(&app_handle);
    config.selected = env_name;
    save_env_config(&app_handle, &config)?;
    Ok(config)
}

#[tauri::command]
fn save_request_cmd(app_handle: tauri::AppHandle, request: SavedRequest) -> Result<SavedRequest, String> {
    let requests_dir = get_requests_dir(&app_handle);
    let now = chrono_now();
    let mut request = request;

    // Ensure git repo exists
    ensure_git_repo(&app_handle)?;

    // If id is empty, generate new one using method and url
    if request.id.is_empty() {
        request.id = generate_request_id(&request.method, &request.url);
    }

    // Set timestamps
    if request.created_at.is_empty() {
        request.created_at = now.clone();
    }
    request.updated_at = now;

    let file_path = requests_dir.join(format!("{}.json", request.id));
    let json = serde_json::to_string_pretty(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to save request: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(&app_handle);
    git_add_file(&git_dir, &format!("requests/{}.json", request.id))?;

    Ok(request)
}

#[tauri::command]
fn get_requests_cmd(app_handle: tauri::AppHandle) -> Result<Vec<SavedRequest>, String> {
    let requests_dir = get_requests_dir(&app_handle);
    let mut requests = Vec::new();

    if let Ok(entries) = fs::read_dir(&requests_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(request) = serde_json::from_str::<SavedRequest>(&content) {
                        requests.push(request);
                    }
                }
            }
        }
    }

    // Sort by updated_at descending (newest first)
    requests.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(requests)
}

#[tauri::command]
fn get_request_cmd(app_handle: tauri::AppHandle, id: String) -> Result<SavedRequest, String> {
    let requests_dir = get_requests_dir(&app_handle);
    let file_path = requests_dir.join(format!("{}.json", id));

    if !file_path.exists() {
        return Err(format!("Request not found: {}", id));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read request: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse request: {}", e))
}

#[tauri::command]
fn delete_request_cmd(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let requests_dir = get_requests_dir(&app_handle);
    let file_path = requests_dir.join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete request: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn save_response_cmd(app_handle: tauri::AppHandle, response: SavedResponse) -> Result<SavedResponse, String> {
    let responses_dir = get_responses_dir(&app_handle);
    let now = chrono_now();
    let mut response = response;

    // Ensure git repo exists
    ensure_git_repo(&app_handle)?;

    // If id is empty, generate new one
    if response.id.is_empty() {
        response.id = generate_response_id(&response.request_id);
    }

    response.created_at = now;

    let file_path = responses_dir.join(format!("{}.json", response.id));
    let json = serde_json::to_string_pretty(&response)
        .map_err(|e| format!("Failed to serialize response: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to save response: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(&app_handle);
    git_add_file(&git_dir, &format!("responses/{}.json", response.id))?;

    Ok(response)
}

#[tauri::command]
fn get_responses_cmd(app_handle: tauri::AppHandle, request_id: Option<String>, endpoint_id: Option<String>) -> Result<Vec<SavedResponse>, String> {
    let responses_dir = get_responses_dir(&app_handle);
    let mut responses = Vec::new();

    if let Ok(entries) = fs::read_dir(&responses_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(response) = serde_json::from_str::<SavedResponse>(&content) {
                        // Filter by request_id if provided
                        if let Some(ref req_id) = request_id {
                            if response.request_id != *req_id {
                                continue;
                            }
                        }
                        // Filter by endpoint_id if provided
                        if let Some(ref ep_id) = endpoint_id {
                            if response.endpoint_id.as_ref() != Some(ep_id) {
                                continue;
                            }
                        }
                        responses.push(response);
                    }
                }
            }
        }
    }

    // Sort by created_at descending (newest first)
    responses.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(responses)
}

#[tauri::command]
fn get_response_cmd(app_handle: tauri::AppHandle, id: String) -> Result<SavedResponse, String> {
    let responses_dir = get_responses_dir(&app_handle);
    let file_path = responses_dir.join(format!("{}.json", id));

    if !file_path.exists() {
        return Err(format!("Response not found: {}", id));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read response: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse response: {}", e))
}

#[tauri::command]
fn delete_response_cmd(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let responses_dir = get_responses_dir(&app_handle);
    let file_path = responses_dir.join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete response: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn delete_responses_cmd(app_handle: tauri::AppHandle, ids: Vec<String>) -> Result<(), String> {
    let responses_dir = get_responses_dir(&app_handle);

    for id in ids {
        let file_path = responses_dir.join(format!("{}.json", id));
        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| format!("Failed to delete response {}: {}", id, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
fn clear_responses_cmd(app_handle: tauri::AppHandle) -> Result<(), String> {
    let responses_dir = get_responses_dir(&app_handle);

    if let Ok(entries) = fs::read_dir(&responses_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to delete response: {}", e))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn save_flow_cmd(app_handle: tauri::AppHandle, flow: SavedFlow) -> Result<SavedFlow, String> {
    let flows_dir = get_flows_dir(&app_handle);
    let now = chrono_now();
    let mut flow = flow;

    // Ensure git repo exists
    ensure_git_repo(&app_handle)?;

    if flow.id.is_empty() {
        flow.id = format!("flow_{}", now.replace(['-', ':', 'T', 'Z', ' '], "").chars().take(14).collect::<String>());
    }

    if flow.created_at.is_empty() {
        flow.created_at = now.clone();
    }
    flow.updated_at = now;
    flow.version = 1;

    let file_path = flows_dir.join(format!("{}.json", flow.id));
    let json = serde_json::to_string_pretty(&flow)
        .map_err(|e| format!("Failed to serialize flow: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to save flow: {}", e))?;

    // Auto-stage the saved file
    let git_dir = get_flare_git_dir(&app_handle);
    git_add_file(&git_dir, &format!("flows/{}.json", flow.id))?;

    Ok(flow)
}

#[tauri::command]
fn get_flows_cmd(app_handle: tauri::AppHandle) -> Result<Vec<SavedFlow>, String> {
    let flows_dir = get_flows_dir(&app_handle);
    let mut flows = Vec::new();

    if let Ok(entries) = fs::read_dir(&flows_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(flow) = serde_json::from_str::<SavedFlow>(&content) {
                        flows.push(flow);
                    }
                }
            }
        }
    }

    flows.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(flows)
}

#[tauri::command]
fn get_flow_cmd(app_handle: tauri::AppHandle, id: String) -> Result<SavedFlow, String> {
    let flows_dir = get_flows_dir(&app_handle);
    let file_path = flows_dir.join(format!("{}.json", id));

    if !file_path.exists() {
        return Err(format!("Flow not found: {}", id));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read flow: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse flow: {}", e))
}

#[tauri::command]
fn delete_flow_cmd(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let flows_dir = get_flows_dir(&app_handle);
    let file_path = flows_dir.join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete flow: {}", e))?;
    }

    Ok(())
}

/// Redact sensitive fields from JSON value recursively
fn redact_json_value(value: &mut serde_json::Value) {
    const SENSITIVE_KEYS: &[&str] = &[
        // Basic credentials
        "password", "passwd", "pass", "pwd",
        // Token variants
        "token", "access_token", "refresh_token", "session_token", "bearer_token",
        "id_token", "oauth_token", "api_token", "auth_token", "jwt", "jwt_token",
        // Secret variants
        "secret", "client_secret", "consumer_secret", "token_secret", "api_secret",
        "secret_key", "secretkey", "encryption_key", "encryptionkey",
        "signing_key", "signingkey", "private_key", "privatekey",
        // AWS
        "aws_secret_key", "aws_access_key", "aws_secret", "aws_key",
        "access_key", "access_key_id", "secret_access_key", "aws_access_key_id",
        // AWS camelCase variants
        "accesskey", "secretkey", "apiSecret", "sessionid", "sessionId",
        // Basic auth
        "basic_password", "basic_username", "bearer_key", "bearer",
        // OAuth2
        "oauth2_client_id", "oauth2_client_secret", "oauth2_access_token",
        "oauth2_refresh_token", "oauth2_token",
        // Auth headers/keys
        "authorization", "auth_header", "auth_key", "auth_secret",
        "api_key", "api_key_value", "apikey", "api_secret",
        // Session/credential
        "session", "credential", "credentials", "session_id",
        // Other sensitive
        "encryption", "encrypt_key",
    ];

    match value {
        serde_json::Value::Object(map) => {
            // Remove sensitive keys (case-insensitive substring match)
            // This catches keys like "userPassword" (contains "password")
            let keys_to_remove: Vec<String> = map.keys()
                .filter(|k| {
                    let lower = k.to_lowercase();
                    SENSITIVE_KEYS.iter().any(|s| lower.contains(&s.to_lowercase()))
                })
                .cloned()
                .collect();

            for key in keys_to_remove {
                map.remove(&key);
            }

            // Recurse into remaining values
            for v in map.values_mut() {
                redact_json_value(v);
            }
        }
        serde_json::Value::Array(arr) => {
            for v in arr.iter_mut() {
                redact_json_value(v);
            }
        }
        _ => {}
    }
}

/// Creates a ZIP archive containing all exportable data (APIs, environments, flows)
fn create_export_zip(
    apis_dir: &std::path::Path,
    env_config_path: &std::path::Path,
    flows_dir: &std::path::Path,
) -> Result<Vec<u8>, String> {
    use std::io::Write;
    use zip::ZipWriter;

    let mut zip_data: Vec<u8> = Vec::new();
    let mut zip = ZipWriter::new(std::io::Cursor::new(&mut zip_data));
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Export metadata
    let metadata = serde_json::json!({
        "version": "1.0",
        "type": EXPORT_TYPE_FULL,
        "exportedAt": chrono::Utc::now().to_rfc3339(),
    });
    zip.add_directory("metadata/", options).map_err(|e| e.to_string())?;
    zip.start_file("metadata/export.json", options).map_err(|e| e.to_string())?;
    zip.write_all(metadata.to_string().as_bytes()).map_err(|e| e.to_string())?;

    // Export APIs (collections)
    zip.add_directory("apis/", options).map_err(|e| e.to_string())?;
    let mut apis_exported: usize = 0;
    let mut apis_failed: usize = 0;
    if let Ok(entries) = fs::read_dir(apis_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                    let raw_content = fs::read_to_string(&path)
                        .map_err(|e| format!("Failed to read {}: {}", name, e))?;
                    match serde_json::from_str::<serde_json::Value>(&raw_content) {
                        Ok(mut value) => {
                            redact_json_value(&mut value);
                            let content = serde_json::to_string(&value)
                                .map_err(|e| format!("Failed to serialize {}: {}", name, e))?;
                            let file_name = format!("apis/{}.json", name);
                            zip.start_file(&file_name, options).map_err(|e| e.to_string())?;
                            zip.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
                            apis_exported += 1;
                        }
                        Err(e) => {
                            apis_failed += 1;
                            tracing::warn!("Skipping invalid JSON {} during export: {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }
    if apis_failed > 0 && apis_exported == 0 {
        return Err(format!("Export failed: all {} API files are invalid", apis_failed));
    } else if apis_failed > 0 {
        tracing::warn!("Export completed with {} valid and {} invalid API files", apis_exported, apis_failed);
    }

    // Export environments
    if env_config_path.exists() {
        let raw_content = fs::read_to_string(env_config_path)
            .map_err(|e| format!("Failed to read environments: {}", e))?;
        if let Ok(mut value) = serde_json::from_str::<serde_json::Value>(&raw_content) {
            redact_json_value(&mut value);
            let content = serde_json::to_string(&value)
                .map_err(|e| format!("Failed to serialize environments: {}", e))?;
            zip.start_file("environments.json", options).map_err(|e| e.to_string())?;
            zip.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        }
    }

    // Export flows
    zip.add_directory("flows/", options).map_err(|e| e.to_string())?;
    let mut flows_exported: usize = 0;
    let mut flows_failed: usize = 0;
    if let Ok(entries) = fs::read_dir(flows_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).unwrap_or("") == "json" {
                if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                    let raw_content = fs::read_to_string(&path)
                        .map_err(|e| format!("Failed to read flow {}: {}", name, e))?;
                    match serde_json::from_str::<serde_json::Value>(&raw_content) {
                        Ok(mut value) => {
                            redact_json_value(&mut value);
                            let content = serde_json::to_string(&value)
                                .map_err(|e| format!("Failed to serialize flow {}: {}", name, e))?;
                            let file_name = format!("flows/{}.json", name);
                            zip.start_file(&file_name, options).map_err(|e| e.to_string())?;
                            zip.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
                            flows_exported += 1;
                        }
                        Err(e) => {
                            flows_failed += 1;
                            tracing::warn!("Skipping invalid flow {} during export: {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }
    if flows_failed > 0 {
        tracing::warn!("Export completed with {} valid and {} invalid flow files", flows_exported, flows_failed);
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_data)
}

#[tauri::command]
fn export_all_data_cmd(app_handle: tauri::AppHandle) -> Result<String, String> {
    let apis_dir = get_flare_dir(&app_handle);
    let env_config_path = get_env_config_path(&app_handle);
    let flows_dir = get_flows_dir(&app_handle);

    let zip_bytes = create_export_zip(&apis_dir, &env_config_path, &flows_dir)?;
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &zip_bytes))
}

// Combined export + save command - shows dialog and writes file directly
#[tauri::command]
async fn export_backup_cmd(app_handle: tauri::AppHandle, default_name: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    // First show the save dialog
    let file_path = app_handle.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("ZIP Archive", &["zip"])
        .add_filter("All Files", &["*"])
        .blocking_save_file();

    let path_str = match file_path {
        Some(path) => path.to_string(),
        None => return Err("No file selected".to_string()),
    };

    // Create ZIP using shared helper
    let apis_dir = get_flare_dir(&app_handle);
    let env_config_path = get_env_config_path(&app_handle);
    let flows_dir = get_flows_dir(&app_handle);

    let zip_data = create_export_zip(&apis_dir, &env_config_path, &flows_dir)?;

    // Write directly to the chosen file path
    fs::write(&path_str, &zip_data)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    tracing::info!("Backup exported to {}", path_str);
    Ok(path_str)
}

// Export flow to JSON file with save dialog
#[tauri::command]
async fn export_flow_cmd(app_handle: tauri::AppHandle, flow_json: String, default_name: String) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    // Show save dialog
    let file_path = app_handle.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JSON File", &["json"])
        .add_filter("All Files", &["*"])
        .blocking_save_file();

    let path_str = match file_path {
        Some(path) => path.to_string(),
        None => return Err("No file selected".to_string()),
    };

    // Write flow JSON to chosen file path
    fs::write(&path_str, &flow_json)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    tracing::info!("Flow exported to {}", path_str);
    Ok(path_str)
}

#[tauri::command]
async fn search_apis(
    app_handle: tauri::AppHandle,
    query: String,
) -> Result<Vec<String>, String> {
    // Get all API names
    let apis_dir = get_flare_dir(&app_handle);
    let mut api_names: Vec<String> = Vec::new();

    if let Ok(entries) = fs::read_dir(&apis_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext == "yaml" || ext == "yml" || ext == "json" {
                if let Some(name) = path.file_stem() {
                    api_names.push(name.to_string_lossy().to_string());
                }
            }
        }
    }

    // Simple keyword matching - in production, this would use embedding-based semantic search
    let q = query.to_lowercase();
    let results: Vec<String> = api_names
        .into_iter()
        .filter(|name| {
            name.to_lowercase().contains(&q) ||
            // Also search in API file content
            {
                let file_path = apis_dir.join(format!("{}.json", name));
                let yaml_path = apis_dir.join(format!("{}.yaml", name));

                if let Ok(content) = fs::read_to_string(&file_path) {
                    content.to_lowercase().contains(&q)
                } else if let Ok(content) = fs::read_to_string(&yaml_path) {
                    content.to_lowercase().contains(&q)
                } else {
                    false
                }
            }
        })
        .collect();

    Ok(results)
}

#[tauri::command]
async fn execute_agent_command(
    app_handle: tauri::AppHandle,
    prompt: String,
    context: Option<String>,
) -> Result<String, String> {
    use std::process::Command;

    // System prompt to define the agent's role and capabilities
    let system_prompt = r#"You are an API assistant in flare-api-spec, a desktop tool for managing and testing APIs.

Your capabilities:
- Search APIs by keyword using /search <query>
- List all available APIs using /list
- Execute HTTP requests using /run <METHOD> <path>
- Get API details using /get <api-name>
- Help users understand API structure and usage

Available commands:
- /search <query> - Search loaded APIs
- /list - List all loaded APIs
- /run <METHOD> <path> - Show how to execute a request (opens Request Builder)
- /get <api-name> - Show API details
- /help - Show available commands

When answering questions:
1. Be concise and helpful
2. Use bullet points for clarity
3. When users ask about APIs, use the available commands to provide accurate info
4. If you don't have information, say so honestly

Response format:
- Use markdown for formatting
- Code blocks for examples
- Bullet points for lists"#;

    // Build the full prompt with system instructions
    let agent_context = context.unwrap_or_default();
    let full_prompt = format!(
        "{}\n\nCurrent environment:\n{}\n\nUser request:\n{}",
        system_prompt,
        agent_context,
        prompt
    );

    // Execute claude -p with the prompt
    // Get the app's current directory to use as working directory
    let app_dir = app_handle.path().app_data_dir()
        .map(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or(None)
        .unwrap_or_else(|| PathBuf::from("."));

       let output = Command::new("claude")
        .args(["-p", &full_prompt])
        .current_dir(&app_dir)
        .output()
        .map_err(|e| format!("Failed to execute claude command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Claude command failed: {}", stderr))
    }
}

// ============================================================================
// Agent Streaming Command (使用 Claude --stream 实现流式响应)
// ============================================================================

const AGENT_STREAM_EVENT: &str = "agent-stream-response";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStreamChunk {
    pub chunk: String,
    pub is_final: bool,
}

#[tauri::command]
async fn execute_agent_command_stream(
    app_handle: tauri::AppHandle,
    prompt: String,
    context: Option<String>,
) -> Result<(), String> {
    use tokio::process::Command;
    use tokio::io::{AsyncBufReadExt, BufReader};
    use std::process::Stdio;

    let system_prompt = r#"You are an API assistant in flare-api-spec, a desktop tool for managing and testing APIs.

Your capabilities:
- Search APIs by keyword using /search <query>
- List all available APIs using /list
- Execute HTTP requests using /run <METHOD> <path>
- Get API details using /get <api-name>
- Help users understand API structure and usage

Available commands:
- /search <query> - Search loaded APIs
- /list - List all loaded APIs
- /run <METHOD> <path> - Show how to execute a request (opens Request Builder)
- /get <api-name> - Show API details
- /help - Show available commands

When answering questions:
1. Be concise and helpful
2. Use bullet points for clarity
3. When users ask about APIs, use the available commands to provide accurate info
4. If you don't have information, say so honestly

Response format:
- Use markdown for formatting
- Code blocks for examples
- Bullet points for lists"#;

    let agent_context = context.unwrap_or_default();
    let full_prompt = format!(
        "{}\n\nCurrent environment:\n{}\n\nUser request:\n{}",
        system_prompt,
        agent_context,
        prompt
    );

    let app_dir = app_handle.path().app_data_dir()
        .map(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or(None)
        .unwrap_or_else(|| PathBuf::from("."));

    let mut child = Command::new("claude")
        .args(["-p", "--stream", &full_prompt])
        .current_dir(&app_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn claude command: {}", e))?;

    let stdout = child.stdout.take()
        .ok_or("Failed to capture stdout")?;

    let mut reader = BufReader::new(stdout).lines();
    let mut full_response = String::new();

    while let Some(line) = reader.next_line().await.map_err(|e| format!("Read error: {}", e))? {
        full_response.push_str(&line);
        full_response.push('\n');

        let chunk = AgentStreamChunk {
            chunk: line,
            is_final: false,
        };
        app_handle.emit(AGENT_STREAM_EVENT, chunk)
            .map_err(|e| format!("Failed to emit chunk: {}", e))?;
    }

    let status = child.wait().await
        .map_err(|e| format!("Failed to wait for process: {}", e))?;

    let final_chunk = AgentStreamChunk {
        chunk: String::new(),
        is_final: true,
    };
    let _ = app_handle.emit(AGENT_STREAM_EVENT, final_chunk);

    if !status.success() {
        if let Some(stderr) = child.stderr.take() {
            let mut err_reader = BufReader::new(stderr).lines();
            let mut err_msg = String::new();
            while let Ok(Some(line)) = err_reader.next_line().await {
                err_msg.push_str(&line);
            }
            if !err_msg.is_empty() {
                return Err(format!("Claude command failed: {}", err_msg));
            }
        }
        return Err("Claude command failed".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn get_agent_context(
    app_handle: tauri::AppHandle,
    selected_api: Option<String>,
    selected_endpoint: Option<String>,
) -> Result<String, String> {
    // Build context about available APIs and current state
    let apis_dir = get_flare_dir(&app_handle);
    let mut api_names: Vec<String> = Vec::new();

    if let Ok(entries) = fs::read_dir(&apis_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext == "yaml" || ext == "yml" || ext == "json" {
                if let Some(name) = path.file_stem() {
                    api_names.push(name.to_string_lossy().to_string());
                }
            }
        }
    }

    let mut context = String::new();
    context.push_str(&format!("Loaded APIs ({}):\n", api_names.len()));
    for name in &api_names {
        context.push_str(&format!("  - {}\n", name));
    }

    // Add selected API details if provided
    if let Some(api_name) = selected_api {
        context.push_str(&format!("\nSelected API: {}\n", api_name));

        // Read API file to get endpoints
        let yaml_path = apis_dir.join(format!("{}.yaml", api_name));
        let json_path = apis_dir.join(format!("{}.json", api_name));

        let content = if yaml_path.exists() {
            fs::read_to_string(&yaml_path).ok()
        } else if json_path.exists() {
            fs::read_to_string(&json_path).ok()
        } else {
            None
        };

        if let Some(content) = content {
            // Parse and show endpoints if possible
            context.push_str("  Endpoints:\n");
            // Simple extraction of paths from content
            for line in content.lines() {
                if line.contains("path:") || line.contains("method:") {
                    let trimmed = line.trim();
                    if trimmed.starts_with("- ") || trimmed.starts_with("path:") {
                        context.push_str(&format!("    {}\n", trimmed.replace("- ", "")));
                    }
                }
            }
        }
    }

    if let Some(endpoint) = selected_endpoint {
        context.push_str(&format!("\nSelected Endpoint: {}\n", endpoint));
    }

    context.push_str("\nStorage location: ");
    context.push_str(&apis_dir.to_string_lossy());

    Ok(context)
}

#[tauri::command]
async fn call_llm(
    system_prompt: String,
    user_prompt: String,
    model: Option<String>,
) -> Result<String, String> {
    use std::process::Command;

    let model_arg = model.unwrap_or_else(|| "sonnet".to_string());

    let full_prompt = format!(
        "System: {}\n\nUser: {}",
        system_prompt,
        user_prompt
    );

    // Use claude -p with model flag
    let output = Command::new("claude")
        .args(["-p", "--model", &model_arg, &full_prompt])
        .output()
        .map_err(|e| format!("Failed to execute claude command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("LLM call failed: {}", stderr))
    }
}

#[tauri::command]
fn update_import_config(app_handle: tauri::AppHandle, config: ImportConfig) -> Result<(), String> {
    save_import_config(app_handle, config)
}

#[tauri::command]
async fn sync_import_config(
    app_handle: tauri::AppHandle,
    config_id: String,
) -> Result<Vec<String>, String> {
    let configs_dir = get_configs_dir(&app_handle);
    let config_path = configs_dir.join(format!("{}.json", config_id));

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let mut config: ImportConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Fetch swagger-config
    let mut request_builder = client.get(&config.url);
    for (key, value) in &config.headers {
        request_builder = request_builder.header(key, value);
    }

    let config_response = request_builder.send().await
        .map_err(|e| format!("Failed to fetch config: {}", e))?;

    if !config_response.status().is_success() {
        return Err(format!("Config fetch failed: {}", config_response.status()));
    }

    let config_text = config_response.text().await
        .map_err(|e| format!("Failed to read config body: {}", e))?;

    let config_json: serde_json::Value = serde_json::from_str(&config_text)
        .map_err(|e| format!("Failed to parse config JSON: {}", e))?;

    let urls = config_json.get("urls")
        .and_then(|v| v.as_array())
        .ok_or("Invalid config: missing urls")?;

    let mut imported: Vec<String> = Vec::new();
    let url_obj = url::Url::parse(&config.url)
        .map_err(|e| format!("Invalid config URL: {}", e))?;

    for api_info in urls {
        let service_name = api_info.get("serviceName")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let api_url = api_info.get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let full_url = format!("{}://{}{}", url_obj.scheme(), url_obj.host_str().unwrap_or(""), api_url);

        // Fetch API doc
        let mut api_request = client.get(&full_url);
        for (key, value) in &config.headers {
            api_request = api_request.header(key, value);
        }

        match api_request.send().await {
            Ok(api_response) if api_response.status().is_success() => {
                let api_body = api_response.text().await
                    .map_err(|e| format!("Failed to read API body: {}", e))?;

                if let Ok(api_json) = serde_json::from_str::<serde_json::Value>(&api_body) {
                    let parsed = parse_openapi_doc(api_json, &service_name);

                    let api_data = serde_json::json!({
                        "name": parsed.0,
                        "version": parsed.1,
                        "baseUrl": parsed.2,
                        "description": parsed.3,
                        "endpoints": parsed.4,
                    });

                    let api_name = service_name.to_lowercase().replace(' ', "-");
                    save_api_to_dir(&app_handle, &api_name, &api_data)?;

                    imported.push(service_name);
                }
            }
            _ => {
                // Skip failed APIs
            }
        }
    }

    // Update last_sync time
    config.last_sync = Some(chrono_now());
    let updated_json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize updated config: {}", e))?;
    fs::write(&config_path, updated_json)
        .map_err(|e| format!("Failed to update config: {}", e))?;

    Ok(imported)
}

fn save_api_to_dir(app_handle: &tauri::AppHandle, name: &str, data: &serde_json::Value) -> Result<(), String> {
    let apis_dir = get_flare_dir(app_handle);
    let file_path = apis_dir.join(format!("{}.json", name));

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize API: {}", e))?;

    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to save API: {}", e))?;

    Ok(())
}

fn parse_openapi_doc(doc: serde_json::Value, fallback_name: &str) -> (String, String, String, Option<String>, Vec<serde_json::Value>) {
    let info = doc.get("info").unwrap_or(&serde_json::Value::Null);
    let name = info.get("title")
        .and_then(|v| v.as_str())
        .unwrap_or(fallback_name)
        .to_string();
    let version = info.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0.0")
        .to_string();
    let description = info.get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let base_url = doc.get("servers")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut endpoints: Vec<serde_json::Value> = Vec::new();
    if let Some(paths) = doc.get("paths").and_then(|v| v.as_object()) {
        for (path, path_item) in paths {
            let methods = ["get", "post", "put", "delete", "patch", "head", "options"];
            for method in methods {
                if let Some(operation) = path_item.get(method) {
                    // Extract requestBody
                    let request_body = operation.get("requestBody").map(|rb| {
                        let description = rb.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
                        let required = rb.get("required").and_then(|v| v.as_bool()).unwrap_or(false);
                        let content = rb.get("content").and_then(|v| v.as_object());
                        let content_type = content.and_then(|c| c.keys().next()).map(|s| s.to_string());
                        let schema = content.and_then(|c| c.values().next()).map(|v| {
                            // Extract schema from content media type
                            v.get("schema").map(|s| s.to_string()).unwrap_or_else(|| "{}".to_string())
                        });

                        serde_json::json!({
                            "description": description,
                            "required": required,
                            "contentType": content_type,
                            "schema": schema,
                        })
                    });

                    let endpoint = serde_json::json!({
                        "path": path,
                        "method": method.to_uppercase(),
                        "operationId": operation.get("operationId"),
                        "summary": operation.get("summary"),
                        "description": operation.get("description"),
                        "tags": operation.get("tags"),
                        "deprecated": operation.get("deprecated").unwrap_or(&serde_json::Value::Bool(false)),
                        "parameters": operation.get("parameters").unwrap_or(&serde_json::Value::Array(vec![])),
                        "requestBody": request_body,
                        "responses": operation.get("responses").unwrap_or(&serde_json::Value::Object(serde_json::Map::new())),
                        "security": operation.get("security"),
                    });
                    endpoints.push(endpoint);
                }
            }
        }
    }

    (name, version, base_url, description, endpoints)
}

/// Generate mock rules from OpenAPI parsed endpoints
/// Returns a list of MockRule structs ready to be loaded into the mock server
pub fn generate_mock_rules_from_openapi(
    name: &str,
    base_url: &str,
    endpoints: Vec<serde_json::Value>,
) -> Vec<MockRule> {
    let mut rules = Vec::new();

    for endpoint in endpoints {
        let path = endpoint.get("path").and_then(|v| v.as_str()).unwrap_or("/");
        let method = endpoint.get("method").and_then(|v| v.as_str()).unwrap_or("GET");
        let operation_id = endpoint.get("operationId").and_then(|v| v.as_str());
        let summary = endpoint.get("summary").and_then(|v| v.as_str());
        let description = endpoint.get("description").and_then(|v| v.as_str());

        // Generate rule name
        let rule_name = operation_id
            .or(summary)
            .or(description)
            .unwrap_or("Unnamed Endpoint")
            .to_string();

        // Generate body template from schema
        let body_template = generate_body_template_from_endpoint(&endpoint);

        // Get response status code (default to 200)
        let status_code = get_response_status_code(&endpoint);

        let rule = MockRule {
            id: format!("openapi_{}_{}_{}", name.to_lowercase().replace(' ', "_"), method.to_lowercase(), path.replace('/', "_")),
            name: rule_name,
            enabled: true,
            trigger: MockTrigger {
                path_pattern: Some(format!("{}{}", base_url.trim_end_matches('/'), path)),
                method: Some(vec![method.to_uppercase()]),
            },
            response: MockResponse {
                status_code,
                headers: None,
                body_template,
                delay_ms: 0,
            },
            locale: None,
        };

        rules.push(rule);
    }

    rules
}

/// Generate a body template from endpoint schema
fn generate_body_template_from_endpoint(endpoint: &serde_json::Value) -> String {
    // Try to get schema from requestBody
    if let Some(request_body) = endpoint.get("requestBody") {
        if let Some(schema_str) = request_body.get("schema").and_then(|v| v.as_str()) {
            if let Ok(schema) = serde_json::from_str::<serde_json::Value>(schema_str) {
                return generate_template_from_schema(&schema);
            }
        }
    }

    // Try to get schema from response
    if let Some(responses) = endpoint.get("responses").and_then(|v| v.as_object()) {
        // Get 200 response
        if let Some(response_200) = responses.get("200").or_else(|| responses.get("201")).or_else(|| responses.get("default")) {
            if let Some(content) = response_200.get("content").and_then(|v| v.as_object()) {
                if let Some(json_media) = content.get("application/json") {
                    if let Some(schema) = json_media.get("schema") {
                        return generate_template_from_schema(schema);
                    }
                }
            }
        }
    }

    // Default empty object
    "{}".to_string()
}

/// Generate template string from JSON schema
fn generate_template_from_schema(schema: &serde_json::Value) -> String {
    match schema {
        serde_json::Value::Object(map) => {
            // Handle $ref
            if let Some(reference) = map.get("$ref") {
                if let Some(ref_path) = reference.as_str() {
                    // Extract final component from ref path like "#/components/schemas/User"
                    let components: Vec<&str> = ref_path.split('/').collect();
                    if let Some(type_name) = components.last() {
                        return format!("{{{{${}}}}}", type_name.to_lowercase());
                    }
                }
                return "{}".to_string();
            }

            // Handle type
            if let Some(type_str) = map.get("type").and_then(|v| v.as_str()) {
                match type_str {
                    "object" => {
                        let mut props = Vec::new();
                        if let Some(properties) = map.get("properties").and_then(|v| v.as_object()) {
                            for (key, value) in properties {
                                let prop_template = generate_template_from_schema(value);
                                props.push(format!("\"{}\": {}", key, prop_template));
                            }
                        }
                        if props.is_empty() {
                            "{}".to_string()
                        } else {
                            format!("{{{}}}", props.join(", "))
                        }
                    }
                    "array" => {
                        if let Some(items) = map.get("items") {
                            let item_template = generate_template_from_schema(items);
                            format!("[{}]", item_template)
                        } else {
                            "[]".to_string()
                        }
                    }
                    "string" => {
                        // Check format for mock rule hint
                        if let Some(format) = map.get("format").and_then(|v| v.as_str()) {
                            match format {
                                "email" => "{{$email}}".to_string(),
                                "uri" | "url" => "{{$url}}".to_string(),
                                "ipv4" => "{{$ipv4}}".to_string(),
                                "ipv6" => "{{$ipv6}}".to_string(),
                                "date" => "{{$date}}".to_string(),
                                "date-time" | "datetime" => "{{$datetime}}".to_string(),
                                _ => "{{$random}}".to_string(),
                            }
                        } else if let Some(pattern) = map.get("pattern").and_then(|v| v.as_str()) {
                            // If there's a pattern, try to infer type
                            if pattern.contains("[a-z]") && pattern.contains("@") {
                                "{{$email}}".to_string()
                            } else {
                                "{{$random}}".to_string()
                            }
                        } else {
                            "{{$random}}".to_string()
                        }
                    }
                    "integer" | "number" => {
                        // Check for minimum/maximum for range hint
                        if let Some(min) = map.get("minimum").and_then(|v| v.as_i64()) {
                            if let Some(max) = map.get("maximum").and_then(|v| v.as_i64()) {
                                return format!("{{$randomInt {} {}}}", min, max);
                            }
                        }
                        "{{$randomInt 1 100}}".to_string()
                    }
                    "boolean" => "{{boolean}}".to_string(),
                    _ => "{}".to_string(),
                }
            } else {
                // No type specified, try to infer from properties
                if map.contains_key("properties") || map.contains_key("additionalProperties") {
                    generate_template_from_schema(&serde_json::Value::Object(map.clone()))
                } else {
                    "{}".to_string()
                }
            }
        }
        serde_json::Value::Array(arr) => {
            if let Some(first) = arr.first() {
                let item_template = generate_template_from_schema(first);
                format!("[{}]", item_template)
            } else {
                "[]".to_string()
            }
        }
        _ => "{}".to_string(),
    }
}

/// Get the primary response status code from endpoint responses
fn get_response_status_code(endpoint: &serde_json::Value) -> u16 {
    if let Some(responses) = endpoint.get("responses").and_then(|v| v.as_object()) {
        // Priority order for common success codes
        for code in ["201", "200", "202", "204"] {
            if let Some(response) = responses.get(code) {
                // Check if it's a real response object, not just "description"
                if response.get("description").is_some() || response.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
                    return code.parse().unwrap_or(200);
                }
            }
        }
        // Get first key that's a number
        for (key, _) in responses.iter() {
            if let Ok(code) = key.parse::<u16>() {
                return code;
            }
        }
    }
    200
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let now = chrono::DateTime::from_timestamp(secs as i64, 0)
        .unwrap_or_default();
    now.format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

// --- Git IPC Commands ---

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub timestamp: u64,
    pub files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffLine {
    #[serde(rename = "type")]
    pub diff_type: String,
    pub content: String,
    pub old_line_number: Option<u32>,
    pub new_line_number: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffHunk {
    pub lines: Vec<DiffLine>,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffFile {
    pub path: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResult {
    pub files: Vec<DiffFile>,
    pub summary: DiffSummary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffSummary {
    pub added: u32,
    pub removed: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepoStatus {
    pub clean: bool,
    pub staged: Vec<String>,
    pub unstaged: Vec<String>,
    pub untracked: Vec<String>,
    pub conflicting: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub current: bool,
    pub remote: bool,
}

fn get_flare_git_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    app_data_dir.join(".flare")
}

/// Ensure the .flare directory is initialized as a Git repository
fn ensure_git_repo(app_handle: &tauri::AppHandle) -> Result<(), String> {
    use std::process::Command;

    let git_dir = get_flare_git_dir(app_handle);
    let git_dir_path = git_dir.join(".git");

    if git_dir_path.exists() && git_dir_path.is_dir() {
        return Ok(());
    }

    // Check if git is installed
    let git_check = Command::new("git").args(["--version"]).output();
    if git_check.is_err() {
        return Err("Git is not installed or not found in PATH".to_string());
    }
    if !git_check.unwrap().status.success() {
        return Err("Git is not installed or not found in PATH".to_string());
    }

    if !git_dir.exists() {
        fs::create_dir_all(&git_dir)
            .map_err(|e| format!("Failed to create .flare directory: {}", e))?;
    }

    let output = Command::new("git")
        .args(["init"])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to run git init: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git init failed: {}", stderr));
    }

    // Create .gitignore
    let gitignore_content = r#"# Temporary files
*.tmp
*.swp
*~

# OS files
.DS_Store
Thumbs.db

# Response cache
responses/
*.response
"#;
    let gitignore_path = git_dir.join(".gitignore");
    fs::write(&gitignore_path, gitignore_content)
        .map_err(|e| format!("Failed to create .gitignore: {}", e))?;

    // Create initial commit
    let add_output = Command::new("git")
        .args(["add", "."])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr);
        return Err(format!("git add failed: {}", stderr));
    }

    let commit_output = Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        return Err(format!("git commit failed: {}", stderr));
    }

    Ok(())
}

/// Helper function to stage a file in git
fn git_add_file(git_dir: &PathBuf, relative_path: &str) -> Result<(), String> {
    use std::process::Command;

    let output = Command::new("git")
        .args(["add", relative_path])
        .current_dir(git_dir)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("ignored") || stderr.contains("The following paths are ignored") {
            return Ok(());
        }
        return Err(format!("git add failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
async fn init_git_repo(app_handle: tauri::AppHandle) -> Result<(), String> {
    ensure_git_repo(&app_handle)
}

#[tauri::command]
async fn git_log(
    app_handle: tauri::AppHandle,
    api_name: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<GitCommit>, String> {
    use std::process::Command;

    // Ensure git repo exists first
    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);
    let mut args: Vec<String> = vec!["log".to_string(), "--format=%H|%h|%s|%an|%ae|%at|%d".to_string()];

    if let Some(name) = &api_name {
        let file_name = format!("apis/{}.yaml", name.to_lowercase().replace(' ', "-"));
        args.push("--".to_string());
        args.push(file_name);
    }

    if let Some(l) = limit {
        args.push(format!("--max-count={}", l));
    }

    let output = Command::new("git")
        .args(&args)
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to execute git log: {}", e))?;

    // If there are no commits yet, git log returns non-zero status
    // This is not an error, just means the repo is empty
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Check if it's just "no commits" error - this is OK
        if stderr.contains("does not have any commits") {
            return Ok(Vec::new());
        }
        return Err(format!("git log failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() { continue; }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 6 {
            commits.push(GitCommit {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                message: parts[2].to_string(),
                author: parts[3].to_string(),
                email: parts[4].to_string(),
                timestamp: parts[5].parse().unwrap_or(0) * 1000,
                files: Vec::new(),
            });
        }
    }

    Ok(commits)
}

#[tauri::command]
async fn git_diff(
    app_handle: tauri::AppHandle,
    api_name: String,
    commit_a: String,
    commit_b: Option<String>,
) -> Result<DiffResult, String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);
    let file_name = format!("apis/{}.yaml", api_name.to_lowercase().replace(' ', "-"));

    let ref_b = commit_b.unwrap_or_else(|| "HEAD".to_string());

    let output = Command::new("git")
        .args(["diff", &commit_a, &ref_b, "--", &file_name])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to execute git diff: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_git_diff(&stdout)
}

fn parse_git_diff(output: &str) -> Result<DiffResult, String> {
    let mut files = Vec::new();
    let mut current_file: Option<DiffFile> = None;
    let mut current_hunk: Option<DiffHunk> = None;
    let mut added = 0u32;
    let mut removed = 0u32;

    for line in output.lines() {
        if line.starts_with("diff --git") {
            if let Some(f) = current_file.take() {
                files.push(f);
            }
            let path = line
                .trim_start_matches("diff --git a/")
                .split(" b/")
                .nth(1)
                .unwrap_or("")
                .to_string();
            current_file = Some(DiffFile { path, hunks: Vec::new() });
            current_hunk = None;
        } else if line.starts_with("@@") {
            if let Some(ref mut f) = current_file {
                if let Some(h) = current_hunk.take() {
                    f.hunks.push(h);
                }
            }
            // Parse @@ -old,old_lines +new,new_lines @@
            let parts: Vec<&str> = line.split("@@").collect();
            if parts.len() >= 2 {
                let nums: Vec<&str> = parts[1].trim().split_whitespace().collect();
                if nums.len() >= 2 {
                    let old_parts: Vec<&str> = nums[0].trim_start_matches('-').split(',').collect();
                    let new_parts: Vec<&str> = nums[1].trim_start_matches('+').split(',').collect();

                    current_hunk = Some(DiffHunk {
                        lines: Vec::new(),
                        old_start: old_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0),
                        old_lines: old_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1),
                        new_start: new_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0),
                        new_lines: new_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1),
                    });
                }
            }
        } else if line.starts_with('+') && !line.starts_with("+++") {
            added += 1;
            if let Some(ref mut h) = current_hunk {
                h.lines.push(DiffLine {
                    diff_type: "add".to_string(),
                    content: line[1..].to_string(),
                    old_line_number: None,
                    new_line_number: None,
                });
            }
        } else if line.starts_with('-') && !line.starts_with("---") {
            removed += 1;
            if let Some(ref mut h) = current_hunk {
                h.lines.push(DiffLine {
                    diff_type: "remove".to_string(),
                    content: line[1..].to_string(),
                    old_line_number: None,
                    new_line_number: None,
                });
            }
        } else if !line.starts_with("+++") && !line.starts_with("index") && !line.is_empty() {
            if let Some(ref mut h) = current_hunk {
                h.lines.push(DiffLine {
                    diff_type: "context".to_string(),
                    content: line[1..].trim_start().to_string(),
                    old_line_number: None,
                    new_line_number: None,
                });
            }
        }
    }

    if let Some(mut f) = current_file {
        if let Some(h) = current_hunk {
            f.hunks.push(h);
        }
        files.push(f);
    }

    Ok(DiffResult {
        files,
        summary: DiffSummary { added, removed },
    })
}

#[tauri::command]
async fn git_status(app_handle: tauri::AppHandle) -> Result<RepoStatus, String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    let output = Command::new("git")
        .args(["status", "--porcelain=v1"])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to execute git status: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    let mut conflicting = Vec::new();

    for line in stdout.lines() {
        if line.len() < 3 { continue; }
        let index_status = line.chars().next().unwrap();
        let work_tree_status = line.chars().nth(1).unwrap();
        let file = line[3..].to_string();

        if index_status == '?' && work_tree_status == '?' {
            untracked.push(file);
        } else if index_status == 'U' || work_tree_status == 'U' {
            conflicting.push(file);
        } else if index_status != ' ' && index_status != '?' {
            staged.push(file);
        } else if work_tree_status != ' ' && work_tree_status != '?' {
            unstaged.push(file);
        }
    }

    let clean = staged.is_empty() && unstaged.is_empty() && untracked.is_empty() && conflicting.is_empty();

    Ok(RepoStatus {
        clean,
        staged,
        unstaged,
        untracked,
        conflicting,
    })
}

#[tauri::command]
async fn git_stage(app_handle: tauri::AppHandle, files: Vec<String>) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    let mut args = vec!["add".to_string()];
    args.extend(files);

    Command::new("git")
        .args(&args)
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn git_commit(app_handle: tauri::AppHandle, message: String) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git commit: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn git_branch_list(app_handle: tauri::AppHandle) -> Result<Vec<Branch>, String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    let output = Command::new("git")
        .args(["branch", "-a"])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git branch: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut branches = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        let is_current = trimmed.starts_with('*');
        let name = trimmed.trim_start_matches("* \t").to_string();
        let is_remote = name.starts_with("remotes/");

        branches.push(Branch {
            name: name.trim_start_matches("remotes/").to_string(),
            current: is_current,
            remote: is_remote,
        });
    }

    Ok(branches)
}

#[tauri::command]
async fn git_branch_create(app_handle: tauri::AppHandle, branch_name: String) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    let output = Command::new("git")
        .args(["branch", &branch_name])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git branch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git branch failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
async fn git_checkout(app_handle: tauri::AppHandle, branch: String) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    Command::new("git")
        .args(["checkout", &branch])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git checkout: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn git_reset(app_handle: tauri::AppHandle, commit_hash: String, mode: String) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);
    let reset_mode = if mode == "hard" { "--hard" } else { "--mixed" };

    let output = Command::new("git")
        .args(["reset", reset_mode, &commit_hash])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git reset: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

#[tauri::command]
async fn git_revert(app_handle: tauri::AppHandle, commit_hash: String) -> Result<(), String> {
    use std::process::Command;

    ensure_git_repo(&app_handle)?;

    let git_dir = get_flare_git_dir(&app_handle);

    let output = Command::new("git")
        .args(["revert", "--no-edit", &commit_hash])
        .current_dir(&git_dir)
        .output()
        .map_err(|e| format!("Failed to git revert: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

// --- Dynamic Mock Data Generation Commands ---

#[derive(Debug, Serialize, Deserialize)]
pub struct RandomIntResult {
    pub value: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RandomFloatResult {
    pub value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimestampResult {
    pub unix_ms: i64,
    pub datetime: String,
    pub date: String,
    pub time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SequenceResult {
    pub value: String,
    pub index: u64,
}

/// Generate a secure UUID v4
#[tauri::command]
fn generate_uuid() -> Result<String, String> {
    use uuid::Uuid;
    let uuid = Uuid::new_v4();
    Ok(uuid.to_string())
}

/// Generate a secure random integer within a range (default 0 to 10000)
#[tauri::command]
fn generate_random_int(min: Option<i64>, max: Option<i64>) -> Result<RandomIntResult, String> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let min_val = min.unwrap_or(0);
    let max_val = max.unwrap_or(10000);
    let value = rng.gen_range(min_val..=max_val);
    Ok(RandomIntResult { value })
}

/// Generate a secure random float within a range (default 0.0 to 1000.0, 2 decimal places)
#[tauri::command]
fn generate_random_float(min: Option<f64>, max: Option<f64>, decimals: Option<u32>) -> Result<RandomFloatResult, String> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let min_val = min.unwrap_or(0.0);
    let max_val = max.unwrap_or(1000.0);
    let decimal_places = decimals.unwrap_or(2).min(10) as usize;
    let range = max_val - min_val;
    let scaled: f64 = rng.gen_range(0.0..=(range * 10_f64.powi(decimal_places as i32)));
    let value = min_val + scaled / 10_f64.powi(decimal_places as i32);
    Ok(RandomFloatResult { value })
}

/// Generate current timestamp and datetime strings
#[tauri::command]
fn generate_timestamp() -> Result<TimestampResult, String> {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let unix_ms = duration.as_secs() as i64 * 1000 + duration.subsec_nanos() as i64 / 1_000_000;

    let secs = duration.as_secs();
    let dt = chrono::DateTime::from_timestamp(secs as i64, 0).unwrap_or_default();
    let datetime = dt.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let date = dt.format("%Y-%m-%d").to_string();
    let time = dt.format("%H:%M:%S").to_string();

    Ok(TimestampResult {
        unix_ms,
        datetime,
        date,
        time,
    })
}

/// Generate a sequence with prefix (e.g., "ORDER_0001")
#[tauri::command]
fn generate_sequence(prefix: Option<String>, index: Option<u64>, padding: Option<u32>) -> Result<SequenceResult, String> {
    let prefix_str = prefix.unwrap_or_else(|| "SEQ".to_string());
    let idx = index.unwrap_or(1);
    let pad = padding.unwrap_or(4).min(20) as usize;

    let value = format!("{}_{}", prefix_str, format!("{:0>width$}", idx, width = pad));
    Ok(SequenceResult { value, index: idx })
}

// ============================================================================
// Unified Mock Data Generation (Single Source of Truth)
// ============================================================================

/// Mock locale enum - supports multiple languages
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MockLocale {
    EnUS,
    ZhCN,
}

impl MockLocale {
    fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "zh-cn" | "zh_cn" | "zhcn" => MockLocale::ZhCN,
            _ => MockLocale::EnUS,
        }
    }
}

/// Locale-specific data pool
#[derive(Debug, Clone)]
struct LocaleDataPool {
    first_name: &'static [&'static str],
    last_name: &'static [&'static str],
    email_domain: &'static [&'static str],
    city: &'static [&'static str],
    country: &'static [&'static str],
    company: &'static [&'static str],
    color: &'static [&'static str],
    street_suffix: &'static [&'static str],
    zip_code: &'static [&'static str],
    lorem: &'static [&'static str],
}

/// English (US) data pool
static EN_US_POOL: LocaleDataPool = LocaleDataPool {
    first_name: &[
        "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
        "David", "Elizabeth", "William", "Susan", "Richard", "Jessica", "Thomas", "Sarah",
    ],
    last_name: &[
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    ],
    email_domain: &["example.com", "test.com", "demo.com", "sample.org", "mail.com"],
    city: &[
        "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
        "San Antonio", "San Diego", "Dallas", "Austin", "Jacksonville", "Fort Worth",
    ],
    country: &["USA", "Canada", "UK", "Germany", "France", "Japan", "Australia", "Brazil"],
    company: &[
        "Acme Corp", "TechCo", "GlobalTech", "Innovation Labs", "Digital Dynamics",
        "Future Systems", "Globex", "Initech", "Umbrella", "Stark Industries",
    ],
    color: &[
        "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33", "#33FFF5",
        "#3498DB", "#2ECC71", "#E74C3C", "#9B59B6", "#F39C12", "#1ABC9C",
    ],
    street_suffix: &["Main St", "Oak Ave", "Maple Dr", "Park Blvd", "Lake View Rd", "Hill St"],
    zip_code: &["10001", "90210", "60601", "77001", "85001", "19101", "30301", "98101"],
    lorem: &[
        "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
        "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
        "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
        "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
        "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
        "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
        "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
        "deserunt", "mollit", "anim", "id", "est", "laborum", "data", "information",
        "content", "system", "user", "request", "response", "application", "service",
    ],
};

/// Chinese (CN) data pool
static ZH_CN_POOL: LocaleDataPool = LocaleDataPool {
    first_name: &[
        "伟", "芳", "明", "丽", "强", "娟", "磊", "敏",
        "军", "英", "华", "玲", "杰", "娟", "涛", "燕",
    ],
    last_name: &[
        "王", "李", "张", "刘", "陈", "杨", "赵", "黄",
        "周", "吴", "徐", "孙", "胡", "朱", "高", "林",
    ],
    email_domain: &["example.com", "qq.com", "163.com", "126.com", "gmail.com"],
    city: &["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安"],
    country: &["中国", "美国", "日本", "韩国", "德国", "法国", "英国", "加拿大"],
    company: &[
        "腾讯科技", "阿里巴巴", "百度", "京东", "字节跳动",
        "美团", "滴滴出行", "小米科技", "华为技术", "网易",
    ],
    color: &[
        "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33", "#33FFF5",
        "#3498DB", "#2ECC71", "#E74C3C", "#9B59B6", "#F39C12", "#1ABC9C",
    ],
    street_suffix: &["路", "街", "大道", "巷", "弄", "号"],
    zip_code: &["100000", "200000", "510000", "518000", "310000", "610000"],
    lorem: &[
        "数据", "信息", "内容", "系统", "用户", "请求", "响应", "应用",
        "服务", "网络", "接口", "功能", "模块", "处理", "管理", "配置",
        "参数", "选项", "设置", "状态", "类型", "值", "结果", "错误",
        "成功", "失败", "完成", "开始", "结束", "进行", "等待", "取消",
        "测试", "开发", "生产", "环境", "版本", "编号", "名称", "描述",
    ],
};

/// Multi-locale data pools - single source of truth
static MOCK_DATA_POOLS: once_cell::sync::Lazy<std::collections::HashMap<MockLocale, LocaleDataPool>> =
    once_cell::sync::Lazy::new(|| {
        std::collections::HashMap::from([
            (MockLocale::EnUS, EN_US_POOL.clone()),
            (MockLocale::ZhCN, ZH_CN_POOL.clone()),
        ])
    });

/// Get data pool by locale (default to EnUS if not found)
fn get_data_pool(locale: MockLocale) -> &'static LocaleDataPool {
    MOCK_DATA_POOLS.get(&locale).unwrap_or_else(|| MOCK_DATA_POOLS.get(&MockLocale::EnUS).unwrap())
}

/// Mock custom rule - maps variable name to rule type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MockCustomRule {
    pub variable: String, // e.g., "userEmail"
    pub target_type: String, // e.g., "email"
    pub enabled: bool,
}

/// Global custom rules storage
static MOCK_CUSTOM_RULES: Lazy<Arc<RwLock<Vec<MockCustomRule>>>> = Lazy::new(|| {
    Arc::new(RwLock::new(Vec::new()))
});

/// Mock value type - matches frontend FieldGenType
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MockValueType {
    Auto,
    Name,
    Email,
    Phone,
    City,
    Country,
    Company,
    Price,
    Address,
    Avatar,
    Uuid,
    Url,
    Ipv4,
    Ipv6,
    Lat,
    Lng,
    Zip,
    Color,
    Rating,
    Age,
    Date,
    Boolean,
    Number,
    Sequence,
    Random,
    Nullify,
    Timestamp,
    DateCurrent,
    TimeCurrent,
    DateTimeCurrent,
    RandomInt,
    RandomFloat,
    Seq,
}

impl MockValueType {
    fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "auto" => Some(Self::Auto),
            "name" => Some(Self::Name),
            "email" => Some(Self::Email),
            "phone" => Some(Self::Phone),
            "city" => Some(Self::City),
            "country" => Some(Self::Country),
            "company" => Some(Self::Company),
            "price" => Some(Self::Price),
            "address" => Some(Self::Address),
            "avatar" => Some(Self::Avatar),
            "uuid" => Some(Self::Uuid),
            "url" => Some(Self::Url),
            "ipv4" => Some(Self::Ipv4),
            "ipv6" => Some(Self::Ipv6),
            "lat" => Some(Self::Lat),
            "lng" => Some(Self::Lng),
            "zip" => Some(Self::Zip),
            "color" => Some(Self::Color),
            "rating" => Some(Self::Rating),
            "age" => Some(Self::Age),
            "date" => Some(Self::Date),
            "boolean" => Some(Self::Boolean),
            "number" => Some(Self::Number),
            "sequence" => Some(Self::Sequence),
            "random" => Some(Self::Random),
            "nullify" => Some(Self::Nullify),
            "$timestamp" => Some(Self::Timestamp),
            "$date" => Some(Self::DateCurrent),
            "$time" => Some(Self::TimeCurrent),
            "$datetime" => Some(Self::DateTimeCurrent),
            "$randomint" => Some(Self::RandomInt),
            "$randomfloat" => Some(Self::RandomFloat),
            "$seq" => Some(Self::Seq),
            _ => None,
        }
    }
}

/// Pick a random element from a slice
fn pick_random<T>(arr: &[T], random: f64) -> &T {
    &arr[(random * arr.len() as f64) as usize % arr.len()]
}

/// Generate a UUID v4
fn generate_uuid_v4() -> String {
    let hex_chars = "0123456789abcdef";
    let segment = |count: usize, random: f64| -> String {
        (0..count)
            .map(|_| {
                let idx = (random * hex_chars.len() as f64 * (count + 1) as f64) as usize % hex_chars.len();
                hex_chars.chars().nth(idx).unwrap()
            })
            .collect()
    };
    let r1 = rand::random::<f64>();
    let r2 = rand::random::<f64>();
    let r3 = rand::random::<f64>();
    format!(
        "{}-{}-{}-{}-{}",
        segment(8, r1),
        segment(4, r2),
        format!("4{}", segment(3, r3)),
        format!("{}{}", hex_chars.chars().nth((r1 * 4.0) as usize % 4 + 8).unwrap(), segment(3, r2)),
        segment(12, r3)
    )
}

/// Generate mock value by type with locale support
fn generate_mock_value_by_type(value_type: MockValueType, random: f64, pool: &LocaleDataPool) -> String {
    match value_type {
        MockValueType::Nullify => String::new(),
        MockValueType::Boolean => (random > 0.5).to_string(),
        MockValueType::Number => (random * 1000.0).floor().to_string(),
        MockValueType::Name => {
            format!(
                "{} {}",
                pick_random(&pool.first_name, random),
                pick_random(&pool.last_name, random)
            )
        }
        MockValueType::Email => {
            format!(
                "{}.{}@{}",
                pick_random(&pool.first_name, random).to_lowercase(),
                pick_random(&pool.last_name, random).to_lowercase(),
                pick_random(&pool.email_domain, random)
            )
        }
        MockValueType::Phone => {
            format!(
                "+1-{}-{}-{}",
                (555.0 + random * 1000.0).floor() as i64,
                (1000.0 + random * 9000.0).floor() as i64,
                (1000.0 + random * 9000.0).floor() as i64
            )
        }
        MockValueType::City => pick_random(&pool.city, random).to_string(),
        MockValueType::Country => pick_random(&pool.country, random).to_string(),
        MockValueType::Company => pick_random(&pool.company, random).to_string(),
        MockValueType::Price => format!("{:.2}", random * 1000.0),
        MockValueType::Address => {
            format!(
                "{} {}",
                (100.0 + random * 900.0).floor() as i64,
                pick_random(&pool.street_suffix, random)
            )
        }
        MockValueType::Avatar => format!("https://i.pravatar.cc/150?img={}", (random * 70.0).floor() as i64),
        MockValueType::Uuid => generate_uuid_v4(),
        MockValueType::Url => {
            format!(
                "https://{}.com",
                pick_random(&pool.company, random).to_lowercase().split_whitespace().collect::<String>()
            )
        }
        MockValueType::Ipv4 => {
            format!(
                "{}.{}.{}.{}",
                (random * 255.0).floor() as i64,
                (random * 255.0).floor() as i64,
                (random * 255.0).floor() as i64,
                (random * 255.0).floor() as i64
            )
        }
        MockValueType::Ipv6 => {
            format!(
                "2001:0db8:{:04x}:{:04x}::1",
                (random * 65535.0).floor() as i64,
                (random * 65535.0).floor() as i64
            )
        }
        MockValueType::Lat => format!("{:.6}", random * 180.0 - 90.0),
        MockValueType::Lng => format!("{:.6}", random * 360.0 - 180.0),
        MockValueType::Zip => pick_random(&pool.zip_code, random).to_string(),
        MockValueType::Color => pick_random(&pool.color, random).to_string(),
        MockValueType::Rating => format!("{:.1}", random * 4.0 + 1.0),
        MockValueType::Age => ((18.0 + random * 60.0).floor() as i64).to_string(),
        MockValueType::Date => chrono::Utc::now().format("%Y-%m-%d").to_string(),
        MockValueType::Sequence | MockValueType::Seq => "1".to_string(),
        MockValueType::Random => rand::random::<f64>().to_string()[2..10].to_string(),
        MockValueType::Timestamp => chrono::Utc::now().timestamp_millis().to_string(),
        MockValueType::DateCurrent => chrono::Utc::now().format("%Y-%m-%d").to_string(),
        MockValueType::TimeCurrent => chrono::Utc::now().format("%H:%M:%S").to_string(),
        MockValueType::DateTimeCurrent => chrono::Utc::now().to_rfc3339(),
        MockValueType::RandomInt => ((random * 10000.0).floor() as i64).to_string(),
        MockValueType::RandomFloat => format!("{:.2}", random * 1000.0),
        MockValueType::Auto => pick_random(&pool.first_name, random).to_string(),
    }
}

/// Process template by replacing {{variable}} patterns (internal)
fn process_mock_template_template(template: &str, locale: MockLocale) -> String {
    let pool = get_data_pool(locale);

    // Process special function patterns first: {{$func arg1 arg2}}
    let re_func = regex::Regex::new(r"\{\{\$(\w+)([^}]*)\}\}").unwrap();
    let mut result = template.to_string();

    result = re_func.replace_all(&result, |caps: &regex::Captures| {
        let func_name = &caps[1];
        let args = caps.get(2).map(|m| m.as_str().trim()).unwrap_or("");

        match func_name {
            "choice" => {
                // {{$choice opt1 opt2 opt3}} - randomly pick one
                let options: Vec<&str> = args.split_whitespace().collect();
                if options.is_empty() {
                    return "{{$choice}}".to_string();
                }
                let idx = (rand::random::<f64>() * options.len() as f64) as usize;
                options[idx.min(options.len() - 1)].to_string()
            }
            "randomInt" => {
                // {{$randomInt min max}} - random integer in range
                let parts: Vec<&str> = args.split_whitespace().collect();
                if parts.len() >= 2 {
                    let min: i64 = parts[0].parse().unwrap_or(0);
                    let max: i64 = parts[1].parse().unwrap_or(100);
                    let val = min + (rand::random::<f64>() * (max - min) as f64) as i64;
                    return val.to_string();
                }
                "{{$randomInt}}".to_string()
            }
            "randomFloat" => {
                // {{$randomFloat min max dec}} - random float with decimals
                let parts: Vec<&str> = args.split_whitespace().collect();
                if parts.len() >= 2 {
                    let min: f64 = parts[0].parse().unwrap_or(0.0);
                    let max: f64 = parts[1].parse().unwrap_or(100.0);
                    let decimals: usize = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(2);
                    let val = min + rand::random::<f64>() * (max - min);
                    return format!("{:.decimals$}", val);
                }
                "{{$randomFloat}}".to_string()
            }
            "delay" => {
                // {{$delay ms}} or {{$delay min-max}} - delay placeholder (returned as-is for extraction)
                // The actual delay processing happens in dynamicMockService
                if args.is_empty() {
                    "{{$delay}}".to_string()
                } else {
                    format!("{{$delay {}}}", args)
                }
            }
            "env" => {
                // {{$env VAR_NAME}} - environment variable placeholder (requires app_handle)
                // Returns placeholder for later substitution with actual env value
                if args.is_empty() {
                    "{{$env}}".to_string()
                } else {
                    format!("{{$env {}}}", args)
                }
            }
            _ => {
                // Unknown function, keep original
                format!("{{${}}}", func_name)
            }
        }
    }).to_string();

    // Process standard variable patterns: {{variableName}}
    let re_var = regex::Regex::new(r"\{\{(\w+)\}\}").unwrap();
    result = re_var.replace_all(&result, |caps: &regex::Captures| {
        let var_name = &caps[1];

        // 1. Check custom rules first (blocking read)
        let custom_rules = MOCK_CUSTOM_RULES.blocking_read();
        if let Some(custom_rule) = custom_rules.iter().find(|r| r.variable == var_name && r.enabled) {
            if let Some(value_type) = MockValueType::from_str(&custom_rule.target_type) {
                return generate_mock_value_by_type(value_type, rand::random(), pool);
            }
        }
        drop(custom_rules);

        // 2. Check built-in rule types
        if let Some(value_type) = MockValueType::from_str(var_name) {
            generate_mock_value_by_type(value_type, rand::random(), pool)
        } else {
            // Unknown variable, keep original
            format!("{{{{{}}}}}", var_name)
        }
    }).to_string();

    result
}

/// Process template with environment variable substitution (for DynamicMockService)
fn process_mock_template_with_env(template: &str, locale: MockLocale, env_vars: &HashMap<String, String>) -> String {
    let pool = get_data_pool(locale);

    // Process special function patterns
    let re_func = regex::Regex::new(r"\{\{\$(\w+)([^}]*)\}\}").unwrap();
    let mut result = template.to_string();

    result = re_func.replace_all(&result, |caps: &regex::Captures| {
        let func_name = &caps[1];
        let args = caps.get(2).map(|m| m.as_str().trim()).unwrap_or("");

        match func_name {
            "choice" => {
                let options: Vec<&str> = args.split_whitespace().collect();
                if options.is_empty() {
                    return "{{$choice}}".to_string();
                }
                let idx = (rand::random::<f64>() * options.len() as f64) as usize;
                options[idx.min(options.len() - 1)].to_string()
            }
            "randomInt" => {
                let parts: Vec<&str> = args.split_whitespace().collect();
                if parts.len() >= 2 {
                    let min: i64 = parts[0].parse().unwrap_or(0);
                    let max: i64 = parts[1].parse().unwrap_or(100);
                    let val = min + (rand::random::<f64>() * (max - min) as f64) as i64;
                    return val.to_string();
                }
                "{{$randomInt}}".to_string()
            }
            "randomFloat" => {
                let parts: Vec<&str> = args.split_whitespace().collect();
                if parts.len() >= 2 {
                    let min: f64 = parts[0].parse().unwrap_or(0.0);
                    let max: f64 = parts[1].parse().unwrap_or(100.0);
                    let decimals: usize = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(2);
                    let val = min + rand::random::<f64>() * (max - min);
                    return format!("{:.decimals$}", val);
                }
                "{{$randomFloat}}".to_string()
            }
            "delay" => {
                // Return empty for delay - delay is handled separately
                "".to_string()
            }
            "env" => {
                // Substitute environment variable value
                let var_name = args.trim();
                if let Some(value) = env_vars.get(var_name) {
                    value.clone()
                } else {
                    format!("{{$env {}}}", var_name)
                }
            }
            _ => {
                format!("{{${}}}", func_name)
            }
        }
    }).to_string();

    // Process standard variable patterns
    let re_var = regex::Regex::new(r"\{\{(\w+)\}\}").unwrap();
    result = re_var.replace_all(&result, |caps: &regex::Captures| {
        let var_name = &caps[1];

        // Check custom rules
        let custom_rules = MOCK_CUSTOM_RULES.blocking_read();
        if let Some(custom_rule) = custom_rules.iter().find(|r| r.variable == var_name && r.enabled) {
            if let Some(value_type) = MockValueType::from_str(&custom_rule.target_type) {
                return generate_mock_value_by_type(value_type, rand::random(), pool);
            }
        }
        drop(custom_rules);

        // Check built-in rule types
        if let Some(value_type) = MockValueType::from_str(var_name) {
            generate_mock_value_by_type(value_type, rand::random(), pool)
        } else {
            format!("{{{{{}}}}}", var_name)
        }
    }).to_string();

    result
}

// ============================================================================
// Mock Server Types and State
// ============================================================================

use once_cell::sync::Lazy;
use std::sync::Arc;
use tokio::sync::RwLock;
use axum::{
    Router,
    response::IntoResponse,
};
use axum::body::Body;
use tower_http::cors::{CorsLayer, Any};

/// Mock rule trigger conditions
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockTrigger {
    pub path_pattern: Option<String>,
    pub method: Option<Vec<String>>,
}

/// Mock response configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockResponse {
    pub status_code: u16,
    pub headers: Option<HashMap<String, String>>,
    pub body_template: String,
    pub delay_ms: u64,
}

/// Mock rule definition
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockRule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger: MockTrigger,
    pub response: MockResponse,
    /// Locale for this rule's response template processing (default: EnUS)
    pub locale: Option<String>,
}

/// Mock server status
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockServerStatus {
    pub running: bool,
    pub port: u16,
    pub rules_count: usize,
    pub request_count: u64,
}

/// Mock request log entry
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockRequestLog {
    pub timestamp: String,
    pub method: String,
    pub path: String,
    pub matched_rule_id: Option<String>,
    pub response_status: u16,
    pub response_time_ms: u64,
}

/// Global mock server state
static MOCK_SERVER_STATE: Lazy<Arc<RwLock<MockServerState>>> = Lazy::new(|| {
    Arc::new(RwLock::new(MockServerState::default()))
});

/// Loaded API spec for auto-mock fallback
#[derive(Debug, Clone)]
struct LoadedApiSpec {
    name: String,
    /// path -> method -> endpoint info
    endpoints: HashMap<String, HashMap<String, EndpointInfo>>,
}

/// Endpoint info for auto-mock
#[derive(Debug, Clone)]
struct EndpointInfo {
    /// status_code -> response schema (JSON Schema format)
    responses: HashMap<u16, serde_json::Value>,
}

#[derive(Debug, Default)]
struct MockServerState {
    running: bool,
    port: u16,
    rules: Vec<MockRule>,
    request_count: u64,
    request_logs: Vec<MockRequestLog>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    api_specs: Vec<LoadedApiSpec>,
}

impl MockServerState {
    fn get_rules(&self) -> Vec<MockRule> {
        self.rules.clone()
    }

    fn add_rule(&mut self, rule: MockRule) {
        self.rules.push(rule);
    }

    fn update_rule(&mut self, rule: MockRule) {
        if let Some(existing) = self.rules.iter_mut().find(|r| r.id == rule.id) {
            *existing = rule;
        }
    }

    fn remove_rule(&mut self, id: &str) {
        self.rules.retain(|r| r.id != id);
    }

    fn clear_rules(&mut self) {
        self.rules.clear();
    }

    fn add_request_log(&mut self, log: MockRequestLog) {
        self.request_logs.push(log);
        // Keep only last 100 logs to prevent memory issues
        if self.request_logs.len() > 100 {
            self.request_logs.remove(0);
        }
    }

    fn get_request_logs(&self) -> Vec<MockRequestLog> {
        self.request_logs.clone()
    }

    fn clear_request_logs(&mut self) {
        self.request_logs.clear();
    }
}

/// Start the mock HTTP server
#[allow(dead_code)]
async fn start_mock_server(port: u16, rules: Vec<MockRule>, api_specs: Vec<LoadedApiSpec>, shutdown_rx: tokio::sync::oneshot::Receiver<()>) {
    let rules = Arc::new(rules);
    let api_specs = Arc::new(api_specs);

    async fn handler(
        axum::extract::Path(path): axum::extract::Path<String>,
        axum::extract::State((rules, api_specs)): axum::extract::State<(Arc<Vec<MockRule>>, Arc<Vec<LoadedApiSpec>>)>,
        req: axum::http::Request<Body>,
    ) -> impl IntoResponse {
        let start_time = std::time::Instant::now();
        let method = req.method().to_string();
        let full_path = format!("/{}", path);

        // Check for X-Mock-Locale header (can override rule's locale)
        let header_locale = req.headers()
            .get("X-Mock-Locale")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        let mut matched_rule_id: Option<String> = None;
        let mut response_status: u16 = 404;

        // Find matching rule
        for rule in rules.iter() {
            if !rule.enabled {
                continue;
            }

            // Check path pattern
            let path_matches = match &rule.trigger.path_pattern {
                Some(pattern) => {
                    let re = regex::Regex::new(pattern);
                    match re {
                        Ok(r) => r.is_match(&full_path),
                        Err(_) => full_path.contains(pattern),
                    }
                }
                None => true, // No pattern means match all
            };

            if !path_matches {
                continue;
            }

            // Check method
            if let Some(methods) = &rule.trigger.method {
                if !methods.is_empty() && !methods.iter().any(|m| m.eq_ignore_ascii_case(&method)) {
                    continue;
                }
            }

            // Match found
            matched_rule_id = Some(rule.id.clone());
            response_status = rule.response.status_code;

            // Determine locale: header > rule > default EnUS
            let locale = header_locale
                .or_else(|| rule.locale.clone())
                .unwrap_or_else(|| "en-US".to_string());
            let mock_locale = MockLocale::from_str(&locale);

            // Match found - process body template using backend (single source of truth)
            let body = process_mock_template_template(&rule.response.body_template, mock_locale);

            // Build response
            let status = rule.response.status_code;
            let headers = rule.response.headers.clone().unwrap_or_default();

            // Apply delay if configured
            if rule.response.delay_ms > 0 {
                tokio::time::sleep(tokio::time::Duration::from_millis(rule.response.delay_ms)).await;
            }

            let mut response = axum::response::Response::builder()
                .status(status);

            // Add headers
            for (key, value) in headers {
                response = response.header(&key, &value);
            }

            let response_time_ms = start_time.elapsed().as_millis() as u64;

            // Record request log
            let log = MockRequestLog {
                timestamp: chrono_now(),
                method: method.clone(),
                path: full_path.clone(),
                matched_rule_id,
                response_status,
                response_time_ms,
            };
            if let Ok(mut state) = MOCK_SERVER_STATE.try_write() {
                state.add_request_log(log);
                state.request_count += 1;
            }

            return response.body(body).unwrap();
        }

        // No matching rule - try to auto-generate from API spec
        let response_time_ms = start_time.elapsed().as_millis() as u64;
        if let Some((status_code, body)) = try_generate_from_api_spec(&full_path, &method, &api_specs) {
            // Record auto-generated response log
            let log = MockRequestLog {
                timestamp: chrono_now(),
                method: method.clone(),
                path: full_path.clone(),
                matched_rule_id: None,
                response_status: status_code,
                response_time_ms,
            };
            if let Ok(mut state) = MOCK_SERVER_STATE.try_write() {
                state.add_request_log(log);
                state.request_count += 1;
            }
            return axum::response::Response::builder()
                .status(status_code)
                .header("content-type", "application/json")
                .body(body)
                .unwrap();
        }

        // No API spec found - return 404
        response_status = 404;

        // Record 404 request log
        let log = MockRequestLog {
            timestamp: chrono_now(),
            method,
            path: full_path,
            matched_rule_id: None,
            response_status,
            response_time_ms,
        };
        if let Ok(mut state) = MOCK_SERVER_STATE.try_write() {
            state.add_request_log(log);
            state.request_count += 1;
        }

        axum::response::Response::builder()
            .status(404)
            .body("No matching mock rule or API spec found".to_string())
            .unwrap()
    }

    let app = Router::new()
        .route("/*path", axum::routing::any(handler))
        .route("/", axum::routing::any(handler))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state((rules, api_specs));

    let addr = format!("127.0.0.1:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            shutdown_rx.await.ok();
        })
        .await
        .unwrap();
}

// ============================================================================
// Auto-Mock from API Spec
// ============================================================================

/// Try to generate a mock response from pre-loaded API specs
/// Returns (status_code, body) tuple on success
fn try_generate_from_api_spec(path: &str, method: &str, api_specs: &[LoadedApiSpec]) -> Option<(u16, String)> {
    let method_upper = method.to_uppercase();

    for spec in api_specs {
        for (spec_path, methods_map) in &spec.endpoints {
            // Try exact match first, then pattern match
            let path_matches = if spec_path == path {
                true
            } else {
                path_matches_pattern(path, spec_path)
            };

            if !path_matches {
                continue;
            }

            // Find the method in this path
            if let Some(endpoint_info) = methods_map.get(&method_upper) {
                // Try 2xx responses in order of preference
                for status_code in &[200, 201, 202, 203, 204] {
                    if let Some(schema) = endpoint_info.responses.get(status_code) {
                        // Generate mock body from schema
                        let mock_body = generate_mock_from_schema_impl(schema.clone(), MockLocale::EnUS);
                        if let Some(body) = mock_body {
                            return Some((*status_code, body));
                        }
                    }
                }
            }
        }
    }

    None
}

/// Load API specs from app_handle directory
fn load_api_specs_from_handle(app_handle: &tauri::AppHandle) -> Vec<LoadedApiSpec> {
    let apis_dir = get_flare_dir(app_handle);
    tracing::info!("Loading API specs from: {:?}", apis_dir);

    let mut specs = Vec::new();

    if let Ok(entries) = fs::read_dir(&apis_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let file_path = entry.path();
            let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");

            if ext != "json" && ext != "yaml" && ext != "yml" {
                continue;
            }

            if let Ok(content) = fs::read_to_string(&file_path) {
                if let Some(spec) = load_api_spec_from_content(&content, ext) {
                    tracing::info!("Loaded API spec: {}", spec.name);
                    specs.push(spec);
                }
            }
        }
    } else {
        tracing::warn!("Failed to read API directory: {:?}", apis_dir);
    }

    specs
}

/// Load a single API spec from content
fn load_api_spec_from_content(content: &str, ext: &str) -> Option<LoadedApiSpec> {
    let spec: serde_json::Value = if ext == "yaml" || ext == "yml" {
        serde_yaml::from_str(content).ok()?
    } else {
        serde_json::from_str(content).ok()?
    };

    let name = spec.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let mut endpoints = HashMap::new();

    // Try OpenAPI format (paths)
    if let Some(paths) = spec.get("paths").and_then(|p| p.as_object()) {
        for (path, path_item) in paths {
            let path_item_obj = path_item.as_object()?;
            for (method, operation) in path_item_obj {
                let method_upper = method.to_uppercase();
                if !["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].contains(&method_upper.as_str()) {
                    continue;
                }
                let operation_obj = operation.as_object()?;
                let mut responses = HashMap::new();
                if let Some(responses_obj) = operation_obj.get("responses").and_then(|r| r.as_object()) {
                    for (code, response) in responses_obj {
                        if let Ok(status_code) = code.parse::<u16>() {
                            if let Some(response_obj) = response.as_object() {
                                if let Some(content) = response_obj.get("content").and_then(|c| c.as_object()) {
                                    for (_content_type, content_value) in content {
                                        if let Some(schema) = content_value.get("schema") {
                                            responses.insert(status_code, schema.clone());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                endpoints.entry(path.clone()).or_insert_with(HashMap::new).insert(method_upper, EndpointInfo { responses });
            }
        }
    }

    // Try internal format (endpoints array)
    if let Some(endpoints_arr) = spec.get("endpoints").and_then(|e| e.as_array()) {
        for endpoint in endpoints_arr {
            let endpoint_obj = endpoint.as_object()?;
            let path = endpoint_obj.get("path")?.as_str()?.to_string();
            let method = endpoint_obj.get("method")?.as_str()?.to_uppercase();

            let mut responses = HashMap::new();
            if let Some(responses_obj) = endpoint_obj.get("responses").and_then(|r| r.as_object()) {
                for (code, response) in responses_obj {
                    if let Ok(status_code) = code.parse::<u16>() {
                        if let Some(response_obj) = response.as_object() {
                            // Handle content nesting: content -> "*/*" -> schema
                            if let Some(content) = response_obj.get("content").and_then(|c| c.as_object()) {
                                for (_content_type, content_value) in content {
                                    if let Some(schema) = content_value.get("schema") {
                                        responses.insert(status_code, schema.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            endpoints.entry(path).or_insert_with(HashMap::new).insert(method, EndpointInfo { responses });
        }
    }

    Some(LoadedApiSpec { name, endpoints })
}

/// Check if a request path matches an API spec path pattern
fn path_matches_pattern(request_path: &str, spec_path: &str) -> bool {
    // Exact match
    if request_path == spec_path {
        return true;
    }

    // Path parameter matching (e.g., /users/{id} matches /users/123)
    let request_parts: Vec<&str> = request_path.split('/').filter(|s| !s.is_empty()).collect();
    let spec_parts: Vec<&str> = spec_path.split('/').filter(|s| !s.is_empty()).collect();

    if request_parts.len() != spec_parts.len() {
        return false;
    }

    for (req_part, spec_part) in request_parts.iter().zip(spec_parts.iter()) {
        if spec_part.starts_with('{') && spec_part.ends_with('}') {
            // Path parameter - matches anything
            continue;
        }
        if spec_part.starts_with(':') {
            // Express-style parameter - matches anything
            continue;
        }
        if *req_part != *spec_part {
            return false;
        }
    }

    true
}

// ============================================================================
// Logging Tauri Commands
// ============================================================================

/// Emit a log entry from the frontend
#[tauri::command]
fn emit_log(
    level: String,
    message: String,
    category: String,
    correlation_id: Option<String>,
    data: Option<serde_json::Value>,
) -> Result<(), String> {
    let entry = logging::LogEntry {
        timestamp: chrono_now(),
        level,
        message,
        category,
        correlation_id,
        data,
    };
    logging::handle_frontend_log(entry);
    Ok(())
}

/// Query logs from the log file with filters
#[tauri::command]
fn query_logs(
    app_handle: tauri::AppHandle,
    level: Option<String>,
    category: Option<String>,
    correlation_id: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<logging::LogEntry>, String> {
    let log_dir = logging::get_log_dir(&app_handle)?;
    let filters = logging::LogFilters {
        level,
        category,
        correlation_id,
        start_time,
        end_time,
        limit,
    };
    logging::query_logs_from_file(&log_dir, &filters)
}

/// Get the log directory path
#[tauri::command]
fn get_log_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    let log_dir = logging::get_log_dir(&app_handle)?;
    Ok(log_dir.to_string_lossy().to_string())
}

// ============================================================================
// Mock Server Tauri Commands
// ============================================================================

/// Get mock server status
#[tauri::command]
fn get_mock_server_status() -> MockServerStatus {
    let state = MOCK_SERVER_STATE.blocking_read();
    MockServerStatus {
        running: state.running,
        port: state.port,
        rules_count: state.rules.len(),
        request_count: state.request_count,
    }
}

/// Generate mock rules from OpenAPI JSON document
#[tauri::command]
fn generate_mock_rules_from_openapi_cmd(openapi_json: String) -> Result<Vec<MockRule>, String> {
    let doc: serde_json::Value = serde_json::from_str(&openapi_json)
        .map_err(|e| format!("Invalid OpenAPI JSON: {}", e))?;

    let (name, version, base_url, description, endpoints) = parse_openapi_doc(doc, "Imported API");

    tracing::info!("Generating mock rules for OpenAPI: {} v{} ({} endpoints)", name, version, endpoints.len());

    let rules = generate_mock_rules_from_openapi(&name, &base_url, endpoints);

    Ok(rules)
}

/// Start mock server on specified port
#[tauri::command]
async fn start_mock_server_cmd(port: u16, app_handle: tauri::AppHandle) -> Result<MockServerStatus, String> {
    let mut state = MOCK_SERVER_STATE.write().await;

    if state.running {
        return Err(format!("Mock server already running on port {}", state.port));
    }

    let rules = state.rules.clone();
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // Load API specs for auto-mock using app_handle (has correct directory access)
    state.api_specs = load_api_specs_from_handle(&app_handle);
    tracing::info!("Loaded {} API specs for auto-mock", state.api_specs.len());

    state.running = true;
    state.port = port;
    state.shutdown_tx = Some(shutdown_tx);

    // Auto-inject Mock environment with baseUrl
    tracing::info!("Injecting mock environment with port {}", port);
    if let Err(e) = inject_mock_environment(&app_handle, port) {
        tracing::error!("Failed to inject mock environment: {}", e);
    } else {
        tracing::info!("Mock environment injected successfully");
    }

    // Spawn the server in background
    let api_specs = state.api_specs.clone();
    tokio::spawn(async move {
        start_mock_server(port, rules, api_specs, shutdown_rx).await;
    });

    Ok(MockServerStatus {
        running: true,
        port,
        rules_count: state.rules.len(),
        request_count: state.request_count,
    })
}

/// Inject or update Mock environment with baseUrl pointing to mock server
fn inject_mock_environment(app_handle: &tauri::AppHandle, port: u16) -> Result<(), String> {
    tracing::info!("Starting inject_mock_environment with port {}", port);
    let mut config = get_env_config(app_handle);
    tracing::info!("Current environments: {:?}", config.environments.iter().map(|e| &e.name).collect::<Vec<_>>());

    let mock_base_url = format!("http://localhost:{}", port);

    // Find or create Mock environment
    if let Some(env) = config.environments.iter_mut().find(|e| e.name == "Mock") {
        tracing::info!("Found existing Mock environment, updating baseUrl to {}", mock_base_url);
        env.variables.insert("baseUrl".to_string(), mock_base_url);
    } else {
        tracing::info!("Creating new Mock environment with baseUrl {}", mock_base_url);
        config.environments.push(EnvEnvironment {
            name: "Mock".to_string(),
            variables: [
                ("baseUrl".to_string(), mock_base_url),
            ].into_iter().collect(),
        });
    }

    // Auto-select Mock environment when mock server starts
    config.selected = "Mock".to_string();

    tracing::info!("Saving environment config with Mock environment added");
    save_env_config(app_handle, &config)?;
    tracing::info!("Environment config saved successfully");

    Ok(())
}

/// Remove Mock environment when server stops
fn remove_mock_environment(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let mut config = get_env_config(app_handle);

    // Remove Mock environment
    config.environments.retain(|e| e.name != "Mock");

    // If Mock was selected, switch to first available or none
    if config.selected == "Mock" {
        config.selected = config.environments.first().map(|e| e.name.clone()).unwrap_or_default();
    }

    save_env_config(app_handle, &config)
}

/// Stop mock server
#[tauri::command]
async fn stop_mock_server_cmd(app_handle: tauri::AppHandle) -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;

    if !state.running {
        return Err("Mock server not running".to_string());
    }

    if let Some(tx) = state.shutdown_tx.take() {
        let _ = tx.send(());
    }

    state.running = false;
    state.port = 0;

    // Remove Mock environment
    if let Err(e) = remove_mock_environment(&app_handle) {
        eprintln!("Failed to remove mock environment: {}", e);
    }

    Ok(())
}

/// Add a mock rule
#[tauri::command]
async fn add_mock_rule(rule: MockRule) -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;
    state.add_rule(rule);
    Ok(())
}

/// Update a mock rule
#[tauri::command]
async fn update_mock_rule(rule: MockRule) -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;
    state.update_rule(rule);
    Ok(())
}

/// Delete a mock rule
#[tauri::command]
async fn delete_mock_rule(id: String) -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;
    state.remove_rule(&id);
    Ok(())
}

/// Get all mock rules
#[tauri::command]
async fn get_mock_rules() -> Result<Vec<MockRule>, String> {
    let state = MOCK_SERVER_STATE.read().await;
    Ok(state.get_rules())
}

/// Clear all mock rules
#[tauri::command]
async fn clear_mock_rules() -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;
    state.clear_rules();
    Ok(())
}

/// Get mock request logs
#[tauri::command]
async fn get_mock_request_logs() -> Result<Vec<MockRequestLog>, String> {
    let state = MOCK_SERVER_STATE.read().await;
    Ok(state.get_request_logs())
}

/// Clear mock request logs
#[tauri::command]
async fn clear_mock_request_logs() -> Result<(), String> {
    let mut state = MOCK_SERVER_STATE.write().await;
    state.clear_request_logs();
    Ok(())
}

/// Generate mock value by rule type (internal) - with locale support
fn generate_mock_value_impl(rule_type: String, locale: MockLocale) -> String {
    let pool = get_data_pool(locale);
    if let Some(value_type) = MockValueType::from_str(&rule_type) {
        generate_mock_value_by_type(value_type, rand::random(), pool)
    } else {
        format!("{{{{{}}}}}", rule_type)
    }
}

/// Process mock template by replacing {{variable}} with generated values (internal)
fn process_mock_template_impl(template: String, locale: MockLocale) -> String {
    process_mock_template_template(&template, locale)
}

/// Generate mock value by rule type - Tauri command
/// Supports locale parameter for multi-language data pools
#[tauri::command]
fn generate_mock_value(rule_type: String, locale: Option<String>) -> String {
    let loc = locale.map(|s| MockLocale::from_str(&s)).unwrap_or(MockLocale::EnUS);
    generate_mock_value_impl(rule_type, loc)
}

/// Detect field type from field name (matches frontend's matchFieldNameToRule)
fn detect_field_type_from_name(name: &str) -> Option<&'static str> {
    let lower = name.to_lowercase();

    // Contact patterns (highest priority exact matches)
    if lower.contains("email") { return Some("email"); }
    if lower.contains("phone") || lower.contains("tel") || lower.contains("mobile") { return Some("phone"); }

    // User patterns
    if lower.contains("first_name") || lower.contains("firstname") || lower.contains("fname") { return Some("name"); }
    if lower.contains("last_name") || lower.contains("lastname") || lower.contains("lname") { return Some("name"); }
    if lower.contains("full_name") || lower.contains("fullname") || lower.contains("name") { return Some("name"); }
    if lower.contains("username") || lower.contains("user_name") { return Some("name"); }
    if lower.contains("avatar") || lower.contains("photo") || lower.contains("image") || lower.contains("picture") { return Some("avatar"); }

    // Location patterns
    if lower.contains("city") || lower.contains("town") { return Some("city"); }
    if lower.contains("country") || lower.contains("nation") { return Some("country"); }
    if lower.contains("address") || lower.contains("street") { return Some("address"); }
    if lower.contains("zip") || lower.contains("postal") { return Some("zip"); }
    if lower.contains("latitude") || lower.contains("lat") { return Some("lat"); }
    if lower.contains("longitude") || lower.contains("lng") || lower.contains("lon") { return Some("lng"); }

    // Company patterns
    if lower.contains("company") || lower.contains("organization") || lower.contains("org") { return Some("company"); }

    // URL patterns
    if lower.contains("url") || lower.contains("link") || lower.contains("website") || lower.contains("uri") { return Some("url"); }

    // IP patterns
    if lower.contains("ipv4") || lower.contains("ip_address") || lower == "ip" { return Some("ipv4"); }
    if lower.contains("ipv6") { return Some("ipv6"); }

    // Other patterns
    if lower.contains("color") || lower.contains("colour") { return Some("color"); }
    if lower.contains("rating") || lower.contains("score") { return Some("rating"); }
    if lower.contains("age") { return Some("age"); }
    if lower.contains("price") || lower.contains("amount") || lower.contains("cost") || lower.contains("fee") { return Some("price"); }
    if lower.contains("uuid") || lower.contains("guid") { return Some("uuid"); }

    None
}

/// Generate mock value by field type
fn generate_by_field_type(field_type: &str, pool: &LocaleDataPool, random: f64) -> Result<String, String> {
    match field_type {
        "email" => {
            let first = pick_random(&pool.first_name, random);
            let last = pick_random(&pool.last_name, random);
            let domain = pick_random(&pool.email_domain, random);
            Ok(format!("{}.{}@{}", first, last, domain))
        }
        "phone" => {
            let area = 100 + (random * 900.0) as i64;
            let num1 = 100 + (random * 900.0) as i64;
            let num2 = 1000 + (random * 9000.0) as i64;
            Ok(format!("+1-{}-{}-{}", area, num1, num2))
        }
        "name" => {
            let first = pick_random(&pool.first_name, random);
            let last = pick_random(&pool.last_name, random);
            Ok(format!("{} {}", first, last))
        }
        "city" => Ok(pick_random(&pool.city, random).to_string()),
        "country" => Ok(pick_random(&pool.country, random).to_string()),
        "company" => Ok(pick_random(&pool.company, random).to_string()),
        "address" => {
            let num = 100 + (random * 9900.0) as i64;
            let street = pick_random(&pool.street_suffix, random);
            Ok(format!("{} {}", num, street))
        }
        "zip" => Ok(pick_random(&pool.zip_code, random).to_string()),
        "lat" => Ok(format!("{:.6}", -90.0 + random * 180.0)),
        "lng" => Ok(format!("{:.6}", -180.0 + random * 360.0)),
        "avatar" => Ok(format!("https://api.dicebear.com/7.x/avataaars/svg?seed={}", pick_random(&pool.first_name, random).to_lowercase())),
        "url" => {
            let name = pick_random(&pool.company, random);
            Ok(format!("https://{}.com", name.to_lowercase().replace(' ', "")))
        }
        "ipv4" => Ok(format!("{}.{}.{}.{}", (random * 255.0).floor() as i64, (random * 255.0).floor() as i64, (random * 255.0).floor() as i64, (random * 255.0).floor() as i64)),
        "ipv6" => Ok(format!("{:x}:{:x}:{:x}:{:x}:{:x}:{:x}:{:x}:{:x}", ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64), ((random * 65535.0) as i64))),
        "color" => Ok(pick_random(&pool.color, random).to_string()),
        "rating" => Ok(format!("{:.1}", 1.0 + random * 4.0)),
        "age" => Ok(format!("{}", 18 + (random * 50.0) as i64)),
        "price" => Ok(format!("{:.2}", random * 1000.0)),
        "uuid" => Ok(generate_uuid_v4()),
        _ => {
            let first = pick_random(&pool.first_name, random);
            let last = pick_random(&pool.last_name, random);
            Ok(format!("{} {}", first, last))
        }
    }
}

/// Generate mock value from schema - Tauri command
/// Frontend passes complete schema, backend decides generation logic
/// This is the proper architecture: backend is the single source of truth
///
/// skipFieldNameDetection: when true, skip field name detection
/// Used when user explicitly sets paramType and we want to respect that choice
#[tauri::command]
fn generate_mock_from_schema(
    schema: serde_json::Value,
    locale: Option<String>,
    skip_field_name_detection: Option<bool>,
) -> Result<String, String> {
    use rand::Rng;
    let loc = locale.map(|s| MockLocale::from_str(&s)).unwrap_or(MockLocale::EnUS);
    let mut rng = rand::thread_rng();
    let random = rng.gen::<f64>();

    // Extract schema fields
    let schema_name = schema.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let schema_type = schema.get("type").and_then(|v| v.as_str()).unwrap_or("string");
    let schema_format = schema.get("format").and_then(|v| v.as_str());
    let schema_enum = schema.get("enum").and_then(|v| v.as_array()).and_then(|arr| {
        if arr.is_empty() { None } else { Some(arr) }
    });
    let schema_default = schema.get("default");
    let schema_example = schema.get("example");
    let schema_const = schema.get("const");
    let schema_minimum = schema.get("minimum").and_then(|v| v.as_f64());
    let schema_maximum = schema.get("maximum").and_then(|v| v.as_f64());

    // Priority: const > default > example > enum > generation
    if let Some(const_val) = schema_const {
        return Ok(const_val.to_string());
    }
    if let Some(default_val) = schema_default {
        return Ok(default_val.to_string());
    }
    if let Some(example_val) = schema_example {
        return Ok(example_val.to_string());
    }
    if let Some(enums) = schema_enum {
        if !enums.is_empty() {
            let idx = ((random * enums.len() as f64) as usize).min(enums.len() - 1);
            return Ok(enums[idx].to_string());
        }
    }

    // Get data pool
    let pool = MOCK_DATA_POOLS.get(&loc).ok_or("Locale not found")?;

    // Detect field type from name FIRST (before type-based generation)
    // Skip if user explicitly set the type (skipFieldNameDetection=true)
    let should_skip_field_detection = skip_field_name_detection.unwrap_or(false);
    if !should_skip_field_detection && !schema_name.is_empty() {
        if let Some(field_type) = detect_field_type_from_name(schema_name) {
            return generate_by_field_type(field_type, &pool, random);
        }
    }

    match schema_type {
        "string" => {
            match schema_format {
                Some("email") => {
                    let first = pick_random(&pool.first_name, random);
                    let last = pick_random(&pool.last_name, random);
                    let domain = pick_random(&pool.email_domain, random);
                    Ok(format!("{}.{}@{}", first, last, domain))
                }
                Some("uri") | Some("url") => {
                    let name = pick_random(&pool.first_name, random);
                    Ok(format!("https://example.com/{}", name.to_lowercase()))
                }
                Some("date-time") | Some("date") => Ok(chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string()),
                Some("time") => Ok(chrono::Utc::now().format("%H:%M:%S").to_string()),
                Some("uuid") => Ok(generate_uuid_v4()),
                Some("ipv4") => Ok(format!(
                    "{}.{}.{}.{}",
                    (random * 255.0).floor() as i64,
                    (random * 255.0).floor() as i64,
                    (random * 255.0).floor() as i64,
                    (random * 255.0).floor() as i64
                )),
                Some("ipv6") => Ok(format!(
                    "{:x}:{:x}:{:x}:{:x}:{:x}:{:x}:{:x}:{:x}",
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64),
                    ((random * 65535.0) as i64)
                )),
                _ => {
                    // Generic string - generate paragraph/lorem-like text
                    let words: Vec<&str> = pool.lorem.to_vec();
                    let word_count = 5 + (random * 20.0) as usize;
                    let result: String = (0..word_count)
                        .map(|_| words[(random * words.len() as f64) as usize])
                        .collect::<Vec<_>>()
                        .join(" ");
                    Ok(result)
                }
            }
        }
        "number" | "integer" => {
            let is_integer = schema_type == "integer";
            if let (Some(min), Some(max)) = (schema_minimum, schema_maximum) {
                if is_integer {
                    let val = min.floor() as i64 + ((random * (max - min + 1.0)) as i64);
                    Ok(val.to_string())
                } else {
                    let val = min + random * (max - min);
                    Ok(format!("{:.2}", val))
                }
            } else {
                if is_integer {
                    Ok(((random * 10000.0) as i64).to_string())
                } else {
                    Ok(format!("{:.2}", random * 1000.0))
                }
            }
        }
        "boolean" => Ok((random > 0.5).to_string()),
        "array" => Ok("[...]".to_string()), // Array generation needs items schema
        "object" => Ok("{...}".to_string()), // Object generation needs properties schema
        _ => Ok(pick_random(&pool.first_name, random).to_string()),
    }
}

/// Internal implementation for generating mock data from schema - returns full JSON object
/// This handles object and array types recursively
fn generate_mock_from_schema_impl(schema: serde_json::Value, locale: MockLocale) -> Option<String> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random = rng.gen::<f64>();
    let pool = MOCK_DATA_POOLS.get(&locale)?;

    match schema {
        serde_json::Value::Object(obj) => {
            let schema_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("object");

            match schema_type {
                "object" => {
                    // Generate object from properties
                    if let Some(properties) = obj.get("properties").and_then(|p| p.as_object()) {
                        let mut result_map = serde_json::Map::new();
                        for (key, value_schema) in properties {
                            if let Some(generated) = generate_mock_from_schema_impl(value_schema.clone(), locale) {
                                if let Ok(parsed) = serde_json::from_str(&generated) {
                                    result_map.insert(key.clone(), parsed);
                                } else {
                                    result_map.insert(key.clone(), serde_json::Value::String(generated));
                                }
                            }
                        }
                        serde_json::to_string(&serde_json::Value::Object(result_map)).ok()
                    } else {
                        // No properties, return empty object
                        Some("{}".to_string())
                    }
                }
                "array" => {
                    // Generate array from items schema
                    let min_items = obj.get("minItems").and_then(|v| v.as_u64()).unwrap_or(1) as usize;
                    let max_items = obj.get("maxItems").and_then(|v| v.as_u64()).unwrap_or(5) as usize;
                    let count = min_items + ((random * (max_items - min_items) as f64) as usize).min(max_items - min_items);

                    if let Some(items_schema) = obj.get("items") {
                        let mut items = Vec::new();
                        for _ in 0..count {
                            if let Some(generated) = generate_mock_from_schema_impl(items_schema.clone(), locale) {
                                if let Ok(parsed) = serde_json::from_str(&generated) {
                                    items.push(parsed);
                                } else {
                                    items.push(serde_json::Value::String(generated));
                                }
                            }
                        }
                        serde_json::to_string(&items).ok()
                    } else {
                        Some("[]".to_string())
                    }
                }
                _ => {
                    // Scalar type - delegate to existing logic
                    let schema_value = serde_json::Value::Object(obj);
                    generate_mock_from_schema(schema_value, Some(format!("{:?}", locale)), Some(true)).ok()
                }
            }
        }
        serde_json::Value::Array(arr) => {
            // Array of schemas - pick one randomly or generate all
            if arr.is_empty() {
                return Some("[]".to_string());
            }
            let idx = ((random * arr.len() as f64) as usize).min(arr.len() - 1);
            generate_mock_from_schema_impl(arr[idx].clone(), locale)
        }
        serde_json::Value::String(s) => {
            // Try to parse as schema
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&s) {
                generate_mock_from_schema_impl(parsed, locale)
            } else {
                Some(s)
            }
        }
        _ => None,
    }
}

/// Process mock template by replacing {{variable}} with generated values - Tauri command
/// Supports locale parameter for multi-language data pools
#[tauri::command]
fn process_mock_template(template: String, locale: Option<String>) -> String {
    let loc = locale.map(|s| MockLocale::from_str(&s)).unwrap_or(MockLocale::EnUS);
    process_mock_template_impl(template, loc)
}

/// Public test wrapper for generate_mock_value
pub fn generate_mock_value_public(rule_type: &str) -> String {
    generate_mock_value_impl(rule_type.to_string(), MockLocale::EnUS)
}

/// Public test wrapper for process_mock_template
pub fn process_mock_template_public(template: &str) -> String {
    process_mock_template_impl(template.to_string(), MockLocale::EnUS)
}

// ============================================================================
// Custom Rules Management (统一规则管理)
// ============================================================================

/// Get all custom rules
#[tauri::command]
fn get_mock_custom_rules() -> Vec<MockCustomRule> {
    MOCK_CUSTOM_RULES.blocking_read().clone()
}

/// Add a custom rule
#[tauri::command]
fn add_mock_custom_rule(variable: String, target_type: String) -> Result<MockCustomRule, String> {
    let mut rules = MOCK_CUSTOM_RULES.blocking_write();

    // Check if already exists
    if rules.iter().any(|r| r.variable == variable) {
        return Err(format!("Custom rule for '{{{{{}}}}}' already exists", variable));
    }

    let rule = MockCustomRule {
        variable,
        target_type,
        enabled: true,
    };
    rules.push(rule.clone());
    Ok(rule)
}

/// Update a custom rule
#[tauri::command]
fn update_mock_custom_rule(variable: String, target_type: String) -> Result<MockCustomRule, String> {
    let mut rules = MOCK_CUSTOM_RULES.blocking_write();

    if let Some(rule) = rules.iter_mut().find(|r| r.variable == variable) {
        rule.target_type = target_type;
        Ok(rule.clone())
    } else {
        Err(format!("Custom rule for '{{{{{}}}}}' not found", variable))
    }
}

/// Delete a custom rule
#[tauri::command]
fn delete_mock_custom_rule(variable: String) -> Result<(), String> {
    let mut rules = MOCK_CUSTOM_RULES.blocking_write();
    let len_before = rules.len();
    rules.retain(|r| r.variable != variable);
    if rules.len() == len_before {
        Err(format!("Custom rule for '{{{{{}}}}}' not found", variable))
    } else {
        Ok(())
    }
}

/// Toggle custom rule enabled state
#[tauri::command]
fn toggle_mock_custom_rule(variable: String, enabled: bool) -> Result<MockCustomRule, String> {
    let mut rules = MOCK_CUSTOM_RULES.blocking_write();

    if let Some(rule) = rules.iter_mut().find(|r| r.variable == variable) {
        rule.enabled = enabled;
        Ok(rule.clone())
    } else {
        Err(format!("Custom rule for '{{{{{}}}}}' not found", variable))
    }
}

// --- Tests ---

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_info_serialization() {
        let api_info = ApiInfo {
            name: "Test API".to_string(),
            path: "/path/to/api.yaml".to_string(),
        };
        let json = serde_json::to_string(&api_info).unwrap();
        let deserialized: ApiInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "Test API");
        assert_eq!(deserialized.path, "/path/to/api.yaml");
    }

    #[test]
    fn test_api_details_serialization() {
        let api_details = ApiDetails {
            name: "Test API".to_string(),
            spec: serde_json::json!({
                "openapi": "3.0.0",
                "info": { "title": "Test", "version": "1.0.0" },
                "paths": {}
            }),
        };
        let json = serde_json::to_string(&api_details).unwrap();
        assert!(json.contains("Test API"));
        assert!(json.contains("openapi"));
    }

    #[test]
    fn test_request_result_serialization() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        let result = RequestResult {
            success: true,
            status: 200,
            status_text: "OK".to_string(),
            headers,
            body: "{\"result\":\"ok\"}".to_string(),
            size: 14,
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"status\":200"));
        assert!(json.contains("\"status_text\":\"OK\""));
    }

    #[test]
    fn test_request_result_with_error() {
        let result = RequestResult {
            success: false,
            status: 0,
            status_text: String::new(),
            headers: HashMap::new(),
            body: String::new(),
            size: 0,
            error: Some("Connection refused".to_string()),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("Connection refused"));
    }

    #[test]
    fn test_fetch_result_serialization() {
        let result = FetchResult {
            success: true,
            status: 200,
            body: "response body".to_string(),
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("response body"));
    }

    #[test]
    fn test_import_config_serialization() {
        let config = ImportConfig {
            id: "config_1".to_string(),
            name: "Test Config".to_string(),
            url: "https://api.example.com/swagger-config".to_string(),
            headers: HashMap::new(),
            auth_items: vec![
                AuthItem {
                    location: "header".to_string(),
                    key: "Authorization".to_string(),
                    value: "Bearer token123".to_string(),
                }
            ],
            sync_interval_minutes: 60,
            last_sync: Some("2024-01-01T00:00:00Z".to_string()),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("config_1"));
        assert!(json.contains("Test Config"));
        assert!(json.contains("Bearer token123"));
    }

    #[test]
    fn test_auth_item_serialization() {
        let auth_item = AuthItem {
            location: "cookie".to_string(),
            key: "Cookie".to_string(),
            value: "session=abc123".to_string(),
        };
        let json = serde_json::to_string(&auth_item).unwrap();
        assert!(json.contains("cookie"));
        assert!(json.contains("session=abc123"));
    }

    #[test]
    fn test_parse_openapi_doc_full() {
        let doc = serde_json::json!({
            "openapi": "3.0.0",
            "info": {
                "title": "Test API",
                "version": "2.0.0",
                "description": "A test API"
            },
            "servers": [
                { "url": "https://api.example.com" }
            ],
            "paths": {
                "/users": {
                    "get": {
                        "operationId": "getUsers",
                        "summary": "Get all users",
                        "description": "Returns a list of users",
                        "tags": ["users"],
                        "deprecated": false,
                        "parameters": [],
                        "responses": { "200": { "description": "Success" } }
                    }
                }
            }
        });

        let (name, version, base_url, description, endpoints) = parse_openapi_doc(doc, "fallback");

        assert_eq!(name, "Test API");
        assert_eq!(version, "2.0.0");
        assert_eq!(base_url, "https://api.example.com");
        assert_eq!(description, Some("A test API".to_string()));
        assert_eq!(endpoints.len(), 1);
    }

    #[test]
    fn test_parse_openapi_doc_minimal() {
        let doc = serde_json::json!({
            "paths": {}
        });

        let (name, version, base_url, description, endpoints) = parse_openapi_doc(doc, "Fallback Name");

        assert_eq!(name, "Fallback Name");
        assert_eq!(version, "1.0.0");
        assert_eq!(base_url, "");
        assert_eq!(description, None);
        assert_eq!(endpoints.len(), 0);
    }

    #[test]
    fn test_parse_openapi_doc_extracts_all_methods() {
        let doc = serde_json::json!({
            "info": { "title": "Test", "version": "1.0.0" },
            "paths": {
                "/test": {
                    "get": { "operationId": "getTest", "summary": "Get" },
                    "post": { "operationId": "postTest", "summary": "Post" },
                    "put": { "operationId": "putTest", "summary": "Put" },
                    "delete": { "operationId": "deleteTest", "summary": "Delete" },
                    "patch": { "operationId": "patchTest", "summary": "Patch" },
                    "head": { "operationId": "headTest", "summary": "Head" },
                    "options": { "operationId": "optionsTest", "summary": "Options" }
                }
            }
        });

        let (_, _, _, _, endpoints) = parse_openapi_doc(doc, "test");

        assert_eq!(endpoints.len(), 7);
        let methods: Vec<&str> = endpoints.iter()
            .map(|e| e.get("method").unwrap().as_str().unwrap())
            .collect();
        assert!(methods.contains(&"GET"));
        assert!(methods.contains(&"POST"));
        assert!(methods.contains(&"PUT"));
        assert!(methods.contains(&"DELETE"));
        assert!(methods.contains(&"PATCH"));
        assert!(methods.contains(&"HEAD"));
        assert!(methods.contains(&"OPTIONS"));
    }

    #[test]
    fn test_parse_openapi_doc_endpoint_details() {
        let doc = serde_json::json!({
            "info": { "title": "Test", "version": "1.0.0" },
            "paths": {
                "/users/{id}": {
                    "get": {
                        "operationId": "getUserById",
                        "summary": "Get user by ID",
                        "description": "Returns a single user",
                        "tags": ["users"],
                        "deprecated": true,
                        "parameters": [{"name": "id", "in": "path"}],
                        "responses": {"200": {"description": "Success"}}
                    }
                }
            }
        });

        let (_, _, _, _, endpoints) = parse_openapi_doc(doc, "test");
        let endpoint = &endpoints[0];

        assert_eq!(endpoint.get("path").unwrap(), "/users/{id}");
        assert_eq!(endpoint.get("method").unwrap(), "GET");
        assert_eq!(endpoint.get("operationId").unwrap(), "getUserById");
        assert_eq!(endpoint.get("summary").unwrap(), "Get user by ID");
        assert_eq!(endpoint.get("description").unwrap(), "Returns a single user");
        assert!(endpoint.get("deprecated").unwrap().as_bool().unwrap());
    }

    #[test]
    fn test_chrono_now_format() {
        let now = chrono_now();
        assert!(now.ends_with('Z'));
        assert!(now.contains('-'));
        assert!(now.contains(':'));
    }

    #[test]
    fn test_command_error_serialization() {
        let error = CommandError {
            message: "Something went wrong".to_string(),
        };
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("Something went wrong"));
    }

    #[test]
    fn test_import_config_without_optional_fields() {
        let config = ImportConfig {
            id: "minimal".to_string(),
            name: "Minimal".to_string(),
            url: "https://api.example.com".to_string(),
            headers: HashMap::new(),
            auth_items: vec![],
            sync_interval_minutes: 30,
            last_sync: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("minimal"));
        let deserialized: ImportConfig = serde_json::from_str(&json).unwrap();
        assert!(deserialized.last_sync.is_none());
    }

    #[test]
    fn test_request_result_status_codes() {
        let result = RequestResult {
            success: true,
            status: 201,
            status_text: "Created".to_string(),
            headers: HashMap::new(),
            body: "".to_string(),
            size: 0,
            error: None,
        };
        assert!(result.success);
        assert_eq!(result.status, 201);

        let result = RequestResult {
            success: false,
            status: 404,
            status_text: "Not Found".to_string(),
            headers: HashMap::new(),
            body: "Not Found".to_string(),
            size: 9,
            error: Some("Not Found".to_string()),
        };
        assert!(!result.success);
        assert_eq!(result.status, 404);
    }

    #[test]
    fn test_multiple_auth_items() {
        let config = ImportConfig {
            id: "multi_auth".to_string(),
            name: "Multi Auth Config".to_string(),
            url: "https://api.example.com".to_string(),
            headers: HashMap::new(),
            auth_items: vec![
                AuthItem {
                    location: "header".to_string(),
                    key: "X-API-Key".to_string(),
                    value: "key123".to_string(),
                },
                AuthItem {
                    location: "header".to_string(),
                    key: "Authorization".to_string(),
                    value: "Bearer token".to_string(),
                },
            ],
            sync_interval_minutes: 60,
            last_sync: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        assert_eq!(config.auth_items.len(), 2);
        assert_eq!(config.auth_items[0].key, "X-API-Key");
        assert_eq!(config.auth_items[1].key, "Authorization");
    }

    #[test]
    fn test_headers_hashmap_multiple_entries() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("Accept".to_string(), "application/json".to_string());
        headers.insert("Authorization".to_string(), "Bearer token".to_string());

        let result = RequestResult {
            success: true,
            status: 200,
            status_text: "OK".to_string(),
            headers,
            body: "".to_string(),
            size: 0,
            error: None,
        };

        assert_eq!(result.headers.len(), 3);
        assert_eq!(result.headers.get("Content-Type").unwrap(), "application/json");
        assert_eq!(result.headers.get("Authorization").unwrap(), "Bearer token");
    }

    #[test]
    fn test_parse_openapi_doc_handles_null_info() {
        let doc = serde_json::json!({
            "paths": {}
        });

        let (name, version, _, _, _) = parse_openapi_doc(doc, "Default Name");

        assert_eq!(name, "Default Name");
        assert_eq!(version, "1.0.0");
    }

    #[test]
    fn test_parse_openapi_doc_handles_missing_servers() {
        let doc = serde_json::json!({
            "info": { "title": "Test", "version": "1.0.0" },
            "paths": {}
        });

        let (_, _, base_url, _, _) = parse_openapi_doc(doc, "test");

        assert_eq!(base_url, "");
    }

    #[test]
    fn test_parse_openapi_doc_handles_empty_paths() {
        let doc = serde_json::json!({
            "info": { "title": "Test", "version": "1.0.0" },
            "paths": {}
        });

        let (_, _, _, _, endpoints) = parse_openapi_doc(doc, "test");

        assert!(endpoints.is_empty());
    }

    #[test]
    fn test_parse_openapi_doc_handles_path_with_no_methods() {
        let doc = serde_json::json!({
            "info": { "title": "Test", "version": "1.0.0" },
            "paths": {
                "/empty": {}
            }
        });

        let (_, _, _, _, endpoints) = parse_openapi_doc(doc, "test");

        assert!(endpoints.is_empty());
    }

    #[test]
    fn test_redact_json_value_removes_password() {
        let mut json = serde_json::json!({
            "name": "Test API",
            "password": "secret123",
            "username": "admin"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("name"));
        assert!(obj.contains_key("username"));
        assert!(!obj.contains_key("password"));
    }

    #[test]
    fn test_redact_json_value_removes_nested_secrets() {
        let mut json = serde_json::json!({
            "auth": {
                "token": "bearer_token_here",
                "expires_in": 3600
            }
        });
        redact_json_value(&mut json);
        let auth = json["auth"].as_object().unwrap();
        assert!(!auth.contains_key("token"));
        assert!(auth.contains_key("expires_in"));
    }

    #[test]
    fn test_redact_json_value_handles_array() {
        let mut json = serde_json::json!([
            { "password": "secret1" },
            { "api_key": "key123" },
            { "name": "safe" }
        ]);
        redact_json_value(&mut json);
        let arr = json.as_array().unwrap();
        assert!(!arr[0].as_object().unwrap().contains_key("password"));
        assert!(!arr[1].as_object().unwrap().contains_key("api_key"));
        assert!(arr[2].as_object().unwrap().contains_key("name"));
    }

    #[test]
    fn test_redact_json_value_case_insensitive() {
        let mut json = serde_json::json!({
            "PASSWORD": "secret",
            "Token": "bearer",
            "Secret": "hidden"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("PASSWORD"));
        assert!(!obj.contains_key("Token"));
        assert!(!obj.contains_key("Secret"));
    }

    #[test]
    fn test_redact_json_value_preserves_non_sensitive() {
        let mut json = serde_json::json!({
            "url": "https://api.example.com",
            "method": "GET",
            "timeout": 30000,
            "headers": {
                "Content-Type": "application/json"
            }
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("url"));
        assert!(obj.contains_key("method"));
        assert!(obj.contains_key("timeout"));
        assert!(obj["headers"].as_object().unwrap().contains_key("Content-Type"));
    }

    #[test]
    fn test_redact_json_value_removes_aws_keys() {
        let mut json = serde_json::json!({
            "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
            "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "region": "us-east-1"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("aws_access_key"));
        assert!(!obj.contains_key("aws_secret_key"));
        assert!(obj.contains_key("region"));
    }

    #[test]
    fn test_redact_json_value_oauth2_tokens() {
        let mut json = serde_json::json!({
            "oauth2_access_token": "ya29.a0AfH6SMBx...",
            "oauth2_refresh_token": "1//0gXy3Tj1iW3...",
            "oauth2_client_id": "client_id.apps.googleusercontent.com"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("oauth2_access_token"));
        assert!(!obj.contains_key("oauth2_refresh_token"));
        assert!(!obj.contains_key("oauth2_client_id"));
    }

    #[test]
    fn test_redact_json_value_deeply_nested() {
        let mut json = serde_json::json!({
            "level1": {
                "level2": {
                    "level3": {
                        "password": "secret_at_depth_3",
                        "safe_field": "visible"
                    }
                }
            }
        });
        redact_json_value(&mut json);
        let deep = json["level1"]["level2"]["level3"].as_object().unwrap();
        assert!(!deep.contains_key("password"));
        assert!(deep.contains_key("safe_field"));
    }

    #[test]
    fn test_redact_json_value_preserves_primitives() {
        let mut json = serde_json::json!({
            "string_field": "hello",
            "number_field": 42,
            "bool_field": true,
            "null_field": serde_json::Value::Null
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert_eq!(obj["string_field"], "hello");
        assert_eq!(obj["number_field"], 42);
        assert_eq!(obj["bool_field"], true);
        assert_eq!(obj["null_field"], serde_json::Value::Null);
    }

    #[test]
    fn test_redact_json_value_empty_container() {
        let mut json1 = serde_json::json!({});
        redact_json_value(&mut json1);
        assert!(json1.as_object().unwrap().is_empty());

        let mut json2 = serde_json::json!([]);
        redact_json_value(&mut json2);
        assert!(json2.as_array().unwrap().is_empty());
    }

    #[test]
    fn test_redact_json_value_mixed_sensitive_and_safe() {
        let mut json = serde_json::json!({
            "username": "admin",
            "password": "secret",
            "token": "bearer123",
            "endpoint": "https://api.example.com",
            "timeout": 30000,
            "retry_count": 3
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("password"));
        assert!(!obj.contains_key("token"));
        assert_eq!(obj["username"], "admin");
        assert_eq!(obj["endpoint"], "https://api.example.com");
        assert_eq!(obj["timeout"], 30000);
        assert_eq!(obj["retry_count"], 3);
    }

    #[test]
    fn test_redact_json_value_array_of_objects() {
        let mut json = serde_json::json!([
            { "name": "item1", "secret": "hidden1" },
            { "name": "item2", "api_key": "key2" }
        ]);
        redact_json_value(&mut json);
        let arr = json.as_array().unwrap();
        assert!(!arr[0].as_object().unwrap().contains_key("secret"));
        assert!(arr[0].as_object().unwrap().contains_key("name"));
        assert!(!arr[1].as_object().unwrap().contains_key("api_key"));
        assert!(arr[1].as_object().unwrap().contains_key("name"));
    }

    #[test]
    fn test_redact_json_value_sensitive_in_array_value() {
        // "credentials" is itself a sensitive key, so the entire field is removed
        let mut json = serde_json::json!({
            "credentials": ["user", "pass123"]
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("credentials"));
    }

    #[test]
    fn test_redact_json_value_all_sensitive_removed() {
        let mut json = serde_json::json!({
            "password": "p1",
            "secret": "s1",
            "token": "t1",
            "access_token": "a1"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(obj.is_empty());
    }

    #[test]
    fn test_redact_json_value_camel_case_variants() {
        // Test camelCase sensitive keys (case-insensitive matching)
        let mut json = serde_json::json!({
            "accessKey": "AKIAIOSFODNN7EXAMPLE",
            "secretKey": "wJalrXUtnFEMI/K7MDENG",
            "apiSecret": "secret123",
            "sessionId": "sess_abc123"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("accessKey"));
        assert!(!obj.contains_key("secretKey"));
        assert!(!obj.contains_key("apiSecret"));
        assert!(!obj.contains_key("sessionId"));
    }

    #[test]
    fn test_redact_json_value_aws_camel_case() {
        let mut json = serde_json::json!({
            "access_key_id": "AKIAIOSFODNN7EXAMPLE",
            "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(!obj.contains_key("access_key_id"));
        assert!(!obj.contains_key("secret_access_key"));
    }

    #[test]
    fn test_redact_json_value_substring_match() {
        // Test that sensitive substrings are caught (contains matching)
        let mut json = serde_json::json!({
            "userPassword": "secret123",
            "authToken": "bearer123",
            "apiKeyValue": "key123",
            "mySecretKey": "hidden"
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        // All these keys contain sensitive words, so they should be removed
        assert!(!obj.contains_key("userPassword"));
        assert!(!obj.contains_key("authToken"));
        assert!(!obj.contains_key("apiKeyValue"));
        assert!(!obj.contains_key("mySecretKey"));
    }

    #[test]
    fn test_redact_json_value_no_false_positives() {
        // Test that truly safe keys are not removed
        let mut json = serde_json::json!({
            "username": "admin",
            "endpoint": "/api/v1/users",
            "timeout": 30000,
            "retryCount": 3,
            "userId": 12345
        });
        redact_json_value(&mut json);
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("username"));
        assert!(obj.contains_key("endpoint"));
        assert!(obj.contains_key("timeout"));
        assert!(obj.contains_key("retryCount"));
        assert!(obj.contains_key("userId"));
    }

    // =============================================================================
    // Mock Template Engine Tests
    // =============================================================================

    #[test]
    fn test_process_mock_template_choice_syntax() {
        // Test {{$choice opt1 opt2}} syntax
        let result = process_mock_template_public("{{$choice yes no}}");
        assert!(result == "yes" || result == "no");
    }

    #[test]
    fn test_process_mock_template_choice_multiple_options() {
        // Test {{$choice}} with multiple options
        let result = process_mock_template_public("{{$choice apple banana cherry}}");
        assert!(result == "apple" || result == "banana" || result == "cherry");
    }

    #[test]
    fn test_process_mock_template_random_int() {
        // Test {{$randomInt min max}} syntax
        let result = process_mock_template_public("{{$randomInt 1 10}}");
        let value: i64 = result.parse().unwrap();
        assert!(value >= 1 && value <= 10);
    }

    #[test]
    fn test_process_mock_template_random_int_range() {
        // Test {{$randomInt}} with large range
        let result = process_mock_template_public("{{$randomInt 100 200}}");
        let value: i64 = result.parse().unwrap();
        assert!(value >= 100 && value <= 200);
    }

    #[test]
    fn test_process_mock_template_random_float() {
        // Test {{$randomFloat min max}} syntax
        let result = process_mock_template_public("{{$randomFloat 0 100}}");
        let value: f64 = result.parse().unwrap();
        assert!(value >= 0.0 && value <= 100.0);
    }

    #[test]
    fn test_process_mock_template_random_float_with_decimals() {
        // Test {{$randomFloat min max dec}} syntax
        let result = process_mock_template_public("{{$randomFloat 0 10 4}}");
        let value: f64 = result.parse().unwrap();
        assert!(value >= 0.0 && value <= 10.0);
        // Should have 4 decimal places
        assert!(result.contains('.'));
    }

    #[test]
    fn test_process_mock_template_delay_syntax() {
        // Test {{$delay}} returns the placeholder (delay is extracted separately in frontend)
        let result = process_mock_template_public("{{$delay}}");
        assert_eq!(result, "{{$delay}}");
    }

    #[test]
    fn test_process_mock_template_standard_variables() {
        // Test standard variable substitution
        let result = process_mock_template_public("{{name}}");
        // Result should contain space (full name)
        assert!(result.contains(' '));
    }

    #[test]
    fn test_process_mock_template_email_rule() {
        // Test {{email}} rule (without $ prefix)
        let result = process_mock_template_public("{{email}}");
        assert!(result.contains('@'));
        assert!(result.contains('.'));
    }

    #[test]
    fn test_process_mock_template_unknown_variable_preserved() {
        // Test that unknown variables are preserved as-is
        let result = process_mock_template_public("{{unknownVar}}");
        assert_eq!(result, "{{unknownVar}}");
    }

    // =============================================================================
    // OpenAPI Auto-Mock Generation Tests
    // =============================================================================

    #[test]
    fn test_generate_mock_rules_from_openapi_basic() {
        let doc = serde_json::json!({
            "info": { "title": "Test API", "version": "1.0.0" },
            "servers": [{ "url": "https://api.example.com" }],
            "paths": {
                "/users": {
                    "get": {
                        "summary": "Get all users",
                        "responses": {
                            "200": {
                                "description": "Success",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "array",
                                            "items": { "$ref": "#/components/schemas/User" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "components": {
                "schemas": {
                    "User": {
                        "type": "object",
                        "properties": {
                            "id": { "type": "integer" },
                            "name": { "type": "string" }
                        }
                    }
                }
            }
        });

        let (name, version, base_url, _, endpoints) = parse_openapi_doc(doc, "test");
        let rules = generate_mock_rules_from_openapi(&name, &base_url, endpoints);

        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].name, "Get all users");
        assert_eq!(rules[0].trigger.method.as_ref().unwrap()[0], "GET");
        assert!(rules[0].trigger.path_pattern.as_ref().unwrap().contains("/users"));
    }

    #[test]
    fn test_generate_mock_rules_from_openapi_multiple_endpoints() {
        let doc = serde_json::json!({
            "info": { "title": "Pet Store API", "version": "2.0.0" },
            "servers": [{ "url": "https://petstore.example.com/api" }],
            "paths": {
                "/pets": {
                    "get": { "summary": "List pets", "responses": { "200": { "description": "OK" } } },
                    "post": { "summary": "Create pet", "responses": { "201": { "description": "Created" } } }
                },
                "/pets/{id}": {
                    "get": { "summary": "Get pet by ID", "responses": { "200": { "description": "OK" } } },
                    "delete": { "summary": "Delete pet", "responses": { "204": { "description": "No Content" } } }
                }
            }
        });

        let (name, version, base_url, _, endpoints) = parse_openapi_doc(doc, "test");
        let rules = generate_mock_rules_from_openapi(&name, &base_url, endpoints);

        assert_eq!(rules.len(), 4); // get + post on /pets, get + delete on /pets/{id}
        assert!(rules.iter().any(|r| r.trigger.method.as_ref().unwrap().contains(&"GET".to_string())));
        assert!(rules.iter().any(|r| r.trigger.method.as_ref().unwrap().contains(&"POST".to_string())));
    }

    #[test]
    fn test_generate_mock_rules_from_openapi_with_schema() {
        let doc = serde_json::json!({
            "info": { "title": "User API", "version": "1.0.0" },
            "servers": [{ "url": "https://api.example.com" }],
            "paths": {
                "/users": {
                    "post": {
                        "summary": "Create user",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "email": { "type": "string", "format": "email" },
                                            "name": { "type": "string" }
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "201": {
                                "description": "Created",
                                "content": {
                                    "application/json": {
                                        "schema": { "type": "object" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        let (name, _, base_url, _, endpoints) = parse_openapi_doc(doc, "test");
        let rules = generate_mock_rules_from_openapi(&name, &base_url, endpoints);

        assert_eq!(rules.len(), 1);
        assert!(rules[0].response.body_template.contains("email"));
        assert!(rules[0].response.status_code == 201);
    }

    #[test]
    fn test_generate_mock_rules_from_openapi_empty_paths() {
        let doc = serde_json::json!({
            "info": { "title": "Empty API", "version": "1.0.0" },
            "paths": {}
        });

        let (_, _, _, _, endpoints) = parse_openapi_doc(doc, "test");
        let rules = generate_mock_rules_from_openapi("Empty API", "", endpoints);

        assert!(rules.is_empty());
    }
}

// --- Main Application Setup ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_apis,
            get_api,
            execute_request,
            read_file_base64,
            save_response_to_file,
            save_api,
            fetch_url,
            save_import_config,
            get_import_configs,
            delete_import_config,
            update_import_config,
            sync_import_config,
            search_apis,
            execute_agent_command,
            execute_agent_command_stream,
            get_agent_context,
            call_llm,
            get_env_config_cmd,
            save_env_config_cmd,
            switch_env_cmd,
            save_request_cmd,
            get_requests_cmd,
            get_request_cmd,
            delete_request_cmd,
            save_response_cmd,
            get_responses_cmd,
            get_response_cmd,
            delete_response_cmd,
            delete_responses_cmd,
            clear_responses_cmd,
            git_log,
            git_diff,
            git_status,
            git_stage,
            git_commit,
            git_branch_list,
            git_branch_create,
            git_checkout,
            git_reset,
            git_revert,
            init_git_repo,
            save_flow_cmd,
            get_flows_cmd,
            get_flow_cmd,
            delete_flow_cmd,
            export_all_data_cmd,
            export_backup_cmd,
            export_flow_cmd,
            generate_uuid,
            generate_random_int,
            generate_random_float,
            generate_timestamp,
            generate_sequence,
            get_mock_server_status,
            generate_mock_rules_from_openapi_cmd,
            start_mock_server_cmd,
            stop_mock_server_cmd,
            get_mock_rules,
            add_mock_rule,
            update_mock_rule,
            delete_mock_rule,
            clear_mock_rules,
            get_mock_request_logs,
            clear_mock_request_logs,
            generate_mock_value,
            generate_mock_from_schema,
            process_mock_template,
            get_mock_custom_rules,
            add_mock_custom_rule,
            update_mock_custom_rule,
            delete_mock_custom_rule,
                       toggle_mock_custom_rule,
            emit_log,
            query_logs,
            get_log_path,
        ])
        .setup(|app| {
            // Initialize logging first
            if let Err(e) = logging::init_logging(&app.handle()) {
                eprintln!("Warning: Failed to initialize logging: {}", e);
                eprintln!("Logs will not be persisted to disk");
            } else {
                tracing::info!("Logging subsystem initialized");
            }

            // Start capture server for browser extension
            let capture_server = capture_server::CaptureServer::new();
            let capture_port = capture_server.port;
            let capture_server_handle = capture_server.get_connected_clients();
            tauri::async_runtime::spawn(async move {
                capture_server.start().await;
            });
            tracing::info!("Capture server started on port {}", capture_port);

            // Store connected clients count for frontend query
            app.manage(capture_server_handle);

            // Initialize git repo on startup
            match ensure_git_repo(&app.handle()) {
                Ok(_) => {
                    tracing::info!("Git repository initialized successfully");
                }
                Err(e) => {
                    tracing::warn!(reason = %e, "Failed to initialize git repo - git version control will not be available");
                }
            }

            // Create system tray menu
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Build system tray
            let icon_bytes = include_bytes!("../icons/icon.png");
            let icon_image = image::load_from_memory(icon_bytes)
                .expect("Failed to decode tray icon PNG");
            let rgba = icon_image.to_rgba8();
            let (width, height) = rgba.dimensions();
            let icon = Image::new_owned(rgba.into_raw(), width, height);
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("flare-api-spec")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
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

            // Open devtools in debug mode
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
