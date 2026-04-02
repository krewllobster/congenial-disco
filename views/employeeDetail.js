import { money } from "../lib/format.js";
import { DAILY_HOURS_DEFAULTS } from "../db/queries/anomalies.js";

const DAYS_SHORT = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const maxStThreshold = DAILY_HOURS_DEFAULTS.maxStandardHours;
const maxTotalThreshold = DAILY_HOURS_DEFAULTS.maxTotalHours;

function weekDayCells(r) {
  return DAYS_SHORT.map((d) => {
    const st = r[`${d}_st_hours`];
    const ot = r[`${d}_ot_hours`];
    const flagged = st > maxStThreshold || (st + ot) > maxTotalThreshold;
    return `<td${flagged ? ' class="anomaly-high"' : ""}>${st}${ot > 0 ? ` + ${ot}` : ""}</td>`;
  }).join("");
}

const DAY_FIELDS = {
  Mon: { st: "mon_st_hours", ot: "mon_ot_hours" },
  Tue: { st: "tue_st_hours", ot: "tue_ot_hours" },
  Wed: { st: "wed_st_hours", ot: "wed_ot_hours" },
  Thu: { st: "thu_st_hours", ot: "thu_ot_hours" },
  Fri: { st: "fri_st_hours", ot: "fri_ot_hours" },
  Sat: { st: "sat_st_hours", ot: "sat_ot_hours" },
  Sun: { st: "sun_st_hours", ot: "sun_ot_hours" },
};

