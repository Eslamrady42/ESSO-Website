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

    json_response([
        'success' => true,
        'project' => [
            'token' => $p['token'],
            'created_at' => $p['created_at'],
            'status' => $p['status'],
            'analysis' => $p['analysis'],
            'digital_model' => $p['digital_model'],
            'review_required' => $p['analysis']['needs_review'] ?? [],
        ],
    ]);
}

fail_json('Method not allowed.', 405);
