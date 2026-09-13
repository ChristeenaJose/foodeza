<?php
$config = require __DIR__ . '/config.php';
$appName = htmlspecialchars((string) ($config['app_name'] ?? 'House Budget'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title><?php echo $appName; ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <header class="topbar">
    <div class="container-fluid wrap py-0 d-flex align-items-center justify-content-between gap-2">
      <h1 id="appTitle"><i class="fa-solid fa-house me-2"></i><?php echo $appName; ?></h1>
      <span class="small opacity-75">Private household bookkeeping</span>
    </div>
  </header>

  <div id="loginScreen" hidden>
    <div class="panel login-box">
      <h2 class="h5 mb-3">Enter PIN</h2>
      <form id="loginForm">
        <input class="form-control mb-2" id="pinInput" type="password" autocomplete="current-password" placeholder="PIN">
        <p id="loginError" class="text-danger small" hidden>Wrong PIN.</p>
        <button class="btn btn-dark w-100" type="submit">Open</button>
      </form>
    </div>
  </div>

  <main id="appScreen" class="wrap">
    <div class="d-flex flex-wrap gap-2 align-items-end mb-4">
      <div>
        <label class="form-label small mb-1" for="monthSelect">Month</label>
        <select id="monthSelect" class="form-select"></select>
      </div>
      <div>
        <label class="form-label small mb-1" for="newMonthName">New month</label>
        <input id="newMonthName" class="form-control" placeholder="September">
      </div>
      <div>
        <label class="form-label small mb-1" for="newMonthYear">Year</label>
        <input id="newMonthYear" class="form-control" style="width:7rem">
      </div>
      <button id="addMonthBtn" class="btn btn-dark" type="button">Add month</button>
      <div class="ms-auto small text-muted" id="currentMonthLabel"></div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="stat-card stat-income">
          <div class="label">Income</div>
          <div class="value" id="sumIncome">0,00 €</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card stat-expense">
          <div class="label">Expenses</div>
          <div class="value" id="sumExpense">0,00 €</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card stat-pending">
          <div class="label">Pending payments</div>
          <div class="value" id="sumPending">0,00 €</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card">
          <div class="label">Balance</div>
          <div class="value" id="sumBalance">0,00 €</div>
        </div>
      </div>
    </div>

    <div class="btn-group mb-3" role="tablist">
      <button class="btn btn-outline-dark" data-tab="income" type="button">Income</button>
      <button class="btn btn-outline-dark" data-tab="expense" type="button">Expenses</button>
      <button class="btn btn-outline-dark active" data-tab="pending" type="button">Pending payments</button>
    </div>

    <section class="panel mb-3" data-panel="income" hidden>
      <h2 class="h5 mb-3">Income</h2>
      <div class="form-grid mb-3">
        <input id="incomeTitle" class="form-control" placeholder="Salary, refund…">
        <input id="incomeAmount" class="form-control" placeholder="Amount">
        <input id="incomeCategory" class="form-control" placeholder="Category">
        <input id="dateIncome" class="form-control" type="date">
        <button id="addIncomeBtn" class="btn btn-success" type="button">Add</button>
      </div>
      <input id="incomeNote" class="form-control mb-3" placeholder="Note (optional)">
      <div id="incomeList"></div>
    </section>

    <section class="panel mb-3" data-panel="expense" hidden>
      <h2 class="h5 mb-3">Expenses</h2>
      <div class="form-grid mb-3">
        <input id="expenseTitle" class="form-control" placeholder="Rent, food, bill…">
        <input id="expenseAmount" class="form-control" placeholder="Amount">
        <input id="expenseCategory" class="form-control" placeholder="Category">
        <input id="dateExpense" class="form-control" type="date">
        <button id="addExpenseBtn" class="btn btn-danger" type="button">Add</button>
      </div>
      <input id="expenseNote" class="form-control mb-3" placeholder="Note (optional)">
      <div id="expenseList"></div>
    </section>

    <section class="panel mb-3" data-panel="pending">
      <h2 class="h5 mb-3">Pending payments</h2>
      <p class="small text-muted">Money still to arrive. When it comes, click <strong>Payment received</strong> and it is added to income.</p>
      <div class="form-grid mb-3">
        <input id="pendingTitle" class="form-control" placeholder="Who / what">
        <input id="pendingAmount" class="form-control" placeholder="Amount">
        <input id="pendingCategory" class="form-control" placeholder="Category">
        <input id="datePending" class="form-control" type="date">
        <button id="addPendingBtn" class="btn btn-warning" type="button">Add pending</button>
      </div>
      <input id="pendingNote" class="form-control mb-3" placeholder="Note (optional)">
      <div id="pendingList"></div>
    </section>
  </main>

  <script src="js/app.js"></script>
</body>
</html>
