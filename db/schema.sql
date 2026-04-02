CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('APPRENTICE', 'JOURNEYWORKER')),
  occupation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  week_ending TEXT NOT NULL,
  mon_st_hours REAL NOT NULL DEFAULT 0,
  tue_st_hours REAL NOT NULL DEFAULT 0,
  wed_st_hours REAL NOT NULL DEFAULT 0,
  thu_st_hours REAL NOT NULL DEFAULT 0,
  fri_st_hours REAL NOT NULL DEFAULT 0,
  sat_st_hours REAL NOT NULL DEFAULT 0,
  sun_st_hours REAL NOT NULL DEFAULT 0,
  mon_ot_hours REAL NOT NULL DEFAULT 0,
  tue_ot_hours REAL NOT NULL DEFAULT 0,
  wed_ot_hours REAL NOT NULL DEFAULT 0,
  thu_ot_hours REAL NOT NULL DEFAULT 0,
  fri_ot_hours REAL NOT NULL DEFAULT 0,
  sat_ot_hours REAL NOT NULL DEFAULT 0,
  sun_ot_hours REAL NOT NULL DEFAULT 0,
  standard_rate REAL NOT NULL,
  overtime_rate REAL NOT NULL,
  benefits_rate REAL NOT NULL,
  UNIQUE (employee_id, week_ending)
);
