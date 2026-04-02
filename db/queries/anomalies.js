import db from "../index.js";

/**
 * Finds timesheet entries where an employee's standard rate deviates from their
 * personal median rate by more than 50%. Computes each employee's median standard
 * rate using a row-number approach (picking the middle value when rows are ordered
 * by rate), then joins every timesheet row against that median and filters to those
 * where the absolute deviation exceeds half the median. Results are sorted by
 * percent deviation descending, surfacing the most extreme outliers first.
 *
 * @returns {{
 *   name: string,
 *   employee_id: number,
 *   week_ending: string,
 *   standard_rate: number,
 *   median_rate: number,
 *   pct_deviation: number
 * }[]}
 */
export function getRateAnomalies() {
  return db
    .prepare(
      `
    WITH employee_median AS (
      SELECT
        employee_id,
        standard_rate AS median_rate
      FROM (
        SELECT
          employee_id,
          standard_rate,
          ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY standard_rate) AS rn,
          COUNT(*) OVER (PARTITION BY employee_id) AS cnt
        FROM timesheets
      )
      WHERE rn = (cnt + 1) / 2
    )
    SELECT
      e.name,
      e.id AS employee_id,
      t.week_ending,
      t.standard_rate,
      m.median_rate,
      ROUND(100.0 * ABS(t.standard_rate - m.median_rate) / m.median_rate, 1) AS pct_deviation
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    JOIN employee_median m ON m.employee_id = t.employee_id
    WHERE ABS(t.standard_rate - m.median_rate) > 0.5 * m.median_rate
    ORDER BY pct_deviation DESC
  `,
    )
    .all();
}

/**
 * Identifies individual days where an employee worked more than 12 hours.
 * Unpivots the per-day columns (Mon–Sun) into a single "daily" CTE by unioning
 * standard + overtime hours for each day of the week, then filters to rows
 * exceeding the 12-hour threshold. Results are ordered by hours descending.
 *
 * @returns {{
 *   name: string,
 *   employee_id: number,
 *   week_ending: string,
 *   day: string,
 *   hours: number
 * }[]}
 */
export function getExcessiveDailyHours() {
  return db
    .prepare(
      `
    WITH daily AS (
      SELECT e.name, e.id AS employee_id, t.week_ending, 'Mon' AS day, (t.mon_st_hours + t.mon_ot_hours) AS hours FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Tue', (t.tue_st_hours + t.tue_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Wed', (t.wed_st_hours + t.wed_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Thu', (t.thu_st_hours + t.thu_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Fri', (t.fri_st_hours + t.fri_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Sat', (t.sat_st_hours + t.sat_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
      UNION ALL SELECT e.name, e.id, t.week_ending, 'Sun', (t.sun_st_hours + t.sun_ot_hours) FROM timesheets t JOIN employees e ON e.id = t.employee_id
    )
    SELECT name, employee_id, week_ending, day, ROUND(hours, 1) AS hours
    FROM daily
    WHERE hours > 12
    ORDER BY hours DESC
  `,
    )
    .all();
}

/**
 * Finds timesheet weeks where an employee's total hours (standard + overtime,
 * summed across all seven days) exceed 60. Orders results by total hours
 * descending to highlight the most extreme weeks first.
 *
 * @returns {{
 *   name: string,
 *   employee_id: number,
 *   week_ending: string,
 *   total_hours: number
 * }[]}
 */
export function getExcessiveWeeklyHours() {
  return db
    .prepare(
      `
    SELECT
      e.name,
      e.id AS employee_id,
      t.week_ending,
      ROUND(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      , 1) AS total_hours
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    WHERE total_hours > 60
    ORDER BY total_hours DESC
  `,
    )
    .all();
}

/**
 * Detects employees whose timesheets contain more than one distinct
 * raw_employee_name value. Groups the distinct non-null raw names by
 * employee_id, concatenates them with " | " separators, and returns only
 * those employees with multiple variants — indicating possible data-entry
 * inconsistencies or name changes. Ordered by employee_id.
 *
 * @returns {{
 *   employee_id: number,
 *   names: string,
 *   name_count: number
 * }[]}
 */
export function getNameMismatches() {
  return db
    .prepare(
      `
    WITH distinct_names AS (
      SELECT DISTINCT employee_id, raw_employee_name
      FROM timesheets
      WHERE raw_employee_name IS NOT NULL
    )
    SELECT
      employee_id,
      GROUP_CONCAT(raw_employee_name, ' | ') AS names,
      COUNT(*) AS name_count
    FROM distinct_names
    GROUP BY employee_id
    HAVING name_count > 1
    ORDER BY employee_id
  `,
    )
    .all();
}

/**
 * Single-employee variant of getRateAnomalies. Computes the employee's median
 * standard rate using the same row-number median technique, then returns only
 * that employee's timesheet weeks where the rate deviates by more than 50%
 * from the median. Sorted by percent deviation descending.
 *
 * @param {number} employeeId
 * @returns {Object[]}
 */
export function getRateAnomaliesForEmployee(employeeId) {
  return db
    .prepare(
      `
    WITH employee_median AS (
      SELECT
        employee_id,
        standard_rate AS median_rate
      FROM (
        SELECT
          employee_id,
          standard_rate,
          ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY standard_rate) AS rn,
          COUNT(*) OVER (PARTITION BY employee_id) AS cnt
        FROM timesheets
      )
      WHERE rn = (cnt + 1) / 2
    )
    SELECT
      t.week_ending,
      t.standard_rate,
      m.median_rate,
      ROUND(100.0 * ABS(t.standard_rate - m.median_rate) / m.median_rate, 1) AS pct_deviation
    FROM timesheets t
    JOIN employee_median m ON m.employee_id = t.employee_id
    WHERE t.employee_id = ? AND ABS(t.standard_rate - m.median_rate) > 0.5 * m.median_rate
    ORDER BY pct_deviation DESC
  `,
    )
    .all(employeeId);
}

