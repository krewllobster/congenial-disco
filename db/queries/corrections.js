import { randomUUID } from "node:crypto";
import db from "../index.js";

/**
 * Logs a correction to the audit trail.
 */
function applyCorrection({ batchId, correctionType, targetTable, targetId, field, oldValue, newValue, reason }) {
  const insert = db.prepare(`
    INSERT INTO corrections (batch_id, correction_type, target_table, target_id, field, old_value, new_value, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(batchId ?? null, correctionType, targetTable, targetId, field, oldValue, newValue, reason);
  return info.lastInsertRowid;
}

/**
 * Revert a single correction row. Does not mark it as reverted — caller handles that.
 */
function revertOne(correction) {
  if (correction.correction_type === "name_unify") {
    if (correction.target_table === "employees") {
      db.prepare(`UPDATE employees SET name = ? WHERE id = ?`)
        .run(correction.old_value, correction.target_id);
    } else {
      db.prepare(`UPDATE timesheets SET raw_employee_name = ? WHERE id = ?`)
        .run(correction.old_value, correction.target_id);
    }
  } else if (correction.correction_type === "name_split") {
    db.prepare(`
      UPDATE timesheets SET employee_id = ? WHERE id = ? AND employee_id = ?
    `).run(Number(correction.old_value), correction.target_id, Number(correction.new_value));

    const remaining = db.prepare(`
      SELECT COUNT(*) AS cnt FROM timesheets WHERE employee_id = ?
    `).get(Number(correction.new_value));
    if (remaining.cnt === 0) {
      db.prepare(`DELETE FROM employees WHERE id = ?`).run(Number(correction.new_value));
    }
  } else {
    const { target_table, target_id, field, old_value } = correction;
    if (target_table === "timesheets") {
      db.prepare(`UPDATE timesheets SET ${field} = ? WHERE id = ?`).run(Number(old_value), target_id);
    }
  }
}

/**
 * Correct a timesheet field (rate or hours) for a single row.
 * Logs the change and updates the DB.
 */
export function correctTimesheetField({ timesheetId, field, newValue, reason, correctionType }) {
  const allowedFields = [
    "standard_rate", "overtime_rate", "benefits_rate",
    "mon_st_hours", "tue_st_hours", "wed_st_hours", "thu_st_hours", "fri_st_hours", "sat_st_hours", "sun_st_hours",
    "mon_ot_hours", "tue_ot_hours", "wed_ot_hours", "thu_ot_hours", "fri_ot_hours", "sat_ot_hours", "sun_ot_hours",
  ];
  if (!allowedFields.includes(field)) {
    throw new Error(`Field "${field}" is not correctable.`);
  }

  const row = db.prepare(`SELECT ${field} FROM timesheets WHERE id = ?`).get(timesheetId);
  if (!row) throw new Error(`Timesheet ${timesheetId} not found.`);

  const oldValue = String(row[field]);
  const correctionId = applyCorrection({
    correctionType,
    targetTable: "timesheets",
    targetId: timesheetId,
    field,
    oldValue,
    newValue: String(newValue),
    reason,
  });

  db.prepare(`UPDATE timesheets SET ${field} = ? WHERE id = ?`).run(Number(newValue), timesheetId);
  return correctionId;
}

/**
 * Unify names: set raw_employee_name to the preferred name for all timesheets
 * belonging to a given employee. All sub-corrections share a batch_id.
 */
export function unifyEmployeeName({ employeeId, preferredName, reason }) {
  const employee = db.prepare(`SELECT name FROM employees WHERE id = ?`).get(employeeId);
  if (!employee) throw new Error(`Employee ${employeeId} not found.`);

  const batchId = randomUUID();
  const correctionIds = [];

  // Log and apply the employees.name change (only if it actually differs)
  if (employee.name !== preferredName) {
    const empCorrectionId = applyCorrection({
      batchId,
      correctionType: "name_unify",
      targetTable: "employees",
      targetId: employeeId,
      field: "name",
      oldValue: employee.name,
      newValue: preferredName,
      reason,
    });
    correctionIds.push(empCorrectionId);
    db.prepare(`UPDATE employees SET name = ? WHERE id = ?`).run(preferredName, employeeId);
  }

  // Log one correction per affected timesheet row so revert is exact
  const affectedRows = db.prepare(`
    SELECT id, raw_employee_name FROM timesheets
    WHERE employee_id = ? AND raw_employee_name IS NOT NULL AND raw_employee_name != ?
  `).all(employeeId, preferredName);

  for (const row of affectedRows) {
    const correctionId = applyCorrection({
      batchId,
      correctionType: "name_unify",
      targetTable: "timesheets",
      targetId: row.id,
      field: "raw_employee_name",
      oldValue: row.raw_employee_name,
      newValue: preferredName,
      reason,
    });
    correctionIds.push(correctionId);
  }

  db.prepare(`
    UPDATE timesheets SET raw_employee_name = ?
    WHERE employee_id = ? AND raw_employee_name != ?
  `).run(preferredName, employeeId, preferredName);

  return correctionIds;
}

/**
 * Split names: reassign timesheets with a specific raw_employee_name to a new employee_id.
 * All sub-corrections share a batch_id.
 */
export function splitEmployeeName({ currentEmployeeId, rawName, newEmployeeId, reason }) {
  const existing = db.prepare(`SELECT id, name FROM employees WHERE id = ?`).get(newEmployeeId);
  if (existing) throw new Error(`Employee ID ${newEmployeeId} already exists (${existing.name}).`);

  const currentEmployee = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(currentEmployeeId);
  if (!currentEmployee) throw new Error(`Employee ${currentEmployeeId} not found.`);

  const affectedRows = db.prepare(`
    SELECT id FROM timesheets WHERE employee_id = ? AND raw_employee_name = ?
  `).all(currentEmployeeId, rawName);

  if (affectedRows.length === 0) throw new Error(`No timesheets found for employee ${currentEmployeeId} with name "${rawName}".`);

  db.prepare(`
    INSERT INTO employees (id, name, level, occupation) VALUES (?, ?, ?, ?)
  `).run(newEmployeeId, rawName, currentEmployee.level, currentEmployee.occupation);

  const batchId = randomUUID();
  const correctionIds = [];
  for (const { id } of affectedRows) {
    const correctionId = applyCorrection({
      batchId,
      correctionType: "name_split",
      targetTable: "timesheets",
      targetId: id,
      field: "employee_id",
      oldValue: String(currentEmployeeId),
      newValue: String(newEmployeeId),
      reason,
    });
    correctionIds.push(correctionId);
  }

  db.prepare(`
    UPDATE timesheets SET employee_id = ? WHERE employee_id = ? AND raw_employee_name = ?
  `).run(newEmployeeId, currentEmployeeId, rawName);

  return correctionIds;
}

/**
 * Revert a correction by its ID. If the correction belongs to a batch,
 * reverts all corrections in the batch together.
 */
export function revertCorrection(correctionId) {
  const correction = db.prepare(`SELECT * FROM corrections WHERE id = ?`).get(correctionId);
  if (!correction) throw new Error(`Correction ${correctionId} not found.`);
  if (correction.reverted_at) throw new Error(`Correction ${correctionId} was already reverted.`);

  let toRevert;
  if (correction.batch_id) {
    // Revert the whole batch, newest-first so dependencies unwind correctly
    toRevert = db.prepare(`
      SELECT * FROM corrections WHERE batch_id = ? AND reverted_at IS NULL ORDER BY id DESC
    `).all(correction.batch_id);
  } else {
    toRevert = [correction];
  }

  for (const c of toRevert) {
    revertOne(c);
  }

  const ids = toRevert.map(c => c.id);
  db.prepare(`
    UPDATE corrections SET reverted_at = datetime('now') WHERE id IN (${ids.map(() => "?").join(",")})
  `).run(...ids);

  return toRevert;
}

/**
 * Get all corrections, newest first.
 */
export function getCorrections() {
  return db.prepare(`SELECT * FROM corrections ORDER BY created_at DESC, id DESC`).all();
}

/**
 * Get timesheet ID for a given employee + week combination.
 */
export function getTimesheetId(employeeId, weekEnding) {
  const row = db.prepare(`SELECT id FROM timesheets WHERE employee_id = ? AND week_ending = ?`).get(employeeId, weekEnding);
  return row ? row.id : null;
}

/**
 * Get distinct raw names for an employee.
 */
export function getDistinctNamesForEmployee(employeeId) {
  return db.prepare(`
    SELECT DISTINCT raw_employee_name FROM timesheets
    WHERE employee_id = ? AND raw_employee_name IS NOT NULL
    ORDER BY raw_employee_name
  `).all(employeeId).map(r => r.raw_employee_name);
}
