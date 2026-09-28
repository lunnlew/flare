use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info};

const CAPTURE_PORT: u16 = 7890;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedRequest {
    pub id: String,
    pub method: String,
    pub url: String,
    pub headers: std::collections::HashMap<String, String>,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureConfig {
    pub enabled: bool,
    #[serde(rename = "allowedDomains")]
    pub allowed_domains: Vec<String>,
    #[serde(rename = "excludePatterns")]
    pub exclude_patterns: Vec<String>,
}

// Wrapper for incoming messages that have { type, data } structure
#[derive(Debug, Deserialize)]
struct IncomingMessage {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(default)]
    data: serde_json::Value,
}

impl IncomingMessage {
    fn to_bridge_message(&self) -> Option<BridgeMessage> {
        match self.msg_type.as_str() {
            "CAPTURED_REQUEST" => {
                serde_json::from_value(self.data.clone()).ok().map(BridgeMessage::CapturedRequest)
            }
            "CAPTURE_CONFIG" => {
                serde_json::from_value(self.data.clone()).ok().map(BridgeMessage::Config)
            }
            "GET_CONFIG" => Some(BridgeMessage::GetConfig),
            _ => None,
        }
    }
}

// Generic bridge message that can be either request or config
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BridgeMessage {
    #[serde(rename = "CAPTURED_REQUEST")]
    CapturedRequest(CapturedRequest),
    #[serde(rename = "CAPTURE_CONFIG")]
    Config(CaptureConfig),
    #[serde(rename = "GET_CONFIG")]
    GetConfig,
}

#[derive(Debug, Serialize)]
struct OutgoingConfigData {
    enabled: bool,
    allowedDomains: Vec<String>,
    excludePatterns: Vec<String>,
}

// OutgoingCapturedRequest with camelCase field names
#[derive(Debug, Serialize)]
struct OutgoingCapturedRequest {
    id: String,
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_body: Option<String>,
}

impl From<CapturedRequest> for OutgoingCapturedRequest {
    fn from(req: CapturedRequest) -> Self {
        Self {
            id: req.id,
            method: req.method,
            url: req.url,
            headers: req.headers,
            timestamp: req.timestamp,
            request_body: req.request_body,
        }
    }
}

// Wrapper for outgoing messages with { type, data } structure
#[derive(Debug, Serialize)]
struct OutgoingMessage {
    #[serde(rename = "type")]
    msg_type: String,
    data: serde_json::Value,
}

impl From<BridgeMessage> for String {
    fn from(bridge_msg: BridgeMessage) -> Self {
        let msg = match bridge_msg {
            BridgeMessage::CapturedRequest(req) => {
                OutgoingMessage {
                    msg_type: "CAPTURED_REQUEST".to_string(),
                    data: serde_json::to_value(&OutgoingCapturedRequest::from(req)).unwrap(),
                }
            }
            BridgeMessage::Config(cfg) => {
                OutgoingMessage {
                    msg_type: "CAPTURE_CONFIG".to_string(),
                    data: serde_json::to_value(&OutgoingConfigData {
                        enabled: cfg.enabled,
                        allowedDomains: cfg.allowed_domains,
                        excludePatterns: cfg.exclude_patterns,
                    }).unwrap(),
                }
            }
            BridgeMessage::GetConfig => {
                OutgoingMessage {
                    msg_type: "GET_CONFIG".to_string(),
                    data: serde_json::Value::Null,
                }
            }
        };
        serde_json::to_string(&msg).unwrap()
    }
}

pub struct CaptureServer {
    pub port: u16,
    sender: broadcast::Sender<String>,
    connected_clients: Arc<RwLock<usize>>,
}

impl CaptureServer {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self {
            port: CAPTURE_PORT,
            sender,
            connected_clients: Arc::new(RwLock::new(0)),
        }
    }

    pub async fn start(&self) {
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port));
        let listener = TcpListener::bind(&addr).await.expect("Failed to bind port");

        info!("[Capture] WebSocket server started on port {}", self.port);

        let connected_clients = self.connected_clients.clone();
        let sender = self.sender.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, addr)) => {
                        let client_count = {
                            let mut count = connected_clients.write().await;
                            *count += 1;
                            *count
                        };
                        info!("[Capture] Client connected: {} (total: {})", addr, client_count);

                        let sender = sender.clone();
                        let connected_clients = connected_clients.clone();

                        tokio::spawn(async move {
                            let ws_stream = match tokio_tungstenite::accept_async(stream).await {
                                Ok(ws) => ws,
                                Err(e) => {
                                    error!("[Capture] WebSocket error: {}", e);
                                    return;
                                }
                            };

                            let (mut write, mut read) = ws_stream.split();
                            let mut broadcast_rx = sender.subscribe();

                            loop {
                                tokio::select! {
                                    // Receive message from client (extension or desktop)
                                    msg = read.next() => {
                                        match msg {
                                            Some(Ok(Message::Text(text))) => {
                                                info!("[Capture] Received text message: {}", text);
                                                // Parse as BridgeMessage and broadcast to all clients
                                                match serde_json::from_str::<IncomingMessage>(&text) {
                                                    Ok(incoming) => {
                                                        match incoming.to_bridge_message() {
                                                            Some(bridge_msg) => {
                                                                match &bridge_msg {
                                                                    BridgeMessage::CapturedRequest(req) => {
                                                                        info!("[Capture] Parsed request: {} {}", req.method, req.url);
                                                                    }
                                                                    BridgeMessage::Config(cfg) => {
                                                                        info!("[Capture] Received config: enabled={}, domains={:?}", cfg.enabled, cfg.allowed_domains);
                                                                    }
                                                                    BridgeMessage::GetConfig => {
                                                                        info!("[Capture] Extension requested config");
                                                                    }
                                                                }
                                                                let json_str: String = bridge_msg.into();
                                                                info!("[Capture] Broadcasting: {}", json_str);
                                                                let _ = sender.send(json_str);
                                                            }
                                                            None => {
                                                                error!("[Capture] Unknown message type: {}", incoming.msg_type);
                                                            }
                                                        }
                                                    }
                                                    Err(e) => {
                                                        error!("[Capture] Failed to parse: {}", e);
                                                    }
                                                }
                                            }
                                            Some(Ok(Message::Close(_))) | None => {
                                                break;
                                            }
                                            Some(Ok(_)) | Some(Err(_)) => {
                                                // Ignore other messages
                                            }
                                        }
                                    }
                                    // Forward broadcasts to client (all connected clients)
                                    broadcast_msg = broadcast_rx.recv() => {
                                        match broadcast_msg {
                                            Ok(msg) => {
                                                if write.send(Message::Text(msg.into())).await.is_err() {
                                                    break;
                                                }
                                            }
                                            Err(_) => {}
                                        }
                                    }
                                }
                            }

                            let mut count = connected_clients.write().await;
                            *count -= 1;
                            info!("[Capture] Client disconnected (total: {})", count);
                        });
                    }
                    Err(e) => {
                        error!("[Capture] Accept error: {}", e);
                    }
                }
            }
        });
    }

    pub fn get_connected_clients(&self) -> Arc<RwLock<usize>> {
        self.connected_clients.clone()
    }
}

impl Default for CaptureServer {
    fn default() -> Self {
        Self::new()
    }
}