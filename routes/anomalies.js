import express from "express";
import { layout } from "../lib/layout.js";
import { anomaliesView } from "../views/anomalies.js";
import { correctionsLogView } from "../views/correctionsLog.js";
import {
  getRateAnomalies,
  getExcessiveDailyHours,
  getExcessiveWeeklyHours,
  getNameMismatches,
  getSevenDayWeeks,
} from "../db/queries/anomalies.js";
import {
  correctTimesheetField,
  unifyEmployeeName,
  splitEmployeeName,
  revertCorrection,
  getCorrections,
  getTimesheetId,
  getDistinctNamesForEmployee,
} from "../db/queries/corrections.js";

const router = express.Router();

function redirectBack(req, res, flash) {
  const base = req.body.return_to || "/anomalies";
  const sep = base.includes("?") ? "&" : "?";
  res.redirect(`${base}${sep}flash=${encodeURIComponent(flash)}`);
}

function redirectError(req, res, err) {
  const base = req.body.return_to || "/anomalies";
  const sep = base.includes("?") ? "&" : "?";
  res.redirect(`${base}${sep}error=${encodeURIComponent(err.message)}`);
}

router.get("/", (req, res) => {
  const rateAnomalies = getRateAnomalies();
  const dailyHours = getExcessiveDailyHours();
  const weeklyHours = getExcessiveWeeklyHours();
  const nameMismatches = getNameMismatches();
  const sevenDayWeeks = getSevenDayWeeks();

  // Enrich name mismatches with distinct names for the form
  const enrichedNameMismatches = nameMismatches.map((r) => ({
    ...r,
    nameList: getDistinctNamesForEmployee(r.employee_id),
  }));

  const flash = req.query.flash || null;
  const error = req.query.error || null;

  const content = anomaliesView({
    rateAnomalies, dailyHours, weeklyHours,
    nameMismatches: enrichedNameMismatches, sevenDayWeeks,
    flash, error,
  });
  res.type("html").send(layout("Anomaly Detection", content));
});

// Correction log page
router.get("/corrections", (req, res) => {
  const corrections = getCorrections();
  const flash = req.query.flash || null;
  const error = req.query.error || null;
  const content = correctionsLogView({ corrections, flash, error });
  res.type("html").send(layout("Correction Log", content));
});

// Correct a rate on a specific timesheet
router.post("/correct-rate", (req, res) => {
  try {
    const { employee_id, week_ending, field, new_value, reason } = req.body;
    const timesheetId = getTimesheetId(Number(employee_id), week_ending);
    if (!timesheetId) throw new Error(`Timesheet not found for employee ${employee_id}, week ${week_ending}.`);
    correctTimesheetField({
      timesheetId,
      field,
      newValue: Number(new_value),
      reason,
      correctionType: "rate",
    });
    redirectBack(req, res, "Rate corrected successfully.");
  } catch (err) {
    redirectError(req, res, err);
  }
});

// Correct standard and/or overtime hours on a specific timesheet day
router.post("/correct-daily-hours", (req, res) => {
  try {
    const { employee_id, week_ending, st_field, ot_field, new_st_value, new_ot_value, reason } = req.body;
    const timesheetId = getTimesheetId(Number(employee_id), week_ending);
    if (!timesheetId) throw new Error(`Timesheet not found for employee ${employee_id}, week ${week_ending}.`);
    correctTimesheetField({
      timesheetId,
      field: st_field,
      newValue: Number(new_st_value),
      reason,
      correctionType: "daily_hours",
    });
    correctTimesheetField({
      timesheetId,
      field: ot_field,
      newValue: Number(new_ot_value),
      reason,
      correctionType: "daily_hours",
    });
    redirectBack(req, res, "Daily hours corrected successfully.");
  } catch (err) {
    redirectError(req, res, err);
  }
});

// Correct weekly hours by adjusting a specific day's hours
router.post("/correct-weekly-hours", (req, res) => {
  try {
    const { employee_id, week_ending, field, new_value, reason } = req.body;
    const timesheetId = getTimesheetId(Number(employee_id), week_ending);
    if (!timesheetId) throw new Error(`Timesheet not found for employee ${employee_id}, week ${week_ending}.`);
    correctTimesheetField({
      timesheetId,
      field,
      newValue: Number(new_value),
      reason,
      correctionType: "weekly_hours",
    });
    redirectBack(req, res, "Weekly hours corrected successfully.");
  } catch (err) {
    redirectError(req, res, err);
  }
});

// Unify employee name
router.post("/unify-name", (req, res) => {
  try {
    const { employee_id, preferred_name, reason } = req.body;
    unifyEmployeeName({
      employeeId: Number(employee_id),
      preferredName: preferred_name,
      reason,
    });
    redirectBack(req, res, "Name unified successfully.");
  } catch (err) {
    redirectError(req, res, err);
  }
});

// Split employee name into separate ID
router.post("/split-name", (req, res) => {
  try {
    const { employee_id, raw_name, new_employee_id, reason } = req.body;
    splitEmployeeName({
      currentEmployeeId: Number(employee_id),
      rawName: raw_name,
      newEmployeeId: Number(new_employee_id),
      reason,
    });
    redirectBack(req, res, `Name split successfully. New employee ID: ${new_employee_id}`);
  } catch (err) {
    redirectError(req, res, err);
  }
});

// Revert a correction
router.post("/revert", (req, res) => {
  try {
    const { correction_id } = req.body;
    revertCorrection(Number(correction_id));
    res.redirect("/anomalies/corrections?flash=Correction+reverted+successfully.");
  } catch (err) {
    res.redirect(`/anomalies/corrections?error=${encodeURIComponent(err.message)}`);
  }
});

export default router;
