import { server } from "../../../packages/kitojs/src/server";

const app = server();

// Form data parsing (application/x-www-form-urlencoded)
app.post("/api/login", ({ req, res }) => {
  // Form data is automatically parsed for application/x-www-form-urlencoded
  const { username, password } = req.body as { username?: string; password?: string };
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  
  // In a real app, you would validate credentials here
  res.json({ 
    message: "Login successful",
    username,
    // Never send back passwords!
    token: "fake-jwt-token"
  });
});

// Handling form data with file uploads (multipart/form-data)
// Note: For multipart, you'd typically use a file upload handler
app.post("/api/profile", ({ req, res }) => {
  // For multipart forms, the body would contain file information
  // This example shows how you might handle mixed form data
  const { bio, avatar } = req.body as { bio?: string; avatar?: any };
  
  res.json({ 
    message: "Profile updated",
    bio: bio || "",
    avatarReceived: !!avatar
  });
});

// Example with validation
app.post("/api/register", ({ req, res }) => {
  const { email, password, confirmPassword } = req.body as {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  
  // Basic validation
  if (!email?.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }
  
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }
  
  res.status(201).json({ 
    message: "User registered successfully",
    email
  });
});

app.listen(3000);