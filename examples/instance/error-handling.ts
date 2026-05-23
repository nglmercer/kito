import { server } from "kitojs";

const app = server();

// Global error handling middleware
app.use((err, ctx, next) => {
  console.error("Global error handler:", err);
  const errmsg = err instanceof Error ? err.message : String(err);
  ctx.res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? errmsg : undefined,
  });
});

// Route-specific error handler
app.use("/api/", (err, ctx, next) => {
  console.error("API error handler:", err);
  ctx.res.status(500).json({
    error: "API Error",
    message: "Something went wrong with the API request",
  });
});

// Route that throws an error
app.get("/api/error", ({ res }) => {
  throw new Error("Something went wrong!");
});

// Route that throws an error in middleware
app.use("/api/middleware-error", (ctx, next) => {
  throw new Error("Middleware error!");
});

// Route that works normally
app.get("/api/ok", ({ res }) => {
  res.json({ message: "This works fine!" });
});

app.listen(3002, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Try:");
  console.log("  GET http://localhost:3000/api/ok");
  console.log("  GET http://localhost:3000/api/error");
  console.log("  GET http://localhost:3000/api/middleware-error");
});
