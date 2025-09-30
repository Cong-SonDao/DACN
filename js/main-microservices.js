// Modern main.js for Vy Food Microservices

// Use global VyFood API client (created in api-client.js)
const vyFoodAPI = window.vyFoodAPI;

// Global state management
let currentUser = null;
let products = [];
let cart = [];

// Debug function to check cart state
function debugCart() {
    console.log('🐛 CART DEBUG:');
    console.log('Current cart:', cart);
    console.log('LocalStorage cart:', localStorage.getItem('cart'));
    console.log('User logged in:', vyFoodAPI ? vyFoodAPI.isLoggedIn() : false);
    console.log('VyFoodAPI exists:', !!vyFoodAPI);
}

// Add debug to window for easy console access
window.debugCart = debugCart;
window.clearCartDebug = clearCart;



// Checkout page controls
function closecheckout() {
    console.log('❌ Closing checkout page');
    const checkoutPage = document.querySelector('.checkout-page');
    if (checkoutPage) {
        checkoutPage.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Make globally available
window.closecheckout = closecheckout;

// Cart utility functions for checkout compatibility
function getCartTotal() {
    console.log('💰 Calculating cart total from:', cart);
    let total = 0;
    
    if (cart && Array.isArray(cart)) {
        cart.forEach(item => {
            const product = window.products ? window.products.find(p => p.id == item.id || p._id == item.id) : null;
            if (product) {
                const itemTotal = product.price * item.soluong;
                total += itemTotal;
                console.log(`Item ${item.id}: ${item.soluong} x ${product.price} = ${itemTotal}`);
            } else {
                console.warn(`Product not found for cart item:`, item);
            }
        });
    }
    
    console.log('💵 Total calculated:', total);
    return total;
}

function getAmountCart() {
    console.log('🔢 Calculating cart amount from:', cart);
    let amount = 0;
    
    if (cart && Array.isArray(cart)) {
        cart.forEach(item => {
            amount += item.soluong || 0;
        });
    }
    
    console.log('📦 Amount calculated:', amount);
    return amount;
}

// Make functions globally available for checkout
window.getCartTotal = getCartTotal;
window.getAmountCart = getAmountCart;


// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    console.error('Stack trace:', e.error?.stack);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    console.error('Promise rejection stack:', e.reason?.stack);
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing app...');
    try {
        await initializeApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

async function initializeApp() {
    try {
        // Load products first (this is most important)
        console.log('Loading products...');
        await loadProducts();
        console.log('Products loaded:', products.length);
        
        // Initialize UI
        initializeEventListeners();
        
        // Initialize cart from localStorage first
        loadCartFromLocalStorage();
        
        // Check if user is logged in (this is optional)
        if (vyFoodAPI && vyFoodAPI.isLoggedIn()) {
            try {
                currentUser = await vyFoodAPI.getCurrentUser();
                updateUIForLoggedInUser();
                
                // Load cart from API and merge with localStorage
                await loadCartFromAPI();
                console.log('User session and cart loaded from API');
            } catch (userError) {
                console.warn('User session error (non-critical):', userError);
                // Clear invalid token
                vyFoodAPI.removeToken();
                // Keep using localStorage cart
                console.log('Fallback to localStorage cart');
            }
        }
        
        console.log('App initialized successfully');
        // App ready - no toast needed
    } catch (error) {
        console.error('Critical error initializing app:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải dữ liệu ứng dụng. Vui lòng thử lại.' });
        
        // Try to at least show empty products container
        try {
            displayProducts([]);
        } catch (displayError) {
            console.error('Error displaying empty products:', displayError);
        }
    }
}

// Product Management
async function loadProducts() {
    try {
        console.log('Checking vyFoodAPI availability...');
        if (typeof vyFoodAPI === 'undefined') {
            throw new Error('vyFoodAPI is not defined');
        }
        
        console.log('vyFoodAPI available, calling getProducts...');
        console.log('API base URL:', vyFoodAPI.baseURL);
        
        // Load all products by setting high limit
        const response = await vyFoodAPI.getProducts({ limit: 100 });
        console.log('API response received:', response);
        
        products = response.products || response || [];
        window.products = products; // Expose globally for cart
        console.log('Products processed:', products.length, 'items');
        console.log('Global window.products set:', !!window.products);
        
        if (products.length === 0) {
            console.warn('No products found in response');
        } else {
            console.log('Sample product:', products[0]);
            console.log('Total products loaded:', products.length);
        }
        
        displayProducts(products);
        console.log('Products displayed successfully');
        
        // Hide pagination since we load all products
        const pageNav = document.querySelector('.page-nav');
        if (pageNav) {
            pageNav.style.display = 'none';
        }
        
        // Removed toast message - products loaded silently
    } catch (error) {
        console.error('Error loading products:', error);
        console.error('Error stack:', error.stack);
        products = [];
        
        // Show error message but try to display empty state
        displayProducts([]);
        
        const errorMsg = error.message || 'Unknown error';
        showToast({ type: 'error', title: 'Lỗi', message: `Không thể tải sản phẩm: ${errorMsg}` });
    }
}

function displayProducts(productList) {
    console.log('Displaying products:', productList.length);
    const productContainer = document.querySelector('.home-products');
    if (!productContainer) {
        console.error('Product container not found');
        return;
    }

    if (!productList || productList.length === 0) {
        productContainer.innerHTML = `
            <div class="no-products">
                <div class="no-products-message">
                    <i class="fa-light fa-bowl-food"></i>
                    <h3>Không có sản phẩm nào</h3>
                    <p>Hiện tại chưa có sản phẩm nào để hiển thị.</p>
                </div>
            </div>
        `;
        return;
    }

    let productsHtml = '';
    productList.forEach(product => {
        // Add safety checks for product properties
        const productId = product.id || product._id || ''; // Use id first, then _id as fallback
        const productTitle = product.title || 'Không có tên';
        const productImg = product.img || './assets/img/blank-image.png';
        const productPrice = product.price || 0;
        
        productsHtml += `
            <div class="col-product" onclick="detailProduct('${productId}')">
                <article class="card-product">
                    <div class="card-header">
                        <a href="#" class="card-image-link">
                            <img class="card-image" src="${productImg}" alt="${productTitle}" 
                                 onerror="this.src='./assets/img/blank-image.png'">
                        </a>
                    </div>
                    <div class="food-info">
                        <div class="card-content">
                            <div class="card-title">
                                <a href="#" class="card-title-link">${productTitle}</a>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="product-price">
                                <span class="current-price">${vnd(productPrice)}</span>
                            </div>
                            <div class="product-buy">
                                <button onclick="addToCartFromProduct('${productId}'); event.stopPropagation();" class="card-button">
                                    <i class="fa-light fa-basket-shopping"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        `;
    });
    productContainer.innerHTML = productsHtml;
    console.log('Products HTML updated');
}

// Product Detail Modal
async function detailProduct(productId) {
    try {
        let product;
        
        // Find product in local array first (by id or _id)
        if (products.length > 0) {
            product = products.find(p => p.id == productId || p._id === productId);
        }
        
        if (!product) {
            product = await vyFoodAPI.getProduct(productId);
        }

        if (!product) {
            throw new Error('Không tìm thấy sản phẩm');
        }

        const modal = document.querySelector('.modal.product-detail');
        const modalHtml = `
            <div class="modal-header">
                <img class="product-image" src="${product.img}" alt="${product.title}">
            </div>
            <div class="modal-body">
                <h2 class="product-title">${product.title}</h2>
                <div class="product-control">
                    <div class="priceBox">
                        <span class="current-price">${vnd(product.price)}</span>
                    </div>
                    <div class="buttons_added">
                        <input class="minus is-form" type="button" value="-" onclick="decreasingNumber(this)">
                        <input class="input-qty" max="100" min="1" name="" type="number" value="1">
                        <input class="plus is-form" type="button" value="+" onclick="increasingNumber(this)">
                    </div>
                </div>
                <p class="product-description">${product.desc || 'Không có mô tả'}</p>
            </div>
            <div class="notebox">
                <p class="notebox-title">Ghi chú</p>
                <textarea class="text-note" id="popup-detail-note" placeholder="Nhập thông tin cần lưu ý..."></textarea>
            </div>
            <div class="modal-footer">
                <div class="price-total">
                    <span class="thanhtien">Thành tiền</span>
                    <span class="price">${vnd(product.price)}</span>
                </div>
                <div class="modal-footer-control">
                    <button class="button-dathangngay" onclick="orderNow('${product.id || product._id}')">Đặt hàng ngay</button>
                    <button class="button-dat" onclick="addToCartFromModal('${product.id || product._id}'); animationCart()">
                        <i class="fa-light fa-basket-shopping"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.querySelector('#product-detail-content').innerHTML = modalHtml;
        modal.classList.add('open');
        document.body.style.overflow = "hidden";
        
        // Update price when quantity changes
        const tgbtns = document.querySelectorAll('.is-form');
        const qty = document.querySelector('.product-control .input-qty');
        const priceText = document.querySelector('.price');
        
        tgbtns.forEach(element => {
            element.addEventListener('click', () => {
                const price = product.price * parseInt(qty.value);
                priceText.innerHTML = vnd(price);
            });
        });

    } catch (error) {
        console.error('Error loading product details:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải chi tiết sản phẩm' });
    }
}

// Cart Management - Simplified approach
function loadCartFromLocalStorage() {
    console.log('🛒 Loading cart from localStorage...');
    try {
        const savedCart = localStorage.getItem('cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        console.log('🛒 Loaded from localStorage:', cart.length, 'items');
        
        // Update UI immediately
        updateCartUI();
        updateCartModal();
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        cart = [];
        updateCartUI();
        updateCartModal();
    }
}

async function loadCartFromAPI() {
    console.log('🛒 Loading cart...');
    
    try {
        if (vyFoodAPI && vyFoodAPI.isLoggedIn()) {
            console.log('🛒 User logged in, loading from API...');
            const cartData = await vyFoodAPI.getCart();
            
            if (cartData && cartData.cart) {
                cart = cartData.cart;
                console.log('🛒 Loaded from API:', cart.length, 'items');
            } else {
                cart = [];
                console.log('🛒 Empty cart from API');
            }
        } else {
            console.log('🛒 Guest user, loading from localStorage...');
            const savedCart = localStorage.getItem('cart');
            cart = savedCart ? JSON.parse(savedCart) : [];
            console.log('🛒 Loaded from localStorage:', cart.length, 'items');
        }
        
        // Always ensure cart is array
        if (!Array.isArray(cart)) {
            cart = [];
        }
        
    } catch (error) {
        console.error('🛒 Error loading cart:', error);
        // Fallback to localStorage
        const savedCart = localStorage.getItem('cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
    }
    
    updateCartUI();
    updateCartModal();
}

// Clear cart function
async function clearCart() {
    console.log('🧹 Clearing cart...');
    
    try {
        if (vyFoodAPI && vyFoodAPI.isLoggedIn()) {
            await vyFoodAPI.clearCart();
        }
        
        cart = [];
        localStorage.removeItem('cart');
        
        updateCartUI();
        updateCartModal();
        
        console.log('✅ Cart cleared');
        
    } catch (error) {
        console.error('❌ Error clearing cart:', error);
        // Force clear even on error
        cart = [];
        localStorage.removeItem('cart');
        updateCartUI();
        updateCartModal();
    }
}

async function addToCartFromProduct(productId) {
    console.log('🛒 ===== ADDING PRODUCT TO CART =====');
    console.log('Product ID:', productId);
    console.log('Current cart before adding:', cart);
    console.log('User logged in:', vyFoodAPI ? vyFoodAPI.isLoggedIn() : false);
    
    try {
        // Find the product
        const product = window.products ? window.products.find(p => p.id == productId || p._id === productId) : null;
        if (!product) {
            console.log('❌ Product not found:', productId);
            showToast({ type: 'error', title: 'Lỗi', message: 'Không tìm thấy sản phẩm' });
            return;
        }
        
        console.log('✅ Product found:', product.title);
        
        // Try API first if logged in, fallback to localStorage
        let useAPI = vyFoodAPI && vyFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('📦 Using API mode...');
                await vyFoodAPI.addToCart(productId, 1);
                console.log('✅ API call successful, reloading cart...');
                
                await loadCartFromAPI(); // Reload to sync
                console.log('Cart after reload:', cart);
                
                showToast({ type: 'success', title: 'Thành công', message: 'Đã thêm vào giỏ hàng' });
                animationCart();
                return;
            } catch (apiError) {
                console.warn('API failed, falling back to localStorage:', apiError.message);
                useAPI = false;
            }
        }
        
        if (!useAPI) {
            // Use localStorage for guest
            console.log('📦 Using guest mode...');
            console.log('Cart before local add:', cart);
            
            const existingItemIndex = cart.findIndex(item => item.id == productId);
            console.log('Existing item index:', existingItemIndex);
            
            if (existingItemIndex !== -1) {
                cart[existingItemIndex].soluong += 1;
                console.log('Updated existing item quantity:', cart[existingItemIndex].soluong);
            } else {
                const newItem = {
                    id: productId,
                    soluong: 1,
                    note: ""
                };
                cart.push(newItem);
                console.log('Added new item:', newItem);
            }
            
            console.log('Cart after local update:', cart);
            localStorage.setItem('cart', JSON.stringify(cart));
            
            updateCartUI();
            updateCartModal();
            
            showToast({ type: 'success', title: 'Thành công', message: 'Đã thêm vào giỏ hàng (Guest mode)' });
        }
        
        animationCart();
        console.log('🛒 ===== ADD TO CART COMPLETED =====');
        
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể thêm vào giỏ hàng' });
    }
}

async function addToCartFromModal(productId) {
    try {
        const qty = parseInt(document.querySelector('.product-control .input-qty').value) || 1;
        const note = document.querySelector('#popup-detail-note')?.value || "";
        
        console.log(`Adding ${qty} items of product ${productId} from modal`);
        
        // Try API first if logged in, fallback to localStorage
        let useAPI = vyFoodAPI && vyFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('📦 Using API mode for modal add...');
                await vyFoodAPI.addToCart(productId, qty);
                await loadCartFromAPI();
                
                closeModal();
                showToast({ type: 'success', title: 'Thành công', message: `Đã thêm ${qty} sản phẩm vào giỏ hàng` });
                return;
            } catch (apiError) {
                console.warn('Modal API failed, falling back to localStorage:', apiError.message);
                useAPI = false;
            }
        }
        
        if (!useAPI) {
            // Guest mode - use localStorage
            console.log('📦 Using guest mode for modal add...');
            
            const existingItemIndex = cart.findIndex(item => item.id == productId);
            if (existingItemIndex !== -1) {
                cart[existingItemIndex].soluong += qty;
                if (note) cart[existingItemIndex].note = note;
            } else {
                cart.push({
                    id: productId,
                    soluong: qty,
                    note: note || ""
                });
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            updateCartModal();
            
            closeModal();
            showToast({ type: 'success', title: 'Thành công', message: `Đã thêm ${qty} sản phẩm vào giỏ hàng (Guest mode)` });
        }
        
    } catch (error) {
        console.error('Error adding to cart from modal:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể thêm vào giỏ hàng: ' + error.message });
    }
}

async function updateCartQuantity(productId, quantity) {
    console.log('🔄 Updating cart quantity:', productId, quantity);
    
    try {
        // Try API first if logged in, fallback to localStorage
        let useAPI = vyFoodAPI && vyFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                if (quantity <= 0) {
                    await vyFoodAPI.removeFromCart(productId);
                } else {
                    await vyFoodAPI.updateCartItem(productId, quantity);
                }
                await loadCartFromAPI();
                return;
            } catch (apiError) {
                console.warn('Update quantity API failed, falling back to localStorage:', apiError.message);
                useAPI = false;
            }
        }
        
        if (!useAPI) {
            // Guest mode - use localStorage
            if (quantity <= 0) {
                // Remove item
                const itemIndex = cart.findIndex(item => item.id == productId);
                if (itemIndex !== -1) {
                    cart.splice(itemIndex, 1);
                }
            } else {
                // Update quantity
                const itemIndex = cart.findIndex(item => item.id == productId);
                if (itemIndex !== -1) {
                    cart[itemIndex].soluong = quantity;
                }
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            updateCartModal();
        }
        
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể cập nhật giỏ hàng' });
    }
}

async function removeFromCart(productId) {
    console.log('🗑️ ===== REMOVING FROM CART =====');
    console.log('Product ID to remove:', productId);
    console.log('Current cart before removal:', cart);
    console.log('User logged in:', vyFoodAPI ? vyFoodAPI.isLoggedIn() : false);
    
    try {
        // Try API first if logged in, fallback to localStorage
        let useAPI = vyFoodAPI && vyFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('🗑️ Using API mode for removal...');
                await vyFoodAPI.removeFromCart(productId);
                console.log('✅ API removal successful, reloading cart...');
                
                await loadCartFromAPI(); // Reload to sync
                console.log('Cart after reload:', cart);
                
                showToast({ type: 'success', title: 'Thành công', message: 'Đã xóa khỏi giỏ hàng' });
                return;
            } catch (apiError) {
                console.warn('Remove API failed, falling back to localStorage:', apiError.message);
                useAPI = false;
            }
        }
        
        if (!useAPI) {
            // Use localStorage for guest
            console.log('🗑️ Using guest mode for removal...');
            
            const itemIndex = cart.findIndex(item => item.id == productId);
            console.log('Item index to remove:', itemIndex);
            
            if (itemIndex !== -1) {
                const removedItem = cart[itemIndex];
                console.log('Removing item:', removedItem);
                
                cart.splice(itemIndex, 1);
                console.log('Cart after removal:', cart);
                
                localStorage.setItem('cart', JSON.stringify(cart));
                
                updateCartUI();
                updateCartModal();
                
                showToast({ type: 'success', title: 'Thành công', message: 'Đã xóa khỏi giỏ hàng (Guest mode)' });
            } else {
                console.log('❌ Item not found in cart');
            }
        }
        
        console.log('🗑️ ===== REMOVAL COMPLETED =====');
        
    } catch (error) {
        console.error('❌ Error removing from cart:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể xóa khỏi giỏ hàng' });
    }
}

function updateCartUI() {
    console.log('🎨 Updating cart UI with items:', cart);
    
    const cartCount = document.querySelector('.count-product-cart');
    // Cart items use 'soluong' field, not 'quantity'
    const totalQuantity = cart.reduce((sum, item) => sum + (item.soluong || item.quantity || 0), 0);
    
    console.log('🛒 Total quantity:', totalQuantity);
    
    if (cartCount) {
        cartCount.textContent = totalQuantity;
        cartCount.style.display = totalQuantity > 0 ? 'block' : 'none';
    }
    
    // Update cart modal if open
    updateCartModal();
}

// Order Management
async function orderNow(productId) {
    if (!vyFoodAPI.isLoggedIn()) {
        showLoginRequired();
        return;
    }

    try {
        // Add to cart first, then go to checkout
        const qty = parseInt(document.querySelector('.product-control .input-qty').value);
        await vyFoodAPI.addToCart(productId, qty);
        await loadCartFromAPI();
        
        closeModal();
        window.location.href = '#checkout'; // Or show checkout modal
        showToast({ type: 'info', title: 'Chuyển hướng', message: 'Chuyển đến trang thanh toán' });
    } catch (error) {
        console.error('Error with order now:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể đặt hàng' });
    }
}

// Search and Filter
async function searchProducts() {
    const searchInput = document.querySelector('.form-search-input');
    const categorySelect = document.querySelector('#advanced-search-category-select');
    const minPrice = document.querySelector('#min-price');
    const maxPrice = document.querySelector('#max-price');
    
    const query = searchInput ? searchInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : '';
    const minPriceValue = minPrice ? parseInt(minPrice.value) || 0 : 0;
    const maxPriceValue = maxPrice ? parseInt(maxPrice.value) || 999999999 : 999999999;
    
    try {
        let filteredProducts = [...products];
        
        // Filter by text search
        if (query) {
            const response = await vyFoodAPI.searchProducts(query, { limit: 100 });
            filteredProducts = response.products || response;
        }
        
        // Filter by category
        if (category && category !== 'Tất cả') {
            filteredProducts = filteredProducts.filter(product => 
                product.category && product.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        // Filter by price range
        if (minPriceValue > 0 || maxPriceValue < 999999999) {
            filteredProducts = filteredProducts.filter(product => 
                product.price >= minPriceValue && product.price <= maxPriceValue
            );
        }
        
        displayProducts(filteredProducts);
        
        // Removed toast message as requested by user
        // Just display the results without notification
    } catch (error) {
        console.error('Error searching products:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể tìm kiếm sản phẩm' });
    }
}

async function filterByCategory(category) {
    try {
        if (category === 'all' || !category) {
            displayProducts(products);
        } else {
            // Use high limit to get all products in category
            const response = await vyFoodAPI.getProducts({ category, limit: 100 });
            const filteredProducts = response.products || response;
            displayProducts(filteredProducts);
            
            console.log(`Filtered ${filteredProducts.length} products for category: ${category}`);
        }
    } catch (error) {
        console.error('Error filtering by category:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể lọc sản phẩm theo danh mục' });
    }
}

// Hiển thị chuyên mục - wrapper cho filterByCategory
async function showCategory(category) {
    try {
        // Hide other sections if they exist
        const trangchu = document.getElementById('trangchu');
        const accountUser = document.getElementById('account-user');
        const orderHistory = document.getElementById('order-history');
        
        if (trangchu) trangchu.classList.remove('hide');
        if (accountUser) accountUser.classList.remove('open');
        if (orderHistory) orderHistory.classList.remove('open');
        
        // Filter products by category
        await filterByCategory(category);
        
        // Scroll to products section
        const homeTitle = document.getElementById("home-title");
        if (homeTitle) {
            homeTitle.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Fallback: scroll to products container
            const productsContainer = document.querySelector('.home-products');
            if (productsContainer) {
                productsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Removed toast message - category filtering silent
    } catch (error) {
        console.error('Error showing category:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể hiển thị danh mục sản phẩm' });
    }
}

// User Authentication
function showLoginRequired() {
    console.log('=== showLoginRequired called ===');
    showToast({ type: 'warning', title: 'Yêu cầu đăng nhập', message: 'Vui lòng đăng nhập để tiếp tục' });
    
    // Show login form instead of signup
    setTimeout(() => {
        showLoginForm();
    }, 500);
}

function updateUIForLoggedInUser() {
    // Update header to show user info
    const userControls = document.querySelector('.header-action');
    if (userControls && currentUser) {
        const userInfo = `
            <div class="user-info">
                <span>Xin chào, ${currentUser.fullName || currentUser.phone}!</span>
                <button onclick="logout()" class="btn-logout">Đăng xuất</button>
            </div>
        `;
        userControls.innerHTML = userInfo + userControls.innerHTML;
    }
}

async function logout() {
    try {
        await vyFoodAPI.logout();
        currentUser = null;
        
        // Clear both API and local cart data
        cart = [];
        localStorage.removeItem('cart');
        
        updateCartUI();
        updateCartModal();
        
        showToast({ type: 'success', title: 'Thành công', message: 'Đã đăng xuất' });
        
        // Reload page to reset all state
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error during logout:', error);
        
        // Force logout even if API call fails
        currentUser = null;
        cart = [];
        localStorage.removeItem('cart');
        vyFoodAPI.removeToken();
        location.reload();
    }
}

// Utility Functions
function vnd(price) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(price);
}

function increasingNumber(element) {
    const qty = element.parentNode.querySelector('.input-qty');
    if (parseInt(qty.value) < parseInt(qty.max)) {
        qty.value = parseInt(qty.value) + 1;
    }
}

function decreasingNumber(element) {
    const qty = element.parentNode.querySelector('.input-qty');
    if (parseInt(qty.value) > parseInt(qty.min)) {
        qty.value = parseInt(qty.value) - 1;
    }
}

function animationCart() {
    // Add cart animation here
    const cartButton = document.querySelector('.header-action .count-product-cart');
    if (cartButton) {
        cartButton.classList.add('shake');
        setTimeout(() => {
            cartButton.classList.remove('shake');
        }, 500);
    }
}

// Modal Management
const body = document.querySelector("body");
const modalContainer = document.querySelectorAll('.modal');
const modalBox = document.querySelectorAll('.mdl-cnt');

modalContainer.forEach(item => {
    item.addEventListener('click', closeModal);
});

modalBox.forEach(item => {
    item.addEventListener('click', function (event) {
        event.stopPropagation();
    });
});

function closeModal() {
    modalContainer.forEach(item => {
        item.classList.remove('open');
    });
    body.style.overflow = "auto";
}

// Event Listeners
function initializeEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('.form-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchProducts, 500));
    }
    
    // Category select dropdown
    const categorySelect = document.querySelector('#advanced-search-category-select');
    if (categorySelect) {
        categorySelect.addEventListener('change', searchProducts);
    }
    
    // Price range inputs
    const minPrice = document.querySelector('#min-price');
    const maxPrice = document.querySelector('#max-price');
    if (minPrice) minPrice.addEventListener('change', searchProducts);
    if (maxPrice) maxPrice.addEventListener('change', searchProducts);
    
    // Advanced search button
    const searchBtn = document.querySelector('#advanced-search-price-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            searchProducts();
        });
    }
    
    // Home link - show all products
    const homeLinks = document.querySelectorAll('.menu-list-item a[href=""]');
    homeLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            displayProducts(products);
            
            // Reset search inputs
            if (searchInput) searchInput.value = '';
            if (categorySelect) categorySelect.value = 'Tất cả';
            if (minPrice) minPrice.value = '';
            if (maxPrice) maxPrice.value = '';
            
            // Hide pagination
            const pageNav = document.querySelector('.page-nav');
            if (pageNav) pageNav.style.display = 'none';
            
            // Removed toast message for home page
        });
    });

    // Login/Signup Form Event Listeners
    initializeAuthModal();
}

// Initialize Authentication Modal
function initializeAuthModal() {
    console.log('🔑 Initializing authentication modal...');
    
    // Get modal elements
    const modal = document.querySelector('.modal.signup-login');
    const container = document.querySelector('.signup-login .modal-container');
    const body = document.body;
    
    // Get navigation buttons
    const signupBtn = document.getElementById('signup');
    const loginBtn = document.getElementById('login');
    
    // Get form switch links
    const signupLink = document.querySelector('.signup-link');
    const loginLink = document.querySelector('.login-link');
    
    console.log('Modal elements found:', { 
        modal: !!modal, 
        container: !!container, 
        signupBtn: !!signupBtn, 
        loginBtn: !!loginBtn,
        signupLink: !!signupLink,
        loginLink: !!loginLink
    });
    
    // Signup button click - show modal with signup form
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            console.log('✅ Signup button clicked - showing signup form');
            if (modal) {
                modal.classList.add('open');
                container.classList.remove('active'); // Show signup form
                body.style.overflow = "hidden";
                console.log('✅ Signup modal opened');
            }
        });
    }
    
    // Login button click - show modal with login form
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('✅ Login button clicked - showing login form');
            if (modal) {
                // Clear any previous error messages
                const errorMsg = document.querySelector('.form-message-check-login');
                if (errorMsg) errorMsg.innerHTML = '';
                
                modal.classList.add('open');
                container.classList.add('active'); // Show login form
                body.style.overflow = "hidden";
                console.log('✅ Login modal opened');
            }
        });
    }
    
    // Switch to login form from within modal
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            console.log('✅ Login link clicked - switching to login form');
            if (container) {
                container.classList.add('active'); // Show login form
            }
        });
    }
    
    // Switch to signup form from within modal
    if (signupLink) {
        signupLink.addEventListener('click', () => {
            console.log('✅ Signup link clicked - switching to signup form');
            if (container) {
                container.classList.remove('active'); // Show signup form
            }
        });
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error handling wrapper
function handleAsyncError(asyncFn) {
    return async function(...args) {
        try {
            return await asyncFn.apply(this, args);
        } catch (error) {
            console.error('Async operation failed:', error);
            showToast({ 
                type: 'error', 
                title: 'Lỗi', 
                message: 'Có lỗi xảy ra, vui lòng thử lại' 
            });
        }
    };
}

// Cart Modal Management - Hiển thị tên món ăn thực và giá cả
function updateCartModal() {
    console.log('📦 Updating cart modal with items:', cart);
    
    const cartList = document.querySelector('.cart-list');
    const cartEmptyDiv = document.querySelector('.gio-hang-trong');
    const totalPriceElement = document.querySelector('.text-price');
    
    if (!cartList) {
        console.warn('Cart list element not found');
        return;
    }
    
    if (cart.length === 0) {
        // Empty cart
        cartList.innerHTML = '';
        cartList.style.display = 'none';
        if (cartEmptyDiv) cartEmptyDiv.style.display = 'block';
        if (totalPriceElement) totalPriceElement.textContent = '0đ';
        return;
    }
    
    // Hide empty cart message
    if (cartEmptyDiv) cartEmptyDiv.style.display = 'none';
    cartList.style.display = 'block';
    
    let cartHTML = '';
    let totalPrice = 0;
    
    cart.forEach(item => {
        // Find product details from global products array
        const product = window.products ? window.products.find(p => p.id == item.id) : null;
        
        if (product) {
            const itemTotal = product.price * item.soluong;
            totalPrice += itemTotal;
            
            cartHTML += `
                <li class="cart-item" data-id="${item.id}">
                    <div class="item-content">
                        <div class="item-details">
                            <h4 class="item-name">${product.title}</h4>
                            <div class="item-note">Không có ghi chú</div>
                            <div class="item-pricing">
                                <div class="item-total">${vnd(itemTotal)}</div>
                            </div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-box">
                                <button class="qty-btn minus" onclick="changeQuantity(${item.id}, -1)">-</button>
                                <span class="qty-num">${item.soluong}</span>
                                <button class="qty-btn plus" onclick="changeQuantity(${item.id}, 1)">+</button>
                            </div>
                            <button class="remove-item" onclick="removeFromCart(${item.id})">
                                <input type="checkbox" class="item-select" checked>
                                <span>Xóa</span>
                            </button>
                        </div>
                    </div>
                </li>
            `;
        } else {
            // Fallback for unknown products - vẫn hiển thị "Sản phẩm #X" nếu không tìm thấy
            console.warn('Product not found for cart item:', item.id);
            const fallbackPrice = 50000;
            const itemTotal = fallbackPrice * item.soluong;
            totalPrice += itemTotal;
            
            cartHTML += `
                <li class="cart-item" data-id="${item.id}">
                    <div class="item-content">
                        <div class="item-details">
                            <h4 class="item-name">Sản phẩm #${item.id}</h4>
                            <div class="item-note">Không có ghi chú</div>
                            <div class="item-pricing">
                                <div class="item-total">${vnd(itemTotal)}</div>
                            </div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-box">
                                <button class="qty-btn minus" onclick="changeQuantity(${item.id}, -1)">-</button>
                                <span class="qty-num">${item.soluong}</span>
                                <button class="qty-btn plus" onclick="changeQuantity(${item.id}, 1)">+</button>
                            </div>
                            <button class="remove-item" onclick="removeFromCart(${item.id})">
                                <input type="checkbox" class="item-select" checked>
                                <span>Xóa</span>
                            </button>
                        </div>
                    </div>
                </li>
            `;
        }
    });
    
    cartList.innerHTML = cartHTML;
    if (totalPriceElement) {
        totalPriceElement.textContent = vnd(totalPrice);
    }
    
    console.log(`✅ Cart modal updated: ${cart.length} items, total: ${vnd(totalPrice)}`);
    
    // Update checkout button state
    const checkoutButton = document.querySelector('.thanh-toan');
    if (checkoutButton) {
        if (cart.length > 0) {
            checkoutButton.classList.remove('disabled');
            checkoutButton.disabled = false;
        } else {
            checkoutButton.classList.add('disabled');
            checkoutButton.disabled = true;
        }
    }
    
    // Force remove any "Thêm món" button that might exist
    const themMonButton = document.querySelector('.them-mon');
    if (themMonButton) {
        themMonButton.remove();
        console.log('🗑️ Removed "Thêm món" button');
    }
}

// Change quantity in cart
async function changeQuantity(productId, change) {
    console.log('🔢 Changing quantity:', { productId, change });
    
    try {
        const itemIndex = cart.findIndex(item => item.id == productId);
        if (itemIndex === -1) {
            console.warn('Item not found in cart:', productId);
            return;
        }
        
        const currentQuantity = cart[itemIndex].soluong;
        const newQuantity = currentQuantity + change;
        
        if (newQuantity <= 0) {
            await removeFromCart(productId);
            return;
        }
        
        // Try API first if logged in, fallback to localStorage
        let useAPI = vyFoodAPI && vyFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('🔢 Updating quantity via API...');
                await vyFoodAPI.updateCartItem(productId, newQuantity);
                await loadCartFromAPI(); // Reload to sync
                
                showToast({ type: 'success', title: 'Thành công', message: 'Đã cập nhật số lượng' });
                return;
            } catch (apiError) {
                console.warn('Quantity update API failed, falling back to localStorage:', apiError.message);
                useAPI = false;
            }
        }
        
        if (!useAPI) {
            // Use localStorage for guest or fallback
            console.log('🔢 Updating local cart quantity...');
            
            cart[itemIndex].soluong = newQuantity;
            localStorage.setItem('cart', JSON.stringify(cart));
            
            updateCartUI();
            updateCartModal();
            
            showToast({ type: 'success', title: 'Thành công', message: 'Đã cập nhật số lượng (Offline mode)' });
        }
        
    } catch (error) {
        console.error('Error changing quantity:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể cập nhật số lượng' });
    }
}

// Checkout function - microservices with fallback
async function checkout() {
    console.log('💳 Checkout clicked');
    
    if (cart.length === 0) {
        showToast({ 
            type: 'error', 
            title: 'Lỗi', 
            message: 'Giỏ hàng của bạn đang trống' 
        });
        return;
    }
    
    // Open checkout page
    console.log('🛒 Opening checkout page...');
    const checkoutPage = document.querySelector('.checkout-page');
    if (checkoutPage) {
        checkoutPage.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Initialize checkout page with cart data
        if (typeof thanhtoanpage === 'function') {
            console.log('🔄 Initializing checkout page...');
            await thanhtoanpage(1); // Option 1 = checkout from cart
            
            // Force update cart display after initialization
            setTimeout(async () => {
                if (typeof showProductCart === 'function') {
                    console.log('🛒 Force updating cart display...');
                    await showProductCart();
                }
                if (typeof updateCheckoutTotal === 'function') {
                    console.log('💰 Force updating checkout total...');
                    await updateCheckoutTotal();
                }
            }, 100);
        } else {
            console.warn('⚠️ thanhtoanpage function not found');
        }
        
        return; // Exit early - don't process order here
    } else {
        console.error('❌ Checkout page element not found');
    }
    
    // Calculate total
    let total = 0;
    cart.forEach(item => {
        const product = window.products ? window.products.find(p => p.id == item.id) : null;
        if (product) {
            total += product.price * item.soluong;
        }
    });
    
    try {
        // Try microservices checkout (if logged in)
        if (vyFoodAPI.isLoggedIn()) {
            try {
                console.log('Creating order via microservices...');
                
                const orderData = {
                    items: cart,
                    total: total,
                    paymentMethod: 'cash',
                    deliveryAddress: 'Default address'
                };
                
                const order = await vyFoodAPI.createOrder(orderData);
                
                // Clear cart via API
                await vyFoodAPI.clearCart();
                await loadCartFromAPI();
                
                showToast({ 
                    type: 'success', 
                    title: 'Thành công', 
                    message: `Đã đặt hàng thành công! Mã đơn: ${order.orderId}` 
                });
                
                closeCart();
                return;
            } catch (apiError) {
                console.warn('API checkout failed, using local fallback:', apiError);
            }
        }
        
        // Fallback - local checkout for demo/guest users
        const orderId = 'LOCAL-' + Date.now();
        
        // Clear local cart
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        updateCartModal();
        
        showToast({ 
            type: 'success', 
            title: 'Thành công', 
            message: `Đã đặt hàng thành công! Tổng tiền: ${vnd(total)} (Demo mode)` 
        });
        
        closeCart();
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast({ 
            type: 'error', 
            title: 'Lỗi', 
            message: 'Không thể thanh toán' 
        });
    }
}
