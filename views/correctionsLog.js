export function correctionsLogView({ corrections, flash, error }) {
  const flashHtml = flash ? `<div class="flash flash-success">${flash}</div>` : "";
  const errorHtml = error ? `<div class="flash flash-error">${error}</div>` : "";

  // Track which batch_ids we've already rendered a revert button for
  const batchSeen = new Set();

  const rows = corrections.map((c) => {
    let statusCell;
    if (c.reverted_at) {
      statusCell = `<span class="correction-reverted">Reverted ${c.reverted_at}</span>`;
    } else if (c.batch_id && batchSeen.has(c.batch_id)) {
      // Another row in this batch already has the revert button
      statusCell = `<span class="correction-batch-note">batch</span>`;
    } else {
      if (c.batch_id) batchSeen.add(c.batch_id);
      statusCell = `
        <form method="POST" action="/anomalies/revert" style="display:inline">
          <input type="hidden" name="correction_id" value="${c.id}">
          <button type="submit" class="btn-revert">Revert${c.batch_id ? " all" : ""}</button>
        </form>`;
    }

    return `
    <tr class="${c.reverted_at ? "row-reverted" : ""}">
      <td>${c.id}</td>
      <td>${c.correction_type}</td>
      <td>${c.target_table}[${c.target_id}]</td>
      <td>${c.field || "—"}</td>
      <td>${c.old_value}</td>
      <td>${c.new_value}</td>
      <td>${c.reason || "—"}</td>
      <td>${c.created_at}</td>
      <td>${statusCell}</td>
    </tr>`;
  }).join("");

  return `
  ${flashHtml}${errorHtml}
  <p><a href="/anomalies">&larr; Back to anomalies</a></p>
  <p class="table-note">All corrections are logged here with old and new values. Revert any correction to restore the original data.</p>

  ${corrections.length ? `
  <table class="data-table">
    <thead>
      <tr>
        <th>#</th><th>Type</th><th>Target</th><th>Field</th>
        <th>Old Value</th><th>New Value</th><th>Reason</th>
        <th>Applied</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>` : "<p>No corrections have been made yet.</p>"}`;
}
