<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // استلام البيانات وتنقيتها
    $name = htmlspecialchars(trim($_POST['name']));
    $email = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($_POST['phone']));
    $service = htmlspecialchars(trim($_POST['service']));
    $message = htmlspecialchars(trim($_POST['message']));

    // التحقق من صحة البريد
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("البريد الإلكتروني غير صحيح");
    }
    if (empty($name) || empty($email) || empty($message)) {
        die("جميع الحقول المطلوبة يجب ملؤها");
    }

    // البريد الإلكتروني المستلم (تم التحديث)
    $to = "info25.esso@gmail.com";

    // عنوان الرسالة
    $subject = "رسالة جديدة من موقع ESSO - " . $service;

    // محتوى الرسالة
    $body = "لقد استلمت رسالة جديدة من نموذج الاتصال:\n\n";
    $body .= "الاسم: " . $name . "\n";
    $body .= "البريد الإلكتروني: " . $email . "\n";
    $body .= "رقم الهاتف: " . ($phone ?: "غير مذكور") . "\n";
    $body .= "الخدمة المطلوبة: " . ($service ?: "غير محددة") . "\n\n";
    $body .= "الرسالة:\n" . $message . "\n";

    // ترويسة البريد
    $headers = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // إرسال البريد
    if (mail($to, $subject, $body, $headers)) {
        // نجاح الإرسال - إعادة توجيه مع رسالة نجاح
        header("Location: contact.html?success=1");
        exit();
    } else {
        echo "عذراً، حدث خطأ في إرسال الرسالة. يرجى المحاولة لاحقاً.";
    }
} else {
    // لو تم الدخول للملف مباشرة دون POST
    header("Location: contact.html");
    exit();
}
?>