# Future Work

Ideas and enhancements that are out of scope for now but worth tracking.

## Anomaly Resolution Workflow

- **Mark anomaly as "fixed"** — Allow users to flag an anomaly as resolved and link the resolution to a fine, fee, or restitution record. This would add a `resolutions` table with fields for amount, type (fine/fee/restitution), linked correction ID, and notes. The anomalies view would show a "Resolved" status alongside the badge counts.

## Other Ideas

- **Authentication & access control** — Restrict who can apply/revert corrections. Role-based access (viewer vs. editor).
- **Batch corrections** — Apply the same fix across multiple rows at once (e.g. fix a rate typo that appears in 10 weeks).
- **Configurable anomaly rules** — Let users define their own anomaly detection thresholds (e.g. max weekly hours, overtime trigger point, minimum daily hours) rather than hard-coding them, so the tool adapts to different labor agreements or jurisdictions.
- **Correction approval workflow** — Require a second user to approve corrections before they take effect.
- **CSV/file import pipeline with validation** — Build a more robust import flow that previews incoming data, flags format errors or duplicates before committing, and supports drag-and-drop. Focuses on the real-world UX of getting data into the system, not just what happens after it's there.
- **CSV re-export** — Export the corrected dataset back to CSV for downstream systems.
- **Data visualization & reporting** — Add charts for hours worked over time, overtime trends per employee, and anomaly frequency breakdowns. A visual layer makes patterns obvious at a glance and shows thinking about data presentation, not just data processing.
- **Employee designations (e.g. Journeyman, Apprentice) by date range** — At the moment, an employee can only ever be a single classification. IRL, workers will progress, and so the classification needs to be tied to the timesheets as well as the employee. This would allow for automatically detecting promotions/changes over time and creating different ways of displaying data per role.
- **In-situ timesheet editing** — Add cell-level correction capability for a timesheet to allow corrections from a high-level view — fix each cell and then hit update once. Each cell would create a distinct correction, but all in the same batch so that it is undoable.
- **Project-level dashboard** — Add a "Projects" layer so users can manage multiple datasets (e.g. different job sites or contracts) under one account, with summary cards showing total hours, anomaly counts, and correction activity per project.
- **Soft-delete / archive** — Instead of reverting corrections destructively, keep both old and new values active with a status flag.
- **7-day work week corrections** — Add correction capability for 7-day work weeks (currently informational only).
