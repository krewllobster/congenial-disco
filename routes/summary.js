import express from "express";
import { layout } from "../lib/layout.js";
import { summaryView } from "../views/summary.js";
import {
  getOverviewStats,
  getAverageRates,
  getCumulativeSpend,
  getApprenticeHoursPercent,
  getWeeklySpend,
} from "../db/queries/summary.js";

const router = express.Router();

router.get("/", (req, res) => {
  const overview = getOverviewStats();
  const rates = getAverageRates();
  const spend = getCumulativeSpend();
  const apprentice = getApprenticeHoursPercent();
  const weekly = getWeeklySpend();

  const content = summaryView({ overview, rates, spend, apprentice, weekly });
  res.type("html").send(layout("Summary", content));
});

export default router;
