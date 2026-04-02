import express from "express";
import { layout } from "../lib/layout.js";
import { employeeListView } from "../views/employeeList.js";
import { employeeDetailView } from "../views/employeeDetail.js";
import {
  getEmployeeById,
  getEmployeeDailyHourStats,
  getEmployeeRateStats,
  getEmployeeSummary,
  getEmployeeTimesheets,
  getEmployeeTotals,
  getLevelAggregates,
} from "../db/queries/employees.js";
import {
  getExcessiveDailyHoursForEmployee,
  getExcessiveWeeklyHoursForEmployee,
  getNameMismatchForEmployee,
  getRateAnomalies,
  getRateAnomaliesForEmployee,
  getExcessiveDailyHours,
  getExcessiveWeeklyHours,
  getNameMismatches,
  getSevenDayWeeks,
  getSevenDayWeeksForEmployee,
} from "../db/queries/anomalies.js";
import { getDistinctNamesForEmployee } from "../db/queries/corrections.js";

const router = express.Router();

router.get("/", (req, res) => {
  const dailyStats = getEmployeeDailyHourStats();
  const rateStats = getEmployeeRateStats();
  const totals = getEmployeeTotals();
  const levelAgg = getLevelAggregates();

  // Collect employee IDs that appear in any anomaly list
  const anomalyIds = new Set([
    ...getRateAnomalies().map((r) => r.employee_id),
    ...getExcessiveDailyHours().map((r) => r.employee_id),
    ...getExcessiveWeeklyHours().map((r) => r.employee_id),
    ...getNameMismatches().map((r) => r.employee_id),
    ...getSevenDayWeeks().map((r) => r.employee_id),
  ]);

  const content = employeeListView({ dailyStats, rateStats, totals, levelAgg, anomalyIds });
  res.type("html").send(layout("Employee Overviews", content));
});

router.get("/:id", (req, res) => {
  const employee = getEmployeeById(req.params.id);
  if (!employee) {
    return res.status(404).type("html").send(layout("Not Found", "<p>Employee not found.</p>"));
  }

  const summary = getEmployeeSummary(employee.id);
  const timesheets = getEmployeeTimesheets(employee.id);
  const nameMismatch = getNameMismatchForEmployee(employee.id);
  const anomalies = {
    rateAnomalies: getRateAnomaliesForEmployee(employee.id),
    dailyHours: getExcessiveDailyHoursForEmployee(employee.id),
    weeklyHours: getExcessiveWeeklyHoursForEmployee(employee.id),
    sevenDayWeeks: getSevenDayWeeksForEmployee(employee.id),
    nameMismatch: nameMismatch
      ? { ...nameMismatch, nameList: getDistinctNamesForEmployee(employee.id) }
      : null,
  };

  const flash = req.query.flash || null;
  const error = req.query.error || null;
  const content = employeeDetailView({ employee, summary, timesheets, anomalies, flash, error });
  res.type("html").send(layout(employee.name, content));
});

export default router;
