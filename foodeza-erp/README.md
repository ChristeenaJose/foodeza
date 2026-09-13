# Foodeza ERP

Internal staff system. **Not** the public website. Do not replace foodeza.de homepage with this.

Same tech as Foodeza staff tools: **PHP + JSON + HTML/JS + Bootstrap**.

Modules:

1. **Bookkeeping** — income, expenses, pending payments (tick received → income)
2. **Inventory** — stock items, +/− qty, low-stock flag
3. **Booking** — customer events, status enquiry → confirmed → done
4. **Menu** — dishes, price, veg/vegan/non-veg, on/off
5. **Service** — indoor, outdoor, food truck, live, delivery

## Run

```bash
cd foodeza-erp
php -S localhost:8080
```

Open http://localhost:8080

Optional PIN: set `'pin'` in `config.php`.
