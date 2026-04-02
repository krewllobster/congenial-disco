import { money, badge } from "../lib/format.js";
import { DAILY_HOURS_DEFAULTS } from "../db/queries/anomalies.js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const maxSt = DAILY_HOURS_DEFAULTS.maxStandardHours;
const maxTotal = DAILY_HOURS_DEFAULTS.maxTotalHours;

function weekDayCells(r) {
  return DAYS.map((d) => {
    const st = r[`${d}_st_hours`];
    const ot = r[`${d}_ot_hours`];
    const flagged = st > maxSt || st + ot > maxTotal;
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

export function anomaliesView({
  rateAnomalies,
  dailyHours,
  weeklyHours,
  nameMismatches,
  sevenDayWeeks,
  flash,
  error,
}) {
  const flashHtml = flash
    ? `<div class="flash flash-success">${flash}</div>`
    : "";
  const errorHtml = error
    ? `<div class="flash flash-error">${error}</div>`
    : "";

  // Rate anomaly table rows with inline correction form
  const rateRows = rateAnomalies
    .map(
      (r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td>${money(r.standard_rate)}</td>
      <td>${money(r.median_rate)}</td>
      <td class="anomaly-high">${r.pct_deviation}%</td>
      <td>
        <details class="inline-correction">
          <summary>Correct</summary>
          <form method="POST" action="/anomalies/correct-rate">
            <input type="hidden" name="employee_id" value="${r.employee_id}">
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
    .join("");

  // Excessive daily hours rows with correction forms for both ST and OT
  const dailyRows = dailyHours
    .map((r) => {
      const dayField = DAY_FIELDS[r.day];
      const flagLabel =
        r.flag === "both"
          ? "std + total"
          : r.flag === "standard"
            ? "std hrs"
            : "total hrs";
      return `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
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
            <input type="hidden" name="employee_id" value="${r.employee_id}">
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
    .join("");

  // Excessive weekly hours rows with correction form
  const weeklyRows = weeklyHours
    .map((r) => {
      const flagLabel =
        r.flag === "both"
          ? "excessive + OT misclass"
          : r.flag === "ot_misclass"
            ? "OT misclass"
            : "excessive";
      return `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
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
            <input type="hidden" name="employee_id" value="${r.employee_id}">
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
    .join("");

  // Name mismatch rows with unify/split forms
  const nameRows = nameMismatches
    .map((r) => {
      const nameOptions = (r.nameList || [])
        .map((n) => `<option value="${n}">${n}</option>`)
        .join("");

      return `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.employee_id}</a></td>
      <td class="anomaly-high">${r.names}</td>
      <td>${r.name_count} variants</td>
      <td>
        <details class="inline-correction">
          <summary>Unify</summary>
          <form method="POST" action="/anomalies/unify-name">
            <input type="hidden" name="employee_id" value="${r.employee_id}">
            <label>Preferred name:
              <select name="preferred_name">${nameOptions}</select>
            </label>
            <label>Reason: <input type="text" name="reason" placeholder="e.g. correct spelling" required></label>
            <button type="submit">Unify All</button>
          </form>
        </details>
        <details class="inline-correction">
          <summary>Split</summary>
          <form method="POST" action="/anomalies/split-name">
            <input type="hidden" name="employee_id" value="${r.employee_id}">
            <label>Name to split off:
              <select name="raw_name">${nameOptions}</select>
            </label>
            <label>New employee ID: <input type="number" name="new_employee_id" required></label>
            <label>Reason: <input type="text" name="reason" placeholder="e.g. separate person" required></label>
            <button type="submit">Split</button>
          </form>
        </details>
      </td>
    </tr>`;
    })
    .join("");

  // Seven-day work week rows (informational only)
  const sevenDayRows = sevenDayWeeks
    .map(
      (r) => `
    <tr>
      <td><a href="/employees/${r.employee_id}">${r.name}</a></td>
      <td>${r.employee_id}</td>
      <td>${r.week_ending}</td>
      <td>${r.total_hours}</td>
    </tr>`,
    )
    .join("");

  return `
  ${flashHtml}${errorHtml}
  <p>Potential data quality issues and entries that warrant review.
    <a href="/anomalies/corrections">View correction log &rarr;</a>
  </p>


  <!-- Name mismatches: inconsistent raw_employee_name values for the same ID -->
  <h2>Name Mismatches ${badge(nameMismatches.length)}</h2>
  <p class="table-note">Employee IDs with inconsistent name spellings across weeks.</p>
  ${
    nameMismatches.length
      ? `
  <table class="data-table">
    <thead>
      <tr><th>Employee ID</th><th>Names Found</th><th>Count</th><th>Action</th></tr>
    </thead>
    <tbody>${nameRows}</tbody>
  </table>`
      : "<p>No name mismatches found.</p>"
  }

  <!-- Rate anomalies: standard rate vs. employee's personal median -->
  <h2>Rate Anomalies ${badge(rateAnomalies.length)}</h2>
  <p class="table-note">Weeks where an employee's standard rate deviates &gt;50% from their median rate.</p>
  ${
    rateAnomalies.length
      ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Rate</th><th>Median Rate</th><th>Deviation</th><th>Action</th></tr>
    </thead>
    <tbody>${rateRows}</tbody>
  </table>`
      : "<p>No rate anomalies found.</p>"
  }

  <!-- Daily hours flags: standard hours > 8 or total hours > 12 -->
  <h2>Excessive Daily Hours ${badge(dailyHours.length)}</h2>
  <p class="table-note">Days where standard hours exceed 8 or total (standard + overtime) hours exceed 12.</p>
  ${
    dailyHours.length
      ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Day</th><th>Std</th><th>OT</th><th>Total</th><th>Flag</th><th>Action</th></tr>
    </thead>
    <tbody>${dailyRows}</tbody>
  </table>`
      : "<p>No excessive daily hours found.</p>"
  }

  <!-- Weekly hours flags: excessive hours or OT misclassification -->
  <h2>Weekly Hours Anomalies ${badge(weeklyHours.length)}</h2>
  <p class="table-note">Weeks where total hours exceed 60, or where total &gt;40 but OT is underreported.</p>
  ${
    weeklyHours.length
      ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th>${DAY_LABELS.map((d) => `<th>${d}</th>`).join("")}<th>Std</th><th>OT</th><th>Total</th><th>Flag</th><th>Action</th></tr>
    </thead>
    <tbody>${weeklyRows}</tbody>
  </table>`
      : "<p>No excessive weekly hours found.</p>"
  }

  <!-- Seven-day work weeks: employees who logged hours every day of the week -->
  <h2>7-Day Work Weeks ${badge(sevenDayWeeks.length)}</h2>
  <p class="table-note">Employees who worked all 7 days — potential burnout or compliance concern.</p>
  ${
    sevenDayWeeks.length
      ? `
  <table class="data-table">
    <thead>
      <tr><th>Name</th><th>ID</th><th>Week</th><th>Total Hours</th></tr>
    </thead>
    <tbody>${sevenDayRows}</tbody>
  </table>`
      : "<p>No 7-day work weeks found.</p>"
  }`;
}
