<div align="center">
  <img src="https://github.com/nglmercer/.github/blob/882f94e7c1bb1c463ad475539aa4d53a2eeef1d5/assets/kito-banner.svg" width="220px" />
  
  <br />
  <br />
  
  <p>
    <strong>High-performance</strong>, fully <strong>type-safe</strong>, and modern web framework for <strong>TypeScript</strong>.  
    Powered by <strong>Rust</strong> for extreme speed and low memory usage.
  </p>
</div>

---

- **Extreme performance** – Rust core optimized for extreme speed & efficiency. **See the [benchmarks](https://github.com/nglmercer/kito/tree/main/bench).**
- **Type-safe** – full TypeScript support with end-to-end safety and exceptional DX.
- **Schema validation** – built-in validation with zero bloat.  
- **Middleware system** – composable and flexible like you expect.
- **Cross-platform** – runs on Node.js, Bun, and Deno.  

---

## 🚀 Quick Start

You can add **Kito** to an existing project:

```bash
pnpm add kitojs

# Or: npm/yarn/bun add kitojs
# Or: deno add npm:kitojs
```

Or create a new project instantly with the [official starter](https://github.com/nglmercer/create-kitojs):

```bash
pnpm create kitojs

# Or: npm/yarn/bun create kitojs
# Or: deno init --npm kitojs
```

### Minimal Example

```ts
import { server } from "kitojs";
const app = server();

app.get("/", ({ res }) => {
  res.send("hello world!");
});

app.listen(3000);
```

<details>
  <summary><strong>Fluent style</strong></summary>

  Kito also supports fluent style. You can chain all methods. **See the examples [here](https://github.com/nglmercer/kito/tree/main/examples/fluent).**

  ```ts
  import { server } from "kitojs";

  server()
    .get("/", ({ res }) => res.send("hello world!"))
    .listen(3000);
  ```
</details>

---

## 📚 Documentation

Full docs available at the [**official website**](https://nglmercer.github.io/kito).
You can also explore ready-to-run [examples](https://github.com/nglmercer/kito/tree/main/examples).

---

## 🤝 Contributing

We welcome contributions! Check the [**contributing guide**](https://github.com/nglmercer/kito/blob/main/contributing.md) to learn how to set up your environment and submit pull requests.

---

## 📄 License

Licensed under the [MIT License](https://github.com/nglmercer/kito/blob/main/license).

---
