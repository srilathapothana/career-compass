require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRouter = require("./src/routes/api");
const { verifyConnection, closeDriver } = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", apiRouter);

app.get("/api", (req, res) => {
  res.json({ name: "Career Compass API", status: "ok" });
});

app.listen(PORT, async () => {
  console.log(`Career Compass listening on http://localhost:${PORT}`);
  const status = await verifyConnection();
  if (status.ok) {
    console.log("✓ Connected to CognoDB");
  } else {
    console.warn("⚠ Could not connect to CognoDB:", status.error);
    console.warn("  The app will run, but data-backed routes will return 503 until this is fixed.");
  }
});

process.on("SIGINT", async () => {
  await closeDriver();
  process.exit(0);
});
