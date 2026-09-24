// shop.js - نسخة محدثة مع ترقيم الصفحات وأزرار الفئات + فتح المنتجات

// ===== إدارة سلة التسوق =====
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// تحديث عداد السلة في جميع الصفحات
function updateCartCount() {
    const cartCountElements = document.querySelectorAll('#cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// إضافة منتج إلى السلة
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('تمت إضافة المنتج إلى السلة', 'success');
}

// إظهار إشعار بسيط
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 30px;
        border-radius: 50px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 600;
        animation: slideDown 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ===== متغيرات التصفيف والترقيم =====
let currentPage = 1;
let itemsPerPage = 9;
let currentCategory = 'all';
let currentSearchTerm = '';
let filteredProducts = [];

// الحصول على المنتجات المفلترة بناءً على الفئة والبحث
function getFilteredProducts() {
    let filtered = products;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (currentSearchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(currentSearchTerm) || 
            p.description.toLowerCase().includes(currentSearchTerm)
        );
    }

    return filtered;
}

// عرض المنتجات للصفحة الحالية
function displayProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    filteredProducts = getFilteredProducts();

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-products">لا توجد منتجات تطابق بحثك</div>';
        renderPagination(0);
        return;
    }

    // حساب المنتجات الخاصة بالصفحة الحالية
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    // عرض المنتجات مع إمكانية النقر لفتح صفحة التفاصيل
    container.innerHTML = pageProducts.map(product => {
        const displayName = product.description.split('.')[0] || product.name;
        return `
            <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${displayName}</h3>
                    <p class="product-description">${product.description.substring(0, 100)}...</p>
                    <div class="product-price">EGP ${product.price.toLocaleString()}</div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> أضف إلى السلة
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // تحديث أزرار الترقيم
    renderPagination(filteredProducts.length);
}

// رسم أزرار الترقيم
function renderPagination(totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHtml = '';

    // زر السابق
    paginationHtml += `<button class="page-btn prev-next ${currentPage === 1 ? 'disabled' : ''}" onclick="changePage(${currentPage - 1})">السابق</button>`;

    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += `<span class="page-dots">...</span>`;
        }
    }

    // زر التالي
    paginationHtml += `<button class="page-btn prev-next ${currentPage === totalPages ? 'disabled' : ''}" onclick="changePage(${currentPage + 1})">التالي</button>`;

    paginationContainer.innerHTML = paginationHtml;
}

// تغيير الصفحة
function changePage(page) {
    const totalPages = Math.ceil(getFilteredProducts().length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayProducts();
    // تمرير سلس لأعلى الشبكة
    document.querySelector('.products-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// فلترة المنتجات (تستدعى عند تغيير الفئة أو البحث)
function filterProducts(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
    }
    displayProducts();
}

// تحديث الفئة من القائمة المنسدلة
function updateCategoryFromSelect() {
    const select = document.getElementById('category-select');
    currentCategory = select?.value || 'all';
    // تحديث الأزرار النشطة
    document.querySelectorAll('.category-tab').forEach(tab => {
        const cat = tab.dataset.category;
        if (cat === currentCategory) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    filterProducts();
}

// تحديث الفئة من الأزرار
function updateCategoryFromTab(category) {
    currentCategory = category;
    // تحديث القائمة المنسدلة
    const select = document.getElementById('category-select');
    if (select) select.value = category;
    // تحديث الأزرار النشطة
    document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    filterProducts();
}

// تهيئة الصفحة
function initShop() {
    // تهيئة المستمعات
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', updateCategoryFromSelect);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            currentSearchTerm = e.target.value.toLowerCase();
            filterProducts();
        });
    }

    // تهيئة أزرار الفئات
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            updateCategoryFromTab(this.dataset.category);
        });
    });

    // العرض الأول
    displayProducts();
}

// تنفيذ عند تحميل الصفحة
if (document.getElementById('products-container')) {
    initShop();
}

// تحديث العداد عند تحميل الصفحة
updateCartCount();