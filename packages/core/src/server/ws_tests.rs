#[cfg(test)]
mod tests {
    use super::super::ws::WsMessageSender;
    use tokio_tungstenite::tungstenite::Message;

    #[test]
    fn test_ws_message_sender_send() {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let sender = WsMessageSender { tx };

        sender.tx.send(Message::Text("hello".into())).unwrap();

        let received = rx.try_recv().unwrap();
        assert_eq!(received, Message::Text("hello".into()));
    }

    #[test]
    fn test_ws_message_sender_close() {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let sender = WsMessageSender { tx };

        sender.tx.send(Message::Close(None)).unwrap();

        let received = rx.try_recv().unwrap();
        assert_eq!(received, Message::Close(None));
    }

    #[tokio::test]
    async fn test_ws_message_sender_multiple_messages() {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let sender = WsMessageSender { tx };

        sender.tx.send(Message::Text("first".into())).unwrap();
        sender.tx.send(Message::Text("second".into())).unwrap();

        assert_eq!(rx.recv().await.unwrap(), Message::Text("first".into()));
        assert_eq!(rx.recv().await.unwrap(), Message::Text("second".into()));
    }

    #[tokio::test]
    async fn test_ws_message_sender_channel_dropped() {
        let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<Message>();
        let sender = WsMessageSender { tx };

        drop(rx);

        let result = sender.tx.send(Message::Text("should fail".into()));
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_store_upgrade_no_panic_in_runtime() {
        let req = hyper::Request::builder()
            .body(http_body_util::Full::new(hyper::body::Bytes::new()))
            .unwrap();
        let upgrade = hyper::upgrade::on(req);
        super::super::ws::store_upgrade(upgrade, None);
    }
}
