import { money, shortDate } from "../lib/format.js";

export function summaryView({ overview, rates, spend, apprentice, weekly }) {
  // Chart scale ceilings — used to normalize Charts.css --start/--size values (0–1)
  const maxSpend = Math.max(...weekly.map((w) => w.weekly_spend));
  const maxHead = Math.max(...weekly.map((w) => w.head_count));

  // Average rates table rows — one row per employee level (apprentice, journeyworker)
  const ratesRows = rates
    .map(
      (r) => `
    <tr>
      <td>${r.level}</td>
      <td>${money(r.avg_standard_rate)}</td>
      <td>${money(r.avg_overtime_rate)}</td>
      <td>${money(r.avg_benefits_rate)}</td>
    </tr>`,
    )
    .join("");

  // Round ceilings up with 10% headroom so chart lines don't clip the top edge
  const spendCeil = Math.ceil((maxSpend * 1.1) / 1000) * 1000;
  const headCeil = maxHead * 1.1;

  // Weekly spend area chart — each row sets --start (previous week's ratio) and
  // --size (this week's ratio) so Charts.css draws a continuous area line
  const weeklySpendChart = weekly
    .map((w, i) => {
      const size = (w.weekly_spend / spendCeil).toFixed(4);
      const start =
        i > 0 ? (weekly[i - 1].weekly_spend / spendCeil).toFixed(4) : size;
      return `
    <tr>
      <th scope="row">${shortDate(w.week_ending)}</th>
      <td style="--start: ${start}; --size: ${size}">
        <span class="data">${money(w.weekly_spend)}</span>
      </td>
    </tr>`;
    })
    .join("");

  // Weekly head count area chart — same --start/--size pattern as spend chart
  const headCountChart = weekly
    .map((w, i) => {
      const size = (w.head_count / headCeil).toFixed(4);
      const start =
        i > 0 ? (weekly[i - 1].head_count / headCeil).toFixed(4) : size;
      return `
    <tr>
      <th scope="row">${shortDate(w.week_ending)}</th>
      <td style="--start: ${start}; --size: ${size}">
        <span class="data">${w.head_count}</span>
      </td>
    </tr>`;
    })
    .join("");

  // Cumulative spend area chart — accumulates a running total from weekly data
  let runningTotal = 0;
  const cumulative = weekly.map((w) => {
    runningTotal += w.weekly_spend;
    return { week_ending: w.week_ending, cumulative_spend: runningTotal };
  });
  const cumulativeCeil = Math.ceil((runningTotal * 1.1) / 1000) * 1000;

  const cumulativeChart = cumulative
    .map((w, i) => {
      const size = (w.cumulative_spend / cumulativeCeil).toFixed(4);
      const start =
        i > 0
          ? (cumulative[i - 1].cumulative_spend / cumulativeCeil).toFixed(4)
          : "0";
      return `
    <tr>
      <th scope="row">${shortDate(w.week_ending)}</th>
      <td style="--start: ${start}; --size: ${size}">
        <span class="data">${money(w.cumulative_spend)}</span>
      </td>
    </tr>`;
    })
    .join("");

  // Y-axis tick labels for each chart — evenly spaced from 0 to the ceiling
  const ticks = 5;

  const cumulativeStep = cumulativeCeil / ticks;
  const cumulativeYAxis = Array.from(
    { length: ticks + 1 },
    (_, i) => `<li>$${Math.round((cumulativeStep * i) / 1000)}k</li>`,
  ).join("");

  const spendStep = spendCeil / ticks;
  const spendYAxis = Array.from(
    { length: ticks + 1 },
    (_, i) => `<li>$${Math.round((spendStep * i) / 1000)}k</li>`,
  ).join("");

  const headStep = headCeil / ticks;
  const headYAxis = Array.from(
    { length: ticks + 1 },
    (_, i) => `<li>${Math.round(headStep * i)}</li>`,
  ).join("");

  return `
  <!-- KPI cards: employee count, total spend breakdown, apprentice %, and date range -->
  <section class="stats-grid">
    <div class="stat-card">
      <h3>Unique Employees</h3>
      <p class="stat-value">${overview.unique_employees}</p>
      <p class="stat-detail">${overview.apprentice_count} apprentices, ${overview.journeyworker_count} journeyworkers</p>
    </div>
    <div class="stat-card">
      <h3>Total Payroll Spend</h3>
      <p class="stat-value">${money(spend.total_spend)}</p>
      <p class="stat-detail">
        Standard: ${money(spend.standard_spend)} |
        Overtime: ${money(spend.overtime_spend)} |
        Benefits: ${money(spend.benefits_spend)}
      </p>
    </div>
    <div class="stat-card">
      <h3>Apprentice Hours</h3>
      <p class="stat-value">${apprentice.apprentice_pct}%</p>
      <p class="stat-detail">of total hours worked</p>
    </div>
    <div class="stat-card">
      <h3>Date Range</h3>
      <p class="stat-value">${overview.total_timesheets} timesheets</p>
      <p class="stat-detail">${overview.first_week} to ${overview.last_week}</p>
    </div>
  </section>

  <!-- Rates table: average standard, overtime, and benefits rates per level -->
  <h2>Average Rates by Level</h2>
  <table class="data-table">
    <thead>
      <tr><th>Level</th><th>Std Rate</th><th>OT Rate</th><th>Benefits Rate</th></tr>
    </thead>
    <tbody>${ratesRows}</tbody>
  </table>

  <!-- Three Charts.css area charts side-by-side: weekly spend, cumulative spend, head count -->
  <div class="charts-row">
    <div class="charts-row-item">
      <h2>Weekly Spend</h2>
      <div class="chart-with-axis">
        <ul class="y-axis">${spendYAxis}</ul>
        <div class="chart-wrapper chart-area">
          <table class="charts-css area show-labels show-data-on-hover show-primary-axis show-data-axes">
            <thead><tr><th scope="col">Week</th><th scope="col">Spend</th></tr></thead>
            <tbody>${weeklySpendChart}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="charts-row-item">
      <h2>Cumulative Spend</h2>
      <div class="chart-with-axis">
        <ul class="y-axis">${cumulativeYAxis}</ul>
        <div class="chart-wrapper chart-area">
          <table class="charts-css area show-labels show-data-on-hover show-primary-axis show-data-axes">
            <thead><tr><th scope="col">Week</th><th scope="col">Cumulative Spend</th></tr></thead>
            <tbody>${cumulativeChart}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="charts-row-item">
      <h2>Weekly Head Count</h2>
      <div class="chart-with-axis">
        <ul class="y-axis">${headYAxis}</ul>
        <div class="chart-wrapper chart-area">
          <table class="charts-css area show-labels show-data-on-hover show-primary-axis show-data-axes">
            <thead><tr><th scope="col">Week</th><th scope="col">Count</th></tr></thead>
            <tbody>${headCountChart}</tbody>
          </table>
        </div>
      </div>
    </div>    
  </div>

  <!-- Navigation links to the other two dashboard pages -->
  <section class="section-links">
    <h2>Explore</h2>
    <ul>
      <li><a href="/employees">Employee Statistical Overviews</a> — per-employee hours, rates, and totals</li>
      <li><a href="/anomalies">Anomaly Detection</a> — data quality flags and suspicious entries</li>
    </ul>
  </section>`;
}
