// product_en.js - English product details matching the Arabic product page

function getProductIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
}

function getCategoryName(category) {
    const categories = {
        'wifi-switches': 'WiFi Smart Switches',
        'zigbee-switches': 'Zigbee Smart Switches',
        'wifi-mini': 'WiFi Mini Switches',
        'zigbee-mini': 'Zigbee Mini Switches',
        staircase: 'Staircase Lighting',
        rgb: 'RGB Lighting',
        'wifi-sockets': 'WiFi Sockets',
        'zigbee-sockets': 'Zigbee Sockets',
        'wifi-curtain': 'WiFi Curtain Control',
        'zigbee-curtain': 'Zigbee Curtain Control',
        'curtain-accessories': 'Curtain Accessories',
        'motion-sensors': 'Motion Sensors',
        'wifi-sensors': 'WiFi Sensors',
        'zigbee-sensors': 'Zigbee Sensors',
        remotes: 'Remote Controls',
        'touch-screens': 'Touch Screens',
        'wifi-security': 'WiFi Security',
        'zigbee-security': 'Zigbee Security',
        hubs: 'Control Hubs',
        garage: 'Garage Openers',
        alexa: 'Alexa Devices'
    };
    return categories[category] || category;
}

function displayProductDetails() {
    const productId = getProductIdFromUrl();
    const container = document.getElementById('product-detail-container');

    if (!container) return;

    if (!productId) {
        container.innerHTML = '<p class="no-products">No product was selected.</p>';
        return;
    }

    const product = products.find(p => p.id == productId);

    if (!product) {
        container.innerHTML = '<p class="no-products">Product not found.</p>';
        return;
    }

    const additionalImages = [product.image];

    const thumbnailsHtml = additionalImages.map((img, index) => `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
            <img src="${img}" alt="${product.name}">
        </div>
    `).join('');

    container.innerHTML = `
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
            <div class="product-description">${product.description}</div>

            <div class="quantity-selector">
                <label>Quantity:</label>
                <div class="quantity-controls">
                    <button type="button" class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                    <input type="number" id="quantity-input" class="quantity-input" value="1" min="1" readonly>
                    <button type="button" class="quantity-btn" onclick="changeQuantity(1)">+</button>
                </div>
            </div>

            <button type="button" class="add-to-cart-large" onclick="addToCartFromDetail(${product.id})">
                <i class="fas fa-cart-plus" aria-hidden="true"></i> Add to Cart
            </button>

            <div class="product-meta">
                <div class="meta-item">
                    <span class="meta-label">Category:</span>
                    <span class="meta-value">${getCategoryName(product.category)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Product Code:</span>
                    <span class="meta-value">${product.id}</span>
                </div>
            </div>
        </div>
    `;
}

function changeMainImage(src, element) {
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
        mainImage.innerHTML = `<img src="${src}" alt="">`;
    }

    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
    if (element) element.classList.add('active');
}

let currentQuantity = 1;

function changeQuantity(delta) {
    const input = document.getElementById('quantity-input');
    currentQuantity = Math.max(1, currentQuantity + delta);
    if (input) input.value = currentQuantity;
}

function addToCartFromDetail(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity += currentQuantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: currentQuantity
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Product added to cart.', 'success');
    currentQuantity = 1;
    const input = document.getElementById('quantity-input');
    if (input) input.value = 1;
}

document.addEventListener('DOMContentLoaded', function () {
    displayProductDetails();
    updateCartCount();
});