export function employeeDetailView({
  employee,
  summary,
  timesheets,
  anomalies,
  flash,
  error,
}) {
  // Highest weekly pay — used to scale the bar chart (floor of 1 prevents division by zero)
  const maxPay = Math.max(...timesheets.map((t) => t.weekly_pay), 1);

  // Destructure the five anomaly categories and compute a total badge count
  const {
    rateAnomalies,
    dailyHours,
    weeklyHours,
    sevenDayWeeks,
    nameMismatch,
  } = anomalies;
  const anomalyCount =
    rateAnomalies.length +
    dailyHours.length +
    weeklyHours.length +
    sevenDayWeeks.length +
    (nameMismatch ? 1 : 0);

  // Column keys and header labels for the seven-day breakdown
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Build lookup sets for anomalous cells
  const rateAnomalyWeeks = new Set(rateAnomalies.map((r) => r.week_ending));
  const weeklyAnomalyWeeks = new Set(weeklyHours.map((r) => r.week_ending));
  const maxSt = DAILY_HOURS_DEFAULTS.maxStandardHours;
  const maxTotal = DAILY_HOURS_DEFAULTS.maxTotalHours;

  // Timesheet table rows — each cell shows "ST + OT" per day, plus totals and rates
  const timesheetRows = timesheets
    .map((t) => {
      const dayCells = days
        .map((d) => {
          const st = t[`${d}_st_hours`];
          const ot = t[`${d}_ot_hours`];
          const flagged = st > maxSt || (st + ot) > maxTotal;
          return `<td${flagged ? ' class="anomaly-high"' : ""}>${st}${ot > 0 ? ` + ${ot}` : ""}</td>`;
        })
        .join("");
      const rateFlag = rateAnomalyWeeks.has(t.week_ending);
      const weekFlag = weeklyAnomalyWeeks.has(t.week_ending);
      return `
    <tr>
      <td>${t.week_ending}</td>
      ${dayCells}
      <td${weekFlag ? ' class="anomaly-high"' : ""}>${t.total_st_hours}</td>
      <td${weekFlag ? ' class="anomaly-high"' : ""}>${t.total_ot_hours}</td>
      <td${rateFlag ? ' class="anomaly-high"' : ""}>${money(t.standard_rate)}</td>
      <td>${money(t.overtime_rate)}</td>
      <td>${money(t.benefits_rate)}</td>
      <td>${money(t.weekly_pay)}</td>
    </tr>`;
    })
    .join("");

  // Weekly pay bar chart rows — bar width is this week's pay relative to the max
  const payChart = timesheets
    .map(
      (t) => `
    <tr>
      <th scope="row">${t.week_ending}</th>
      <td style="--size: ${(t.weekly_pay / maxPay).toFixed(4)}">
        <span class="data">${money(t.weekly_pay)}</span>
      </td>
    </tr>`,
    )
    .join("");

  // Anomaly sub-sections — each category renders conditionally only if it has entries
  const anomaliesHtml =
    anomalyCount === 0
      ? ""
      : `
  ${
    rateAnomalies.length
      ? `
  <h3>Rate Anomalies</h3>
  <p class="table-note">Weeks where standard rate deviates &gt;50% from median rate.</p>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Rate</th><th>Median Rate</th><th>Deviation</th><th>Action</th></tr>
    </thead>
    <tbody>${rateAnomalies
      .map(
        (r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td>${money(r.standard_rate)}</td>
        <td>${money(r.median_rate)}</td>
        <td class="anomaly-high">${r.pct_deviation}%</td>
        <td>
          <details class="inline-correction">
            <summary>Correct</summary>
            <form method="POST" action="/anomalies/correct-rate">
              <input type="hidden" name="return_to" value="/employees/${employee.id}">
              <input type="hidden" name="employee_id" value="${employee.id}">
              <input type="hidden" name="week_ending" value="${r.week_ending}">
              <input type="hidden" name="field" value="standard_rate">
              <label>New rate: <input type="number" name="new_value" step="0.01" value="${r.median_rate}" required></label>
              <label>Reason: <input type="text" name="reason" placeholder="e.g. typo correction" required></label>
              <button type="submit">Apply</button>
            </form>
          </details>
        </td>
      </tr>`,
      )
      .join("")}
    </tbody>
  </table>`
      : ""
  }

  ${
    dailyHours.length
      ? `
  <h3>Excessive Daily Hours</h3>
  <p class="table-note">Standard hours &gt;8 or total hours &gt;12.</p>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Day</th><th>Std</th><th>OT</th><th>Total</th><th>Flag</th><th>Action</th></tr>
    </thead>
    <tbody>${dailyHours
      .map((r) => {
        const dayField = DAY_FIELDS[r.day];
        const flagLabel = r.flag === "both" ? "std + total" : r.flag === "standard" ? "std hrs" : "total hrs";
        return `
      <tr>
        <td>${r.week_ending}</td>
        <td>${r.day}</td>
        <td class="${r.flag !== "total" ? "anomaly-high" : ""}">${r.st_hours}</td>
        <td>${r.ot_hours}</td>
        <td class="${r.flag !== "standard" ? "anomaly-high" : ""}">${r.hours}</td>
        <td><span class="flag-label flag-${r.flag}">${flagLabel}</span></td>
        <td>
          <details class="inline-correction">
            <summary>Correct</summary>
            <form method="POST" action="/anomalies/correct-daily-hours">
              <input type="hidden" name="return_to" value="/employees/${employee.id}">
              <input type="hidden" name="employee_id" value="${employee.id}">
              <input type="hidden" name="week_ending" value="${r.week_ending}">
              <input type="hidden" name="st_field" value="${dayField.st}">
              <input type="hidden" name="ot_field" value="${dayField.ot}">
              <label>Std hours (${r.day}): <input type="number" name="new_st_value" step="0.1" value="${r.st_hours}" required></label>
              <label>OT hours (${r.day}): <input type="number" name="new_ot_value" step="0.1" value="${r.ot_hours}" required></label>
              <label>Reason: <input type="text" name="reason" placeholder="e.g. typo correction" required></label>
              <button type="submit">Apply</button>
            </form>
          </details>
        </td>
      </tr>`;
      })
      .join("")}
    </tbody>
  </table>`
      : ""
  }

  ${
    weeklyHours.length
      ? `
  <h3>Weekly Hours Anomalies</h3>
  <p class="table-note">Total &gt;60h or OT underreported when total &gt;40h.</p>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th><th>Std</th><th>OT</th><th>Total</th><th>Flag</th><th>Action</th></tr>
    </thead>
    <tbody>${weeklyHours
      .map((r) => {
        const flagLabel = r.flag === "both" ? "excessive + OT misclass"
          : r.flag === "ot_misclass" ? "OT misclass" : "excessive";
        return `
      <tr>
        <td>${r.week_ending}</td>
        ${weekDayCells(r)}
        <td>${r.total_st}</td>
        <td>${r.total_ot}</td>
        <td class="anomaly-high">${r.total_hours}</td>
        <td><span class="flag-label flag-${r.flag}">${flagLabel}</span></td>
        <td>
          <details class="inline-correction">
            <summary>Correct</summary>
            <form method="POST" action="/anomalies/correct-weekly-hours">
              <input type="hidden" name="return_to" value="/employees/${employee.id}">
              <input type="hidden" name="employee_id" value="${employee.id}">
              <input type="hidden" name="week_ending" value="${r.week_ending}">
              <label>Day field:
                <select name="field">
                  <option value="mon_st_hours">Mon (std)</option>
                  <option value="mon_ot_hours">Mon (OT)</option>
                  <option value="tue_st_hours">Tue (std)</option>
                  <option value="tue_ot_hours">Tue (OT)</option>
                  <option value="wed_st_hours">Wed (std)</option>
                  <option value="wed_ot_hours">Wed (OT)</option>
                  <option value="thu_st_hours">Thu (std)</option>
                  <option value="thu_ot_hours">Thu (OT)</option>
                  <option value="fri_st_hours">Fri (std)</option>
                  <option value="fri_ot_hours">Fri (OT)</option>
                  <option value="sat_st_hours">Sat (std)</option>
                  <option value="sat_ot_hours">Sat (OT)</option>
                  <option value="sun_st_hours">Sun (std)</option>
                  <option value="sun_ot_hours">Sun (OT)</option>
                </select>
              </label>
              <label>New value: <input type="number" name="new_value" step="0.1" required></label>
              <label>Reason: <input type="text" name="reason" placeholder="e.g. typo correction" required></label>
              <button type="submit">Apply</button>
            </form>
          </details>
        </td>
      </tr>`;
      })
      .join("")}
    </tbody>
  </table>`
      : ""
  }

  ${
    sevenDayWeeks.length
      ? `
  <h3>7-Day Work Weeks</h3>
  <table class="data-table">
    <thead>
      <tr><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${sevenDayWeeks
      .map(
        (r) => `
      <tr>
        <td>${r.week_ending}</td>
        <td>${r.total_hours}</td>
      </tr>`,
      )
      .join("")}
    </tbody>
  </table>`
      : ""
  }

  ${
    nameMismatch
      ? `
  <h3>Name Mismatches</h3>
  <p class="table-note">Inconsistent name spellings found across timesheets.</p>
  <table class="data-table">
    <thead>
      <tr><th>Names Found</th><th>Count</th><th>Action</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="anomaly-high">${nameMismatch.names}</td>
        <td>${nameMismatch.name_count} variants</td>
        <td>
          <details class="inline-correction">
            <summary>Unify</summary>
            <form method="POST" action="/anomalies/unify-name">
              <input type="hidden" name="return_to" value="/employees/${employee.id}">
              <input type="hidden" name="employee_id" value="${employee.id}">
              <label>Preferred name:
                <select name="preferred_name">${(nameMismatch.nameList || [])
                  .map((n) => `<option value="${n}">${n}</option>`)
                  .join("")}</select>
              </label>
              <label>Reason: <input type="text" name="reason" placeholder="e.g. correct spelling" required></label>
              <button type="submit">Unify All</button>
            </form>
          </details>
          <details class="inline-correction">
            <summary>Split</summary>
            <form method="POST" action="/anomalies/split-name">
              <input type="hidden" name="return_to" value="/employees/${employee.id}">
              <input type="hidden" name="employee_id" value="${employee.id}">
              <label>Name to split off:
                <select name="raw_name">${(nameMismatch.nameList || [])
                  .map((n) => `<option value="${n}">${n}</option>`)
                  .join("")}</select>
              </label>
              <label>New employee ID: <input type="number" name="new_employee_id" required></label>
              <label>Reason: <input type="text" name="reason" placeholder="e.g. separate person" required></label>
              <button type="submit">Split</button>
            </form>
          </details>
        </td>
      </tr>
    </tbody>
  </table>`
      : ""
  }`;

  const flashHtml = flash ? `<div class="flash flash-success">${flash}</div>` : "";
  const errorHtml = error ? `<div class="flash flash-error">${error}</div>` : "";

  return `
  ${flashHtml}${errorHtml}
  <!-- Back-navigation link to the employee list page -->
  <p><a href="/employees">&larr; All Employees</a></p>


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

  <!-- Collapsible anomaly panel — shows badge count; expands to reveal flagged entries -->
  <details class="anomaly-panel">
    <summary>Anomalies <span class="badge">${anomalyCount}</span></summary>
    <div class="anomaly-panel-content">
      ${anomalyCount === 0 ? "<p>No anomalies found for this employee.</p>" : anomaliesHtml}
    </div>
  </details>


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
