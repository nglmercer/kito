import { server } from "/run/media/meme/35fda0f3-940b-47be-a245-2258a910d0b8/@home/meme/Descargas/kito/packages/kitojs/src/server";

const app = server();

// TRACE method for debugging
app.trace("/debug/trace", ({ req, res }) => {
  // Echo back the request headers for diagnostic purposes
  const headers = Object.fromEntries(req.headers.entries());
  res.json({
    method: req.method,
    url: req.url,
    headers,
    body: req.body
  });
});

// CONNECT method for handling tunneling (like HTTPS proxies)
app.connect("/tunnel", ({ req, res }) => {
  // In a real proxy, you would establish a tunnel here
  // For this example, we'll just acknowledge the connection attempt
  res.status(200).send("Connection established");
});

app.listen(3000);