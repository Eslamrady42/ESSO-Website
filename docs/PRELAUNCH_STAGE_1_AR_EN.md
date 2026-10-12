# ESSO Pre-Launch — Stage 1 Security / المرحلة الأولى للأمان

> **Branch only:** `prelaunch/stage-1-security`. These changes have not been merged into `main`; test locally before release.
>
> **فرع اختبار فقط:** `prelaunch/stage-1-security`. التعديلات لم تُدمج في `main`؛ اختبرها محليًا قبل الإطلاق.

## What changed / ما الذي تغيّر؟

### 1. Private storage / حماية التخزين الخاص
- `uploads/.htaccess`, `storage/.htaccess`, and `logs/.htaccess` now deny all direct HTTP access.
- ملفات المخططات، المشاريع، مفاتيح التشغيل، الطلبات والسجلات لا يجب أن تكون قابلة للفتح مباشرة من المتصفح.
- **Server note:** Apache must honor `.htaccess`. On non-Apache hosting, configure equivalent access rules.

### 2. Server-priced shop orders / الأسعار المعتمدة من الخادم
- Added `config/shop-catalog.php` for server-side product IDs, names and prices.
- `order-process.php` accepts only product IDs and quantities as authoritative inputs; client-supplied names/prices are ignored.
- Validates customer fields, rejects unsupported payment types (including the inactive card option), checks CSRF, limits order attempts, and writes a private order record before sending e-mail.
- If staff e-mail fails, the customer sees a clear error with the order reference rather than a false success page.
- Checkout pages in both languages now submit only IDs and quantities, fetch a CSRF token, show a validated order reference, and no longer show an inactive discount-code UI or an unverified encryption promise.

**Catalogue maintenance warning / تنبيه مزامنة الكتالوج:** update `config/shop-catalog.php` whenever a product ID, name, or price changes in `js/data.js`. A future stage can remove this duplication by moving both front end and server to one shared data source.

### 3. Project records and requests / حفظ المشاريع والطلبات
- Newly created projects use 32-hex-character opaque references (128 bits); legacy 12-character references remain readable.
- Project creation and report reads are rate-limited, and required customer details are validated on the server.
- Writes to project records are checked and use a Windows-compatible replacement routine for existing JSON files.
- Final-design requests are not confirmed as successful if saving fails; notification failure is recorded and reported.

### 4. Contact form / نموذج التواصل
- The Arabic and English contact forms now fetch a CSRF token before submit; the PHP handler validates fields and limits repeated sends per IP.
- نماذج التواصل بالعربية والإنجليزية تطلب رمز CSRF قبل الإرسال، ويعيد الخادم التحقق من الحقول ويحدّ من تكرار الرسائل من عنوان الاتصال نفسه.

### 5. Public health response / فحص صحة الخادم
- `api/health.php` no longer exposes PHP version, file paths, key-file presence or provider configuration. It returns only a generic service status.

### 6. PHP syntax CI / فحص صياغة PHP
- Added `.github/workflows/php-lint.yml`, which runs `php -l` over all PHP files on relevant pushes and pull requests.

## Local test plan / خطة الاختبار المحلي

Run through XAMPP Apache (not `file://`). Back up your current project folder first. Preserve your local `.env` and runtime data folders; do not overwrite or commit real secrets or customer records.

### A. Private folders / المجلدات الخاصة
Open these in a browser, adjusting the project folder name if necessary:
- `http://localhost/ESSO-Website/uploads/private/`
- `http://localhost/ESSO-Website/storage/projects/`
- `http://localhost/ESSO-Website/storage/orders/`
- `http://localhost/ESSO-Website/logs/`

**Expected / المتوقع:** Apache returns `403 Forbidden` (or `404 Not Found`) and reveals no file names or data. A directory listing or downloadable JSON/log file is a release blocker.

### B. Health endpoint / فحص الخادم
Open `http://localhost/ESSO-Website/api/health.php`.

**Expected / المتوقع:** a short JSON response with `success`, `service`, and `status`; no filesystem paths, PHP version, or API key/configuration details.

### Configure XAMPP e-mail / إعداد بريد XAMPP المحلي

This is separate from the order-validation code. The warning `mail(): Failed to connect to mailserver at localhost port 25` means PHP is using its default local SMTP target, and no mail server is listening there.

1. In XAMPP Control Panel, click **Apache → Config → PHP (php.ini)**. In the `[mail function]` section, set the sendmail path (adjust only if XAMPP is installed somewhere else):
   ```ini
   sendmail_path = "\"C:\xampp\sendmail\sendmail.exe\" -t"
   ```
2. Open `C:\xampp\sendmail\sendmail.ini` and configure the SMTP section:
   ```ini
   smtp_server=smtp.gmail.com
   smtp_port=465
   smtp_ssl=auto
   error_logfile=error.log
   auth_username=info25.esso@gmail.com
   auth_password=YOUR_GOOGLE_APP_PASSWORD
   ```
3. For Gmail, use a Google **App Password** if your account is eligible; it requires 2-Step Verification. Do not use or share your normal Gmail password. Generate the App Password through Google Account security settings and keep it only in your local configuration.
4. Save both files and restart Apache from XAMPP Control Panel.
5. Place a test order using an address you control. Check the `sendmail` error log and recipient inbox (including Spam).

Never commit `sendmail.ini`, an App Password, or any secret. For production hosting, configure the provider's authenticated mail transport rather than assuming the local XAMPP settings transfer to the server.

### C. Shop order / طلب من المتجر
1. Add product ID 1 (`WS-TG-US-T`, catalogue price EGP 1,750) twice.
2. Go to checkout and place a test order using Cash on Delivery. Use a test name such as `TEST — DO NOT FULFILL`.
3. Confirm the server e-mail and private record in `storage/orders/` contain the canonical product and total **EGP 3,500** and an `ESSO-...` reference.
4. Confirm the thank-you page displays the same reference.
5. In browser storage, changing the cart item's `price` or `name` must not change the displayed/submitted canonical product price or the server-side order e-mail. The server only trusts the ID and quantity.

If local PHP mail is not configured, the order is saved and the thank-you page must explicitly warn that ESSO was not notified automatically and show the order reference. Do not treat it as an order that the team has been notified about, and do not fulfill the test order.

### D. CSRF / رمز الحماية
Submit to `order-process.php` without a valid `csrf_token` (for example, using a direct test request). **Expected:** HTTP 403 and no order is created. A normal checkout submission should fetch its token from `api/csrf-token.php`.

### E. Smart Home project flow / مسار المنزل الذكي
1. Create a new preliminary analysis and save it.
2. Confirm the new project token has 32 hexadecimal characters and the report opens.
3. Submit “final design request”; confirm the project status is saved and the team e-mail is accepted by the local mail subsystem.
4. Open one older project link with a 12-character token; the report should still load.

### F. PHP checks / فحص PHP
PowerShell in the project root:
```powershell
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```
Every file should report `No syntax errors detected`.

## Not yet validated / ما لم يُختبر بعد
- Actual behavior on this specific XAMPP machine: cookies/CSRF, authenticated SMTP delivery, filesystem permissions and HTTP denial.
- A full browser pass on mobile and desktop.
- File malware scanning, advanced anti-spam/CAPTCHA, content/privacy/legal policy pages, and remaining storefront DOM-XSS review are still for later stages.
