require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/dbConn");
const { initDB } = require("./models");
const { initializeRoutes } = require("./routes/index");
const { logger } = require("./middlewares/logger");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).send();
  }
  next();
});

const startServer = async () => {
  await initializeRoutes(app);
  await connectDB();
  await initDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();

module.exports = app;
