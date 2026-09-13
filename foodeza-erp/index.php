<?php
$config = require __DIR__ . '/config.php';
$appName = htmlspecialchars((string) ($config['app_name'] ?? 'Foodeza ERP'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title><?php echo $appName; ?></title>
  <link rel="icon" type="image/x-icon" href="../images/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <header class="topbar">
    <div class="wrap py-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <h1 id="appTitle"><i class="fa-solid fa-utensils me-2"></i><?php echo $appName; ?></h1>
      <nav class="nav-mod">
        <button type="button" class="active" data-mod="home">Home</button>
        <button type="button" data-mod="bookkeeping">Bookkeeping</button>
        <button type="button" data-mod="inventory">Inventory</button>
        <button type="button" data-mod="booking">Booking</button>
        <button type="button" data-mod="menu">Menu</button>
        <button type="button" data-mod="service">Service</button>
      </nav>
    </div>
  </header>

  <div id="loginScreen" hidden>
    <div class="panel login-box">
      <h2 class="h5 mb-3">Staff PIN</h2>
      <form id="loginForm">
        <input class="form-control mb-2" id="pinInput" type="password" autocomplete="current-password" placeholder="PIN">
        <p id="loginError" class="text-danger small" hidden>Wrong PIN.</p>
        <button class="btn btn-danger w-100" type="submit">Open ERP</button>
      </form>
    </div>
  </div>

  <main id="appScreen" class="wrap">
    <section data-mod-panel="home">
      <p class="text-muted mb-3">Internal Foodeza system. Bookkeeping is live. Inventory, booking, menu and service are next to it.</p>
      <div class="row g-3">
        <div class="col-6 col-lg-3"><button class="hub-card" data-mod="bookkeeping" type="button"><div class="label">Bookkeeping</div><div class="value" id="homeBalance">—</div><div class="small text-muted">Balance</div></button></div>
        <div class="col-6 col-lg-3"><button class="hub-card" data-mod="inventory" type="button"><div class="label">Inventory</div><div class="value" id="homeStock">—</div><div class="small text-muted" id="homeLow">Low stock</div></button></div>
        <div class="col-6 col-lg-3"><button class="hub-card" data-mod="booking" type="button"><div class="label">Booking</div><div class="value" id="homeBook">—</div><div class="small text-muted">Open bookings</div></button></div>
        <div class="col-6 col-lg-3"><button class="hub-card" data-mod="menu" type="button"><div class="label">Menu</div><div class="value" id="homeMenu">—</div><div class="small text-muted">Dishes</div></button></div>
      </div>
    </section>

    <section data-mod-panel="bookkeeping" hidden>
      <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
        <div>
          <label class="form-label small mb-1" for="monthSelect">Month</label>
          <select id="monthSelect" class="form-select"></select>
        </div>
        <input id="newMonthName" class="form-control" placeholder="September" style="max-width:10rem">
        <input id="newMonthYear" class="form-control" style="width:7rem">
        <button id="addMonthBtn" class="btn btn-dark" type="button">Add month</button>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3"><div class="stat-card stat-income"><div class="label">Income</div><div class="value" id="sumIncome">0</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card stat-expense"><div class="label">Expenses</div><div class="value" id="sumExpense">0</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card stat-pending"><div class="label">Pending</div><div class="value" id="sumPending">0</div></div></div>
        <div class="col-6 col-lg-3"><div class="stat-card"><div class="label">Balance</div><div class="value" id="sumBalance">0</div></div></div>
      </div>
      <div class="btn-group mb-3">
        <button class="btn btn-outline-dark" data-tab="income" type="button">Income</button>
        <button class="btn btn-outline-dark" data-tab="expense" type="button">Expenses</button>
        <button class="btn btn-outline-dark active" data-tab="pending" type="button">Pending payments</button>
      </div>
      <div class="panel mb-3" data-panel="income" hidden>
        <div class="form-grid mb-2">
          <input id="incomeTitle" class="form-control" placeholder="Catering invoice…">
          <input id="incomeAmount" class="form-control" placeholder="Amount">
          <input id="incomeCategory" class="form-control" placeholder="Category">
          <input id="dateIncome" class="form-control" type="date">
          <button id="addIncomeBtn" class="btn btn-success" type="button">Add</button>
        </div>
        <input id="incomeNote" class="form-control mb-2" placeholder="Note">
        <div id="incomeList"></div>
      </div>
      <div class="panel mb-3" data-panel="expense" hidden>
        <div class="form-grid mb-2">
          <input id="expenseTitle" class="form-control" placeholder="Stock, fuel…">
          <input id="expenseAmount" class="form-control" placeholder="Amount">
          <input id="expenseCategory" class="form-control" placeholder="Category">
          <input id="dateExpense" class="form-control" type="date">
          <button id="addExpenseBtn" class="btn btn-danger" type="button">Add</button>
        </div>
        <input id="expenseNote" class="form-control mb-2" placeholder="Note">
        <div id="expenseList"></div>
      </div>
      <div class="panel" data-panel="pending">
        <p class="small text-muted">When payment arrives, click Payment received — it is added to income.</p>
        <div class="form-grid mb-2">
          <input id="pendingTitle" class="form-control" placeholder="Who / event">
          <input id="pendingAmount" class="form-control" placeholder="Amount">
          <input id="pendingCategory" class="form-control" placeholder="Category">
          <input id="datePending" class="form-control" type="date">
          <button id="addPendingBtn" class="btn btn-warning" type="button">Add pending</button>
        </div>
        <input id="pendingNote" class="form-control mb-2" placeholder="Note">
        <div id="pendingList"></div>
      </div>
    </section>

    <section data-mod-panel="inventory" hidden>
      <div class="panel">
        <h2 class="h5 mb-3">Inventory</h2>
        <div class="form-grid mb-3">
          <input id="invName" class="form-control" placeholder="Rice, oil, paneer…">
          <input id="invQty" class="form-control" placeholder="Qty">
          <input id="invUnit" class="form-control" placeholder="kg / L / pcs" value="kg">
          <input id="invMin" class="form-control" placeholder="Min stock">
          <button id="addInvBtn" class="btn btn-dark" type="button">Add item</button>
        </div>
        <div id="invList"></div>
      </div>
    </section>

    <section data-mod-panel="booking" hidden>
      <div class="panel">
        <h2 class="h5 mb-3">Bookings</h2>
        <div class="form-grid-6 mb-3">
          <input id="bkCustomer" class="form-control" placeholder="Customer">
          <input id="bkPhone" class="form-control" placeholder="Phone">
          <input id="bkDate" class="form-control" type="date">
          <input id="bkGuests" class="form-control" placeholder="Guests">
          <select id="bkService" class="form-select"></select>
          <button id="addBkBtn" class="btn btn-dark" type="button">Add booking</button>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-md-4"><input id="bkAmount" class="form-control" placeholder="Quoted amount €"></div>
          <div class="col-md-8"><input id="bkNote" class="form-control" placeholder="Menu / notes"></div>
        </div>
        <div id="bkList"></div>
      </div>
    </section>

    <section data-mod-panel="menu" hidden>
      <div class="panel">
        <h2 class="h5 mb-3">Menu</h2>
        <div class="form-grid mb-3">
          <input id="mnName" class="form-control" placeholder="Dish name">
          <input id="mnCat" class="form-control" placeholder="Category" value="Mains">
          <input id="mnPrice" class="form-control" placeholder="Price">
          <select id="mnDiet" class="form-select">
            <option value="nonveg">Non-veg</option>
            <option value="veg">Veg</option>
            <option value="vegan">Vegan</option>
          </select>
          <button id="addMnBtn" class="btn btn-dark" type="button">Add dish</button>
        </div>
        <div id="mnList"></div>
      </div>
    </section>

    <section data-mod-panel="service" hidden>
      <div class="panel">
        <h2 class="h5 mb-3">Services</h2>
        <div class="row g-2 mb-3">
          <div class="col-md-4"><input id="svName" class="form-control" placeholder="Service name"></div>
          <div class="col-md-6"><input id="svDesc" class="form-control" placeholder="Description"></div>
          <div class="col-md-2"><button id="addSvBtn" class="btn btn-dark w-100" type="button">Add</button></div>
        </div>
        <div id="svList"></div>
      </div>
    </section>
  </main>
  <script src="js/app.js"></script>
</body>
</html>
