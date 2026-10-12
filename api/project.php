<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
require_once __DIR__.'/csrf.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true);
    if (!is_array($in)) {
        fail_json('Invalid request.');
    }
    if (!csrf_valid($in['csrf_token'] ?? null)) {
        fail_json('Invalid security token.', 403);
    }

    // Rebuild analysis-dependent recommendations on the server instead of trusting browser-supplied BOQ values.
    $analysis = validate_analysis((array)($in['analysis'] ?? []));
    $project = is_array($in['project'] ?? null) ? $in['project'] : [];
    $requirements = clean_array($in['project']['requirements'] ?? [], 30);
    $recommendations = build_recommendations($analysis, $requirements);
    $boq = build_boq($recommendations);

    $result = save_project([
        'project' => $project,
        'analysis' => $analysis,
        'recommendations' => $recommendations,
        'boq' => $boq,
        'files' => is_array($in['files'] ?? null) ? $in['files'] : [],
    ]);

    json_response(['success' => true] + $result);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = clean_string($_GET['token'] ?? '', 12);
    $p = load_project(strtoupper($token));
    if (!$p) {
        fail_json('Project not found.', 404);
    }

    // Recalculate the customer-facing device list and prices using the current
    // server-side rules, so older saved projects also show the latest BOQ prices.
    $analysis = validate_analysis((array)($p['analysis'] ?? []));
    $requirements = clean_array($p['requirements'] ?? ($p['project']['requirements'] ?? []), 30);
    $recommendations = build_recommendations($analysis, $requirements);
    $boq = build_boq($recommendations);
    $model = is_array($p['digital_model'] ?? null) ? $p['digital_model'] : [];
    $model['devices'] = $recommendations;
    $model['boq'] = $boq;

    json_response([
        'success' => true,
        'project' => [
            'token' => $p['token'],
            'created_at' => $p['created_at'],
            'status' => $p['status'],
            'analysis' => $analysis,
            'digital_model' => $model,
            'review_required' => $analysis['needs_review'] ?? [],
        ],
    ]);
}

fail_json('Method not allowed.', 405);
