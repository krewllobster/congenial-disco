# Future Work

Ideas and enhancements that are out of scope for now but worth tracking.

## Anomaly Resolution Workflow

- **Mark anomaly as "fixed"** — Allow users to flag an anomaly as resolved and link the resolution to a fine, fee, or restitution record. This would add a `resolutions` table with fields for amount, type (fine/fee/restitution), linked correction ID, and notes. The anomalies view would show a "Resolved" status alongside the badge counts.

## Other Ideas

- **Authentication & access control** — Restrict who can apply/revert corrections. Role-based access (viewer vs. editor).
- **Batch corrections** — Apply the same fix across multiple rows at once (e.g. fix a rate typo that appears in 10 weeks).
- **CSV re-export** — Export the corrected dataset back to CSV for downstream systems.
- **Correction approval workflow** — Require a second user to approve corrections before they take effect.
- **Soft-delete / archive** — Instead of reverting corrections destructively, keep both old and new values active with a status flag.
- **In-situ time sheet editing** - Add cell-level correction capability for a time sheet to allow corrections from a high level view -- fix each cell and then hit update once. Each cell would create a distinct correction, but all in the same batch so that it is undoable
- **7-day work week corrections** — Add correction capability for 7-day work weeks (currently informational only).
- **Employee designations (e.g. Journeyman, Apprentice) by date range** - At the moment, an employee can only ever be a single classification. IRL, workers will progress, and so the classification needs to be tied to the timesheets as well as the employee. This would allow for us to automatically detect promotions/changes over time and create different ways of displaying the data-per-role.
