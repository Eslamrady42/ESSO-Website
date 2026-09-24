// product.js - عرض تفاصيل منتج واحد

// دالة للحصول على معامل id من الرابط
function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// دالة لعرض تفاصيل المنتج
function displayProductDetails() {
    const productId = getProductIdFromUrl();
    if (!productId) {
        // إذا لم يوجد id، نوجه المستخدم إلى المتجر
        window.location.href = 'shop.html';
        return;
    }

    const product = products.find(p => p.id == productId);
    if (!product) {
        // إذا لم يوجد المنتج
        document.getElementById('product-detail-container').innerHTML = '<p class="no-products">المنتج غير موجود</p>';
        return;
    }

    // إنشاء صور إضافية (يمكن استخدام نفس الصورة كمثال، أو إضافة المزيد)
    // نفترض أن لدينا صور إضافية بنفس الاسم مع إضافة _1, _2 إلخ.
    // لكن هنا سنستخدم صورة واحدة فقط.
    const mainImage = product.image;
    const additionalImages = [product.image]; // يمكن إضافة صور أخرى هنا إذا كانت متوفرة

    let thumbnailsHtml = additionalImages.map((img, index) => `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
            <img src="${img}" alt="${product.name}">
        </div>
    `).join('');

    // تحضير HTML لصفحة التفاصيل
    const html = `
        <div class="product-gallery">
            <div class="main-image" id="main-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="thumbnail-list">
                ${thumbnailsHtml}
            </div>
        </div>
        <div class="product-info">
            <h1>${product.name}</h1>
            <div class="product-price">EGP ${product.price.toLocaleString()}</div>
            <div class="product-description">${product.description.replace(/\n/g, '<br>')}</div>
            
            <div class="quantity-selector">
                <label>الكمية:</label>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                    <input type="number" id="quantity-input" class="quantity-input" value="1" min="1" readonly>
                    <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
                </div>
            </div>

            <button class="add-to-cart-large" onclick="addToCartFromDetail(${product.id})">
                <i class="fas fa-cart-plus"></i> أضف إلى السلة
            </button>

            <div class="product-meta">
                <div class="meta-item">
                    <span class="meta-label">التصنيف:</span>
                    <span class="meta-value">${getCategoryName(product.category)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">كود المنتج:</span>
                    <span class="meta-value">${product.id}</span>
                </div>
            </div>
        </div>
    `;

    document.getElementById('product-detail-container').innerHTML = html;
}

// دالة مساعدة للحصول على اسم التصنيف بالعربية
function getCategoryName(category) {
    const categories = {
        'wifi-switches': 'مفاتيح WiFi ذكية',
        'zigbee-switches': 'مفاتيح Zigbee ذكية',
        'wifi-mini': 'مفاتيح ميني WiFi',
        'zigbee-mini': 'مفاتيح ميني Zigbee',
        'staircase': 'تحكم إضاءة السلالم',
        'rgb': 'إضاءة RGB',
        'wifi-sockets': 'مقابس WiFi',
        'zigbee-sockets': 'مقابس Zigbee',
        'wifi-curtain': 'تحكم ستائر WiFi',
        'zigbee-curtain': 'تحكم ستائر Zigbee',
        'curtain-accessories': 'اكسسوارات ستائر',
        'motion-sensors': 'حساسات حركة تقليدية',
        'wifi-sensors': 'حساسات WiFi',
        'zigbee-sensors': 'حساسات Zigbee',
        'remotes': 'ريموت كنترول',
        'touch-screens': 'شاشات لمس',
        'wifi-security': 'أمن وسلامة WiFi',
        'zigbee-security': 'أمن وسلامة Zigbee',
        'hubs': 'مراكز تحكم',
        'garage': 'فتحات جراج',
        'alexa': 'أجهزة Alexa'
    };
    return categories[category] || category;
}

// تغيير الصورة الرئيسية عند النقر على الصورة المصغرة
function changeMainImage(src, element) {
    document.getElementById('main-image').innerHTML = `<img src="${src}" alt="">`;
    // إزالة class active من جميع الصور المصغرة
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    element.classList.add('active');
}

// تغيير الكمية
let currentQuantity = 1;
function changeQuantity(delta) {
    const input = document.getElementById('quantity-input');
    let newVal = currentQuantity + delta;
    if (newVal >= 1) {
        currentQuantity = newVal;
        input.value = currentQuantity;
    }
}

// إضافة المنتج إلى السلة من صفحة التفاصيل
function addToCartFromDetail(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    // استخدام الدالة addToCart من shop.js مع الكمية المحددة
    // نحتاج إلى تعديل addToCart لقبول كمية
    // سنقوم بتعديل الدالة في shop.js لاحقًا
    // مؤقتًا نستخدم الإضافة بكمية 1
    addToCart(productId); // هذه الدالة موجودة في shop.js
    // يمكن تحسينها لتمرير الكمية
}

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    displayProductDetails();
    updateCartCount(); // من shop.js
});