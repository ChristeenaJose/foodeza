<?php
/**
 * Central storage for market / online preorders → ../files/generated/online-order/market/orders.json
 *
 * Webserver user (e.g. www-data, _www) must be allowed to create/write this file and folder.
 *
 * POST (public if allow_public_append): { "action":"append", "order": { "name","pickupTime","items","total" [, "source"] } }
 * GET (auth): returns { "ok": true, "orders": [ ... ] }
 * PATCH (auth): { "orderNumber": 123, "collected": true|false }
 * PUT (auth): { "orders": [ ... ] } replaces entire list (import / clear)
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configPath = __DIR__ . '/foodeza-orders-config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error' => 'config_missing',
        'hint' => 'Copy api/foodeza-orders-config.example.php to api/foodeza-orders-config.php and set secret.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/** @var array{secret: string, allow_public_append?: bool, orders_file?: string} $config */
$config = require $configPath;
$secret = isset($config['secret']) ? (string) $config['secret'] : '';
$allowPublicAppend = !isset($config['allow_public_append']) || $config['allow_public_append'] !== false;

$ordersFile = isset($config['orders_file']) && is_string($config['orders_file']) && trim($config['orders_file']) !== ''
    ? trim($config['orders_file'])
    : dirname(__DIR__) . '/files/generated/online-order/market/orders.json';

function foodeza_read_auth_header(): string
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION']) && preg_match('/Bearer\s+(\S+)/i', (string) $_SERVER['HTTP_AUTHORIZATION'], $m)) {
        return trim($m[1]);
    }
    if (!empty($_SERVER['HTTP_X_API_KEY'])) {
        return trim((string) $_SERVER['HTTP_X_API_KEY']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) && preg_match('/Bearer\s+(\S+)/i', (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'], $m)) {
        return trim($m[1]);
    }
    return '';
}

function foodeza_auth_ok(array $config, string $provided): bool
{
    $secret = isset($config['secret']) ? (string) $config['secret'] : '';
    if (strlen($secret) < 16) {
        return false;
    }
    if (strpos($secret, 'CHANGE_ME') !== false) {
        return false;
    }
    return hash_equals($secret, $provided);
}

function foodeza_read_orders(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function foodeza_write_orders(string $path, array $orders): bool
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
            return false;
        }
    }
    $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
    $json = json_encode($orders, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    if (file_put_contents($tmp, $json, LOCK_EX) === false) {
        return false;
    }
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/** @return mixed */
function foodeza_with_orders_lock(string $path, callable $fn)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (!is_file($path)) {
        touch($path);
    }
    $fp = fopen($path, 'c+');
    if ($fp === false) {
        return null;
    }
    try {
        if (!flock($fp, LOCK_EX)) {
            return null;
        }
        rewind($fp);
        $raw = stream_get_contents($fp);
        if ($raw === false) {
            $raw = '';
        }
        $orders = [];
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            $orders = is_array($decoded) ? $decoded : [];
        }
        $result = $fn($orders);
        if (is_array($result)) {
            ftruncate($fp, 0);
            rewind($fp);
            $out = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if ($out !== false) {
                fwrite($fp, $out);
                fflush($fp);
            }
        }
        return $result;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

function foodeza_validate_append_order(array $o): ?string
{
    $name = isset($o['name']) ? trim((string) $o['name']) : '';
    if ($name === '' || strlen($name) > 120) {
        return 'invalid_name';
    }
    $pickup = isset($o['pickupTime']) ? trim((string) $o['pickupTime']) : '';
    if ($pickup === '' || strlen($pickup) > 60) {
        return 'invalid_pickup';
    }
    if (!isset($o['items']) || !is_array($o['items']) || count($o['items']) > 50 || count($o['items']) < 1) {
        return 'invalid_items';
    }
    foreach ($o['items'] as $it) {
        if (!is_array($it)) {
            return 'invalid_item_shape';
        }
        $nm = isset($it['name']) ? (string) $it['name'] : '';
        if (strlen($nm) > 200) {
            return 'invalid_item_name';
        }
        $qty = isset($it['qty']) ? (int) $it['qty'] : 0;
        if ($qty < 1 || $qty > 99) {
            return 'invalid_item_qty';
        }
    }
    if (!isset($o['total']) || !is_numeric($o['total'])) {
        return 'invalid_total';
    }
    $total = (float) $o['total'];
    if ($total < 0 || $total > 10000) {
        return 'invalid_total_range';
    }
    return null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$auth = foodeza_read_auth_header();

// ——— GET: list all (staff) ———
if ($method === 'GET') {
    if (!foodeza_auth_ok($config, $auth)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    $orders = foodeza_read_orders($ordersFile);
    echo json_encode(['ok' => true, 'orders' => $orders], JSON_UNESCAPED_UNICODE);
    exit;
}

// ——— POST: append (public) or future extensions ———
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_json'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $action = isset($body['action']) ? (string) $body['action'] : 'append';

    if ($action === 'append') {
        if (!$allowPublicAppend) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => 'public_append_disabled'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $orderIn = isset($body['order']) && is_array($body['order']) ? $body['order'] : null;
        if (!$orderIn) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'missing_order'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $err = foodeza_validate_append_order($orderIn);
        if ($err !== null) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $err], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $newOrder = null;
        $locked = foodeza_with_orders_lock($ordersFile, static function (array $orders) use ($orderIn, &$newOrder): array {
            $max = 1000;
            foreach ($orders as $row) {
                if (isset($row['orderNumber'])) {
                    $n = (int) $row['orderNumber'];
                    if ($n > $max) {
                        $max = $n;
                    }
                }
            }
            $num = $max + 1;
            $src = isset($orderIn['source']) ? trim((string) $orderIn['source']) : 'market';
            if (strlen($src) > 40) {
                $src = 'market';
            }
            $newOrder = [
                'source' => $src,
                'orderNumber' => $num,
                'orderTime' => (int) round(microtime(true) * 1000),
                'name' => trim((string) $orderIn['name']),
                'pickupTime' => trim((string) $orderIn['pickupTime']),
                'items' => $orderIn['items'],
                'total' => (float) $orderIn['total'],
                'collected' => false,
            ];
            $orders[] = $newOrder;
            return $orders;
        });

        if ($locked === null || $newOrder === null) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'write_failed'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        echo json_encode(['ok' => true, 'order' => $newOrder], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'unknown_action'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ——— PATCH: update collected ———
if ($method === 'PATCH') {
    if (!foodeza_auth_ok($config, $auth)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body) || !isset($body['orderNumber'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_patch'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $target = (string) $body['orderNumber'];
    $collected = !empty($body['collected']);

    $updated = foodeza_with_orders_lock($ordersFile, static function (array $orders) use ($target, $collected): array {
        foreach ($orders as $i => $row) {
            if (!isset($row['orderNumber'])) {
                continue;
            }
            if ((string) $row['orderNumber'] === $target) {
                $orders[$i]['collected'] = $collected;
                $orders[$i]['collectedAt'] = $collected ? (int) round(microtime(true) * 1000) : null;
                break;
            }
        }
        return $orders;
    });

    if ($updated === null) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'write_failed'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// ——— PUT: replace full list ———
if ($method === 'PUT') {
    if (!foodeza_auth_ok($config, $auth)) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'unauthorized'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $raw = file_get_contents('php://input');
    $body = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($body) || !isset($body['orders']) || !is_array($body['orders'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_put'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $orders = $body['orders'];
    if (count($orders) > 5000) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'too_many_orders'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (!foodeza_write_orders($ordersFile, $orders)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'write_failed'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['ok' => true, 'count' => count($orders)], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
