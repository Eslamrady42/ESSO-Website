<?php
declare(strict_types=1);

/*
 * AR: يمنع هذا الاختبار اختلاف أسماء أو أسعار منتجات الخادم عن كتالوج الواجهة.
 * EN: Prevent the server-side order catalogue from drifting away from the browser catalogue.
 */

$root = dirname(__DIR__);
$sourcePath = $root.'/js/data.js';
if (!is_readable($sourcePath)) {
    fwrite(STDERR, "FAIL: js/data.js is missing or unreadable.\n");
    exit(1);
}

$source = file_get_contents($sourcePath);
$pattern = '/\{\s*id:\s*(\d+),\s*name:\s*("(?:\\\\.|[^"\\\\])*"),\s*description:\s*("(?:\\\\.|[^"\\\\])*"),\s*price:\s*([0-9]+(?:\.[0-9]+)?),\s*category:\s*("(?:\\\\.|[^"\\\\])*"),\s*image:\s*("(?:\\\\.|[^"\\\\])*")\s*\}/u';
$matchCount = preg_match_all($pattern, $source, $matches, PREG_SET_ORDER);
if ($matchCount === false || $matchCount === 0) {
    fwrite(STDERR, "FAIL: no product records could be parsed from js/data.js.\n");
    exit(1);
}

$browserCatalog = [];
foreach ($matches as $match) {
    $id = (int)$match[1];
    $name = json_decode($match[2], true);
    $category = json_decode($match[5], true);
    if ($id < 1 || !is_string($name) || $name === '' || !is_string($category) || $category === '') {
        fwrite(STDERR, "FAIL: invalid product row in js/data.js (ID {$id}).\n");
        exit(1);
    }
    if (isset($browserCatalog[$id])) {
        fwrite(STDERR, "FAIL: duplicate product ID {$id} in js/data.js.\n");
        exit(1);
    }
    $browserCatalog[$id] = [
        'name' => $name,
        'price' => (float)$match[4],
        'category' => $category,
    ];
}

$serverCatalog = require $root.'/config/shop-catalog.php';
if (!is_array($serverCatalog)) {
    fwrite(STDERR, "FAIL: config/shop-catalog.php did not return an array.\n");
    exit(1);
}

$errors = [];
foreach ($browserCatalog as $id => $product) {
    if (!isset($serverCatalog[$id]) || !is_array($serverCatalog[$id])) {
        $errors[] = "Product ID {$id} is missing from the server catalogue.";
        continue;
    }
    $serverProduct = $serverCatalog[$id];
    if (($serverProduct['name'] ?? null) !== $product['name']) {
        $errors[] = "Name differs for product ID {$id}.";
    }
    if (!is_numeric($serverProduct['price'] ?? null) || abs((float)$serverProduct['price'] - $product['price']) > 0.0001) {
        $errors[] = "Price differs for product ID {$id}.";
    }
    if (($serverProduct['category'] ?? null) !== $product['category']) {
        $errors[] = "Category differs for product ID {$id}.";
    }
}
foreach ($serverCatalog as $id => $_product) {
    if (!isset($browserCatalog[$id])) {
        $errors[] = "Server catalogue contains unknown product ID {$id}.";
    }
}

if ($errors) {
    fwrite(STDERR, "FAIL: server and browser catalogues differ:\n- ".implode("\n- ", $errors)."\n");
    exit(1);
}

echo "PASS: {$matchCount} product IDs, names, prices and categories match.\n";
