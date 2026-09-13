<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = require __DIR__ . '/config.php';
$dataFile = __DIR__ . '/data/erp.json';

function erp_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return $_POST ?: [];
    }
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function erp_fail(int $code, string $error): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function erp_ok(array $extra = []): void
{
    echo json_encode(['ok' => true] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function erp_id(): string
{
    return bin2hex(random_bytes(8));
}

function erp_money($value): float
{
    if (is_string($value)) {
        $value = str_replace([' ', '€'], '', $value);
        $value = str_replace(',', '.', $value);
    }
    return round((float) $value, 2);
}

function erp_default_services(): array
{
    $now = date('c');
    $names = [
        ['Indoor Catering', 'Food display and service in your venue.'],
        ['Outdoor Catering', 'Garden parties, festivals and open-air events.'],
        ['Food Truck Service', 'Live service from the Foodeza food truck.'],
        ['Live Food Experience', 'Live cooking and food stations on site.'],
        ['Delivery', 'Freshly prepared food delivered ready to serve.'],
    ];
    $out = [];
    foreach ($names as $row) {
        $out[] = [
            'id' => erp_id(),
            'name' => $row[0],
            'description' => $row[1],
            'active' => true,
            'createdAt' => $now,
        ];
    }
    return $out;
}

function erp_empty_store(): array
{
    return [
        'months' => [],
        'entries' => [],
        'inventory' => [],
        'bookings' => [],
        'menu' => [],
        'services' => erp_default_services(),
    ];
}

function erp_normalize(array $decoded): array
{
    $data = erp_empty_store();
    foreach (['months', 'entries', 'inventory', 'bookings', 'menu'] as $key) {
        $data[$key] = isset($decoded[$key]) && is_array($decoded[$key]) ? $decoded[$key] : [];
    }
    if (isset($decoded['services']) && is_array($decoded['services']) && $decoded['services']) {
        $data['services'] = $decoded['services'];
    }
    return $data;
}

function erp_with_store(string $path, callable $fn)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (!is_file($path)) {
        file_put_contents($path, json_encode(erp_empty_store(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
    $fp = fopen($path, 'c+');
    if ($fp === false) {
        erp_fail(500, 'cannot_open_store');
    }
    try {
        if (!flock($fp, LOCK_EX)) {
            erp_fail(500, 'cannot_lock_store');
        }
        rewind($fp);
        $raw = stream_get_contents($fp);
        $data = erp_empty_store();
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $data = erp_normalize($decoded);
            }
        }
        $result = $fn($data);
        if (!empty($result['persist']) && isset($result['store']) && is_array($result['store'])) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($result['store'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            fflush($fp);
        }
        if (!isset($result['store'])) {
            $result['store'] = $data;
        }
        return $result;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function erp_summarize(array $store, string $monthId): array
{
    $income = 0.0;
    $expense = 0.0;
    $pending = 0.0;
    foreach ($store['entries'] as $row) {
        if ($monthId !== '' && (string) ($row['monthId'] ?? '') !== $monthId) {
            continue;
        }
        $type = (string) ($row['type'] ?? '');
        $amount = erp_money($row['amount'] ?? 0);
        if ($type === 'income') {
            $income += $amount;
        } elseif ($type === 'expense') {
            $expense += $amount;
        } elseif ($type === 'pending' && empty($row['received'])) {
            $pending += $amount;
        }
    }
    $lowStock = 0;
    foreach ($store['inventory'] as $item) {
        if ((float) ($item['qty'] ?? 0) <= (float) ($item['minQty'] ?? 0)) {
            $lowStock++;
        }
    }
    $openBookings = 0;
    foreach ($store['bookings'] as $b) {
        $st = (string) ($b['status'] ?? 'enquiry');
        if (in_array($st, ['enquiry', 'confirmed'], true)) {
            $openBookings++;
        }
    }
    return [
        'income' => round($income, 2),
        'expense' => round($expense, 2),
        'pending' => round($pending, 2),
        'balance' => round($income - $expense, 2),
        'inventoryCount' => count($store['inventory']),
        'lowStock' => $lowStock,
        'bookingCount' => count($store['bookings']),
        'openBookings' => $openBookings,
        'menuCount' => count($store['menu']),
        'serviceCount' => count($store['services']),
    ];
}

function erp_delete_by_id(array $rows, string $id): array
{
    return array_values(array_filter($rows, static function ($row) use ($id) {
        return (string) ($row['id'] ?? '') !== $id;
    }));
}

$pin = isset($config['pin']) ? trim((string) $config['pin']) : '';
$action = '';
$body = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? (string) $_GET['action'] : 'list';
} else {
    $body = erp_body();
    $action = isset($body['action']) ? (string) $body['action'] : (isset($_GET['action']) ? (string) $_GET['action'] : '');
}

if ($pin !== '') {
    $authed = !empty($_SESSION['erp_ok']);
    if ($action === 'login') {
        $try = isset($body['pin']) ? (string) $body['pin'] : '';
        if (hash_equals($pin, $try)) {
            $_SESSION['erp_ok'] = true;
            erp_ok(['authed' => true]);
        }
        erp_fail(401, 'bad_pin');
    }
    if ($action === 'logout') {
        unset($_SESSION['erp_ok']);
        erp_ok(['authed' => false]);
    }
    if (!$authed) {
        erp_fail(401, 'auth_required');
    }
}

if ($action === 'list' || $action === '') {
    $monthId = isset($_GET['monthId']) ? (string) $_GET['monthId'] : '';
    $out = erp_with_store($dataFile, function (array $store) {
        return ['store' => $store];
    });
    $store = $out['store'];
    erp_ok([
        'appName' => $config['app_name'] ?? 'Foodeza ERP',
        'currency' => $config['currency_symbol'] ?? '€',
        'authRequired' => $pin !== '',
        'months' => $store['months'],
        'entries' => $store['entries'],
        'inventory' => $store['inventory'],
        'bookings' => $store['bookings'],
        'menu' => $store['menu'],
        'services' => $store['services'],
        'totals' => erp_summarize($store, $monthId),
    ]);
}

if ($action === 'add_month') {
    $name = trim((string) ($body['name'] ?? ''));
    $year = trim((string) ($body['year'] ?? date('Y')));
    if ($name === '') {
        erp_fail(400, 'month_name_required');
    }
    $result = erp_with_store($dataFile, function (array $store) use ($name, $year) {
        $month = ['id' => erp_id(), 'name' => $name, 'year' => $year, 'createdAt' => date('c')];
        $store['months'][] = $month;
        return ['store' => $store, 'month' => $month, 'persist' => true];
    });
    erp_ok(['month' => $result['month']]);
}

if ($action === 'add_entry') {
    $type = (string) ($body['type'] ?? '');
    if (!in_array($type, ['income', 'expense', 'pending'], true)) {
        erp_fail(400, 'bad_type');
    }
    $title = trim((string) ($body['title'] ?? ''));
    $amount = erp_money($body['amount'] ?? 0);
    if ($title === '' || $amount <= 0) {
        erp_fail(400, 'title_and_amount_required');
    }
    $entry = [
        'id' => erp_id(),
        'monthId' => (string) ($body['monthId'] ?? ''),
        'type' => $type,
        'title' => $title,
        'amount' => $amount,
        'category' => trim((string) ($body['category'] ?? '')),
        'date' => trim((string) ($body['date'] ?? date('Y-m-d'))),
        'note' => trim((string) ($body['note'] ?? '')),
        'received' => false,
        'receivedAt' => null,
        'createdAt' => date('c'),
    ];
    erp_with_store($dataFile, function (array $store) use ($entry) {
        $store['entries'][] = $entry;
        return ['store' => $store, 'persist' => true];
    });
    erp_ok(['entry' => $entry]);
}

if ($action === 'receive') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    $result = erp_with_store($dataFile, function (array $store) use ($id) {
        $found = null;
        $income = null;
        foreach ($store['entries'] as &$row) {
            if ((string) $row['id'] !== $id) {
                continue;
            }
            if (($row['type'] ?? '') !== 'pending' || !empty($row['received'])) {
                break;
            }
            $row['received'] = true;
            $row['receivedAt'] = date('c');
            $found = $row;
            $income = [
                'id' => erp_id(),
                'monthId' => $row['monthId'],
                'type' => 'income',
                'title' => $row['title'],
                'amount' => $row['amount'],
                'category' => $row['category'] ?: 'Pending payment',
                'date' => date('Y-m-d'),
                'note' => trim('Received from pending: ' . ($row['note'] ?? '')),
                'received' => true,
                'receivedAt' => date('c'),
                'fromPendingId' => $row['id'],
                'createdAt' => date('c'),
            ];
            $store['entries'][] = $income;
            break;
        }
        unset($row);
        return ['store' => $store, 'pending' => $found, 'income' => $income, 'persist' => true];
    });
    if (empty($result['pending'])) {
        erp_fail(404, 'pending_not_found');
    }
    erp_ok(['pending' => $result['pending'], 'income' => $result['income']]);
}

if ($action === 'delete_entry') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    erp_with_store($dataFile, function (array $store) use ($id) {
        $store['entries'] = erp_delete_by_id($store['entries'], $id);
        return ['store' => $store, 'persist' => true];
    });
    erp_ok();
}

if ($action === 'add_inventory') {
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        erp_fail(400, 'name_required');
    }
    $item = [
        'id' => erp_id(),
        'name' => $name,
        'sku' => trim((string) ($body['sku'] ?? '')),
        'qty' => (float) ($body['qty'] ?? 0),
        'unit' => trim((string) ($body['unit'] ?? 'kg')) ?: 'kg',
        'minQty' => (float) ($body['minQty'] ?? 0),
        'note' => trim((string) ($body['note'] ?? '')),
        'createdAt' => date('c'),
    ];
    erp_with_store($dataFile, function (array $store) use ($item) {
        $store['inventory'][] = $item;
        return ['store' => $store, 'persist' => true];
    });
    erp_ok(['item' => $item]);
}

if ($action === 'adjust_inventory') {
    $id = (string) ($body['id'] ?? '');
    $delta = (float) ($body['delta'] ?? 0);
    if ($id === '' || $delta == 0.0) {
        erp_fail(400, 'id_and_delta_required');
    }
    $result = erp_with_store($dataFile, function (array $store) use ($id, $delta) {
        $found = null;
        foreach ($store['inventory'] as &$row) {
            if ((string) $row['id'] !== $id) {
                continue;
            }
            $row['qty'] = round(((float) $row['qty']) + $delta, 2);
            if ($row['qty'] < 0) {
                $row['qty'] = 0;
            }
            $found = $row;
            break;
        }
        unset($row);
        return ['store' => $store, 'item' => $found, 'persist' => (bool) $found];
    });
    if (empty($result['item'])) {
        erp_fail(404, 'item_not_found');
    }
    erp_ok(['item' => $result['item']]);
}

if ($action === 'delete_inventory') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    erp_with_store($dataFile, function (array $store) use ($id) {
        $store['inventory'] = erp_delete_by_id($store['inventory'], $id);
        return ['store' => $store, 'persist' => true];
    });
    erp_ok();
}

if ($action === 'add_booking') {
    $customer = trim((string) ($body['customer'] ?? ''));
    $date = trim((string) ($body['date'] ?? ''));
    if ($customer === '' || $date === '') {
        erp_fail(400, 'customer_and_date_required');
    }
    $status = (string) ($body['status'] ?? 'enquiry');
    if (!in_array($status, ['enquiry', 'confirmed', 'done', 'cancelled'], true)) {
        $status = 'enquiry';
    }
    $booking = [
        'id' => erp_id(),
        'customer' => $customer,
        'phone' => trim((string) ($body['phone'] ?? '')),
        'date' => $date,
        'guests' => (int) ($body['guests'] ?? 0),
        'service' => trim((string) ($body['service'] ?? '')),
        'status' => $status,
        'amount' => erp_money($body['amount'] ?? 0),
        'note' => trim((string) ($body['note'] ?? '')),
        'createdAt' => date('c'),
    ];
    erp_with_store($dataFile, function (array $store) use ($booking) {
        $store['bookings'][] = $booking;
        return ['store' => $store, 'persist' => true];
    });
    erp_ok(['booking' => $booking]);
}

if ($action === 'set_booking_status') {
    $id = (string) ($body['id'] ?? '');
    $status = (string) ($body['status'] ?? '');
    if ($id === '' || !in_array($status, ['enquiry', 'confirmed', 'done', 'cancelled'], true)) {
        erp_fail(400, 'bad_status');
    }
    $result = erp_with_store($dataFile, function (array $store) use ($id, $status) {
        $found = null;
        foreach ($store['bookings'] as &$row) {
            if ((string) $row['id'] !== $id) {
                continue;
            }
            $row['status'] = $status;
            $found = $row;
            break;
        }
        unset($row);
        return ['store' => $store, 'booking' => $found, 'persist' => (bool) $found];
    });
    if (empty($result['booking'])) {
        erp_fail(404, 'booking_not_found');
    }
    erp_ok(['booking' => $result['booking']]);
}

if ($action === 'delete_booking') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    erp_with_store($dataFile, function (array $store) use ($id) {
        $store['bookings'] = erp_delete_by_id($store['bookings'], $id);
        return ['store' => $store, 'persist' => true];
    });
    erp_ok();
}

