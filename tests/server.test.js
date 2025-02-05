require("dotenv").config();
const request = require("supertest");
const { HealthCheck } = require("../models");

jest.mock("../dbConn", () => ({
  connectDB: jest.fn().mockResolvedValue(),
}));

jest.mock("../models", () => ({
  HealthCheck: {
    create: jest.fn(),
  },
  initDB: jest.fn().mockResolvedValue(),
}));

const app = require("../server");

describe("/healthz endpoint", () => {
  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 OK when health check succeeds", async () => {
    HealthCheck.create.mockResolvedValueOnce({});

    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
    expect(res.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(res.headers["pragma"]).toBe("no-cache");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should return 400 Bad Request when we pass a payload", async () => {
    HealthCheck.create.mockResolvedValueOnce({});

    const res = await request(app).get("/healthz").send({ id: 1 });

    expect(res.status).toBe(400);
  });
  it("should return 400 Bad Request when an unexpected query param is provided", async () => {
    HealthCheck.create.mockResolvedValueOnce({});

    const res = await request(app).get("/healthz?unexpectedParam=true");

    expect(res.status).toBe(400);
  });

  it("should return 503 when database insert fails", async () => {
    HealthCheck.create.mockImplementationOnce(() =>
      Promise.reject(new Error("DB error"))
    );

    const res = await request(app).get("/healthz");

    console.log("Response status:", res.status); // Debugging
    console.log("Response text:", res.text); // Debugging

    expect(res.status).toBe(503);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).post("/healthz");
    expect(res.status).toBe(405);
    expect(res.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(res.headers["pragma"]).toBe("no-cache");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).put("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).patch("/healthz");
    expect(res.status).toBe(405);
  });

  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).delete("/healthz");
    expect(res.status).toBe(405);
  });
});
