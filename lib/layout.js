export function layout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Payroll Dashboard</title>
  <link rel="stylesheet" href="/stylesheets/charts.min.css">
  <link rel="stylesheet" href="/stylesheets/style.css">
  <script type="module">
    import hotwiredTurbo from "https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.12/+esm";
  </script>
</head>
<body>
  <nav>
    <a href="/">Summary</a>
    <a href="/employees">Employees</a>
    <a href="/anomalies">Anomalies</a>
  </nav>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;
}
