import { money } from "../lib/format.js";

export function employeeListView({ dailyStats, rateStats, totals, levelAgg, anomalyIds }) {
  // Highest total pay across all employees — used to scale the bar chart
  const maxPay = Math.max(...totals.map((t) => t.total_pay));

  // Level aggregate table rows — min/max/avg daily hours per level (apprentice, journeyworker)
  const levelRows = levelAgg.map((l) => `
    <tr>
      <td>${l.level}</td>
      <td>${l.min_daily_hours}</td>
      <td>${l.max_daily_hours}</td>
      <td>${l.avg_daily_hours}</td>
    </tr>`).join("");

  const anom = (id) => anomalyIds.has(id) ? ' class="has-anomaly"' : "";

  // Per-employee daily hours table rows — min/max/avg with name linking to detail page
  const dailyRows = dailyStats.map((e) => `
    <tr${anom(e.employee_id)}>
      <td><a href="/employees/${e.employee_id}">${e.name}</a></td>
      <td>${e.employee_id}</td>
      <td>${e.level}</td>
      <td>${e.occupation}</td>
      <td>${e.min_daily_hours}</td>
      <td>${e.max_daily_hours}</td>
      <td>${e.avg_daily_hours}</td>
    </tr>`).join("");

  // Rate ranges table rows — min/avg/max for standard, overtime, and benefits rates
  const rateRows = rateStats.map((e) => `
    <tr${anom(e.employee_id)}>
      <td><a href="/employees/${e.employee_id}">${e.name}</a></td>
      <td>${e.employee_id}</td>
      <td>${e.level}</td>
      <td>${money(e.min_standard_rate)} / ${money(e.avg_standard_rate)} / ${money(e.max_standard_rate)}</td>
      <td>${money(e.min_overtime_rate)} / ${money(e.avg_overtime_rate)} / ${money(e.max_overtime_rate)}</td>
      <td>${money(e.min_benefits_rate)} / ${money(e.avg_benefits_rate)} / ${money(e.max_benefits_rate)}</td>
    </tr>`).join("");

  // Horizontal bar chart rows — each bar's width is total_pay relative to the highest earner
  const totalsChart = totals.map((e) => `
    <tr>
      <th scope="row"><a href="/employees/${e.employee_id}">${e.name}</a></th>
      <td style="--size: ${(e.total_pay / maxPay).toFixed(4)}">
        <span class="data">${money(e.total_pay)}</span>
      </td>
    </tr>`).join("");

  // Employee totals table rows — weeks worked, standard/overtime hours, and total pay
  const totalsRows = totals.map((e) => `
    <tr${anom(e.employee_id)}>
      <td><a href="/employees/${e.employee_id}">${e.name}</a></td>
      <td>${e.employee_id}</td>
      <td>${e.level}</td>
      <td>${e.occupation}</td>
      <td>${e.weeks_worked}</td>
      <td>${e.total_st_hours}</td>
      <td>${e.total_ot_hours}</td>
      <td>${money(e.total_pay)}</td>
    </tr>`).join("");

  return `
  <!-- Aggregate daily hours stats grouped by employee level -->
  <h2>Daily Hours by Level</h2>
  <table class="data-table">
    <thead>
      <tr><th>Level</th><th>Min Daily</th><th>Max Daily</th><th>Avg Daily</th></tr>
    </thead>
    <tbody>${levelRows}</tbody>
  </table>

  <!-- Per-employee daily hours breakdown with links to individual detail pages -->
  <h2>Daily Hours by Employee</h2>
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Level</th><th>Occupation</th><th>Min Daily</th><th>Max Daily</th><th>Avg Daily</th></tr>
    </thead>
    <tbody>${dailyRows}</tbody>
  </table>

  <!-- Per-employee rate ranges: min/avg/max for each rate type -->
  <h2>Rate Ranges by Employee</h2>
  <p class="table-note">Shown as min / avg / max</p>
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Level</th><th>Standard Rate</th><th>Overtime Rate</th><th>Benefits Rate</th></tr>
    </thead>
    <tbody>${rateRows}</tbody>
  </table>

  <!-- Charts.css horizontal bar chart comparing total pay across employees -->
  <h2>Total Pay by Employee</h2>
  <div class="chart-wrapper chart-bar">
    <table class="charts-css bar show-labels show-data data-spacing-4">
      <thead><tr><th scope="col">Employee</th><th scope="col">Pay</th></tr></thead>
      <tbody>${totalsChart}</tbody>
    </table>
  </div>

  <!-- Detailed totals table: weeks, hours, and pay for every employee -->
  <h2>Employee Totals</h2>
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Level</th><th>Occupation</th><th>Weeks</th><th>ST Hours</th><th>OT Hours</th><th>Total Pay</th></tr>
    </thead>
    <tbody>${totalsRows}</tbody>
  </table>`;
}
