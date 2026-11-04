const { useAzureMonitor } = require('@azure/monitor-opentelemetry');

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  useAzureMonitor();

}
const express = require('express');
const sql = require('mssql');

const app = express();

function escapeHtml(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

app.get('/', async (_req, res) => {
  try {
    const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    const { recordset: employees } = await pool.request().query(`
      SELECT EmployeeID, EmployeeName, Department
      FROM dbo.Employees
      ORDER BY EmployeeID
    `);

    const rows = employees.map(employee => `
      <tr>
        <td>${escapeHtml(employee.EmployeeID)}</td>
        <td>${escapeHtml(employee.EmployeeName)}</td>
        <td>${escapeHtml(employee.Department)}</td>
      </tr>
    `).join('');

    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Employee Directory</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f1f5f9; color: #172033; font: 1rem system-ui, sans-serif; }
    main { width: min(92%, 760px); margin: 4rem auto; }
    header { margin-bottom: 1.5rem; }
    h1 { margin: 0 0 .4rem; font-size: clamp(1.8rem, 5vw, 2.6rem); }
    p { margin: 0; color: #475569; }
    .table-card { overflow-x: auto; background: white; border-radius: .8rem; border: 1px solid #dbe3ee; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: .9rem 1rem; text-align: left; }
    th { background: #1e3a5f; color: white; }
    tbody tr + tr { border-top: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Employee Directory</h1>
      <p>Azure SQL Database · ${employees.length} employee records</p>
    </header>
    <div class="table-card">
      <table aria-label="Employees">
        <thead>
          <tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Department</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="3">No employees found.</td></tr>'}</tbody>
      </table>
    </div>
  </main>
</body>
</html>`);
  } catch (error) {
    console.error('Employee query failed', error.code || error.name);
    res.status(500).type('text/plain').send('Could not load employees.');
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0');
