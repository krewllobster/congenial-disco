# Payroll Dashboard

A Node.js + Express web app for analyzing payroll data, detecting anomalies, and making auditable corrections. Data is stored in SQLite and rendered as server-side HTML with Charts.css visualizations.

## Setup

```bash
git clone https://github.com/krewllobster/congenial-disco.git
cd congenial-disco
npm install
npm run seed      # Load payroll_data.csv into SQLite
npm run migrate   # Create the corrections table
```

## Running

```bash
npm run dev       # Start with auto-reload on http://localhost:3000
npm start         # Production start
```

## Other Scripts

```bash
npm run reset     # Drop all tables, re-seed from CSV, and re-run migrations (fresh start)
```

## Features

### Summary Dashboard (`/`)

- KPI cards: employee count, total payroll spend, apprentice hour percentage, date range
- Area charts: weekly spend, cumulative spend, weekly head count
- Average rates by employee level

### Employee Overviews (`/employees`)

- Daily hours stats by level and by employee (min/max/avg)
- Rate ranges by employee (standard, overtime, benefits)
- Total pay bar chart and detailed totals table with benefits
- Rows with anomalies are highlighted

### Employee Detail (`/employees/:id`)

- Profile, summary stats, weekly pay bar chart
- Full timesheet table with per-day breakdown and anomalous cells highlighted
- Collapsible anomaly panel with inline correction forms

### Anomaly Detection (`/anomalies`)

- **Name Mismatches** -- Employee IDs with multiple distinct name spellings
- **Rate Anomalies** -- Weeks where standard rate deviates >50% from the employee's median
- **Excessive Daily Hours** -- Days where standard hours exceed 8 (OT misclassification) or total hours exceed 12
- **Weekly Hours Anomalies** -- Weeks over 60 total hours, or over 40 hours with underreported overtime
- **7-Day Work Weeks** -- Employees who logged hours every day of the week (informational)

### Corrections (`/anomalies/corrections`)

All corrections are logged with old/new values and are fully reversible:

- **Rate/hours corrections** -- Fix a specific field on a timesheet row
- **Name unify** -- Pick a preferred name and apply it to all timesheets for an employee
- **Name split** -- Reassign timesheets with a specific name to a new employee ID
- **Revert** -- Undo any correction (or entire batch) from the correction log

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Server-rendered HTML templates, Charts.css
- **Navigation**: Hotwired Turbo (CDN)

## Project Structure

```
app.js              Express app setup and routing
bin/www             Server entry point (port 3000)
db/
  schema.sql        Table definitions (employees, timesheets, corrections)
  seed.js           CSV data loader
  migrate.js        Creates corrections table
  reset.js          Full database reset
  index.js          Database connection
  queries/
    summary.js      Overview and spend queries
    employees.js    Employee stats and totals
    anomalies.js    Anomaly detection queries
    corrections.js  Correction apply/revert logic
lib/
  layout.js         HTML template wrapper
  format.js         Formatting utilities (money, dates, badges)
routes/
  summary.js        GET /
  employees.js      GET /employees, /employees/:id
  anomalies.js      GET/POST /anomalies/*
views/
  summary.js        Summary dashboard
  employeeList.js   Employee list page
  employeeDetail.js Employee detail page
  anomalies.js      Anomalies page
  correctionsLog.js Correction log page
public/
  stylesheets/      CSS (custom + Charts.css)
```
