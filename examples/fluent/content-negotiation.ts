import { server } from "kitojs";

const app = server();

// Content negotiation examples
app.get("/api/data", ({ req, res }) => {
  // Check what media types the client accepts
  if (req.accepts("application/json")) {
    res.json({ message: "JSON preferred", format: "json" });
  } else if (req.accepts("text/html")) {
    res.send("<h1>HTML preferred</h1><p>Format: html</p>");
  } else if (req.accepts("text/plain")) {
    res.type("text/plain").send("Text preferred\nFormat: plain");
  } else {
    res.status(406).send("Not Acceptable");
  }
});

// More specific content negotiation
app.get("/api/lang", ({ req, res }) => {
  const lang = req.acceptsLanguages("en", "es", "fr");
  if (lang) {
    res.json({ 
      language: lang,
      message: lang === "en" ? "Hello" : 
               lang === "es" ? "Hola" : 
               lang === "fr" ? "Bonjour" : "Unknown"
    });
  } else {
    res.json({ message: "Hello", language: "en (default)" });
  }
});

// Character set negotiation
app.get("/api/charset", ({ req, res }) => {
  const charset = req.acceptsCharsets("utf-8", "iso-8859-1");
  if (charset) {
    res.type("text/plain; charset=" + charset);
    res.send(`Character set: ${charset}`);
  } else {
    res.type("text/plain").send("No acceptable charset");
  }
});

// Encoding negotiation
app.get("/api/encoding", ({ req, res }) => {
  const encoding = req.acceptsEncodings("gzip", "deflate", "identity");
  if (encoding) {
    // In a real app, you would actually encode the response
    res.header("content-encoding", encoding);
    res.json({ 
      encoding: encoding,
      message: `Response encoded with ${encoding}`
    });
  } else {
    res.json({ encoding: "none", message: "No content encoding" });
  }
});

// Content type checking
app.post("/api/check-type", ({ req, res }) => {
  if (req.is("application/json")) {
    res.json({ 
      type: "json", 
      message: "Received JSON data",
      data: req.body
    });
  } else if (req.is("text/*")) {
    res.send({ 
      type: "text", 
      message: "Received text data",
      data: req.body
    });
  } else {
    res.status(415).json({ error: "Unsupported media type" });
  }
});

// Freshness checking (for caching)
app.get("/api/fresh", ({ req, res }) => {
  // Set ETag and Last-Modified headers
  res.header("etag", "abc123");
  res.header("last-modified", new Date().toUTCString());
  
  // Check if request is fresh
  if (req.fresh) {
    res.sendStatus(304); // Not Modified
  } else {
    res.send({ 
      timestamp: Date.now(),
      message: "Fresh content",
      fresh: false
    });
  }
});

// Stale checking (opposite of fresh)
app.get("/api/stale", ({ req, res }) => {
  // Set ETag and Last-Modified headers in the past
  res.header("etag", "old-etag");
  res.header("last-modified", new Date(Date.now() - 10000).toUTCString());
  
  if (req.stale) {
    res.send({ 
      timestamp: Date.now(),
      message: "Stale content - needs update",
      stale: true
    });
  } else {
    res.sendStatus(304); // Not Modified
  }
});

// Subdomains (if applicable)
app.get("/api/subdomain", ({ req, res }) => {
  // Note: This requires host-based routing to work properly
  // For demo purposes, we'll show what subdomains would be
  res.json({ 
    subdomains: req.subdomains,
    hostname: req.hostname,
    note: "Subdomain parsing works when hosted under a domain"
  });
});

app.listen(3000);