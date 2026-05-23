#[cfg(test)]
mod tests {
    use super::super::multipart::*;
    use hyper::body::Bytes;

    fn default_config() -> UploadConfig {
        UploadConfig::default()
    }

    fn small_file_config() -> UploadConfig {
        UploadConfig {
            memory_threshold: 1024,
            max_file_size: 10 * 1024,
            max_total_size: 50 * 1024,
            temp_dir: None,
        }
    }

    fn build_multipart_body(
        fields: &[(&str, &str)],
        files: &[(&str, &str, &str, &[u8])],
    ) -> (String, Bytes) {
        let boundary = "test-boundary-123";
        let mut body = Vec::new();

        for (name, value) in fields {
            body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
            body.extend_from_slice(
                format!("Content-Disposition: form-data; name=\"{}\"\r\n\r\n", name).as_bytes(),
            );
            body.extend_from_slice(value.as_bytes());
            body.extend_from_slice(b"\r\n");
        }

        for (name, filename, content_type, data) in files {
            body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
            body.extend_from_slice(
                format!(
                    "Content-Disposition: form-data; name=\"{}\"; filename=\"{}\"\r\n",
                    name, filename
                )
                .as_bytes(),
            );
            body.extend_from_slice(format!("Content-Type: {}\r\n\r\n", content_type).as_bytes());
            body.extend_from_slice(data);
            body.extend_from_slice(b"\r\n");
        }

        body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

        (boundary.to_string(), Bytes::from(body))
    }

    // ===== extract_boundary tests =====

    #[test]
    fn test_extract_boundary_basic() {
        let ct = "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW";
        assert_eq!(extract_boundary(ct), Some("----WebKitFormBoundary7MA4YWxkTrZu0gW".to_string()));
    }

    #[test]
    fn test_extract_boundary_with_quotes() {
        let ct = "multipart/form-data; boundary=\"my-boundary\"";
        assert_eq!(extract_boundary(ct), Some("my-boundary".to_string()));
    }

