import express from "express";
import db from "../db/index.js";

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT
      e.id AS employee_id,
      e.name,
      e.level,
      e.occupation,
      t.week_ending,
      t.mon_st_hours, t.tue_st_hours, t.wed_st_hours, t.thu_st_hours, t.fri_st_hours, t.sat_st_hours, t.sun_st_hours,
      t.mon_ot_hours, t.tue_ot_hours, t.wed_ot_hours, t.thu_ot_hours, t.fri_ot_hours, t.sat_ot_hours, t.sun_ot_hours,
      t.standard_rate, t.overtime_rate, t.benefits_rate
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    ORDER BY t.week_ending, e.name
  `).all();

  const tableRows = rows.map((r) => {
    const stHours = [r.mon_st_hours, r.tue_st_hours, r.wed_st_hours, r.thu_st_hours, r.fri_st_hours, r.sat_st_hours, r.sun_st_hours];
    const otHours = [r.mon_ot_hours, r.tue_ot_hours, r.wed_ot_hours, r.thu_ot_hours, r.fri_ot_hours, r.sat_ot_hours, r.sun_ot_hours];
    const stTotal = stHours.reduce((a, b) => a + b, 0);
    const otTotal = otHours.reduce((a, b) => a + b, 0);
    const daily = stHours.map((st, i) => st + otHours[i]);

    const cells = [
      r.name,
      r.employee_id,
      r.level,
      r.occupation,
      r.week_ending,
      ...daily.map((d) => d.toFixed(1)),
      stTotal.toFixed(1),
      otTotal.toFixed(1),
      `$${r.standard_rate.toFixed(2)}`,
      `$${r.overtime_rate.toFixed(2)}`,
      `$${r.benefits_rate.toFixed(2)}`,
    ].map((v) => `<td>${v}</td>`).join("");

    return `<tr>${cells}</tr>`;
  }).join("\n");

  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payroll</title>
  <link rel="stylesheet" href="/stylesheets/style.css">
</head>
<body>
  <h1>Payroll</h1>
  <table>
    <thead>
      <tr>
        <th>Employee</th>
        <th>ID</th>
        <th>Level</th>
        <th>Occupation</th>
        <th>Week Ending</th>
        <th>Mon</th>
        <th>Tue</th>
        <th>Wed</th>
        <th>Thu</th>
        <th>Fri</th>
        <th>Sat</th>
        <th>Sun</th>
        <th>ST Total</th>
        <th>OT Total</th>
        <th>Std Rate</th>
        <th>OT Rate</th>
        <th>Benefits Rate</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`);
});

export default router;