if ($action === 'add_menu') {
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        erp_fail(400, 'name_required');
    }
    $item = [
        'id' => erp_id(),
        'name' => $name,
        'category' => trim((string) ($body['category'] ?? 'Mains')),
        'price' => erp_money($body['price'] ?? 0),
        'diet' => in_array(($body['diet'] ?? 'nonveg'), ['veg', 'vegan', 'nonveg'], true) ? (string) $body['diet'] : 'nonveg',
        'active' => true,
        'note' => trim((string) ($body['note'] ?? '')),
        'createdAt' => date('c'),
    ];
    erp_with_store($dataFile, function (array $store) use ($item) {
        $store['menu'][] = $item;
        return ['store' => $store, 'persist' => true];
    });
    erp_ok(['item' => $item]);
}

if ($action === 'toggle_menu') {
    $id = (string) ($body['id'] ?? '');
    $result = erp_with_store($dataFile, function (array $store) use ($id) {
        $found = null;
        foreach ($store['menu'] as &$row) {
            if ((string) $row['id'] !== $id) {
                continue;
            }
            $row['active'] = empty($row['active']);
            $found = $row;
            break;
        }
        unset($row);
        return ['store' => $store, 'item' => $found, 'persist' => (bool) $found];
    });
    if (empty($result['item'])) {
        erp_fail(404, 'item_not_found');
    }
    erp_ok(['item' => $result['item']]);
}

