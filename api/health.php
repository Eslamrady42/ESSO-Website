<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

// Public health checks should not disclose PHP versions, environment paths,
// API-provider configuration, or whether a secret file exists.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json('Method not allowed.', 405);
}

json_response([
    'success' => true,
    'service' => 'ESSO API',
    'status' => 'online',
]);
