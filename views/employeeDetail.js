import { money } from "../lib/format.js";

export function employeeDetailView({ employee, summary, timesheets, anomalies }) {
  // Highest weekly pay — used to scale the bar chart (floor of 1 prevents division by zero)
  const maxPay = Math.max(...timesheets.map((t) => t.weekly_pay), 1);

  // Destructure the five anomaly categories and compute a total badge count
  const { rateAnomalies, dailyHours, weeklyHours, sevenDayWeeks, nameMismatch } = anomalies;
  const anomalyCount = rateAnomalies.length + dailyHours.length + weeklyHours.length + sevenDayWeeks.length + (nameMismatch ? 1 : 0);

  // Column keys and header labels for the seven-day breakdown
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Timesheet table rows — each cell shows "ST + OT" per day, plus totals and rates
  const timesheetRows = timesheets.map((t) => {
    const dayCells = days.map((d) => {
      const st = t[`${d}_st_hours`];
      const ot = t[`${d}_ot_hours`];
      return `<td>${st}${ot > 0 ? ` + ${ot}` : ""}</td>`;
    }).join("");
    return `
    <tr>
      <td>${t.week_ending}</td>
      ${dayCells}
      <td>${t.total_st_hours}</td>
      <td>${t.total_ot_hours}</td>
      <td>${money(t.standard_rate)}</td>
      <td>${money(t.overtime_rate)}</td>
      <td>${money(t.benefits_rate)}</td>
      <td>${money(t.weekly_pay)}</td>
    </tr>`;
  }).join("");

  // Weekly pay bar chart rows — bar width is this week's pay relative to the max
  const payChart = timesheets.map((t) => `
    <tr>
      <th scope="row">${t.week_ending}</th>
      <td style="--size: ${(t.weekly_pay / maxPay).toFixed(4)}">
        <span class="data">${money(t.weekly_pay)}</span>
      </td>
    </tr>`).join("");

  // Anomaly sub-sections — each category renders conditionally only if it has entries
  const anomaliesHtml = anomalyCount === 0 ? "" : `
  ${rateAnomalies.length ? `
  <h3>Rate Anomalies</h3>
  <p class="table-note">Weeks where standard rate deviates &gt;50% from median rate.</p>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Rate</th><th>Median Rate</th><th>Deviation</th></tr>
    </thead>
    <tbody>${rateAnomalies.map((r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td>${money(r.standard_rate)}</td>
        <td>${money(r.median_rate)}</td>
        <td class="anomaly-high">${r.pct_deviation}%</td>
      </tr>`).join("")}
    </tbody>
  </table>` : ""}

  ${dailyHours.length ? `
  <h3>Excessive Daily Hours (&gt;12h)</h3>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Day</th><th>Hours</th></tr>
    </thead>
    <tbody>${dailyHours.map((r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td>${r.day}</td>
        <td class="anomaly-high">${r.hours}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : ""}

  ${weeklyHours.length ? `
  <h3>Excessive Weekly Hours (&gt;60h)</h3>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${weeklyHours.map((r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td class="anomaly-high">${r.total_hours}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : ""}

  ${sevenDayWeeks.length ? `
  <h3>7-Day Work Weeks</h3>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${sevenDayWeeks.map((r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td>${r.total_hours}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : ""}

  ${nameMismatch ? `
  <h3>Name Mismatches</h3>
  <p class="table-note">Inconsistent name spellings found across timesheets.</p>
  <table class="data-table">
    <thead>
      <tr><th>Names Found</th><th>Count</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="anomaly-high">${nameMismatch.names}</td>
        <td>${nameMismatch.name_count} variants</td>
      </tr>
    </tbody>
  </table>` : ""}`;

  return `
  <!-- Back-navigation link to the employee list page -->
  <p><a href="/employees">&larr; All Employees</a></p>

  <!-- Collapsible anomaly panel — shows badge count; expands to reveal flagged entries -->
  <details class="anomaly-panel">
    <summary>Anomalies <span class="badge">${anomalyCount}</span></summary>
    <div class="anomaly-panel-content">
      ${anomalyCount === 0 ? "<p>No anomalies found for this employee.</p>" : anomaliesHtml}
    </div>
  </details>

  <!-- Employee profile: id, name, level, occupation -->
  <h2>Profile</h2>
  <table class="data-table">
    <tbody>
      <tr><th>ID</th><td>${employee.id}</td></tr>
      <tr><th>Name</th><td>${employee.name}</td></tr>
      <tr><th>Level</th><td>${employee.level}</td></tr>
      <tr><th>Occupation</th><td>${employee.occupation}</td></tr>
    </tbody>
  </table>

  <!-- Aggregate stats: weeks worked, total standard/overtime hours, total pay -->
  <h2>Summary</h2>
  <table class="data-table">
    <tbody>
      <tr><th>Weeks Worked</th><td>${summary.weeks_worked}</td></tr>
      <tr><th>Total ST Hours</th><td>${summary.total_st_hours}</td></tr>
      <tr><th>Total OT Hours</th><td>${summary.total_ot_hours}</td></tr>
      <tr><th>Total Pay</th><td>${money(summary.total_pay)}</td></tr>
    </tbody>
  </table>

  <!-- Charts.css horizontal bar chart of weekly pay over time -->
  <h2>Weekly Pay</h2>
  <div class="chart-wrapper chart-bar">
    <table class="charts-css bar show-labels show-data data-spacing-4">
      <thead><tr><th scope="col">Week</th><th scope="col">Pay</th></tr></thead>
      <tbody>${payChart}</tbody>
    </table>
  </div>

  <!-- Full timesheet table: per-day hours, rates, and computed weekly pay -->
  <h2>Timesheets</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Week Ending</th>
        ${dayLabels.map((d) => `<th>${d}</th>`).join("")}
        <th>ST Hrs</th><th>OT Hrs</th>
        <th>ST Rate</th><th>OT Rate</th><th>Benefits</th>
        <th>Weekly Pay</th>
      </tr>
    </thead>
    <tbody>${timesheetRows}</tbody>
  </table>`;
}
