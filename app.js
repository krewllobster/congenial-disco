import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import logger from "morgan";

import summaryRouter from "./routes/summary.js";
import employeesRouter from "./routes/employees.js";
import anomaliesRouter from "./routes/anomalies.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, "public")));

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use("/", summaryRouter);
app.use("/employees", employeesRouter);
app.use("/anomalies", anomaliesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = req.app.get("env") === "development" ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

export default app;