/**
 * Single-employee variant of getExcessiveDailyHours. Unpivots the seven
 * per-day hour columns into individual rows for the given employee, then
 * filters to days exceeding 12 hours. Sorted by hours descending.
 *
 * @param {number} employeeId
 * @returns {Object[]}
 */
export function getExcessiveDailyHoursForEmployee(employeeId) {
  return db
    .prepare(
      `
    WITH daily AS (
      SELECT t.week_ending, 'Mon' AS day, (t.mon_st_hours + t.mon_ot_hours) AS hours FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Tue', (t.tue_st_hours + t.tue_ot_hours) FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Wed', (t.wed_st_hours + t.wed_ot_hours) FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Thu', (t.thu_st_hours + t.thu_ot_hours) FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Fri', (t.fri_st_hours + t.fri_ot_hours) FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Sat', (t.sat_st_hours + t.sat_ot_hours) FROM timesheets t WHERE t.employee_id = ?
      UNION ALL SELECT t.week_ending, 'Sun', (t.sun_st_hours + t.sun_ot_hours) FROM timesheets t WHERE t.employee_id = ?
    )
    SELECT week_ending, day, ROUND(hours, 1) AS hours
    FROM daily
    WHERE hours > 12
    ORDER BY hours DESC
  `,
    )
    .all(employeeId, employeeId, employeeId, employeeId, employeeId, employeeId, employeeId);
}

/**
 * Single-employee variant of getExcessiveWeeklyHours. Sums standard + overtime
 * hours across all seven days for the given employee and returns only weeks
 * where the total exceeds 60 hours. Sorted by total hours descending.
 *
 * @param {number} employeeId
 * @returns {Object[]}
 */
export function getExcessiveWeeklyHoursForEmployee(employeeId) {
  return db
    .prepare(
      `
    SELECT
      t.week_ending,
      ROUND(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      , 1) AS total_hours
    FROM timesheets t
    WHERE t.employee_id = ? AND total_hours > 60
    ORDER BY total_hours DESC
  `,
    )
    .all(employeeId);
}

/**
 * Finds weeks where the given employee logged hours on all seven days of the
 * week (Mon–Sun each having combined standard + overtime hours > 0). Returns
 * the week_ending date and total hours, sorted by total hours descending.
 *
 * @param {number} employeeId
 * @returns {Object[]}
 */
export function getSevenDayWeeksForEmployee(employeeId) {
  return db
    .prepare(
      `
    SELECT
      t.week_ending,
      ROUND(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      , 1) AS total_hours
    FROM timesheets t
    WHERE t.employee_id = ?
      AND (t.mon_st_hours + t.mon_ot_hours) > 0
      AND (t.tue_st_hours + t.tue_ot_hours) > 0
      AND (t.wed_st_hours + t.wed_ot_hours) > 0
      AND (t.thu_st_hours + t.thu_ot_hours) > 0
      AND (t.fri_st_hours + t.fri_ot_hours) > 0
      AND (t.sat_st_hours + t.sat_ot_hours) > 0
      AND (t.sun_st_hours + t.sun_ot_hours) > 0
    ORDER BY total_hours DESC
  `,
    )
    .all(employeeId);
}

/**
 * Single-employee variant of getNameMismatches. Collects all distinct non-null
 * raw_employee_name values for the given employee and returns them concatenated
 * with " | " only if more than one variant exists. Returns undefined when the
 * employee has a single consistent name across all timesheets.
 *
 * @param {number} employeeId
 * @returns {{names: string, name_count: number}|undefined}
 */
export function getNameMismatchForEmployee(employeeId) {
  const row = db
    .prepare(
      `
    WITH distinct_names AS (
      SELECT DISTINCT raw_employee_name
      FROM timesheets
      WHERE employee_id = ? AND raw_employee_name IS NOT NULL
    )
    SELECT
      GROUP_CONCAT(raw_employee_name, ' | ') AS names,
      COUNT(*) AS name_count
    FROM distinct_names
    HAVING name_count > 1
  `,
    )
    .get(employeeId);
  return row;
}

/**
 * Finds all timesheet weeks across all employees where hours were logged on
 * every day of the week (Mon–Sun each > 0). Returns the employee name, id,
 * week_ending, and total hours (standard + overtime). Sorted by total hours
 * descending.
 */
export function getSevenDayWeeks() {
  return db
    .prepare(
      `
    SELECT
      e.name,
      e.id AS employee_id,
      t.week_ending,
      ROUND(
        t.mon_st_hours + t.tue_st_hours + t.wed_st_hours + t.thu_st_hours + t.fri_st_hours + t.sat_st_hours + t.sun_st_hours
        + t.mon_ot_hours + t.tue_ot_hours + t.wed_ot_hours + t.thu_ot_hours + t.fri_ot_hours + t.sat_ot_hours + t.sun_ot_hours
      , 1) AS total_hours
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    WHERE (t.mon_st_hours + t.mon_ot_hours) > 0
      AND (t.tue_st_hours + t.tue_ot_hours) > 0
      AND (t.wed_st_hours + t.wed_ot_hours) > 0
      AND (t.thu_st_hours + t.thu_ot_hours) > 0
      AND (t.fri_st_hours + t.fri_ot_hours) > 0
      AND (t.sat_st_hours + t.sat_ot_hours) > 0
      AND (t.sun_st_hours + t.sun_ot_hours) > 0
    ORDER BY total_hours DESC
  `,
    )
    .all();
}
