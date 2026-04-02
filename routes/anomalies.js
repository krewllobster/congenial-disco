import express from "express";
import { layout } from "../lib/layout.js";
import { anomaliesView } from "../views/anomalies.js";
import {
  getRateAnomalies,
  getExcessiveDailyHours,
  getExcessiveWeeklyHours,
  getNameMismatches,
  getSevenDayWeeks,
} from "../db/queries/anomalies.js";

const router = express.Router();

router.get("/", (req, res) => {
  const rateAnomalies = getRateAnomalies();
  const dailyHours = getExcessiveDailyHours();
  const weeklyHours = getExcessiveWeeklyHours();
  const nameMismatches = getNameMismatches();
  const sevenDayWeeks = getSevenDayWeeks();

  const content = anomaliesView({ rateAnomalies, dailyHours, weeklyHours, nameMismatches, sevenDayWeeks });
  res.type("html").send(layout("Anomaly Detection", content));
});

export default router;
