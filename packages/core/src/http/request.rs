use http_body_util::BodyExt;
use hyper::{
    Request,
    body::{Bytes, Incoming},
};

use napi::bindgen_prelude::{Buffer, External};

use crate::http::multipart::{
    FileData, UploadConfig, UploadedFile, extract_boundary, parse_multipart,
};
use std::{collections::HashMap, net::SocketAddr, sync::Arc};

#[derive(Clone)]
pub struct RequestCore {
    pub method: String,
    pub url: String,
    pub pathname: String,
    pub search: Option<String>,
    pub protocol: String,
    pub hostname: String,
    pub original_url: String,
    pub secure: bool,
    pub xhr: bool,
    pub ip: String,
    pub ips: Vec<String>,

    pub body: Bytes,
    pub headers_raw: HashMap<String, String>,
    pub params: HashMap<String, String>,
    pub query_raw: HashMap<String, Vec<String>>,
    pub cookies_raw: HashMap<String, String>,
    pub files: HashMap<String, Vec<UploadedFile>>,
}

impl RequestCore {
    pub async fn new(
        req: Request<Incoming>,
        remote_addr: Option<SocketAddr>,
        trust_proxy: bool,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        Self::new_with_config(req, remote_addr, trust_proxy, &UploadConfig::default(), None).await
    }

    pub async fn new_with_config(
        req: Request<Incoming>,
        remote_addr: Option<SocketAddr>,
        trust_proxy: bool,
        upload_config: &UploadConfig,
        max_request_size: Option<usize>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let method = req.method().as_str().to_string();
        let uri = req.uri();
        let url = uri.to_string();
        let pathname = uri.path().to_string();
        let search = uri.query().map(|q| format!("?{q}"));
        let original_url = url.clone();

        let mut headers_raw = HashMap::with_capacity(req.headers().len());
        for (name, value) in req.headers() {
            if let Ok(v) = value.to_str() {
                headers_raw.insert(name.as_str().to_string(), v.to_string());
            }
        }

        let mut query_raw: HashMap<String, Vec<String>> = HashMap::new();
        if let Some(q) = uri.query() {
            for pair in q.split('&') {
                if let Some((key, value)) = pair.split_once('=') {
                    let decoded_key = urlencoding::decode(key).unwrap_or_default().into_owned();
                    let decoded_value = urlencoding::decode(value).unwrap_or_default().into_owned();
                    query_raw.entry(decoded_key).or_default().push(decoded_value);
                }
            }
        }

        let scheme = req.uri().scheme_str().unwrap_or("http").to_string();

        let body = req.into_body().collect().await?.to_bytes();

        if let Some(max_size) = max_request_size {
            if body.len() > max_size {
                return Err(format!("Request body exceeds maximum size of {max_size} bytes").into());
            }
        }

        let protocol = if trust_proxy {
            headers_raw
                .get("x-forwarded-proto")
                .map(|s| s.to_string())
                .unwrap_or_else(|| "http".to_string())
        } else {
            scheme
        };

        let secure = protocol.eq_ignore_ascii_case("https");
        let hostname = headers_raw.get("host").cloned().unwrap_or_else(|| "localhost".to_string());

        let cookies_raw = headers_raw.get("cookie").map_or(HashMap::new(), |cookie_str| {
            cookie_str
                .split(';')
                .filter_map(|c| {
                    let parts: Vec<&str> = c.trim().splitn(2, '=').collect();
                    if parts.len() == 2 {
                        Some((parts[0].to_string(), parts[1].to_string()))
                    } else {
                        None
                    }
                })
                .collect()
        });

        let ips: Vec<String> = if trust_proxy {
            headers_raw
                .get("x-forwarded-for")
                .map(|s| s.split(',').map(|ip| ip.trim().to_string()).collect())
                .unwrap_or_default()
        } else {
            vec![]
        };

        let ip = ips
            .first()
            .cloned()
            .or_else(|| remote_addr.map(|a| a.ip().to_string()))
            .unwrap_or_default();

        let xhr =
            headers_raw.get("x-requested-with").map(|v| v == "XMLHttpRequest").unwrap_or(false);

        let mut files = HashMap::new();
        if let Some(content_type) = headers_raw.get("content-type")
            && let Some(boundary) = extract_boundary(content_type)
        {
            match parse_multipart(&boundary, body.clone(), upload_config).await {
                Ok((fields, parsed_files)) => {
                    for (key, values) in fields {
                        query_raw.entry(key).or_default().extend(values);
                    }
                    files = parsed_files;
                }
                Err(e) => {
                    eprintln!("Error parsing multipart body: {}", e);
                }
            }
        }

        Ok(Self {
            method,
            url,
            pathname,
            search,
            protocol,
            hostname,
            original_url,
            secure,
            xhr,
            ip,
            ips,
            body,
            headers_raw,
            params: HashMap::new(),
            query_raw,
            cookies_raw,
            files,
        })
    }
}

