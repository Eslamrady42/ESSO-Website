// English shopping cart for cart_en.html
function displayCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;

    if (!cart || cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your shopping cart is empty</p>
                <a href="shop_en.html" class="continue-shopping">Shop Now</a>
            </div>
        `;
        return;
    }

    let total = 0;
    let cartHtml = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const safeName = String(item.name || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const safeImage = String(item.image || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

        cartHtml += `
            <tr>
                <td>
                    <div class="cart-product">
                        <img src="${safeImage}" alt="${safeName}">
                        <div class="cart-product-info">
                            <h4>${safeName}</h4>
                        </div>
                    </div>
                </td>
                <td>EGP ${Number(item.price).toLocaleString()}</td>
                <td>
                    <div class="cart-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${Number(item.id)}, ${Number(item.quantity) - 1})">-</button>
                        <span class="quantity-value">${Number(item.quantity)}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${Number(item.id)}, ${Number(item.quantity) + 1})">+</button>
                    </div>
                </td>
                <td>EGP ${Number(itemTotal).toLocaleString()}</td>
                <td>
                    <button class="remove-btn" onclick="removeFromCart(${Number(item.id)})" aria-label="Remove product">
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
                Total: <span>EGP ${total.toLocaleString()}</span>
            </div>
            <button class="checkout-btn" onclick="checkout()">Proceed to Checkout</button>
        </div>
    `;

    container.innerHTML = cartHtml;
}

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
        if (typeof updateCartCount === 'function') updateCartCount();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id != productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    displayCart();
    if (typeof updateCartCount === 'function') updateCartCount();
}

function checkout() {
    if (!cart || cart.length === 0) {
        alert('Your shopping cart is empty');
        return;
    }
    window.location.href = 'checkout_en.html';
}

if (document.getElementById('cart-container')) {
    displayCart();
}
