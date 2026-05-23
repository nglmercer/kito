import { server } from "kitojs";

const app = server();

// Register all HTTP methods on the same path with one handler
app.all("/api/test", ({ res }) => {
  res.json({ message: "This works for all HTTP methods!" });
});

// Or with separate handlers for different methods
app.all("/api/users")
  .get(({ res }) => res.json({ users: [] }))
  .post(({ res }) => res.status(201).json({ created: true }))
  .put(({ res }) => res.json({ updated: true }))
  .delete(({ res }) => res.status(204).end());

app.listen(3000);