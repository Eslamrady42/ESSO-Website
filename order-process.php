<?php
declare(strict_types=1);

require_once __DIR__.'/api/functions.php';
require_once __DIR__.'/api/csrf.php';

$lang = (($_POST['lang'] ?? 'ar') === 'en') ? 'en' : 'ar';
$homeRedirect = $lang === 'en' ? 'shop_en.html' : 'shop.html';
$thankYouRedirect = $lang === 'en' ? 'thank-you_en.html' : 'thank-you.html';

// Return a localized, escaped error page for HTML form submissions.
function order_error(string $message, int $status = 400): never
{
    global $lang, $homeRedirect;
    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    $title = $lang === 'en' ? 'Order not completed' : 'لم يكتمل الطلب';
    $back = $lang === 'en' ? 'Return to the shop' : 'العودة إلى المتجر';
    echo '<!doctype html><html lang="'.($lang === 'en' ? 'en' : 'ar').'" dir="'.($lang === 'en' ? 'ltr' : 'rtl').'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.e($title).'</title><body style="font-family:Arial,sans-serif;max-width:720px;margin:60px auto;padding:24px;line-height:1.8"><h1>'.e($title).'</h1><p>'.e($message).'</p><a href="'.e($homeRedirect).'">'.e($back).'</a></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: '.$homeRedirect);
    exit();
}

// AR: رمز CSRF وحدود المعدل يقللان إساءة استخدام نقطة إرسال الطلبات العامة.
// EN: CSRF and rate limiting make the public order endpoint harder to abuse.
if (!csrf_valid(isset($_POST['csrf_token']) ? (string)$_POST['csrf_token'] : null)) {
    order_error($lang === 'en' ? 'Your security token expired. Refresh checkout and try again.' : 'انتهت صلاحية رمز الأمان. حدّث صفحة إتمام الطلب وحاول مرة أخرى.', 403);
}
if (!rate_limit('order:'.client_ip(), 10, 600)) {
    order_error($lang === 'en' ? 'Too many order attempts. Please try again later.' : 'تم إرسال طلبات كثيرة من هذا الاتصال. حاول مرة أخرى لاحقًا.', 429);
}