    #[test]
    fn test_extract_boundary_case_insensitive_content_type() {
        let ct = "Multipart/Form-Data; boundary=abc123";
        assert_eq!(extract_boundary(ct), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_boundary_case_insensitive_boundary_param() {
        let ct = "multipart/form-data; Boundary=abc123";
        assert_eq!(extract_boundary(ct), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_boundary_extra_params() {
        let ct = "multipart/form-data; boundary=abc123; charset=UTF-8";
        assert_eq!(extract_boundary(ct), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_boundary_not_multipart() {
        let ct = "application/json";
        assert_eq!(extract_boundary(ct), None);
    }

    #[test]
    fn test_extract_boundary_multipart_no_boundary_param() {
        let ct = "multipart/form-data";
        assert_eq!(extract_boundary(ct), None);
    }

    #[test]
    fn test_extract_boundary_empty_boundary() {
        let ct = "multipart/form-data; boundary=";
        assert_eq!(extract_boundary(ct), Some("".to_string()));
    }

    #[test]
    fn test_extract_boundary_with_spaces_around_equals() {
        let ct = "multipart/form-data; boundary = my-boundary";
        assert_eq!(extract_boundary(ct), Some("my-boundary".to_string()));
    }

    #[test]
    fn test_extract_boundary_with_quotes_and_spaces() {
        let ct = "multipart/form-data; boundary = \"quoted-boundary\"";
        assert_eq!(extract_boundary(ct), Some("quoted-boundary".to_string()));
    }

    // ===== UploadConfig tests =====

    #[test]
    fn test_upload_config_default() {
        let config = UploadConfig::default();
        assert_eq!(config.memory_threshold, 10 * 1024 * 1024);
        assert_eq!(config.max_file_size, 100 * 1024 * 1024);
        assert_eq!(config.max_total_size, 500 * 1024 * 1024);
        assert!(config.temp_dir.is_none());
    }

    #[test]
    fn test_upload_config_custom() {
        let config = UploadConfig {
            memory_threshold: 512,
            max_file_size: 1024,
            max_total_size: 2048,
            temp_dir: Some("/tmp/uploads".to_string()),
        };
        assert_eq!(config.memory_threshold, 512);
        assert_eq!(config.max_file_size, 1024);
        assert_eq!(config.max_total_size, 2048);
        assert_eq!(config.temp_dir.as_deref(), Some("/tmp/uploads"));
    }

    // ===== FileData tests =====

    #[test]
    fn test_file_data_memory() {
        let data = FileData::Memory(Bytes::from("hello"));
        assert!(data.is_memory());
        assert!(!data.is_disk());
        assert!(data.as_bytes().is_some());
        assert_eq!(data.as_bytes().unwrap().as_ref(), b"hello");
        assert!(data.path().is_none());
    }

    #[test]
    fn test_file_data_disk() {
        let data = FileData::Disk(std::path::PathBuf::from("/tmp/test.txt"));
        assert!(!data.is_memory());
        assert!(data.is_disk());
        assert!(data.as_bytes().is_none());
        assert_eq!(data.path(), Some(std::path::Path::new("/tmp/test.txt")));
    }

    #[test]
    fn test_file_data_clone() {
        let data = FileData::Memory(Bytes::from("test"));
        let cloned = data.clone();
        assert!(cloned.is_memory());
        assert_eq!(cloned.as_bytes().unwrap().as_ref(), b"test");
    }

    // ===== UploadedFile tests =====

    #[test]
    fn test_uploaded_file_memory() {
        let file = UploadedFile {
            filename: "test.txt".to_string(),
            content_type: "text/plain".to_string(),
            size: 4,
            data: FileData::Memory(Bytes::from("test")),
        };

        assert_eq!(file.filename, "test.txt");
        assert_eq!(file.content_type, "text/plain");
        assert_eq!(file.size, 4);
        assert!(file.bytes().is_some());
        assert_eq!(file.bytes().unwrap().as_ref(), b"test");
        assert!(file.path().is_none());
    }

    #[test]
    fn test_uploaded_file_disk() {
        let file = UploadedFile {
            filename: "large.bin".to_string(),
            content_type: "application/octet-stream".to_string(),
            size: 1024,
            data: FileData::Disk(std::path::PathBuf::from("/tmp/large.bin")),
        };

        assert_eq!(file.filename, "large.bin");
        assert!(file.bytes().is_none());
        assert_eq!(file.path(), Some(std::path::Path::new("/tmp/large.bin")));
    }

    #[test]
    fn test_uploaded_file_debug() {
        let file = UploadedFile {
            filename: "debug.txt".to_string(),
            content_type: "text/plain".to_string(),
            size: 5,
            data: FileData::Memory(Bytes::from("hello")),
        };

        let debug_str = format!("{:?}", file);
        assert!(debug_str.contains("debug.txt"));
        assert!(debug_str.contains("text/plain"));
    }

    // ===== parse_multipart tests (in-memory) =====

    #[tokio::test]
    async fn test_parse_multipart_text_fields() {
        let (boundary, body) =
            build_multipart_body(&[("username", "john"), ("email", "john@example.com")], &[]);

        let (fields, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();

        assert_eq!(fields.get("username").unwrap(), &vec!["john".to_string()]);
        assert_eq!(fields.get("email").unwrap(), &vec!["john@example.com".to_string()]);
        assert!(files.is_empty());
    }

    #[tokio::test]
    async fn test_parse_multipart_single_file() {
        let file_content = b"hello world";
        let (boundary, body) =
            build_multipart_body(&[], &[("avatar", "test.txt", "text/plain", file_content)]);

        let (fields, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();

        assert!(fields.is_empty());
        assert_eq!(files.len(), 1);

        let avatar_files = files.get("avatar").unwrap();
        assert_eq!(avatar_files.len(), 1);

        let file = &avatar_files[0];
        assert_eq!(file.filename, "test.txt");
        assert_eq!(file.content_type, "text/plain");
        assert_eq!(file.size, file_content.len());
        assert!(file.data.is_memory());
        assert_eq!(file.bytes().unwrap().as_ref(), file_content);
    }

    #[tokio::test]
    async fn test_parse_multipart_multiple_files_same_field() {
        let (boundary, body) = build_multipart_body(
            &[],
            &[
                ("docs", "a.txt", "text/plain", b"content a"),
                ("docs", "b.txt", "text/plain", b"content b"),
            ],
        );

        let (fields, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();

        assert!(fields.is_empty());
        let doc_files = files.get("docs").unwrap();
        assert_eq!(doc_files.len(), 2);
        assert_eq!(doc_files[0].filename, "a.txt");
        assert_eq!(doc_files[1].filename, "b.txt");
    }

    #[tokio::test]
    async fn test_parse_multipart_mixed_fields_and_files() {
        let (boundary, body) = build_multipart_body(
            &[("description", "my photo")],
            &[("photo", "image.png", "image/png", b"png-data")],
        );

        let (fields, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();

        assert_eq!(fields.get("description").unwrap(), &vec!["my photo".to_string()]);
        assert_eq!(files.len(), 1);
        assert_eq!(files.get("photo").unwrap()[0].filename, "image.png");
    }

    #[tokio::test]
    async fn test_parse_multipart_filename_strips_path() {
        let boundary = "test-boundary-123";
        let body = Bytes::from(
            format!(
                "--{b}\r\n\
                 Content-Disposition: form-data; name=\"file\"; filename=\"/etc/passwd\"\r\n\
                 Content-Type: text/plain\r\n\
                 \r\n\
                 data\r\n\
                 --{b}--\r\n",
                b = boundary
            )
            .as_bytes()
            .to_vec(),
        );

        let (_, files) = parse_multipart(boundary, body, &default_config()).await.unwrap();
        let file = &files.get("file").unwrap()[0];
        assert_eq!(file.filename, "passwd");
    }

    #[tokio::test]
    async fn test_parse_multipart_filename_strips_backslash() {
        let boundary = "test-boundary-123";
        let body = Bytes::from(
            format!(
                "--{b}\r\n\
                 Content-Disposition: form-data; name=\"file\"; filename=\"C:\\\\Users\\\\test.txt\"\r\n\
                 Content-Type: text/plain\r\n\
                 \r\n\
                 data\r\n\
                 --{b}--\r\n",
                b = boundary
            )
            .as_bytes()
            .to_vec(),
        );

        let (_, files) = parse_multipart(boundary, body, &default_config()).await.unwrap();
        let file = &files.get("file").unwrap()[0];
        assert_eq!(file.filename, "test.txt");
    }

    #[tokio::test]
    async fn test_parse_multipart_default_content_type() {
        let boundary = "test-boundary-123";
        let body = Bytes::from(
            format!(
                "--{b}\r\n\
                 Content-Disposition: form-data; name=\"file\"; filename=\"data.bin\"\r\n\
                 \r\n\
                 binary-data\r\n\
                 --{b}--\r\n",
                b = boundary
            )
            .as_bytes()
            .to_vec(),
        );

        let (_, files) = parse_multipart(boundary, body, &default_config()).await.unwrap();
        let file = &files.get("file").unwrap()[0];
        assert_eq!(file.content_type, "application/octet-stream");
    }

    #[tokio::test]
    async fn test_parse_multipart_empty_body() {
        let boundary = "test-boundary-123";
        let body = Bytes::from(format!("--{b}--\r\n", b = boundary).as_bytes().to_vec());

        let (fields, files) = parse_multipart(boundary, body, &default_config()).await.unwrap();
        assert!(fields.is_empty());
        assert!(files.is_empty());
    }

    #[tokio::test]
    async fn test_parse_multipart_invalid_boundary() {
        let body = Bytes::from(b"some random data that is not multipart".to_vec());
        let result = parse_multipart("wrong-boundary", body, &default_config()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_parse_multipart_duplicate_text_fields() {
        let boundary = "test-boundary-123";
        let body = Bytes::from(
            format!(
                "--{b}\r\n\
                 Content-Disposition: form-data; name=\"tag\"\r\n\
                 \r\n\
                 rust\r\n\
                 --{b}\r\n\
                 Content-Disposition: form-data; name=\"tag\"\r\n\
                 \r\n\
                 web\r\n\
                 --{b}--\r\n",
                b = boundary
            )
            .as_bytes()
            .to_vec(),
        );

        let (fields, _) = parse_multipart(boundary, body, &default_config()).await.unwrap();
        let tags = fields.get("tag").unwrap();
        assert_eq!(tags, &vec!["rust".to_string(), "web".to_string()]);
    }

    #[tokio::test]
    async fn test_parse_multipart_binary_file() {
        let binary_data: Vec<u8> = (0..=255).collect();
        let (boundary, body) = build_multipart_body(
            &[],
            &[("data", "bytes.bin", "application/octet-stream", &binary_data)],
        );

        let (_, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();
        let file = &files.get("data").unwrap()[0];
        assert_eq!(file.size, 256);
        assert!(file.data.is_memory());
        assert_eq!(file.bytes().unwrap().as_ref(), binary_data.as_slice());
    }

    #[tokio::test]
    async fn test_parse_multipart_empty_file() {
        let (boundary, body) =
            build_multipart_body(&[], &[("empty", "empty.txt", "text/plain", b"")]);

        let (_, files) = parse_multipart(&boundary, body, &default_config()).await.unwrap();
        let file = &files.get("empty").unwrap()[0];
        assert_eq!(file.size, 0);
        assert!(file.bytes().unwrap().is_empty());
    }

    // ===== Size limit tests =====

    #[tokio::test]
    async fn test_parse_multipart_file_exceeds_max_size() {
        let config = UploadConfig {
            memory_threshold: 1024,
            max_file_size: 50,
            max_total_size: 1024 * 1024,
            temp_dir: None,
        };

        let big_data: Vec<u8> = vec![b'x'; 100];
        let (boundary, body) =
            build_multipart_body(&[], &[("file", "big.txt", "text/plain", &big_data)]);

        let result = parse_multipart(&boundary, body, &config).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            UploadError::SizeLimitExceeded { field, limit, actual } => {
                assert_eq!(field, "file");
                assert_eq!(limit, 50);
                assert!(actual > 50);
            }
            _ => panic!("Expected SizeLimitExceeded error"),
        }
    }

    #[tokio::test]
    async fn test_parse_multipart_total_size_exceeded() {
        let config = UploadConfig {
            memory_threshold: 1024,
            max_file_size: 1024 * 1024,
            max_total_size: 30,
            temp_dir: None,
        };

        let data1: Vec<u8> = vec![b'a'; 20];
        let data2: Vec<u8> = vec![b'b'; 20];
        let (boundary, body) = build_multipart_body(
            &[],
            &[("file1", "a.txt", "text/plain", &data1), ("file2", "b.txt", "text/plain", &data2)],
        );

        let result = parse_multipart(&boundary, body, &config).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            UploadError::TotalSizeExceeded { limit, actual } => {
                assert_eq!(limit, 30);
                assert!(actual > 30);
            }
            _ => panic!("Expected TotalSizeExceeded error"),
        }
    }

    // ===== Temp file tests =====

    #[tokio::test]
    async fn test_parse_multipart_large_file_to_disk() {
        let config = small_file_config();

        let large_data: Vec<u8> = vec![42u8; 2048];
        let (boundary, body) = build_multipart_body(
            &[],
            &[("file", "large.bin", "application/octet-stream", &large_data)],
        );

        let (_, files) = parse_multipart(&boundary, body, &config).await.unwrap();
        let file = &files.get("file").unwrap()[0];

        assert_eq!(file.size, 2048);
        assert!(file.data.is_disk());
        assert!(file.path().is_some());
        assert!(file.bytes().is_none());

        let path = file.path().unwrap();
        assert!(path.exists());

        let content = tokio::fs::read(path).await.unwrap();
        assert_eq!(content, large_data);
    }

    #[tokio::test]
    async fn test_parse_multipart_mixed_memory_and_disk() {
        let config = UploadConfig {
            memory_threshold: 100,
            max_file_size: 10 * 1024,
            max_total_size: 50 * 1024,
            temp_dir: None,
        };

        let small_data = b"small";
        let large_data: Vec<u8> = vec![42u8; 200];

        let boundary = "test-boundary-123";
        let body = Bytes::from(
            format!(
                "--{b}\r\n\
                 Content-Disposition: form-data; name=\"small\"; filename=\"small.txt\"\r\n\
                 Content-Type: text/plain\r\n\
                 \r\n\
                 {s}\r\n\
                 --{b}\r\n\
                 Content-Disposition: form-data; name=\"large\"; filename=\"large.bin\"\r\n\
                 Content-Type: application/octet-stream\r\n\
                 \r\n\
                 {l}\r\n\
                 --{b}--\r\n",
                b = boundary,
                s = std::str::from_utf8(small_data).unwrap(),
                l = String::from_utf8(large_data.clone()).unwrap(),
            )
            .into_bytes(),
        );

        let (_, files) = parse_multipart(boundary, body, &config).await.unwrap();

        let small_file = &files.get("small").unwrap()[0];
        assert!(small_file.data.is_memory());
        assert_eq!(small_file.bytes().unwrap().as_ref(), small_data);

        let large_file = &files.get("large").unwrap()[0];
        assert!(large_file.data.is_disk());
    }

    #[tokio::test]
    async fn test_drop_removes_disk_files() {
        let config = small_file_config();

        let large_data: Vec<u8> = vec![42u8; 2048];
        let (boundary, body) = build_multipart_body(
            &[],
            &[("file", "temp.bin", "application/octet-stream", &large_data)],
        );

        let (_, files) = parse_multipart(&boundary, body, &config).await.unwrap();
        let file = &files.get("file").unwrap()[0];
        let path = file.path().unwrap().to_path_buf();

        assert!(path.exists());
        drop(files);
        assert!(!path.exists());
    }

    #[tokio::test]
    async fn test_drop_cleans_multiple_files() {
        let config = small_file_config();

        let (boundary1, body1) = build_multipart_body(
            &[],
            &[("file1", "a.bin", "application/octet-stream", &vec![42u8; 2048])],
        );
        let (_, files1) = parse_multipart(&boundary1, body1, &config).await.unwrap();
        let path1 = files1.get("file1").unwrap()[0].path().unwrap().to_path_buf();

        let (boundary2, body2) = build_multipart_body(
            &[],
            &[("file2", "b.bin", "application/octet-stream", &vec![42u8; 2048])],
        );
        let (_, files2) = parse_multipart(&boundary2, body2, &config).await.unwrap();
        let path2 = files2.get("file2").unwrap()[0].path().unwrap().to_path_buf();

        assert!(path1.exists());
        assert!(path2.exists());

        drop((files1, files2));

        assert!(!path1.exists());
        assert!(!path2.exists());
    }

    // ===== UploadError tests =====

    #[test]
    fn test_upload_error_display_size_limit() {
        let err = UploadError::SizeLimitExceeded {
            field: "avatar".to_string(),
            limit: 1024,
            actual: 2048,
        };
        let msg = err.to_string();
        assert!(msg.contains("avatar"));
        assert!(msg.contains("1024"));
        assert!(msg.contains("2048"));
    }

    #[test]
    fn test_upload_error_display_total_limit() {
        let err = UploadError::TotalSizeExceeded { limit: 5000, actual: 8000 };
        let msg = err.to_string();
        assert!(msg.contains("5000"));
        assert!(msg.contains("8000"));
    }

    #[test]
    fn test_upload_error_is_std_error() {
        let err =
            UploadError::IoError(std::io::Error::new(std::io::ErrorKind::Other, "test error"));
        let _: &dyn std::error::Error = &err;
    }
}
