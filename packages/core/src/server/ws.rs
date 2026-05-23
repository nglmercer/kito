use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use once_cell::sync::Lazy;

use futures_util::{SinkExt, StreamExt};
use hyper::upgrade::OnUpgrade;
use hyper_util::rt::TokioIo;
use napi::{
    Result, bindgen_prelude::{External, Function},
    threadsafe_function::ThreadsafeFunctionCallMode,
};
use tokio_tungstenite::tungstenite::Message;

static NEXT_ID: AtomicU64 = AtomicU64::new(1);
static UPGRADES: Lazy<Mutex<HashMap<i64, OnUpgrade>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// A sender for WebSocket messages
pub struct WsMessageSender {
    pub tx: tokio::sync::mpsc::UnboundedSender<Message>,
}

/// Store a pending WebSocket upgrade. Returns an ID for JS to reference.
/// Called from handler.rs when a WS upgrade request is detected.
pub fn store_upgrade(upgrade: OnUpgrade) -> i64 {
    let id = NEXT_ID.fetch_add(1, Ordering::SeqCst) as i64;
    let mut registry = UPGRADES.lock();
    registry.insert(id, upgrade);
    id
}

/// Accept a WebSocket upgrade by ID, set up message handling.
/// JS calls this with the upgrade ID and callbacks.
#[napi]
pub fn accept_websocket(
    upgrade_id: i64,
    on_message: Function<'_, String, ()>,
    on_error: Function<'_, String, ()>,
    on_close: Function<'_, (), ()>,
) -> Result<External<WsMessageSender>> {
    let on_message = on_message
        .build_threadsafe_function::<String>()
        .callee_handled::<true>()
        .build_callback(|ctx| Ok(ctx.value))?;
    let on_error = on_error
        .build_threadsafe_function::<String>()
        .callee_handled::<true>()
        .build_callback(|ctx| Ok(ctx.value))?;
    let on_close = on_close
        .build_threadsafe_function::<()>()
        .callee_handled::<true>()
        .build_callback(|_| Ok(()))?;

    let upgrader = {
        let mut registry = UPGRADES.lock();
        registry.remove(&upgrade_id).ok_or_else(|| {
            napi::Error::from_reason("WebSocket upgrade not found or expired")
        })?
    };

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Message>();

    tokio::spawn(async move {
        let upgraded = match upgrader.await {
            Ok(u) => u,
            Err(e) => {
                let _ = on_error.call(
                    Ok(format!("Upgrade failed: {e}")),
                    ThreadsafeFunctionCallMode::NonBlocking,
                );
                return;
            }
        };

        let ws_stream = match tokio_tungstenite::accept_async(TokioIo::new(upgraded)).await {
            Ok(stream) => stream,
            Err(e) => {
                let _ = on_error.call(
                    Ok(format!("WS handshake failed: {e}")),
                    ThreadsafeFunctionCallMode::NonBlocking,
                );
                return;
            }
        };

        let (mut write, mut read) = ws_stream.split();

        let send_handle = tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if write.send(msg).await.is_err() { break; }
            }
            let _ = write.close().await;
        });

        loop {
            match read.next().await {
                Some(Ok(Message::Text(text))) => {
                    let _ = on_message.call(Ok(text), ThreadsafeFunctionCallMode::NonBlocking);
                }
                Some(Ok(Message::Binary(data))) => {
                    if let Ok(text) = String::from_utf8(data) {
                        let _ = on_message.call(Ok(text), ThreadsafeFunctionCallMode::NonBlocking);
                    }
                }
                Some(Ok(Message::Close(_))) | None => {
                    let _ = on_close.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
                    break;
                }
                Some(Ok(_)) => {}
                Some(Err(e)) => {
                    let _ = on_error.call(
                        Ok(format!("WS error: {e}")),
                        ThreadsafeFunctionCallMode::NonBlocking,
                    );
                    break;
                }
            }
        }
        send_handle.abort();
    });

    Ok(External::new(WsMessageSender { tx }))
}

/// Send a text message over a WebSocket connection
#[napi]
pub fn ws_send(sender: &External<WsMessageSender>, message: String) -> Result<()> {
    sender.tx.send(Message::Text(message))
        .map_err(|e| napi::Error::from_reason(format!("Send failed: {e}")))
}

/// Close a WebSocket connection
#[napi]
pub fn ws_close(sender: &External<WsMessageSender>) -> Result<()> {
    sender.tx.send(Message::Close(None))
        .map_err(|e| napi::Error::from_reason(format!("Close failed: {e}")))
}
