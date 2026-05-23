import { cors } from "kitojs";

/**
 * CORS middleware with custom configuration
 * Allows requests from specific origins with specific methods
 */
export const corsMiddleware = cors({
  origin: ["https://example.com", "https://trusted.site"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Custom-Header"],
  credentials: true,
  maxAge: 86400, // 24 hours
});

/**
 * Simple CORS middleware (allows all origins)
 */
export const simpleCors = cors();
