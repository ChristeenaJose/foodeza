<?php
/**
 * Deployment: copy this file to foodeza-orders-config.php (same folder) and set a long random secret.
 * Do not commit foodeza-orders-config.php to git.
 *
 * Staff uses this secret on online-orders.html (stored in session until tab closes).
 * Customer preorders (market.html) use POST without secret; keep "allow_public_append" true unless you add your own protection.
 */
return [
    'secret' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARS',
    /** New orders from market.html without API key (validated server-side). Set false only if you proxy orders another way. */
    'allow_public_append' => true,
    /**
     * Optional: absolute filesystem path *outside* the public web root (best privacy).
     * Example (Linux): '/home/USER/private/foodeza-market-orders.json'
     * Leave unset to use the default path under foodtruck/files/... (must stay protected by .htaccess).
     */
    // 'orders_file' => '/absolute/path/outside/public_html/foodeza-market-orders.json',
];
