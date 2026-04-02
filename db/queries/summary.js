import db from "../index.js";

/**
 * Returns high-level dataset statistics in a single row: the total number of
 * unique employees, counts broken out by APPRENTICE and JOURNEYWORKER levels,
 * the total number of timesheet records, and the earliest and latest week_ending
 * dates. Each scalar is computed as an independent sub-select so the query
 * touches both the employees and timesheets tables.
 *
 * @returns {{
 *   unique_employees: number,
 *   apprentice_count: number,
 *   journeyworker_count: number,
 *   total_timesheets: number,
 *   first_week: string,
 *   last_week: string
 * }}
 */
export function getOverviewStats() {
  return db
    .prepare(
      `
    SELECT
      (SELECT COUNT(DISTINCT id) FROM employees) AS unique_employees,
      (SELECT COUNT(DISTINCT id) FROM employees WHERE level = 'APPRENTICE') AS apprentice_count,
      (SELECT COUNT(DISTINCT id) FROM employees WHERE level = 'JOURNEYWORKER') AS journeyworker_count,
      (SELECT COUNT(*) FROM timesheets) AS total_timesheets,
      (SELECT MIN(week_ending) FROM timesheets) AS first_week,
      (SELECT MAX(week_ending) FROM timesheets) AS last_week
  `,
    )
    .get();
}

/**
 * Computes the average standard, overtime, and benefits rate grouped by employee
 * level (e.g. APPRENTICE, JOURNEYWORKER). Averages are taken across all
 * timesheet rows for employees at each level, giving a per-timesheet-entry
 * weighted mean rather than a per-employee mean.
 *
 * @returns {{
 *   level: string,
 *   avg_standard_rate: number,
 *   avg_overtime_rate: number,
 *   avg_benefits_rate: number
 * }[]}
 */
export function getAverageRates() {
  return db
    .prepare(
      `
    SELECT
      e.level,
      ROUND(AVG(t.standard_rate), 2) AS avg_standard_rate,
      ROUND(AVG(t.overtime_rate), 2) AS avg_overtime_rate,
      ROUND(AVG(t.benefits_rate), 2) AS avg_benefits_rate
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    GROUP BY e.level
  `,
    )
    .all();
}

/**
 * Calculates the total cumulative spend across all timesheets, broken into three
 * components: standard spend (standard hours * standard rate), overtime spend
 * (overtime hours * overtime rate), and benefits spend (all hours * benefits
 * rate). The total_spend field is the sum of the three. Hours for each component
 * are computed by summing the seven per-day columns for that category.
 *
 * @returns {{
 *   total_spend: number,
 *   standard_spend: number,
 *   overtime_spend: number,
 *   benefits_spend: number
 * }}
 */
export function getCumulativeSpend() {
  return db
    .prepare(
      `
    SELECT
      ROUND(SUM(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours) * standard_rate
        + (mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * overtime_rate
        + (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours
           + mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * benefits_rate
      ), 2) AS total_spend,
      ROUND(SUM(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours) * standard_rate
      ), 2) AS standard_spend,
      ROUND(SUM(
        (mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * overtime_rate
      ), 2) AS overtime_spend,
      ROUND(SUM(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours
         + mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * benefits_rate
      ), 2) AS benefits_spend
    FROM timesheets
  `,
    )
    .get();
}

/**
 * Computes the percentage of total project hours (standard + overtime, all days)
 * that were worked by APPRENTICE-level employees. Uses a conditional SUM: the
 * numerator counts hours only where the employee's level is APPRENTICE, and the
 * denominator counts all hours regardless of level.
 *
 * @returns {{ apprentice_pct: number }}
 */
export function getApprenticeHoursPercent() {
  return db
    .prepare(
      `
    SELECT
      ROUND(100.0 * SUM(CASE WHEN e.level = 'APPRENTICE' THEN
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
        ELSE 0 END)
      / SUM(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      ), 1) AS apprentice_pct
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
  `,
    )
    .get();
}

/**
 * Returns one row per week_ending with the total spend for that week and the
 * distinct number of employees who submitted timesheets (head_count). Weekly
 * spend is calculated as standard + overtime + benefits components summed across
 * all employees for that week. Results are ordered chronologically by week_ending.
 *
 * @returns {{
 *   week_ending: string,
 *   weekly_spend: number,
 *   head_count: number
 * }[]}
 */
export function getWeeklySpend() {
  return db
    .prepare(
      `
    SELECT
      t.week_ending,
      ROUND(SUM(
        (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours) * standard_rate
        + (mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * overtime_rate
        + (mon_st_hours + tue_st_hours + wed_st_hours + thu_st_hours + fri_st_hours + sat_st_hours + sun_st_hours
           + mon_ot_hours + tue_ot_hours + wed_ot_hours + thu_ot_hours + fri_ot_hours + sat_ot_hours + sun_ot_hours) * benefits_rate
      ), 2) AS weekly_spend,
      COUNT(DISTINCT t.employee_id) AS head_count
    FROM timesheets t
    GROUP BY t.week_ending
    ORDER BY t.week_ending
  `,
    )
    .all();
}
