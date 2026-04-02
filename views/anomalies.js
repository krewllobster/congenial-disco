import { money, badge } from "../lib/format.js";

export function anomaliesView({ rateAnomalies, dailyHours, weeklyHours, nameMismatches, sevenDayWeeks }) {
  // Rate anomaly table rows — weeks where standard rate deviates >50% from the employee's median
  const rateRows = rateAnomalies.map((r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td>${money(r.standard_rate)}</td>
      <td>${money(r.median_rate)}</td>
      <td class="anomaly-high">${r.pct_deviation}%</td>
    </tr>`).join("");

  // Excessive daily hours rows — individual days exceeding 12 hours
  const dailyRows = dailyHours.map((r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td>${r.day}</td>
      <td class="anomaly-high">${r.hours}</td>
    </tr>`).join("");

  // Excessive weekly hours rows — weeks exceeding 60 total hours
  const weeklyRows = weeklyHours.map((r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td class="anomaly-high">${r.total_hours}</td>
    </tr>`).join("");

  // Name mismatch rows — employee IDs with multiple distinct raw name spellings
  const nameRows = nameMismatches.map((r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.employee_id}</a></td>
      <td class="anomaly-high">${r.names}</td>
      <td>${r.name_count} variants</td>
    </tr>`).join("");

  // Seven-day work week rows — weeks where the employee logged hours every day
  const sevenDayRows = sevenDayWeeks.map((r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td>${r.total_hours}</td>
    </tr>`).join("");

  // Each section renders conditionally — shows a table if anomalies exist, otherwise a "none found" message
  return `
  <p>Potential data quality issues and entries that warrant review.</p>

  <!-- Rate anomalies: standard rate vs. employee's personal median -->
  <h2>Rate Anomalies ${badge(rateAnomalies.length)}</h2>
  <p class="table-note">Weeks where an employee's standard rate deviates &gt;50% from their median rate.</p>
  ${rateAnomalies.length ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Rate</th><th>Median Rate</th><th>Deviation</th></tr>
    </thead>
    <tbody>${rateRows}</tbody>
  </table>` : "<p>No rate anomalies found.</p>"}

  <!-- Daily hours flags: single days exceeding 12 hours -->
  <h2>Excessive Daily Hours (&gt;12h) ${badge(dailyHours.length)}</h2>
  <p class="table-note">Single days where standard + overtime hours exceed 12.</p>
  ${dailyHours.length ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Day</th><th>Hours</th></tr>
    </thead>
    <tbody>${dailyRows}</tbody>
  </table>` : "<p>No excessive daily hours found.</p>"}

  <!-- Weekly hours flags: weeks exceeding 60 total hours -->
  <h2>Excessive Weekly Hours (&gt;60h) ${badge(weeklyHours.length)}</h2>
  <p class="table-note">Weeks where total hours exceed 60.</p>
  ${weeklyHours.length ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${weeklyRows}</tbody>
  </table>` : "<p>No excessive weekly hours found.</p>"}

  <!-- Name mismatches: inconsistent raw_employee_name values for the same ID -->
  <h2>Name Mismatches ${badge(nameMismatches.length)}</h2>
  <p class="table-note">Employee IDs with inconsistent name spellings across weeks.</p>
  ${nameMismatches.length ? `
  <table class="data-table">
    <thead>
      <tr><th>Employee ID</th><th>Names Found</th><th>Count</th></tr>
    </thead>
    <tbody>${nameRows}</tbody>
  </table>` : "<p>No name mismatches found.</p>"}

  <!-- Seven-day work weeks: employees who logged hours every day of the week -->
  <h2>7-Day Work Weeks ${badge(sevenDayWeeks.length)}</h2>
  <p class="table-note">Employees who worked all 7 days — potential burnout or compliance concern.</p>
  ${sevenDayWeeks.length ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${sevenDayRows}</tbody>
  </table>` : "<p>No 7-day work weeks found.</p>"}`;
}
