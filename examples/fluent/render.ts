import { server } from "kitojs";
import type { KitoContext } from "kitojs";

// Register a simple template engine for .html files
import { registerTemplateEngine } from "kitojs";

registerTemplateEngine("html", (view: string, data: Record<string, unknown>) => {
  // Simple template replacement for demonstration
  let template = `<!DOCTYPE html>
<html>
<head>
  <title>${(data.title as string | undefined) || "Default Title"}</title>
</head>
<body>
  <h1>${(data.heading as string | undefined) || "Welcome"}</h1>
  <p>${(data.content as string | undefined) || "Hello World!"}</p>
  {{#if user}}
  <p>Welcome, {{user.name}}!</p>
  {{/if}}
</body>
</html>`;

  // Simple variable replacement (this is just for demo - real engines are more complex)
  Object.keys(data).forEach(key => {
    template = template.replaceAll(`{{${key}}}`, String(data[key]));
  });

  // Handle simple conditionals (very basic implementation)
  if (data.user) {
    template = template.replace("{{#if user}}", "").replace("{{/if}}", "");
  } else {
    template = template.replace("{{#if user}}", "").replace("{{/if}}", "");
  }

  return template;
});

const app = server();

app.get("/", ({ res }: KitoContext) => {
  res.render("index", {
    title: "KitoJS Template Example",
    heading: "Welcome to KitoJS!",
    content: "This page was rendered using a template engine.",
    user: { name: "Developer" }
  });
});

app.get("/about", ({ res }: KitoContext) => {
  res.render("about", {
    title: "About KitoJS",
    heading: "About This Framework",
    content: "KitoJS is a high-performance web framework powered by Rust."
  });
});

app.listen(3000);