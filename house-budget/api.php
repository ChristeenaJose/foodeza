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
$dataFile = __DIR__ . '/data/ledger.json';

function hb_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return $_POST ?: [];
    }
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function hb_fail(int $code, string $error): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function hb_ok(array $extra = []): void
{
    echo json_encode(['ok' => true] + $extra, JSON_UNESCAPED_UNICODE);
    exit;
}

function hb_empty_ledger(): array
{
    return [
        'months' => [],
        'entries' => [],
    ];
}

function hb_with_ledger(string $path, callable $fn)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (!is_file($path)) {
        file_put_contents($path, json_encode(hb_empty_ledger(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
    $fp = fopen($path, 'c+');
    if ($fp === false) {
        hb_fail(500, 'cannot_open_ledger');
    }
    try {
        if (!flock($fp, LOCK_EX)) {
            hb_fail(500, 'cannot_lock_ledger');
        }
        rewind($fp);
        $raw = stream_get_contents($fp);
        $data = hb_empty_ledger();
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $data['months'] = isset($decoded['months']) && is_array($decoded['months']) ? $decoded['months'] : [];
                $data['entries'] = isset($decoded['entries']) && is_array($decoded['entries']) ? $decoded['entries'] : [];
            }
        }
        $result = $fn($data);
        if (!empty($result['persist']) && isset($result['ledger']) && is_array($result['ledger'])) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($result['ledger'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            fflush($fp);
        }
        if (!isset($result['ledger'])) {
            $result['ledger'] = $data;
        }
        return $result;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function hb_id(): string
{
    return bin2hex(random_bytes(8));
}

function hb_money($value): float
{
    if (is_string($value)) {
        $value = str_replace([' ', '€'], '', $value);
        $value = str_replace(',', '.', $value);
    }
    $n = (float) $value;
    return round($n, 2);
}

function hb_summarize(array $ledger, string $monthId): array
{
    $income = 0.0;
    $expense = 0.0;
    $pending = 0.0;
    foreach ($ledger['entries'] as $row) {
        if ($monthId !== '' && (string) ($row['monthId'] ?? '') !== $monthId) {
            continue;
        }
        $type = (string) ($row['type'] ?? '');
        $amount = hb_money($row['amount'] ?? 0);
        if ($type === 'income') {
            $income += $amount;
        } elseif ($type === 'expense') {
            $expense += $amount;
        } elseif ($type === 'pending' && empty($row['received'])) {
            $pending += $amount;
        }
    }
    return [
        'income' => round($income, 2),
        'expense' => round($expense, 2),
        'pending' => round($pending, 2),
        'balance' => round($income - $expense, 2),
    ];
}

$pin = isset($config['pin']) ? trim((string) $config['pin']) : '';
$action = '';
$body = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? (string) $_GET['action'] : 'list';
} else {
    $body = hb_body();
    $action = isset($body['action']) ? (string) $body['action'] : (isset($_GET['action']) ? (string) $_GET['action'] : '');
}

if ($pin !== '') {
    $authed = !empty($_SESSION['hb_ok']);
    if ($action === 'login') {
        $try = isset($body['pin']) ? (string) $body['pin'] : '';
        if (hash_equals($pin, $try)) {
            $_SESSION['hb_ok'] = true;
            hb_ok(['authed' => true]);
        }
        hb_fail(401, 'bad_pin');
    }
    if ($action === 'logout') {
        unset($_SESSION['hb_ok']);
        hb_ok(['authed' => false]);
    }
    if (!$authed) {
        hb_fail(401, 'auth_required');
    }
}

if ($action === 'list' || $action === '') {
    $monthId = isset($_GET['monthId']) ? (string) $_GET['monthId'] : '';
    $out = hb_with_ledger($dataFile, function (array $ledger) use ($monthId) {
        return ['ledger' => $ledger, 'monthId' => $monthId];
    });
    $ledger = $out['ledger'];
    hb_ok([
        'appName' => $config['app_name'] ?? 'House Budget',
        'currency' => $config['currency_symbol'] ?? '€',
        'authRequired' => $pin !== '',
        'months' => $ledger['months'],
        'entries' => $ledger['entries'],
        'totals' => hb_summarize($ledger, $monthId),
    ]);
}

if ($action === 'add_month') {
    $name = trim((string) ($body['name'] ?? ''));
    $year = trim((string) ($body['year'] ?? date('Y')));
    if ($name === '') {
        hb_fail(400, 'month_name_required');
    }
    $result = hb_with_ledger($dataFile, function (array $ledger) use ($name, $year) {
        $month = [
            'id' => hb_id(),
            'name' => $name,
            'year' => $year,
            'createdAt' => date('c'),
        ];
        $ledger['months'][] = $month;
        return ['ledger' => $ledger, 'month' => $month, 'persist' => true];
    });
    hb_ok(['month' => $result['month']]);
}

if ($action === 'add_entry') {
    $type = (string) ($body['type'] ?? '');
    if (!in_array($type, ['income', 'expense', 'pending'], true)) {
        hb_fail(400, 'bad_type');
    }
    $title = trim((string) ($body['title'] ?? ''));
    $amount = hb_money($body['amount'] ?? 0);
    if ($title === '' || $amount <= 0) {
        hb_fail(400, 'title_and_amount_required');
    }
    $entry = [
        'id' => hb_id(),
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
    hb_with_ledger($dataFile, function (array $ledger) use ($entry) {
        $ledger['entries'][] = $entry;
        return ['ledger' => $ledger, 'persist' => true];
    });
    hb_ok(['entry' => $entry]);
}

if ($action === 'receive') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        hb_fail(400, 'id_required');
    }
    $result = hb_with_ledger($dataFile, function (array $ledger) use ($id) {
        $found = null;
        $income = null;
        foreach ($ledger['entries'] as &$row) {
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
                'id' => hb_id(),
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
            $ledger['entries'][] = $income;
            break;
        }
        unset($row);
        return ['ledger' => $ledger, 'pending' => $found, 'income' => $income, 'persist' => true];
    });
    if (empty($result['pending'])) {
        hb_fail(404, 'pending_not_found');
    }
    hb_ok(['pending' => $result['pending'], 'income' => $result['income']]);
}

if ($action === 'delete_entry') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        hb_fail(400, 'id_required');
    }
    hb_with_ledger($dataFile, function (array $ledger) use ($id) {
        $ledger['entries'] = array_values(array_filter(
            $ledger['entries'],
            static function ($row) use ($id) {
                return (string) ($row['id'] ?? '') !== $id;
            }
        ));
        return ['ledger' => $ledger, 'persist' => true];
    });
    hb_ok();
}

if ($action === 'delete_month') {
    $id = (string) ($body['id'] ?? '');
    if ($id === '') {
        hb_fail(400, 'id_required');
    }
    hb_with_ledger($dataFile, function (array $ledger) use ($id) {
        $ledger['months'] = array_values(array_filter(
            $ledger['months'],
            static function ($row) use ($id) {
                return (string) ($row['id'] ?? '') !== $id;
            }
        ));
        $ledger['entries'] = array_values(array_filter(
            $ledger['entries'],
            static function ($row) use ($id) {
                return (string) ($row['monthId'] ?? '') !== $id;
            }
        ));
        return ['ledger' => $ledger, 'persist' => true];
    });
    hb_ok();
}

hb_fail(400, 'unknown_action');
