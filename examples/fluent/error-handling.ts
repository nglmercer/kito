import { server } from "kitojs";
import type { KitoContext, NextFunction } from "kitojs";

const app = server();

// Global error handling middleware
app.use((err: Error, ctx: KitoContext, next: NextFunction) => {
  console.error("Global error handler:", err);
  ctx.res.status(500).json({ 
    error: "Internal Server Error", 
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Route-specific error handler
app.use("/api/", (err: Error, ctx: KitoContext, next: NextFunction) => {
  console.error("API error handler:", err);
  ctx.res.status(500).json({ 
    error: "API Error", 
    message: "Something went wrong with the API request"
  });
});

// Route that throws an error
app.get("/api/error", ({ res }: KitoContext) => {
  throw new Error("Something went wrong!");
});

// Route that throws an error in middleware
app.use("/api/middleware-error", (ctx: KitoContext, next: NextFunction) => {
  throw new Error("Middleware error!");
}, (ctx: KitoContext) => {
  // This won't be reached due to the error above
  ctx.res.send("Should not see this");
});

// Route that works normally
app.get("/api/ok", ({ res }: KitoContext) => {
  res.json({ message: "This works fine!" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("Try:");
  console.log("  GET http://localhost:3000/api/ok");
  console.log("  GET http://localhost:3000/api/error");
  console.log("  GET http://localhost:3000/api/middleware-error");
});