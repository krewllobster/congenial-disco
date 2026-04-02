import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "payroll.db"));

db.pragma("journal_mode = WAL");

db.exec(readFileSync(join(__dirname, "schema.sql"), "utf-8"));

console.log("Migration complete — corrections table created.");
db.close();
