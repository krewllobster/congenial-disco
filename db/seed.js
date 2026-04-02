import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "payroll.db");
const CSV_PATH = join(__dirname, "..", "payroll_data.csv");
const SCHEMA_PATH = join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
const schema = readFileSync(SCHEMA_PATH, "utf-8");
db.exec(schema);

// Parse CSV
const csv = readFileSync(CSV_PATH, "utf-8").trimEnd();
const [headerLine, ...dataLines] = csv.split("\n");
const headers = headerLine.split(",");

function parseDate(mmddyyyy) {
  const [mm, dd, yyyy] = mmddyyyy.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

// Prepare statements
const upsertEmployee = db.prepare(`
  INSERT INTO employees (id, name, level, occupation)
  VALUES (?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET
    name = excluded.name,
    level = excluded.level,
    occupation = excluded.occupation
`);

const insertTimesheet = db.prepare(`
  INSERT INTO timesheets (
    employee_id, week_ending,
    mon_st_hours, tue_st_hours, wed_st_hours, thu_st_hours, fri_st_hours, sat_st_hours, sun_st_hours,
    mon_ot_hours, tue_ot_hours, wed_ot_hours, thu_ot_hours, fri_ot_hours, sat_ot_hours, sun_ot_hours,
    standard_rate, overtime_rate, benefits_rate
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (employee_id, week_ending) DO UPDATE SET
    mon_st_hours = excluded.mon_st_hours,
    tue_st_hours = excluded.tue_st_hours,
    wed_st_hours = excluded.wed_st_hours,
    thu_st_hours = excluded.thu_st_hours,
    fri_st_hours = excluded.fri_st_hours,
    sat_st_hours = excluded.sat_st_hours,
    sun_st_hours = excluded.sun_st_hours,
    mon_ot_hours = excluded.mon_ot_hours,
    tue_ot_hours = excluded.tue_ot_hours,
    wed_ot_hours = excluded.wed_ot_hours,
    thu_ot_hours = excluded.thu_ot_hours,
    fri_ot_hours = excluded.fri_ot_hours,
    sat_ot_hours = excluded.sat_ot_hours,
    sun_ot_hours = excluded.sun_ot_hours,
    standard_rate = excluded.standard_rate,
    overtime_rate = excluded.overtime_rate,
    benefits_rate = excluded.benefits_rate
`);

// Seed inside a transaction for speed
const seed = db.transaction(() => {
  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Handle commas inside quoted fields (e.g. names with commas)
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,))/g) ?? [];

    const name = cols[0]?.replace(/"/g, "");
    const employeeId = Number(cols[1]);
    const level = cols[2];
    const occupation = cols[3];
    const weekEnding = parseDate(cols[4]);

    upsertEmployee.run(employeeId, name, level, occupation);

    insertTimesheet.run(
      employeeId,
      weekEnding,
      ...cols.slice(5).map(Number)
    );
  }
});

seed();

const employeeCount = db.prepare("SELECT COUNT(*) AS count FROM employees").get().count;
const timesheetCount = db.prepare("SELECT COUNT(*) AS count FROM timesheets").get().count;

console.log(`Seeded ${employeeCount} employees and ${timesheetCount} timesheets into ${DB_PATH}`);

db.close();
