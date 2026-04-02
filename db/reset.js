import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const db = new Database(join(__dirname, "payroll.db"));

// Drop all tables so seed and migrate start fresh
db.exec(`
  DROP TABLE IF EXISTS corrections;
  DROP TABLE IF EXISTS timesheets;
  DROP TABLE IF EXISTS employees;
`);
db.close();
console.log("Dropped all tables.");

execSync("node db/seed.js", { cwd: root, stdio: "inherit" });
execSync("node db/migrate.js", { cwd: root, stdio: "inherit" });

console.log("Database reset complete.");
