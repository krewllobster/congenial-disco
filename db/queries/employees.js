import db from "../index.js";

/**
 * Computes per-employee daily-hours statistics (min, max, average) across all
 * timesheet weeks. Unpivots the seven per-day column pairs (standard + overtime)
 * into individual rows via UNION ALL, excludes zero-hour days, then aggregates
 * per employee. Results are joined to the employees table for name/level/occupation
 * and sorted alphabetically by name.
 *
 * @returns {{
 *   employee_id: number,
 *   name: string,
 *   level: string,
 *   occupation: string,
 *   min_daily_hours: number,
 *   max_daily_hours: number,
 *   avg_daily_hours: number
 * }[]}
 */
export function getEmployeeDailyHourStats() {
  return db
    .prepare(
      `
    WITH daily_hours AS (
      SELECT t.employee_id, 'Mon' AS day, (t.mon_st_hours + t.mon_ot_hours) AS hours FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Tue', (t.tue_st_hours + t.tue_ot_hours) FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Wed', (t.wed_st_hours + t.wed_ot_hours) FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Thu', (t.thu_st_hours + t.thu_ot_hours) FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Fri', (t.fri_st_hours + t.fri_ot_hours) FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Sat', (t.sat_st_hours + t.sat_ot_hours) FROM timesheets t
      UNION ALL SELECT t.employee_id, 'Sun', (t.sun_st_hours + t.sun_ot_hours) FROM timesheets t
    )
    SELECT
      e.id AS employee_id,
      e.name,
      e.level,
      e.occupation,
      ROUND(MIN(d.hours), 1) AS min_daily_hours,
      ROUND(MAX(d.hours), 1) AS max_daily_hours,
      ROUND(AVG(d.hours), 1) AS avg_daily_hours
    FROM daily_hours d
    JOIN employees e ON e.id = d.employee_id
    WHERE d.hours > 0
    GROUP BY e.id
    ORDER BY e.name
  `,
    )
    .all();
}

/**
 * Computes per-employee min, max, and average for each of the three rate types
 * (standard, overtime, benefits) across all of their timesheet entries. Groups
 * by employee and joins the employees table for name and level. Sorted
 * alphabetically by name.
 *
 * @returns {{
 *   employee_id: number,
 *   name: string,
 *   level: string,
 *   min_standard_rate: number,
 *   max_standard_rate: number,
 *   avg_standard_rate: number,
 *   min_overtime_rate: number,
 *   max_overtime_rate: number,
 *   avg_overtime_rate: number,
 *   min_benefits_rate: number,
 *   max_benefits_rate: number,
 *   avg_benefits_rate: number
 * }[]}
 */
export function getEmployeeRateStats() {
  return db
    .prepare(
      `
    SELECT
      e.id AS employee_id,
      e.name,
      e.level,
      ROUND(MIN(t.standard_rate), 2) AS min_standard_rate,
      ROUND(MAX(t.standard_rate), 2) AS max_standard_rate,
      ROUND(AVG(t.standard_rate), 2) AS avg_standard_rate,
      ROUND(MIN(t.overtime_rate), 2) AS min_overtime_rate,
      ROUND(MAX(t.overtime_rate), 2) AS max_overtime_rate,
      ROUND(AVG(t.overtime_rate), 2) AS avg_overtime_rate,
      ROUND(MIN(t.benefits_rate), 2) AS min_benefits_rate,
      ROUND(MAX(t.benefits_rate), 2) AS max_benefits_rate,
      ROUND(AVG(t.benefits_rate), 2) AS avg_benefits_rate
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    GROUP BY e.id
    ORDER BY e.name
  `,
    )
    .all();
}

/**
 * Aggregates each employee's lifetime totals: number of timesheet weeks worked,
 * total standard hours, total overtime hours, and total pay. Total pay is
 * calculated as (standard hours * standard rate) + (overtime hours * overtime
 * rate) + (all hours * benefits rate), summed across every timesheet entry.
 * Results are sorted by total pay descending.
 *
 * @returns {{
 *   employee_id: number,
 *   name: string,
 *   level: string,
 *   occupation: string,
 *   weeks_worked: number,
 *   total_st_hours: number,
 *   total_ot_hours: number,
 *   total_pay: number
 * }[]}
 */