#[napi]
pub fn get_body_buffer(core: &External<Arc<RequestCore>>) -> Buffer {
    Buffer::from(core.body.as_ref())
}

#[napi]
pub fn get_header(core: &External<Arc<RequestCore>>, name: String) -> Option<String> {
    core.headers_raw.get(&name.to_lowercase()).cloned()
}

#[napi]
pub fn get_all_headers(core: &External<Arc<RequestCore>>) -> HashMap<String, String> {
    core.headers_raw.clone()
}

#[napi]
pub fn get_query_param(core: &External<Arc<RequestCore>>, name: String) -> Option<Vec<String>> {
    core.query_raw.get(&name).cloned()
}

#[napi]
pub fn get_all_query(core: &External<Arc<RequestCore>>) -> HashMap<String, Vec<String>> {
    core.query_raw.clone()
}

#[napi]
pub fn get_param(core: &External<Arc<RequestCore>>, name: String) -> Option<String> {
    core.params.get(&name).cloned()
}

#[napi]
pub fn get_all_params(core: &External<Arc<RequestCore>>) -> HashMap<String, String> {
    core.params.clone()
}

#[napi]
pub fn get_cookie(core: &External<Arc<RequestCore>>, name: String) -> Option<String> {
    core.cookies_raw.get(&name).cloned()
}

#[napi]
pub fn get_all_cookies(core: &External<Arc<RequestCore>>) -> HashMap<String, String> {
    core.cookies_raw.clone()
}

#[napi]
pub fn get_method(core: &External<Arc<RequestCore>>) -> String {
    core.method.clone()
}

#[napi]
pub fn get_url(core: &External<Arc<RequestCore>>) -> String {
    core.url.clone()
}

#[napi]
pub fn get_pathname(core: &External<Arc<RequestCore>>) -> String {
    core.pathname.clone()
}

#[napi]
pub fn get_search(core: &External<Arc<RequestCore>>) -> Option<String> {
    core.search.clone()
}

#[napi]
pub fn get_protocol(core: &External<Arc<RequestCore>>) -> String {
    core.protocol.clone()
}

#[napi]
pub fn get_hostname(core: &External<Arc<RequestCore>>) -> String {
    core.hostname.clone()
}

#[napi]
pub fn get_ip(core: &External<Arc<RequestCore>>) -> String {
    core.ip.clone()
}

#[napi]
pub fn get_ips(core: &External<Arc<RequestCore>>) -> Vec<String> {
    core.ips.clone()
}

#[napi]
pub fn get_secure(core: &External<Arc<RequestCore>>) -> bool {
    core.secure
}

#[napi]
pub fn get_xhr(core: &External<Arc<RequestCore>>) -> bool {
    core.xhr
}

#[napi(object)]
pub struct UploadedFileNapi {
    pub filename: String,
    pub content_type: String,
    pub size: u32,
    pub data: Buffer,
    pub file_path: String,
    pub is_disk: bool,
}

#[napi]
pub fn get_all_files(core: &External<Arc<RequestCore>>) -> HashMap<String, Vec<UploadedFileNapi>> {
    let mut files = HashMap::new();
    for (key, file_list) in &core.files {
        let napi_files: Vec<UploadedFileNapi> = file_list
            .iter()
            .map(|f| {
                let (data, file_path, is_disk) = match &f.data {
                    FileData::Memory(b) => (Buffer::from(b.as_ref()), String::new(), false),
                    FileData::Disk(p) => {
                        (Buffer::from(&[] as &[u8]), p.to_string_lossy().to_string(), true)
                    }
                };
                UploadedFileNapi {
                    filename: f.filename.clone(),
                    content_type: f.content_type.clone(),
                    size: f.size as u32,
                    data,
                    file_path,
                    is_disk,
                }
            })
            .collect();
        files.insert(key.clone(), napi_files);
    }
    files
}

