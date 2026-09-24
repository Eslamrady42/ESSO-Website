<?php
declare(strict_types=1);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: shop.html');
    exit();
}

$lang = (($_POST['lang'] ?? 'ar') === 'en') ? 'en' : 'ar';
$homeRedirect = $lang === 'en' ? 'shop_en.html' : 'shop.html';
$thankYouRedirect = $lang === 'en' ? 'thank-you_en.html' : 'thank-you.html';

// Sanitize and validate submitted data.
$name = htmlspecialchars(trim((string)($_POST['name'] ?? '')), ENT_QUOTES, 'UTF-8');
$emailRaw = trim((string)($_POST['email'] ?? ''));
$email = filter_var($emailRaw, FILTER_SANITIZE_EMAIL);
$phone = htmlspecialchars(trim((string)($_POST['phone'] ?? '')), ENT_QUOTES, 'UTF-8');
$address = htmlspecialchars(trim((string)($_POST['address'] ?? '')), ENT_QUOTES, 'UTF-8');
$payment = htmlspecialchars(trim((string)($_POST['payment'] ?? '')), ENT_QUOTES, 'UTF-8');
$cartData = (string)($_POST['cart_data'] ?? '');

if ($name === '' || $email === '' || $phone === '' || $address === '' || $cartData === '') {
    die($lang === 'en' ? 'Please complete all required fields.' : 'جميع الحقول المطلوبة يجب ملؤها');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
    die($lang === 'en' ? 'Please enter a valid email address.' : 'البريد الإلكتروني غير صحيح');
}

$cartItems = json_decode($cartData, true);
if (!is_array($cartItems) || empty($cartItems)) {
    die($lang === 'en' ? 'Invalid cart data.' : 'بيانات السلة غير صحيحة');
}

$to = 'info25.esso@gmail.com';
$subject = ($lang === 'en' ? 'New order from ESSO website - ' : 'طلب جديد من موقع ESSO - ') . $name;

$lines = [];
$lines[] = $lang === 'en' ? 'A new order has been received:' : 'تم استلام طلب جديد:';
$lines[] = '';
$lines[] = ($lang === 'en' ? 'Name: ' : 'الاسم: ') . $name;
$lines[] = ($lang === 'en' ? 'Email: ' : 'البريد الإلكتروني: ') . $email;
$lines[] = ($lang === 'en' ? 'Phone: ' : 'الهاتف: ') . $phone;
$lines[] = ($lang === 'en' ? 'Address: ' : 'العنوان: ') . $address;
$lines[] = ($lang === 'en' ? 'Payment method: ' : 'طريقة الدفع: ') . $payment;
$lines[] = '';
$lines[] = $lang === 'en' ? 'Order details:' : 'تفاصيل الطلب:';

$total = 0.0;

foreach ($cartItems as $item) {
    $itemName = (string)($item['name'] ?? '');
    $quantity = (int)($item['quantity'] ?? 0);
    $price = (float)($item['price'] ?? 0);

    if ($itemName === '' || $quantity < 1 || $price < 0) {
        continue;
    }

    $itemTotal = $price * $quantity;
    $total += $itemTotal;

    $lines[] = '- ' . $itemName . ' (' . ($lang === 'en' ? 'Qty: ' : 'الكمية: ') . $quantity . ') - EGP ' . number_format($itemTotal);
}

$lines[] = '';
$lines[] = ($lang === 'en' ? 'Grand total: EGP ' : 'الإجمالي الكلي: EGP ') . number_format($total);

$body = implode("\n", $lines);

$customerSubject = $lang === 'en' ? 'Order confirmation from ESSO' : 'تأكيد استلام طلبك من ESSO';
$customerLines = [];
$customerLines[] = $lang === 'en' ? 'Hello ' . $name . ',' : 'عزيزي ' . $name . '،';
$customerLines[] = '';
$customerLines[] = $lang === 'en'
    ? 'Thank you for shopping with ESSO. We have received your order and will contact you shortly.'
    : 'شكراً لتسوقك من ESSO. لقد تم استلام طلبك وسيتم التواصل معك قريباً.';
$customerLines[] = '';
$customerLines[] = $lang === 'en' ? 'Order total: EGP ' . number_format($total) : 'إجمالي الطلب: EGP ' . number_format($total);
$customerLines[] = '';
$customerLines[] = $lang === 'en' ? 'ESSO Team' : 'مع تحيات فريق ESSO.';

$customerBody = implode("\n", $customerLines);

// Use the site mailbox as From and the customer email as Reply-To.
$headers = "From: info25.esso@gmail.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$mailSent = mail($to, $subject, $body, $headers);
@mail($email, $customerSubject, $customerBody, $headers);

if ($mailSent) {
    header('Location: ' . $thankYouRedirect);
    exit();
}

echo $lang === 'en'
    ? 'Sorry, there was an error sending your order. Please contact us directly.'
    : 'عذراً، حدث خطأ في إرسال الطلب. يرجى الاتصال بنا مباشرة.';
?>