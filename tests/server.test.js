require("dotenv").config();
const request = require("supertest");
const { HealthCheck } = require("../models");
const { sequelize } = require("../config/dbConn");

const app = require("../server");
const { connectDB } = require("../config/dbConn");

describe("/healthz endpoint", () => {
  beforeAll(async () => {
    try {
      await connectDB();
      await sequelize.sync({ force: true });
    } catch (error) {
      console.error("Unable to connect to the database:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await HealthCheck.destroy({ where: {}, truncate: true });
      await sequelize.close();
    } catch (error) {
      console.error("Unable to close the database:", error);
      throw error;
    }
  });

  it("should return 200 OK when health check succeeds", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(res.headers["pragma"]).toBe("no-cache");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should return 400 Bad Request when we pass a payload", async () => {
    const res = await request(app).get("/healthz").send({ id: 1 });

    expect(res.status).toBe(400);
  });
  it("should return 400 Bad Request when an unexpected query param is provided", async () => {
    const res = await request(app).get("/healthz?unexpectedParam=true");

    expect(res.status).toBe(400);
  });

  it.skip("should return 405 for disallowed methods", async () => {
    const res = await request(app).post("/healthz");
    expect(res.status).toBe(405);
    expect(res.headers["cache-control"]).toBe(
      "no-cache, no-store, must-revalidate"
    );
    expect(res.headers["pragma"]).toBe("no-cache");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.skip("should return 405 for disallowed methods", async () => {
    const res = await request(app).put("/healthz");
    expect(res.status).toBe(405);
  });

  it.skip("should return 405 for methods that are not allowed", async () => {
    const res = await request(app).patch("/healthz");
    expect(res.status).toBe(405);
  });

  it.skip("should return 405 for disallowed methods", async () => {
    const res = await request(app).delete("/healthz");
    expect(res.status).toBe(405);
  });
});