#[napi]
pub fn get_file(core: &External<Arc<RequestCore>>, name: String) -> Option<Vec<UploadedFileNapi>> {
    core.files.get(&name).map(|file_list| {
        file_list
            .iter()
            .map(|f| {
                let (data, file_path, is_disk) = match &f.data {
                    FileData::Memory(b) => (Buffer::from(b.as_ref()), String::new(), false),
                    FileData::Disk(p) => {
                        (Buffer::from(&[] as &[u8]), p.to_string_lossy().to_string(), true)
                    }
                };
                UploadedFileNapi {
                    filename: f.filename.clone(),
                    content_type: f.content_type.clone(),
                    size: f.size as u32,
                    data,
                    file_path,
                    is_disk,
                }
            })
            .collect()
    })
}

#[napi]
pub fn get_file_path(core: &External<Arc<RequestCore>>, name: String) -> Option<String> {
    core.files.get(&name).and_then(|file_list| {
        file_list.first().and_then(|f| match &f.data {
            FileData::Disk(p) => Some(p.to_string_lossy().to_string()),
            FileData::Memory(_) => None,
        })
    })
}

#[napi]
pub fn get_file_paths(core: &External<Arc<RequestCore>>) -> HashMap<String, Vec<String>> {
    let mut paths = HashMap::new();
    for (key, file_list) in &core.files {
        let file_paths: Vec<String> = file_list
            .iter()
            .filter_map(|f| match &f.data {
                FileData::Disk(p) => Some(p.to_string_lossy().to_string()),
                FileData::Memory(_) => None,
            })
            .collect();
        if !file_paths.is_empty() {
            paths.insert(key.clone(), file_paths);
        }
    }
    paths
}

#[napi]
pub fn is_file_on_disk(core: &External<Arc<RequestCore>>, name: String) -> bool {
    core.files
        .get(&name)
        .and_then(|file_list| file_list.first())
        .map(|f| f.data.is_disk())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::multipart::{UploadConfigNapi, DEFAULT_MAX_FILE_SIZE, DEFAULT_MEMORY_THRESHOLD, DEFAULT_MAX_TOTAL_SIZE};

    #[test]
    fn test_upload_config_napi_to_upload_config_defaults() {
        let napi = UploadConfigNapi {
            memory_threshold: None,
            max_file_size: None,
            max_total_size: None,
            temp_dir: None,
        };
        let config: UploadConfig = napi.into();
        assert_eq!(config.memory_threshold, DEFAULT_MEMORY_THRESHOLD);
        assert_eq!(config.max_file_size, DEFAULT_MAX_FILE_SIZE);
        assert_eq!(config.max_total_size, DEFAULT_MAX_TOTAL_SIZE);
        assert_eq!(config.temp_dir, None);
    }

    #[test]
    fn test_upload_config_napi_to_upload_config_custom() {
        let napi = UploadConfigNapi {
            memory_threshold: Some(2048),
            max_file_size: Some(5 * 1024 * 1024),
            max_total_size: Some(50 * 1024 * 1024),
            temp_dir: Some("/tmp/kito".to_string()),
        };
        let config: UploadConfig = napi.into();
        assert_eq!(config.memory_threshold, 2048);
        assert_eq!(config.max_file_size, 5 * 1024 * 1024);
        assert_eq!(config.max_total_size, 50 * 1024 * 1024);
        assert_eq!(config.temp_dir, Some("/tmp/kito".to_string()));
    }

    #[test]
    fn test_upload_config_napi_to_upload_config_partial() {
        let napi = UploadConfigNapi {
            memory_threshold: Some(4096),
            max_file_size: None,
            max_total_size: None,
            temp_dir: None,
        };
        let config: UploadConfig = napi.into();
        assert_eq!(config.memory_threshold, 4096);
        assert_eq!(config.max_file_size, DEFAULT_MAX_FILE_SIZE);
        assert_eq!(config.max_total_size, DEFAULT_MAX_TOTAL_SIZE);
    }
}
