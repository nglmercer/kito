import { server } from "../../../packages/kitojs/src/server";

const app = server();

// File upload endpoint with configuration
app.post("/api/upload", ({ req, res }) => {
  // req.files contains uploaded files when using multipart/form-data
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  
  const uploadedFiles = req.files;
  const results = [];
  
  for (const [fieldName, files] of Object.entries(uploadedFiles)) {
    // files can be a single file or array of files
    const fileArray = Array.isArray(files) ? files : [files];
    
    for (const file of fileArray) {
      results.push({
        fieldName,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        // In a real app, you might move the file to a permanent location
        // file.path contains the temporary file path
      });
    }
  }
  
  res.json({ 
    message: "Files uploaded successfully",
    files: results
  });
});

// Example with file validation using schema
// Note: For file validation, you'd typically use schema validation on other fields
app.post("/api/avatar", ({ req, res }) => {
  if (!req.files || !req.files.avatar) {
    return res.status(400).json({ error: "Avatar file required" });
  }
  
  const avatar = req.files.avatar;
  
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(avatar.mimeType)) {
    return res.status(400).json({ 
      error: "Invalid file type. Only JPEG, PNG, and GIF are allowed." 
    });
  }
  
  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (avatar.size > maxSize) {
    return res.status(400).json({ 
      error: "File too large. Maximum size is 5MB." 
    });
  }
  
  // In a real app, you would:
  // 1. Move the file from temp location to permanent storage
  // 2. Save file metadata to database
  // 3. Return URL to access the file
  
  res.json({ 
    message: "Avatar uploaded successfully",
    avatar: {
      originalName: avatar.originalName,
      size: avatar.size,
      mimeType: avatar.mimeType,
      // url: `/avatars/${avatar.filename}` // hypothetical
    }
  });
});

app.listen(3000);