export function getEmployeeTotals() {
  return db
    .prepare(
      `
    SELECT
      e.id AS employee_id,
      e.name,
      e.level,
      e.occupation,
      COUNT(t.id) AS weeks_worked,
      ROUND(SUM(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
      ), 1) AS total_st_hours,
      ROUND(SUM(
        t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      ), 1) AS total_ot_hours,
      ROUND(SUM(
        (t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
         + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours) * t.benefits_rate
      ), 2) AS total_benefits,
      ROUND(SUM(
        (t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours) * t.standard_rate
        + (t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours) * t.overtime_rate
        + (t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
           + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours) * t.benefits_rate
      ), 2) AS total_pay
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    GROUP BY e.id
    ORDER BY total_pay DESC
  `,
    )
    .all();
}

/**
 * Looks up a single employee by primary key. Returns their id, name, level,
 * and occupation, or undefined if no employee with that id exists.
 *
 * @param {number} id
 * @returns {{id: number, name: string, level: string, occupation: string}|undefined}
 */
export function getEmployeeById(id) {
  return db.prepare(`SELECT id, name, level, occupation FROM employees WHERE id = ?`).get(id);
}

/**
 * Returns every timesheet row for a given employee, ordered chronologically by
 * week_ending. Each row includes the raw per-day standard and overtime hours,
 * the three rate columns, and three computed fields: total standard hours,
 * total overtime hours, and weekly pay (standard + overtime + benefits
 * components) for that week.
 *
 * @param {number} id
 * @returns {Object[]}
 */
export function getEmployeeTimesheets(id) {
  return db
    .prepare(
      `
    SELECT
      week_ending,
      mon_st_hours, tue_st_hours, wed_st_hours, thu_st_hours, fri_st_hours, sat_st_hours, sun_st_hours,
      mon_ot_hours, tue_ot_hours, wed_ot_hours, thu_ot_hours, fri_ot_hours, sat_ot_hours, sun_ot_hours,
      standard_rate, overtime_rate, benefits_rate,
      ROUND(mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours, 1) AS total_st_hours,
      ROUND(mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours, 1) AS total_ot_hours,
      ROUND(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours) * standard_rate
        + (mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * overtime_rate
        + (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours
           + mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * benefits_rate
      , 2) AS weekly_pay
    FROM timesheets
    WHERE employee_id = ?
    ORDER BY week_ending
  `,
    )
    .all(id);
}

/**
 * Returns a single-row summary for one employee: total weeks worked, total
 * standard hours, total overtime hours, and total pay across all their
 * timesheets. Pay is computed identically to getEmployeeTotals (standard +
 * overtime + benefits components). Returns undefined if the employee has no
 * timesheet records.
 *
 * @param {number} id
 * @returns {{total_st_hours: number, total_ot_hours: number, total_pay: number, weeks_worked: number}|undefined}
 */
export function getEmployeeSummary(id) {
  return db
    .prepare(
      `
    SELECT
      COUNT(id) AS weeks_worked,
      ROUND(SUM(mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours), 1) AS total_st_hours,
      ROUND(SUM(mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours), 1) AS total_ot_hours,
      ROUND(SUM(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours) * standard_rate
        + (mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * overtime_rate
        + (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours
           + mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * benefits_rate
      ), 2) AS total_pay
    FROM timesheets
    WHERE employee_id = ?
  `,
    )
    .get(id);
}

/**
 * Computes daily-hours statistics (min, max, average) grouped by employee level
 * (e.g. APPRENTICE, JOURNEYWORKER). Uses the same unpivot approach as
 * getEmployeeDailyHourStats — UNION ALL of each day's standard + overtime hours —
 * but groups by level instead of individual employee. Zero-hour days are excluded
 * so they don't pull down the averages.
 *
 * @returns {{
 *   level: string,
 *   min_daily_hours: number,
 *   max_daily_hours: number,
 *   avg_daily_hours: number
 * }[]}
 */
export function getLevelAggregates() {
  return db
    .prepare(
      `
    WITH daily_hours AS (
      SELECT e.level, (t.mon_st_hours + t.mon_ot_hours) AS hours FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.tue_st_hours + t.tue_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.wed_st_hours + t.wed_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.thu_st_hours + t.thu_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.fri_st_hours + t.fri_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.sat_st_hours + t.sat_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.level, (t.sun_st_hours + t.sun_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
    )
    SELECT
      level,
      ROUND(MIN(hours), 1) AS min_daily_hours,
      ROUND(MAX(hours), 1) AS max_daily_hours,
      ROUND(AVG(hours), 1) AS avg_daily_hours
    FROM daily_hours
    WHERE hours > 0
    GROUP BY level
  `,
    )
    .all();
}
