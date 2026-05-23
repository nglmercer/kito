import { describe, expect, it } from "vitest";
import { schema, t } from "../src";

describe("Schema Helper", () => {
  it("should create schema definition with params", () => {
    const userSchema = schema({
      params: t.object({
        id: t.str().uuid(),
      }),
    });

    expect(userSchema).toHaveProperty("params");
    expect(userSchema.params).toBeDefined();
  });

  it("should create schema definition with query", () => {
    const listSchema = schema({
      query: t.object({
        page: t.num().min(1).default(1),
        limit: t.num().min(1).max(100).default(10),
      }),
    });

    expect(listSchema).toHaveProperty("query");
    expect(listSchema.query).toBeDefined();
  });

  it("should create schema definition with body", () => {
    const createUserSchema = schema({
      body: t.object({
        name: t.str().min(1),
        email: t.str().email(),
        age: t.num().min(0).optional(),
      }),
    });

    expect(createUserSchema).toHaveProperty("body");
    expect(createUserSchema.body).toBeDefined();
  });

  it("should create schema definition with headers", () => {
    const authSchema = schema({
      headers: t.object({
        authorization: t.str().min(1),
      }),
    });

    expect(authSchema).toHaveProperty("headers");
    expect(authSchema.headers).toBeDefined();
  });

  it("should create complete schema definition", () => {
    const completeSchema = schema({
      params: t.object({ id: t.str() }),
      query: t.object({ include: t.str().optional() }),
      body: t.object({ data: t.str() }),
      headers: t.object({ "content-type": t.str() }),
    });

    expect(completeSchema.params).toBeDefined();
    expect(completeSchema.query).toBeDefined();
    expect(completeSchema.body).toBeDefined();
    expect(completeSchema.headers).toBeDefined();
  });

  it("should pass through schema object unchanged", () => {
    const original = {
      params: t.object({ id: t.str() }),
      query: t.object({ page: t.num() }),
    };

    const result = schema(original);
    expect(result).toBe(original);
  });

  it("should create schema definition with response", () => {
    const userSchema = schema({
      params: t.object({ id: t.str() }),
      response: {
        200: t.object({
          id: t.str(),
          name: t.str(),
        }),
        404: t.object({
          message: t.str(),
        }),
      },
    });

    expect(userSchema).toHaveProperty("response");
    expect(userSchema.response).toBeDefined();
    expect(userSchema.response[200]).toBeDefined();
    expect(userSchema.response[404]).toBeDefined();
  });

  it("should serialize response schema via getDefinitions()", async () => {
    const { server } = await import("../src");

    const app = server();
    app.get("/res-schema", [{
      params: t.object({ id: t.str() }),
      response: {
        200: t.object({ name: t.str() }),
      },
    }], (ctx) => ctx.res.json({ name: "test" }));

    const defs = app.getDefinitions();
    const route = defs.find((r) => r.path === "/res-schema" && r.method === "GET");
    expect(route).toBeDefined();
    expect(route!.schema).toBeDefined();
    expect(route!.schema!.response).toBeDefined();
  });
});