if ($action === 'delete_menu') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    erp_with_store($dataFile, function (array $store) use ($id) {
        $store['menu'] = erp_delete_by_id($store['menu'], $id);
        return ['store' => $store, 'persist' => true];
    });
    erp_ok();
}

if ($action === 'add_service') {
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        erp_fail(400, 'name_required');
    }
    $item = [
        'id' => erp_id(),
        'name' => $name,
        'description' => trim((string) ($body['description'] ?? '')),
        'active' => true,
        'createdAt' => date('c'),
    ];
    erp_with_store($dataFile, function (array $store) use ($item) {
        $store['services'][] = $item;
        return ['store' => $store, 'persist' => true];
    });
    erp_ok(['item' => $item]);
}

if ($action === 'toggle_service') {
    $id = (string) ($body['id'] ?? '');
    $result = erp_with_store($dataFile, function (array $store) use ($id) {
        $found = null;
        foreach ($store['services'] as &$row) {
            if ((string) $row['id'] !== $id) {
                continue;
            }
            $row['active'] = empty($row['active']);
            $found = $row;
            break;
        }
        unset($row);
        return ['store' => $store, 'item' => $found, 'persist' => (bool) $found];
    });
    if (empty($result['item'])) {
        erp_fail(404, 'item_not_found');
    }
    erp_ok(['item' => $result['item']]);
}

if ($action === 'delete_service') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        erp_fail(400, 'id_required');
    }
    erp_with_store($dataFile, function (array $store) use ($id) {
        $store['services'] = erp_delete_by_id($store['services'], $id);
        return ['store' => $store, 'persist' => true];
    });
    erp_ok();
}

erp_fail(400, 'unknown_action');
