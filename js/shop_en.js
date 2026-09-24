// shop_en.js - English shop logic matching the Arabic shop functionality

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    const cartCountElements = document.querySelectorAll('#cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

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
    showNotification('Product added to cart.', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position:fixed;top:20px;left:50%;transform:translateX(-50%);
        background:${type === 'success' ? '#4CAF50' : '#f44336'};
        color:#fff;padding:15px 30px;border-radius:50px;z-index:1000;
        box-shadow:0 4px 12px rgba(0,0,0,.15);font-weight:600;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

let currentPage = 1;
const itemsPerPage = 9;
let currentCategory = 'all';
let currentSearchTerm = '';
let filteredProducts = [];

const categoryNames = {
    all: 'All',
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

function getFilteredProducts() {
    let filtered = products.slice();

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            (categoryNames[p.category] || '').toLowerCase().includes(term)
        );
    }

    return filtered;
}

function displayProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    filteredProducts = getFilteredProducts();

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-products">No products match your search.</div>';
        renderPagination(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    container.innerHTML = pageProducts.map(product => `
        <div class="product-card" onclick="window.location.href='product_en.html?id=${product.id}'">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description.substring(0, 100)}...</p>
                <div class="product-price">EGP ${product.price.toLocaleString()}</div>
                <button type="button" class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                    <i class="fas fa-cart-plus" aria-hidden="true"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');

    renderPagination(filteredProducts.length);
}

function renderPagination(totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHtml = `<button type="button" class="page-btn prev-next ${currentPage === 1 ? 'disabled' : ''}" onclick="changePage(${currentPage - 1})">Previous</button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += '<span class="page-dots">...</span>';
        }
    }

    paginationHtml += `<button type="button" class="page-btn prev-next ${currentPage === totalPages ? 'disabled' : ''}" onclick="changePage(${currentPage + 1})">Next</button>`;

    paginationContainer.innerHTML = paginationHtml;
}

function changePage(page) {
    const totalPages = Math.ceil(getFilteredProducts().length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    displayProducts();

    document.getElementById('products-container')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function filterProducts(resetPage = true) {
    if (resetPage) currentPage = 1;
    displayProducts();
}

function initShop() {
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', function () {
            currentCategory = this.value || 'all';
            filterProducts();
            document.querySelectorAll('.category-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.category === currentCategory);
            });
        });
    }

    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            currentCategory = this.dataset.category || 'all';
            const select = document.getElementById('category-select');
            if (select) select.value = currentCategory;

            document.querySelectorAll('.category-tab').forEach(item => {
                item.classList.toggle('active', item === this);
            });

            filterProducts();
        });
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            currentSearchTerm = e.target.value.trim().toLowerCase();
            filterProducts();
        });
    }

    displayProducts();
    updateCartCount();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShop);
} else {
    initShop();
}
