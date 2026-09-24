<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: contact.html');
    exit();
}

$lang = (($_POST['lang'] ?? 'ar') === 'en') ? 'en' : 'ar';
$contactRedirect = $lang === 'en' ? 'contact_en.html?success=1' : 'contact.html?success=1';
$contactFallback = $lang === 'en' ? 'contact_en.html' : 'contact.html';

$name = htmlspecialchars(trim((string)($_POST['name'] ?? '')), ENT_QUOTES, 'UTF-8');
$emailRaw = trim((string)($_POST['email'] ?? ''));
$email = filter_var($emailRaw, FILTER_SANITIZE_EMAIL);
$phone = htmlspecialchars(trim((string)($_POST['phone'] ?? '')), ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars(trim((string)($_POST['service'] ?? '')), ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(trim((string)($_POST['message'] ?? '')), ENT_QUOTES, 'UTF-8');

if ($name === '' || $email === '' || $message === '') {
    die($lang === 'en' ? 'Please complete all required fields.' : 'جميع الحقول المطلوبة يجب ملؤها');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
    die($lang === 'en' ? 'Please enter a valid email address.' : 'البريد الإلكتروني غير صحيح');
}

$to = 'info25.esso@gmail.com';
$subject = ($lang === 'en' ? 'New message from ESSO website - ' : 'رسالة جديدة من موقع ESSO - ') . ($service ?: ($lang === 'en' ? 'General inquiry' : 'استفسار عام'));

$bodyLines = [
    $lang === 'en' ? 'A new contact message has been received:' : 'لقد استلمت رسالة جديدة من نموذج الاتصال:',
    '',
    ($lang === 'en' ? 'Name: ' : 'الاسم: ') . $name,
    ($lang === 'en' ? 'Email: ' : 'البريد الإلكتروني: ') . $email,
    ($lang === 'en' ? 'Phone: ' : 'رقم الهاتف: ') . ($phone ?: ($lang === 'en' ? 'Not provided' : 'غير مذكور')),
    ($lang === 'en' ? 'Requested service: ' : 'الخدمة المطلوبة: ') . ($service ?: ($lang === 'en' ? 'Not specified' : 'غير محددة')),
    '',
    ($lang === 'en' ? 'Message:' : 'الرسالة:'),
    $message
];

$body = implode("\n", $bodyLines);

// Keep the site's mailbox as From and the visitor as Reply-To.
$headers = "From: info25.esso@gmail.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

if (mail($to, $subject, $body, $headers)) {
    header('Location: ' . $contactRedirect);
    exit();
}

echo $lang === 'en'
    ? 'Sorry, there was an error sending your message. Please try again later.'
    : 'عذراً، حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً.';
?>