// Strip control characters and line breaks from fields that enter e-mail subjects/headers.
function order_text($value, int $max): string
{
    $text = trim((string)$value);
    $text = preg_replace('/[\\x00-\\x1F\\x7F]+/u', ' ', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
}

$name = order_text($_POST['name'] ?? '', 120);
$email = trim((string)($_POST['email'] ?? ''));
$phone = order_text($_POST['phone'] ?? '', 60);
$address = order_text($_POST['address'] ?? '', 500);
$payment = (string)($_POST['payment'] ?? 'cod');
$notes = order_text($_POST['notes'] ?? '', 1000);
$cartData = (string)($_POST['cart_data'] ?? '');

// AR: تحقق على الخادم؛ خصائص required في المتصفح ليست وسيلة حماية.
// EN: Validate on the server; browser required attributes are not security controls.
if ($name === '' || $phone === '' || $address === '' || $cartData === '') {
    order_error($lang === 'en' ? 'Please complete all required fields.' : 'يرجى استكمال جميع الحقول المطلوبة.', 422);
}
if (strlen($email) > 160 || preg_match('/[\\r\\n]/', $email) || !valid_email($email)) {
    order_error($lang === 'en' ? 'Please enter a valid e-mail address.' : 'يرجى إدخال بريد إلكتروني صحيح.', 422);
}
if (!in_array($payment, ['cod', 'bank'], true)) {
    // Card payment is not enabled; reject attempts to submit it even if the browser is modified.
    order_error($lang === 'en' ? 'That payment method is not currently available.' : 'طريقة الدفع المختارة غير متاحة حاليًا.', 422);
}
if (strlen($cartData) > 20000) {
    order_error($lang === 'en' ? 'The cart payload is too large. Please reduce the number of items.' : 'بيانات السلة كبيرة جدًا. قلّل عدد المنتجات وحاول مرة أخرى.', 413);
}

$submittedItems = json_decode($cartData, true);
if (!is_array($submittedItems) || !$submittedItems || count($submittedItems) > 50) {
    order_error($lang === 'en' ? 'The cart data is invalid. Return to the cart and try again.' : 'بيانات السلة غير صحيحة. ارجع إلى السلة وحاول مرة أخرى.', 422);
}

// AR: حمّل كتالوج الخادم، ولا تثق في اسم أو سعر يرسله المتصفح.
// EN: Load the server-side catalogue; never trust a name or price supplied by the browser.
$catalog = require __DIR__.'/config/shop-catalog.php';
$quantities = [];
foreach ($submittedItems as $entry) {
    if (!is_array($entry)) {
        order_error($lang === 'en' ? 'Invalid cart item.' : 'أحد عناصر السلة غير صحيح.', 422);
    }
    $id = filter_var($entry['id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = filter_var($entry['quantity'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $quantity === false || $id < 1 || $quantity < 1 || $quantity > 100 || !isset($catalog[$id])) {
        order_error($lang === 'en' ? 'A product or quantity in the cart is invalid. Please refresh the shop and try again.' : 'هناك منتج أو كمية غير صحيحة في السلة. حدّث المتجر وحاول مرة أخرى.', 422);
    }
    $quantities[$id] = ($quantities[$id] ?? 0) + $quantity;
    if ($quantities[$id] > 100) {
        order_error($lang === 'en' ? 'The quantity for one product exceeds the allowed limit.' : 'كمية أحد المنتجات تتجاوز الحد المسموح به.', 422);
    }
}

$items = [];
$total = 0.0;
foreach ($quantities as $id => $quantity) {
    $product = $catalog[$id];
    $unitPrice = (float)$product['price'];
    $lineTotal = round($unitPrice * $quantity, 2);
    $items[] = [
        'id' => (int)$id,
        'name' => (string)$product['name'],
        'category' => (string)$product['category'],
        'quantity' => (int)$quantity,
        'unit_price' => $unitPrice,
        'line_total' => $lineTotal,
    ];
    $total += $lineTotal;
}
$total = round($total, 2);
if (!$items || $total <= 0) {
    order_error($lang === 'en' ? 'The cart is empty or invalid.' : 'السلة فارغة أو غير صحيحة.', 422);
}

// AR: احفظ سجلًا خاصًا للطلب حتى لا يؤدي تعطل البريد إلى فقدان الطلب بصمت.
// EN: Keep a private durable order record so an e-mail outage cannot silently erase the submission.
$orderId = 'ESSO-'.strtoupper(bin2hex(random_bytes(6)));
$order = [
    'order_id' => $orderId,
    'created_at' => gmdate('c'),
    'status' => 'pending_notification',
    'language' => $lang,
    'customer' => ['name' => $name, 'email' => $email, 'phone' => $phone, 'address' => $address],
    'payment_method' => $payment,
    'notes' => $notes,
    'items' => $items,
    'total' => $total,
    'currency' => 'EGP',
    'staff_notification' => 'pending',
    'customer_confirmation' => 'pending',
];

function write_order_record(array $order): bool
{
    $orderId = (string)($order['order_id'] ?? '');
    if (!preg_match('/^ESSO-[A-F0-9]{12}$/', $orderId)) {
        return false;
    }
    $target = ORDERS_PATH.'/'.$orderId.'.json';
    $json = json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    $temporary = $target.'.tmp-'.bin2hex(random_bytes(6));
    $written = @file_put_contents($temporary, $json, LOCK_EX);
    if ($written !== strlen($json) || !atomic_replace_file($temporary, $target)) {
        @unlink($temporary);
        return false;
    }
    @chmod($target, 0640);
    return true;
}

if (!write_order_record($order)) {
    audit_log('Order could not be persisted before notification.');
    order_error($lang === 'en' ? 'The order could not be saved securely. Please try again or contact ESSO.' : 'تعذر حفظ الطلب بشكل آمن. حاول مرة أخرى أو تواصل مع ESSO.', 500);
}

// AR: كوّن البريد من بيانات عميل تم التحقق منها وأسعار الكتالوج المعتمدة على الخادم فقط.
// EN: Assemble e-mail content only from validated customer fields and server catalogue values.
$adminEmail = valid_email(ADMIN_EMAIL) ? ADMIN_EMAIL : 'info25.esso@gmail.com';
$subject = ($lang === 'en' ? 'New ESSO order - ' : 'طلب جديد من ESSO - ').$orderId;
$lines = [
    'Order reference: '.$orderId,
    'Created at: '.$order['created_at'],
    'Name: '.$name,
    'Email: '.$email,
    'Phone: '.$phone,
    'Address: '.$address,
    'Payment method: '.$payment,
    '',
    'Order details:',
];
foreach ($items as $item) {
    $lines[] = '- '.$item['name'].' | ID '.$item['id'].' | Qty '.$item['quantity']
        .' | Unit EGP '.number_format($item['unit_price'], 2)
        .' | Total EGP '.number_format($item['line_total'], 2);
}
$lines[] = '';
$lines[] = 'Grand total: EGP '.number_format($total, 2);
$lines[] = 'Customer notes: '.$notes;
$adminBody = implode("\n", $lines);
$adminHeaders = 'From: '.$adminEmail."\r\n"
    .'Reply-To: '.$email."\r\n"
    ."Content-Type: text/plain; charset=UTF-8\r\n";

if (!@mail($adminEmail, $subject, $adminBody, $adminHeaders)) {
    $order['status'] = 'saved_notification_failed';
    $order['staff_notification'] = 'failed';
    $order['notification_failed_at'] = gmdate('c');
    if (!write_order_record($order)) {
        audit_log('Order notification failed and status update also failed for '.$orderId);
    }
    audit_log('Order notification mail failed for '.$orderId);

    // AR: تم حفظ الطلب بالفعل؛ اعرض مرجعه وتحذيرًا صريحًا بدل صفحة خطأ عامة.
    // EN: The order is already stored; show its reference and a clear notification warning.
    header('Location: '.$thankYouRedirect.'?order='.rawurlencode($orderId).'&notification=failed');
    exit();
}

// PHP accepting the staff e-mail is not a delivery guarantee; a customer confirmation is best-effort.
$order['status'] = 'received';
$order['staff_notification'] = 'mail_accepted';
$order['staff_notified_at'] = gmdate('c');
if (!write_order_record($order)) {
    audit_log('Order status update failed after staff mail was accepted for '.$orderId);
}

$customerSubject = $lang === 'en' ? 'Order receipt from ESSO - '.$orderId : 'تأكيد استلام طلبك من ESSO - '.$orderId;
$customerBody = $lang === 'en'
    ? "Hello {$name},\n\nESSO has received your order request. Our team will contact you to confirm availability and delivery.\nOrder reference: {$orderId}\nOrder total: EGP ".number_format($total, 2)."\n\nESSO Team"
    : "أهلًا {$name}،\n\nاستلمت ESSO طلبك المبدئي. سيتواصل معك الفريق لتأكيد التوفر والتوصيل.\nرقم الطلب: {$orderId}\nإجمالي الطلب المبدئي: ".number_format($total, 2)." جنيه مصري\n\nفريق ESSO";
$customerHeaders = 'From: '.$adminEmail."\r\n"
    .'Reply-To: '.$adminEmail."\r\n"
    ."Content-Type: text/plain; charset=UTF-8\r\n";
$customerMailSent = @mail($email, $customerSubject, $customerBody, $customerHeaders);
$order['customer_confirmation'] = $customerMailSent ? 'mail_accepted' : 'failed';
if ($customerMailSent) {
    $order['customer_confirmation_sent_at'] = gmdate('c');
}
if (!write_order_record($order)) {
    audit_log('Customer confirmation status update failed for '.$orderId);
}

header('Location: '.$thankYouRedirect.'?order='.rawurlencode($orderId));
exit();
