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
    // Saving projects is rate-limited separately from upload and AI analysis.
    if (!rate_limit('project-save:'.client_ip(), 10, 900)) {
        fail_json('Too many project submissions. Please try again later.', 429);
    }

    $project = is_array($in['project'] ?? null) ? $in['project'] : [];
    $project['name'] = clean_string($project['name'] ?? '', 120);
    $project['email'] = clean_string($project['email'] ?? '', 160);
    $project['phone'] = clean_string($project['phone'] ?? '', 60);

    // Server-side validation is required even when the browser form has required fields.
    if ($project['name'] === '' || !valid_email($project['email']) || $project['phone'] === '') {
        fail_json('Please provide a valid name, email and phone number.', 422);
    }

    // Rebuild analysis-dependent recommendations on the server instead of trusting browser-supplied BOQ values.
    $analysis = validate_analysis(is_array($in['analysis'] ?? null) ? $in['analysis'] : []);
    $requirements = clean_array($project['requirements'] ?? [], 30);
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
    if (!rate_limit('project-read:'.client_ip(), 120, 600)) {
        fail_json('Too many report requests. Please try again later.', 429);
    }

    // New references use 32 hex characters; load_project still allows legacy 12-character links.
    $token = clean_string($_GET['token'] ?? '', 32);
    $p = load_project(strtoupper($token));
    if (!$p) {
        fail_json('Project not found.', 404);
    }

    // Recalculate current server-side recommendations and prices for older saved reports too.
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
