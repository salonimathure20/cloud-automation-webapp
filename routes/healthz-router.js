const { Router } = require("express");
const {
  healthzController,
  healthzAllController,
} = require("../controllers/healthz-controller");

const router = Router();

router.get("/", healthzController);

router.all("/", healthzAllController);

module.exports = { router };
