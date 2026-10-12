<?php
declare(strict_types=1);
require_once __DIR__.'/functions.php';
require_once __DIR__.'/csrf.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail_json('Method not allowed.', 405);
}
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    fail_json('Invalid request.');
}
if (!csrf_valid($input['csrf_token'] ?? null)) {
    fail_json('Invalid security token.', 403);
}
if (!rate_limit('final:'.client_ip(), RATE_LIMIT_DESIGN_MAX, RATE_LIMIT_DESIGN_PERIOD)) {
    fail_json('Too many requests. Please try again later.', 429);
}

$token = strtoupper(clean_string($input['project_token'] ?? '', 32));
$project = load_project($token);
if (!$project) {
    fail_json('Project not found.', 404);
}

// Save the request before notifying the team. Never confirm success if persistence failed.
$project['status'] = 'conversion_requested';
$project['conversion_request_at'] = gmdate('c');
$project['customer_notes'] = clean_string($input['notes'] ?? '', 1000);
$project['versions'] = is_array($project['versions'] ?? null) ? $project['versions'] : [];
$project['versions'][] = [
    'version' => count($project['versions']) + 1,
    'at' => gmdate('c'),
    'status' => 'conversion_requested',
];
if (!save_project_record($project)) {
    audit_log('Final design request could not be persisted for project '.$token);
    fail_json('The request could not be saved. Please try again.', 500);
}

$customer = is_array($project['customer'] ?? null) ? $project['customer'] : [];
$customerEmail = (string)($customer['email'] ?? '');
$replyTo = valid_email($customerEmail) ? $customerEmail : ADMIN_EMAIL;
$subject = 'ESSO Smart Home Final Design Request - '.$token;
$body = "Project Token: {$token}\n"
    .'Name: '.clean_string($customer['name'] ?? '', 120)."\n"
    .'Email: '.$customerEmail."\n"
    .'Phone: '.clean_string($customer['phone'] ?? '', 60)."\n"
    ."Status: conversion_requested\n"
    .'Notes: '.$project['customer_notes']."\n";
$headers = 'From: '.ADMIN_EMAIL."\r\n"
    .'Reply-To: '.$replyTo."\r\n"
    ."Content-Type: text/plain; charset=UTF-8\r\n";

if (!@mail(ADMIN_EMAIL, $subject, $body, $headers)) {
    // The request is saved, but the team was not notified automatically.
    $project['notification_status'] = 'failed';
    $project['notification_failed_at'] = gmdate('c');
    save_project_record($project);
    audit_log('Final design notification mail failed for project '.$token);
    fail_json(
        'تم حفظ الطلب لكن تعذر إرسال الإشعار تلقائيًا. احتفظ برقم المشروع: '.$token
        .' / The request was saved, but ESSO could not be notified automatically. Project reference: '.$token,
        503
    );
}

$project['notification_status'] = 'sent';
$project['notification_sent_at'] = gmdate('c');
if (!save_project_record($project)) {
    // The original request and version were saved before mail was attempted.
    audit_log('Project notification status update failed for '.$token);
}

json_response([
    'success' => true,
    'message' => 'Request received.',
    'status' => $project['status'],
]);
