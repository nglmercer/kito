use hyper::body::Bytes;
use multer::Multipart;
use std::collections::HashMap;
use futures_util::stream::once;
use std::convert::Infallible;

#[derive(Clone, Debug)]
pub struct UploadedFile {
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub data: Bytes,
}

pub async fn parse_multipart(
    boundary: &str,
    data: Bytes,
) -> Result<(HashMap<String, Vec<String>>, HashMap<String, Vec<UploadedFile>>), multer::Error> {
    let stream = once(async move { Result::<Bytes, Infallible>::Ok(data) });
    let mut multipart = Multipart::new(stream, boundary);

    let mut fields: HashMap<String, Vec<String>> = HashMap::new();
    let mut files: HashMap<String, Vec<UploadedFile>> = HashMap::new();

    while let Some(field) = multipart.next_field().await? {
        let name = field.name().unwrap_or_default().to_string();
        let filename = field.file_name().map(|s| {
            // Sanitize filename: remove path components
            let s = s.split(['/', '\\']).last().unwrap_or(s);
            s.to_string()
        });
        let content_type = field.content_type().map(|m| m.to_string()).unwrap_or_else(|| "application/octet-stream".to_string());

        if let Some(filename) = filename {
            let data = field.bytes().await?;
            let size = data.len();
            files.entry(name).or_default().push(UploadedFile {
                filename,
                content_type,
                size,
                data,
            });
        } else {
            let value = field.text().await?;
            fields.entry(name).or_default().push(value);
        }
    }

    Ok((fields, files))
}
