import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "payroll.db"), { readonly: true });
db.pragma("journal_mode = WAL");

export default db;
