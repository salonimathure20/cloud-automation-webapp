require("dotenv").config();
const express = require("express");
const { connectDB } = require("./dbConn");
const { HealthCheck, initDB } = require("./models");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).send();
  }
  next();
});

app.get("/healthz", async (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      res.status(400).send();
    }
    await HealthCheck.create({
      datetime: new Date().toISOString(),
    });

    res.status(200).send();
  } catch (error) {
    console.error("Health check insert failed:", error);

    res.status(503).send();
  }
});

app.all("/healthz", (req, res) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("X-Content-Type-Options", "nosniff");
  res.status(405).send();
});

const startServer = async () => {
  await connectDB();
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = app;
