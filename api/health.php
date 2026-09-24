<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json('Method not allowed.', 405);
}

json_response([
    'success' => true,
    'php' => PHP_VERSION,
    'gemini_configured' => gemini_configured(),
    'openai_configured' => env_is_configured('OPENAI_API_KEY'),
    'gemini_model' => GEMINI_MODEL,
    'env_file_expected' => dirname(__DIR__).'/.env',
    'env_file_readable' => is_readable(dirname(__DIR__).'/.env'),
 'local_key_file_readable' => defined('ESSO_LOCAL_GEMINI_KEY') && ESSO_LOCAL_GEMINI_KEY !== '',
 'curl_available' => function_exists('curl_init'),
]);
