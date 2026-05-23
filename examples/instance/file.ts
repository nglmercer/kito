import { server } from "kitojs";

const app = server();

app.get("/download", ({ res }) => {
  res.sendFile("public/banner.png", {
    root: "./",
    maxAge: 3600,
    lastModified: true,
    cacheControl: true,
    immutable: false,
    etag: true,
  });
});

app.get("/export", ({ res }) => {
  res.download("public/banner.png", "kito-banner.png");
});

// Upload a small file — stays in memory (below memoryThreshold, default 10 MB)
app.post("/upload/memory", async ({ req, res }) => {
  const file = req.files?.avatar;
  if (!file || Array.isArray(file)) {
    return res.status(400).send("No file uploaded");
  }

  res.json({
    filename: file.filename,
    size: file.size,
    inMemory: !file.isDisk,
    dataLength: file.data.length,
  });
});

// Upload a large file — spills to disk when exceeding memoryThreshold
app.post("/upload/disk", async ({ req, res }) => {
  const file = req.files?.video;
  if (!file || Array.isArray(file)) {
    return res.status(400).send("No file uploaded");
  }

  res.json({
    filename: file.filename,
    size: file.size,
    onDisk: file.isDisk,
    tempPath: file.filePath,
  });
});

// Expose all registered route definitions for introspection
app.get("/info", ({ res }) => {
  res.json(app.getDefinitions());
});

app.listen(3000);
