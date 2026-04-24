use futures_util::StreamExt;
use hyper::body::Bytes;
use multer::Multipart;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;

const DEFAULT_MEMORY_THRESHOLD: usize = 10 * 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE: usize = 100 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_SIZE: usize = 500 * 1024 * 1024;

#[derive(Clone, Debug)]
pub struct UploadConfig {
    pub memory_threshold: usize,
    pub max_file_size: usize,
    pub max_total_size: usize,
    pub temp_dir: Option<String>,
}

impl Default for UploadConfig {
    fn default() -> Self {
        Self {
            memory_threshold: DEFAULT_MEMORY_THRESHOLD,
            max_file_size: DEFAULT_MAX_FILE_SIZE,
            max_total_size: DEFAULT_MAX_TOTAL_SIZE,
            temp_dir: None,
        }
    }
}

#[derive(Clone, Debug)]
pub enum FileData {
    Memory(Bytes),
    Disk(PathBuf),
}

impl FileData {
    pub fn as_bytes(&self) -> Option<&Bytes> {
        match self {
            FileData::Memory(b) => Some(b),
            FileData::Disk(_) => None,
        }
    }

    pub fn path(&self) -> Option<&Path> {
        match self {
            FileData::Memory(_) => None,
            FileData::Disk(p) => Some(p),
        }
    }

    pub fn is_disk(&self) -> bool {
        matches!(self, FileData::Disk(_))
    }

    pub fn is_memory(&self) -> bool {
        matches!(self, FileData::Memory(_))
    }
}

#[derive(Clone, Debug)]
pub struct UploadedFile {
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub data: FileData,
}

impl UploadedFile {
    pub fn bytes(&self) -> Option<Bytes> {
        match &self.data {
            FileData::Memory(b) => Some(b.clone()),
            FileData::Disk(_) => None,
        }
    }

    pub fn path(&self) -> Option<&Path> {
        match &self.data {
            FileData::Memory(_) => None,
            FileData::Disk(p) => Some(p),
        }
    }
}

#[derive(Debug)]
pub enum UploadError {
    SizeLimitExceeded { field: String, limit: usize, actual: usize },
    TotalSizeExceeded { limit: usize, actual: usize },
    IoError(std::io::Error),
    MultipartError(multer::Error),
}

impl std::fmt::Display for UploadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UploadError::SizeLimitExceeded { field, limit, actual } => {
                write!(f, "File '{}' exceeds size limit: {} > {}", field, actual, limit)
            }
            UploadError::TotalSizeExceeded { limit, actual } => {
                write!(f, "Total upload size exceeds limit: {} > {}", actual, limit)
            }
            UploadError::IoError(e) => write!(f, "IO error: {}", e),
            UploadError::MultipartError(e) => write!(f, "Multipart error: {}", e),
        }
    }
}

impl std::error::Error for UploadError {}

impl From<multer::Error> for UploadError {
    fn from(e: multer::Error) -> Self {
        UploadError::MultipartError(e)
    }
}

impl From<std::io::Error> for UploadError {
    fn from(e: std::io::Error) -> Self {
        UploadError::IoError(e)
    }
}

pub fn extract_boundary(content_type: &str) -> Option<String> {
    if !content_type.to_lowercase().starts_with("multipart/form-data") {
        return None;
    }

    content_type.split(';').find_map(|s| {
        let s = s.trim();
        let (key, value) = s.split_once('=')?;
        if key.trim().to_lowercase() == "boundary" {
            Some(value.trim().trim_matches('"').to_string())
        } else {
            None
        }
    })
}

pub async fn parse_multipart(
    boundary: &str,
    data: Bytes,
    config: &UploadConfig,
) -> Result<(HashMap<String, Vec<String>>, HashMap<String, Vec<UploadedFile>>), UploadError> {
    let stream = futures_util::stream::once(async { Ok::<Bytes, std::io::Error>(data) });
    let mut multipart = Multipart::new(stream, boundary);

    let mut fields: HashMap<String, Vec<String>> = HashMap::new();
    let mut files: HashMap<String, Vec<UploadedFile>> = HashMap::new();
    let mut total_size: usize = 0;

    while let Some(field) = multipart.next_field().await? {
        let name = field.name().unwrap_or_default().to_string();
        let filename = field.file_name().map(|s| {
            let s = s.split(['/', '\\']).next_back().unwrap_or(s);
            s.to_string()
        });
        let content_type = field
            .content_type()
            .map(|m| m.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        if let Some(filename) = filename {
            let uploaded =
                process_file_field(&name, &filename, &content_type, field, config, &mut total_size)
                    .await?;
            files.entry(name).or_default().push(uploaded);
        } else {
            let value = field.text().await?;
            fields.entry(name).or_default().push(value);
        }
    }

    Ok((fields, files))
}

async fn process_file_field(
    field_name: &str,
    filename: &str,
    content_type: &str,
    mut field: multer::Field<'_>,
    config: &UploadConfig,
    total_size: &mut usize,
) -> Result<UploadedFile, UploadError> {
    let mut in_memory: Vec<u8> = Vec::new();
    let mut temp_file: Option<NamedTempFile> = None;
    let mut file_size: usize = 0;
    let mut writer: Option<tokio::io::BufWriter<tokio::fs::File>> = None;

    while let Some(chunk) = field.next().await {
        let chunk = chunk?;
        let chunk_len = chunk.len();

        if file_size + chunk_len > config.max_file_size {
            return Err(UploadError::SizeLimitExceeded {
                field: field_name.to_string(),
                limit: config.max_file_size,
                actual: file_size + chunk_len,
            });
        }

        if *total_size + chunk_len > config.max_total_size {
            return Err(UploadError::TotalSizeExceeded {
                limit: config.max_total_size,
                actual: *total_size + chunk_len,
            });
        }

        if temp_file.is_none() && file_size + chunk_len <= config.memory_threshold {
            in_memory.extend_from_slice(&chunk);
        } else {
            if temp_file.is_none() {
                let tf = create_temp_file(config.temp_dir.as_deref())?;
                let f = tf.reopen()?;
                let mut buf = tokio::io::BufWriter::new(tokio::fs::File::from_std(f));
                if !in_memory.is_empty() {
                    buf.write_all(&in_memory).await?;
                    in_memory.clear();
                }
                writer = Some(buf);
                temp_file = Some(tf);
            }

            if let Some(ref mut w) = writer {
                w.write_all(&chunk).await?;
            }
        }

        file_size += chunk_len;
        *total_size += chunk_len;
    }

    let data = if let Some(tf) = temp_file {
        if let Some(ref mut w) = writer {
            w.flush().await?;
        }
        let path = tf.into_temp_path();
        let path = path.keep().map_err(std::io::Error::from)?;
        FileData::Disk(path)
    } else {
        FileData::Memory(Bytes::from(in_memory))
    };

    Ok(UploadedFile {
        filename: filename.to_string(),
        content_type: content_type.to_string(),
        size: file_size,
        data,
    })
}

fn create_temp_file(temp_dir: Option<&str>) -> Result<NamedTempFile, std::io::Error> {
    let builder = tempfile::Builder::new();
    match temp_dir {
        Some(dir) => builder.tempfile_in(dir),
        None => builder.tempfile(),
    }
}

pub fn cleanup_file(file: &UploadedFile) {
    if let FileData::Disk(path) = &file.data {
        let _ = std::fs::remove_file(path);
    }
}

pub fn cleanup_files(files: &HashMap<String, Vec<UploadedFile>>) {
    for file_list in files.values() {
        for file in file_list {
            cleanup_file(file);
        }
    }
}
