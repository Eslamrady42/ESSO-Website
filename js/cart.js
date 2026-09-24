// عرض محتويات السلة في صفحة cart.html
function displayCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;

    if (!cart || cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>سلة التسوق فارغة</p>
                <a href="shop.html" class="continue-shopping">تسوق الآن</a>
            </div>
        `;
        return;
    }

    let total = 0;
    let cartHtml = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        cartHtml += `
            <tr>
                <td>
                    <div class="cart-product">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="cart-product-info">
                            <h4>${item.name}</h4>
                        </div>
                    </div>
                </td>
                <td>EGP ${item.price.toLocaleString()}</td>
                <td>
                    <div class="cart-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                </td>
                <td>EGP ${itemTotal.toLocaleString()}</td>
                <td>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    cartHtml += `
            </tbody>
        </table>
        <div class="cart-summary">
            <div class="cart-total">
                الإجمالي: <span>EGP ${total.toLocaleString()}</span>
            </div>
            <button class="checkout-btn" onclick="checkout()">إتمام الطلب</button>
        </div>
    `;

    container.innerHTML = cartHtml;
}

// تحديث الكمية في السلة
function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(i => i.id == productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCart();
        updateCartCount();
    }
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    cart = cart.filter(i => i.id != productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
    updateCartCount();
}

// إتمام الطلب (الانتقال إلى صفحة الدفع)
function checkout() {
    if (cart.length === 0) {
        alert('سلة التسوق فارغة');
        return;
    }
    window.location.href = 'checkout.html';
}

// عرض السلة إذا كنا في صفحة cart.html
if (document.getElementById('cart-container')) {
    displayCart();
}