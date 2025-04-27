// backend/src/main.rs
use axum::{
    routing::{get, post},
    serve, Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[derive(Debug, Serialize, Deserialize)]
struct SyncRequest {
    last_synced_at: i64,
    time_entries: serde_json::Value,
    projects: serde_json::Value,
    categories: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct SyncResponse {
    last_synced_at: i64,
    time_entries: serde_json::Value,
    projects: serde_json::Value,
    categories: serde_json::Value,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    println!("Starting time tracker backend server...");

    // Set up CORS
    let cors = CorsLayer::new().allow_origin(Any);

    // Build our application with routes
    let app = Router::new()
        .route("/", get(|| async { "Time Tracker API" }))
        .route("/sync", get(get_sync))
        .route("/sync", post(post_sync))
        .route("/health", get(health))
        .layer(cors);

    // Run the server
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    serve(listener, app).await.unwrap();
}

/// Get the last synced data for the user
async fn get_sync() -> Json<SyncResponse> {
    // For now, simply echo back the data with an updated timestamp
    let current_time = chrono::Utc::now().timestamp_millis();

    Json(SyncResponse {
        last_synced_at: current_time,
        time_entries: serde_json::Value::Null,
        projects: serde_json::Value::Null,
        categories: serde_json::Value::Null,
    })
}

/// Update the last synced data for the user
async fn post_sync(Json(payload): Json<SyncRequest>) -> Json<SyncResponse> {
    // For now, simply echo back the data with an updated timestamp
    // In a real implementation, you'd compare with stored data
    let current_time = chrono::Utc::now().timestamp_millis();

    Json(SyncResponse {
        last_synced_at: current_time,
        time_entries: payload.time_entries,
        projects: payload.projects,
        categories: payload.categories,
    })
}

async fn health() -> Json<HealthResponse> {
    let current_time = chrono::Utc::now().timestamp_millis();
    let memory_usage = sys_info::mem_info().unwrap();
    let cpu_usage = sys_info::cpu_usage().unwrap();
    let uptime = sys_info::uptime().unwrap();

    Json(HealthResponse {
        status: "OK".to_string(),
        last_synced_at: current_time,
        memory_usage,
        cpu_usage,
        uptime,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_endpoint() {
        let result = health().await;
        assert_eq!(result.status, "OK");
    }
}
