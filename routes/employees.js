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
  getRateAnomaliesForEmployee,
  getSevenDayWeeksForEmployee,
} from "../db/queries/anomalies.js";

const router = express.Router();

router.get("/", (req, res) => {
  const dailyStats = getEmployeeDailyHourStats();
  const rateStats = getEmployeeRateStats();
  const totals = getEmployeeTotals();
  const levelAgg = getLevelAggregates();

  const content = employeeListView({ dailyStats, rateStats, totals, levelAgg });
  res.type("html").send(layout("Employee Overviews", content));
});

router.get("/:id", (req, res) => {
  const employee = getEmployeeById(req.params.id);
  if (!employee) {
    return res.status(404).type("html").send(layout("Not Found", "<p>Employee not found.</p>"));
  }

  const summary = getEmployeeSummary(employee.id);
  const timesheets = getEmployeeTimesheets(employee.id);
  const anomalies = {
    rateAnomalies: getRateAnomaliesForEmployee(employee.id),
    dailyHours: getExcessiveDailyHoursForEmployee(employee.id),
    weeklyHours: getExcessiveWeeklyHoursForEmployee(employee.id),
    sevenDayWeeks: getSevenDayWeeksForEmployee(employee.id),
    nameMismatch: getNameMismatchForEmployee(employee.id),
  };

  const content = employeeDetailView({ employee, summary, timesheets, anomalies });
  res.type("html").send(layout(employee.name, content));
});

export default router;
