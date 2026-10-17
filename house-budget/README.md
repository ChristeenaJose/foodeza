# House Budget

Private household bookkeeping. Not a Foodeza business tool.

Same kind of stack as the Foodeza staff tools: **PHP + JSON file storage + HTML/JS + Bootstrap**.

- Income
- Expenses
- Pending payments — when money arrives, click **Payment received** and it is added to income
- Month filter and running balance

## Run on your Mac

1. Install PHP if needed:

```bash
brew install php
```

2. Open Terminal in this folder:

```bash
cd /Users/christeenajose/Projects/house-budget-calculator
php -S localhost:8080
```

3. In the browser open:

http://localhost:8080

Leave the Terminal window open while you use the app.

No MySQL is required. Data is stored in `data/ledger.json`.

## Optional PIN

Edit `config.php` and set `'pin' => '1234'` (use your own number). Reload the browser.
