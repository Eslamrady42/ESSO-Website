<?php
declare(strict_types=1);
require_once __DIR__.'/api/functions.php';
require_once __DIR__.'/api/csrf.php';

$lang = (($_POST['lang'] ?? 'ar') === 'en') ? 'en' : 'ar';
$contactRedirect = $lang === 'en' ? 'contact_en.html?success=1' : 'contact.html?success=1';
$contactFallback = $lang === 'en' ? 'contact_en.html' : 'contact.html';

// Render a small escaped error page instead of leaking PHP details or showing a false success.
function contact_process_error(string $message, int $status = 400): never
{
    global $lang, $contactFallback;
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    $title = $lang === 'en' ? 'Message not sent' : 'لم يتم إرسال الرسالة';
    $back = $lang === 'en' ? 'Return to contact page' : 'العودة إلى صفحة التواصل';
    echo '<!doctype html><html lang="'.($lang === 'en' ? 'en' : 'ar').'" dir="'.($lang === 'en' ? 'ltr' : 'rtl').'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.e($title).'</title><body style="font-family:Arial,sans-serif;max-width:720px;margin:60px auto;padding:24px;line-height:1.8"><h1>'.e($title).'</h1><p>'.e($message).'</p><a href="'.e($contactFallback).'">'.e($back).'</a></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: '.$contactFallback);
    exit();
}

// AR: احمِ النموذج برمز CSRF وحدّ لمعدل الرسائل. EN: Protect the form with CSRF and rate limiting.
if (!csrf_valid(isset($_POST['csrf_token']) ? (string)$_POST['csrf_token'] : null)) {
    contact_process_error(
        $lang === 'en' ? 'Your security token expired. Refresh the contact page and try again.' : 'انتهت صلاحية رمز الأمان. حدّث صفحة التواصل وحاول مرة أخرى.',
        403
    );
}
if (!rate_limit('contact:'.client_ip(), 5, 600)) {
    contact_process_error(
        $lang === 'en' ? 'Too many messages were submitted. Please try again later.' : 'تم إرسال رسائل كثيرة من هذا الاتصال. حاول مرة أخرى لاحقًا.',
        429
    );
}

// Remove control characters and enforce server-side field lengths.
function contact_text($value, int $max): string
{
    $text = trim((string)$value);
    $text = preg_replace('/[\\x00-\\x1F\\x7F]+/u', ' ', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
}

$name = contact_text($_POST['name'] ?? '', 120);
$email = trim((string)($_POST['email'] ?? ''));
$phone = contact_text($_POST['phone'] ?? '', 60);
$service = trim((string)($_POST['service'] ?? ''));
$message = contact_text($_POST['message'] ?? '', 3000);
$allowedServices = ['architectural', 'smart', 'consulting', 'renewable', 'supervision', 'mep', 'other'];

if ($name === '' || $message === '' || $service === '') {
    contact_process_error($lang === 'en' ? 'Please complete all required fields.' : 'يرجى استكمال جميع الحقول المطلوبة.', 422);
}
if (strlen($email) > 160 || !valid_email($email)) {
    contact_process_error($lang === 'en' ? 'Please enter a valid e-mail address.' : 'يرجى إدخال بريد إلكتروني صحيح.', 422);
}
if (!in_array($service, $allowedServices, true)) {
    contact_process_error($lang === 'en' ? 'Please select a valid service.' : 'يرجى اختيار خدمة صحيحة.', 422);
}

$to = 'info25.esso@gmail.com';
$subject = ($lang === 'en' ? 'New message from ESSO website - ' : 'رسالة جديدة من موقع ESSO - ').$service;
$bodyLines = [
    $lang === 'en' ? 'A new contact message has been received:' : 'لقد استلمت رسالة جديدة من نموذج الاتصال:',
    '',
    ($lang === 'en' ? 'Name: ' : 'الاسم: ').$name,
    ($lang === 'en' ? 'Email: ' : 'البريد الإلكتروني: ').$email,
    ($lang === 'en' ? 'Phone: ' : 'رقم الهاتف: ').($phone !== '' ? $phone : ($lang === 'en' ? 'Not provided' : 'غير مذكور')),
    ($lang === 'en' ? 'Requested service: ' : 'الخدمة المطلوبة: ').$service,
    '',
    ($lang === 'en' ? 'Message:' : 'الرسالة:'),
    $message,
];
$body = implode("\n", $bodyLines);

// The recipient address is fixed; the visitor email is validated before use as Reply-To.
$headers = "From: info25.esso@gmail.com\r\n";
$headers .= "Reply-To: ".$email."\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (!@mail($to, $subject, $body, $headers)) {
    audit_log('Contact message mail failure.');
    contact_process_error(
        $lang === 'en' ? 'The message could not be sent right now. Please try again later or contact ESSO directly.' : 'تعذر إرسال الرسالة حاليًا. حاول لاحقًا أو تواصل مع ESSO مباشرة.',
        503
    );
}

header('Location: '.$contactRedirect);
exit();
