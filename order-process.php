<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // استلام وتنقية البيانات
    $name = htmlspecialchars(trim($_POST['name'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($_POST['phone'] ?? ''));
    $address = htmlspecialchars(trim($_POST['address'] ?? ''));
    $payment = htmlspecialchars(trim($_POST['payment'] ?? ''));
    $cart_data = $_POST['cart_data'] ?? '';

    // التحقق من الحقول المطلوبة
    if (empty($name) || empty($email) || empty($phone) || empty($address) || empty($cart_data)) {
        die("جميع الحقول المطلوبة يجب ملؤها");
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("البريد الإلكتروني غير صحيح");
    }

    // فك بيانات السلة (JSON)
    $cart_items = json_decode($cart_data, true);
    if (!is_array($cart_items) || empty($cart_items)) {
        die("بيانات السلة غير صحيحة");
    }

    // منع حقن الرؤوس في البريد الإلكتروني
    if (preg_match("/[\r\n]/", $email)) {
        die("بريد إلكتروني غير صالح");
    }

    // إعداد البريد
    $to = "info25.esso@gmail.com"; // بريد الإدارة
    $subject = "طلب جديد من موقع ESSO - " . $name;
    
    // بناء نص الرسالة
    $body = "تم استلام طلب جديد:\n\n";
    $body .= "الاسم: $name\n";
    $body .= "البريد الإلكتروني: $email\n";
    $body .= "الهاتف: $phone\n";
    $body .= "العنوان: $address\n";
    $body .= "طريقة الدفع: $payment\n\n";
    $body .= "تفاصيل الطلب:\n";
    
    $total = 0;
    foreach ($cart_items as $item) {
        $item_total = $item['price'] * $item['quantity'];
        $total += $item_total;
        $body .= "- " . $item['name'] . " (الكمية: " . $item['quantity'] . ") - EGP " . number_format($item_total) . "\n";
    }
    $body .= "\nالإجمالي الكلي: EGP " . number_format($total);

    // إرسال نسخة للعميل (اختياري)
    $to_client = $email;
    $subject_client = "تأكيد استلام طلبك من ESSO";
    $body_client = "عزيزي $name،\n\nشكراً لتسوقك من ESSO. لقد تم استلام طلبك وسيتم التواصل معك قريباً.\n\nتفاصيل الطلب:\n";
    foreach ($cart_items as $item) {
        $body_client .= "- " . $item['name'] . " (الكمية: " . $item['quantity'] . ") - EGP " . number_format($item['price'] * $item['quantity']) . "\n";
    }
    $body_client .= "\nالإجمالي: EGP " . number_format($total) . "\n\n";
    $body_client .= "مع تحيات فريق ESSO.";

    $headers = "From: info25.esso@gmail.com\r\n";
    $headers .= "Reply-To: info25.esso@gmail.com\r\n";

    // إرسال البريد للإدارة
    $mail_sent = mail($to, $subject, $body, $headers);
    
    // إرسال البريد للعميل (اختياري)
    $client_mail_sent = mail($to_client, $subject_client, $body_client, $headers);

    if ($mail_sent) {
        // التوجيه إلى صفحة الشكر
        header("Location: thank-you.html");
        exit();
    } else {
        // في حالة فشل الإرسال
        echo "عذراً، حدث خطأ في إرسال الطلب. يرجى المحاولة لاحقاً أو الاتصال بنا مباشرة.";
    }
} else {
    // إذا تم الوصول للملف مباشرة دون POST
    header("Location: shop.html");
    exit();
}
?>