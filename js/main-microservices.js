// Modern main.js for Vy Food Microservices

// Use global VyFood API client (created in api-client.js)
const vyFoodAPI = window.vyFoodAPI;
const sonFoodAPI = window.vyFoodAPI; // Create alias for compatibility

// Global state management
let currentUser = null;

// Helper function to get current user
function getCurrentUser() {
    // Try from memory first
    if (currentUser) {
        return currentUser;
    }
    
    // Try from window global
    if (window.currentUser) {
        currentUser = window.currentUser;
        return currentUser;
    }
    
    // Try multiple localStorage keys
    try {
        // Try vyFoodUser first (from microservices)
        let stored = localStorage.getItem('vyFoodUser');
        if (stored) {
            currentUser = JSON.parse(stored);
            window.currentUser = currentUser;
            return currentUser;
        }
        
        // Try currentuser (legacy)
        stored = localStorage.getItem('currentuser');
        if (stored) {
            currentUser = JSON.parse(stored);
            window.currentUser = currentUser;
            return currentUser;
        }
        
        // Try currentUser (camelCase)
        stored = localStorage.getItem('currentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
            window.currentUser = currentUser;
            return currentUser;
        }
    } catch (error) {
        console.warn('Error parsing stored user:', error);
    }
    
    return null;
}
let products = [];
let cart = [];

// Debug function to check cart state
function debugCart() {
    console.log('🐛 CART DEBUG:');
    console.log('Current cart:', cart);
    console.log('LocalStorage cart:', localStorage.getItem('cart'));
    console.log('User logged in:', sonFoodAPI ? sonFoodAPI.isLoggedIn() : false);
    console.log('sonFoodAPI exists:', !!sonFoodAPI);
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
    
    // Auto refresh when returning to homepage after order success
    if (window.orderCompleted) {
        console.log('🔄 Auto refreshing after order completion');
        window.orderCompleted = false; // Reset flag
        setTimeout(() => {
            window.location.reload();
        }, 500); // Short delay to ensure checkout is fully closed
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

// Emergency function to force username update
function forceUpdateUsername() {
    const user = getCurrentUser();
    if (user) {
        const name = user.fullname || user.fullName || user.name || user.phone || 'Khách hàng';
        console.log('🚨 [EMERGENCY] Force updating username to:', name);
        
        // Find all possible selectors
        const selectors = [
            '.auth-container',
            '.text-tk',
            '.user-welcome'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.innerHTML.includes('Khách hàng') || el.innerHTML.includes('Đăng nhập')) {
                    console.log(`🚨 [EMERGENCY] Updating element with selector ${selector}:`, el);
                    el.innerHTML = `Xin chào, ${name}! <i class="fa-sharp fa-solid fa-caret-down"></i>`;
                }
            });
        });
    }
}

// Make auth functions globally available
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.logout = logout;
window.showUserAccount = showUserAccount;
window.showOrderHistory = showOrderHistory;
window.forceUpdateUsername = forceUpdateUsername;


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
        // Wait for API client to be available
        console.log('🚀 [INIT] Waiting for API client...');
        let apiWaitAttempts = 0;
        while (typeof vyFoodAPI === 'undefined' && apiWaitAttempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            apiWaitAttempts++;
        }
        
        if (typeof vyFoodAPI !== 'undefined') {
            console.log('🚀 [INIT] API client available after', apiWaitAttempts, 'attempts');
            // Make sonFoodAPI alias for compatibility
            if (typeof sonFoodAPI === 'undefined') {
                window.sonFoodAPI = vyFoodAPI;
                console.log('🚀 [INIT] Created sonFoodAPI alias');
            }
        } else {
            console.warn('🚀 [INIT] API client not available, continuing with fallbacks');
        }
        
        // Load products first (this is most important)
        console.log('🚀 [INIT] Loading products...');
        await loadProducts();
        console.log('🚀 [INIT] Products loaded:', products.length);
        
        // Initialize UI
        initializeEventListeners();
        
        // Initialize cart from localStorage first
        loadCartFromLocalStorage();
        
        // Check if user is logged in (check both API and localStorage)
        let userFound = false;
        
        // Method 1: Check API first
        if (vyFoodAPI && vyFoodAPI.isLoggedIn()) {
            try {
                currentUser = await vyFoodAPI.getCurrentUser();
                console.log('🔄 [INIT] User found via API:', currentUser);
                
                // Save to localStorage for persistence
                try {
                    const toStore = currentUser && currentUser.user ? currentUser.user : currentUser;
                    localStorage.setItem('currentUser', JSON.stringify(toStore));
                    localStorage.setItem('vyFoodUser', JSON.stringify(toStore));
                } catch(_) {}
                
                updateUIForLoggedInUser();
                userFound = true;
                
                // Load cart from API and merge with localStorage
                await loadCartFromAPI();
                console.log('✅ [INIT] User session and cart loaded from API');
            } catch (userError) {
                console.warn('⚠️ [INIT] User session error (trying localStorage):', userError);
                // Clear invalid token
                vyFoodAPI.removeToken();
            }
        }
        
        // Method 2: Check localStorage if API failed
        if (!userFound) {
            currentUser = getCurrentUser(); // This checks localStorage
            if (currentUser) {
                console.log('🔄 [INIT] User found via localStorage:', currentUser);
                updateUIForLoggedInUser();
                userFound = true;
                console.log('✅ [INIT] User session loaded from localStorage');
            }
        }
        
        if (!userFound) {
            console.log('ℹ️ [INIT] No user session found - showing login UI');
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
        console.log('🍕 [PRODUCTS] Starting product load...');
        console.log('🍕 [PRODUCTS] Checking vyFoodAPI availability...');
        
        // Wait for vyFoodAPI to be available with timeout
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait
        
        while (typeof vyFoodAPI === 'undefined' && attempts < maxAttempts) {
            console.log(`🍕 [PRODUCTS] Waiting for vyFoodAPI... attempt ${attempts + 1}`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof vyFoodAPI === 'undefined') {
            throw new Error('vyFoodAPI is still not defined after waiting');
        }
        
        console.log('🍕 [PRODUCTS] vyFoodAPI found after', attempts, 'attempts');
        
        console.log('🍕 [PRODUCTS] vyFoodAPI available, calling getProducts...');
        console.log('🍕 [PRODUCTS] API base URL:', vyFoodAPI.baseURL);
        
        // Load all products by setting high limit
        const response = await vyFoodAPI.getProducts({ limit: 100 });
        console.log('🍕 [PRODUCTS] Raw API response:', response);
        
        // Handle different response formats
        let productArray = [];
        if (response && response.products && Array.isArray(response.products)) {
            productArray = response.products;
            console.log('🍕 [PRODUCTS] Using response.products array');
        } else if (response && Array.isArray(response)) {
            productArray = response;
            console.log('🍕 [PRODUCTS] Using response as array');
        } else if (response && typeof response === 'object') {
            console.log('🍕 [PRODUCTS] Response is object, checking properties...');
            console.log('🍕 [PRODUCTS] Response keys:', Object.keys(response));
            // Try to find array in response
            for (const key of Object.keys(response)) {
                if (Array.isArray(response[key])) {
                    productArray = response[key];
                    console.log(`🍕 [PRODUCTS] Found array at response.${key}`);
                    break;
                }
            }
        }
        
        products = productArray;
        window.products = products; // Expose globally for cart
        
        console.log('🍕 [PRODUCTS] Final products array:', products.length, 'items');
        
        if (products.length === 0) {
            console.warn('🍕 [PRODUCTS] No products found in response');
            console.log('🍕 [PRODUCTS] Full response for debugging:', JSON.stringify(response, null, 2));
        } else {
            console.log('🍕 [PRODUCTS] Sample product:', products[0]);
            console.log('🍕 [PRODUCTS] Total products loaded:', products.length);
        }
        
        // Always try to display (even if empty)
        console.log('🍕 [PRODUCTS] Calling displayProducts...');
        displayProducts(products);
        console.log('🍕 [PRODUCTS] displayProducts completed');
        
        // Hide pagination since we load all products
        const pageNav = document.querySelector('.page-nav');
        if (pageNav) {
            pageNav.style.display = 'none';
        }
        
        console.log('🍕 [PRODUCTS] Load process completed successfully');
    } catch (error) {
        console.error('❌ [PRODUCTS] Error loading products:', error);
        console.error('❌ [PRODUCTS] Error stack:', error.stack);
        
        // Try fallback: load from local JSON or use sample data
        console.log('🍕 [PRODUCTS] Trying fallback data...');
        
        try {
            // Try to fetch from local products.json if available
            const response = await fetch('./microservices/products.json');
            if (response.ok) {
                const localProducts = await response.json();
                console.log('🍕 [PRODUCTS] Loaded fallback data:', localProducts.length, 'products');
                products = localProducts;
                window.products = products;
                displayProducts(products);
                return;
            }
        } catch (fallbackError) {
            console.warn('🍕 [PRODUCTS] Fallback data also failed:', fallbackError);
        }
        
        // Final fallback: empty state
        products = [];
        window.products = [];
        console.log('🍕 [PRODUCTS] Displaying empty state due to all failures');
        displayProducts([]);
        
        const errorMsg = error.message || 'Unknown error';
        showToast({ type: 'error', title: 'Lỗi', message: `Không thể tải sản phẩm: ${errorMsg}` });
    }
}

function displayProducts(productList) {
    console.log('🎨 [DISPLAY] Starting displayProducts with:', productList?.length || 0, 'products');
    
    const productContainer = document.querySelector('.home-products');
    console.log('🎨 [DISPLAY] Product container found:', !!productContainer);
    
    if (!productContainer) {
        console.error('❌ [DISPLAY] Product container (.home-products) not found in DOM');
        return;
    }

    if (!productList || productList.length === 0) {
        console.log('🎨 [DISPLAY] No products to display, showing empty state');
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
    
    console.log('🎨 [DISPLAY] Processing', productList.length, 'products for display');

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
            product = await sonFoodAPI.getProduct(productId);
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
        if (sonFoodAPI && sonFoodAPI.isLoggedIn()) {
            console.log('🛒 User logged in, loading from API...');
            console.log('🛒 User ID:', sonFoodAPI.getCurrentUserId());
            const cartData = await sonFoodAPI.getCart();
            
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
        console.error('🛒 Error loading cart:', error.message, error);
        // Pure microservices - no localStorage fallback
        cart = [];
        console.log('🛒 Set empty cart due to API error');
    }
    
    updateCartUI();
    updateCartModal();
}

// Clear cart function
async function clearCart() {
    console.log('🧹 Clearing cart...');
    
    try {
        if (sonFoodAPI && sonFoodAPI.isLoggedIn()) {
            await sonFoodAPI.clearCart();
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
    console.log('User logged in:', sonFoodAPI ? sonFoodAPI.isLoggedIn() : false);
    
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
        let useAPI = sonFoodAPI && sonFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('📦 Using API mode...');
                await sonFoodAPI.addToCart(productId, 1);
                console.log('✅ API call successful, reloading cart...');
                
                await loadCartFromAPI(); // Reload to sync
                console.log('Cart after reload:', cart);
                
                // Removed toast notification - silent add to cart
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
            
            // Removed toast notification - silent add to cart for guest
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
    const note = document.querySelector('#popup-detail-note')?.value || "Không có ghi chú";
        
        console.log(`Adding ${qty} items of product ${productId} from modal`);
        
        // Try API first if logged in, fallback to localStorage
        let useAPI = sonFoodAPI && sonFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('📦 Using API mode for modal add...');
                await sonFoodAPI.addToCart(productId, qty);
                await loadCartFromAPI();
                
                closeModal();
                // Removed toast notification - silent add to cart from modal
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
            // Removed toast notification - silent add to cart from modal (guest)
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
        let useAPI = sonFoodAPI && sonFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                if (quantity <= 0) {
                    await sonFoodAPI.removeFromCart(productId);
                } else {
                    await sonFoodAPI.updateCartItem(productId, quantity);
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
    console.log('User logged in:', sonFoodAPI ? sonFoodAPI.isLoggedIn() : false);
    
    try {
        // Try API first if logged in, fallback to localStorage
        let useAPI = sonFoodAPI && sonFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('🗑️ Using API mode for removal...');
                await sonFoodAPI.removeFromCart(productId);
                console.log('✅ API removal successful, reloading cart...');
                
                await loadCartFromAPI(); // Reload to sync
                console.log('Cart after reload:', cart);
                
                // Removed toast notification - silent remove from cart
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
                
                // Removed toast notification - silent remove from cart (guest)
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
    if (!sonFoodAPI.isLoggedIn()) {
        showLoginRequired();
        return;
    }

    try {
        // Add to cart first, then go to checkout
        const qty = parseInt(document.querySelector('.product-control .input-qty').value);
        await sonFoodAPI.addToCart(productId, qty);
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
            const response = await sonFoodAPI.searchProducts(query, { limit: 100 });
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
            const response = await sonFoodAPI.getProducts({ category, limit: 100 });
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
    // Removed login required notification - silent redirect to login
    
    // Show login form instead of signup
    setTimeout(() => {
        showLoginForm();
    }, 500);
}

function updateUIForLoggedInUser() {
    // Force refresh current user data
    currentUser = getCurrentUser();
    console.log('🔄 [DETAILED] Updating UI for logged in user:', currentUser);
    
    if (!currentUser) {
        console.error('❌ No current user found for UI update');
        return;
    }
    
    // Find the correct auth container in header
    const authContainer = document.querySelector('.auth-container');
    const loginMenu = document.querySelector('.header-middle-right-menu');
    
    if (!authContainer) {
        console.error('❌ Auth container not found in DOM');
        return;
    }
    
    console.log('✅ Found auth container:', authContainer);
    
    // Determine user display name with clear priority
    let userName = 'Khách hàng'; // Safe fallback
    
    console.log('🔍 [DETAILED] User data analysis:', {
        fullname: currentUser.fullname,
        fullName: currentUser.fullName,
        name: currentUser.name,
        phone: currentUser.phone,
        userId: currentUser.userId || currentUser._id,
        allKeys: Object.keys(currentUser)
    });
    
    // Priority order: fullname > fullName > name > phone
    if (currentUser.fullname && typeof currentUser.fullname === 'string' && currentUser.fullname.trim()) {
        userName = currentUser.fullname.trim();
        console.log('✅ [SUCCESS] Using fullname:', userName);
    } else if (currentUser.fullName && typeof currentUser.fullName === 'string' && currentUser.fullName.trim()) {
        userName = currentUser.fullName.trim();
        console.log('✅ [SUCCESS] Using fullName:', userName);
    } else if (currentUser.name && typeof currentUser.name === 'string' && currentUser.name.trim()) {
        userName = currentUser.name.trim();
        console.log('✅ [SUCCESS] Using name:', userName);
    } else if (currentUser.phone && typeof currentUser.phone === 'string' && currentUser.phone.trim()) {
        userName = currentUser.phone.trim();
        console.log('✅ [SUCCESS] Using phone:', userName);
    } else {
        console.warn('⚠️ [WARNING] No valid name found, using fallback');
    }
    
    console.log('🎯 [FINAL] Display name resolved to:', userName);
    
    // Clear and update auth container with proper structure
    authContainer.innerHTML = '';
    
    // Create the welcome span
    const welcomeSpan = document.createElement('span');
    welcomeSpan.className = 'text-tk user-welcome';
    welcomeSpan.innerHTML = `Xin chào, ${userName}! <i class="fa-sharp fa-solid fa-caret-down"></i>`;
    
    // Append to container
    authContainer.appendChild(welcomeSpan);
    
    console.log('📝 [DOM] Auth container updated with:', authContainer.innerHTML);
    
    // Update login menu to logout menu
    if (loginMenu) {
        loginMenu.innerHTML = `
            <li><a href="#" onclick="showUserAccount()"><i class="fa-light fa-user"></i> Tài khoản</a></li>
            <li><a href="#" onclick="showOrderHistory()"><i class="fa-light fa-clock-rotate-left"></i> Lịch sử đặt hàng</a></li>
            <li><a href="#" onclick="logout()"><i class="fa-light fa-right-from-bracket"></i> Đăng xuất</a></li>
        `;
        loginMenu.style.display = 'block';
        console.log('📝 [DOM] Login menu updated to logout menu');
    } else {
        console.warn('⚠️ Login menu not found');
    }
    
    // Force DOM refresh with multiple approaches
    setTimeout(() => {
        const updatedContainer = document.querySelector('.auth-container');
        if (updatedContainer) {
            console.log('🔄 [VERIFICATION] Auth container after timeout:', updatedContainer.innerHTML);
            // Force visual refresh
            updatedContainer.style.display = 'none';
            updatedContainer.offsetHeight; // Force reflow
            updatedContainer.style.display = '';
        }
    }, 100);
    
    // AGGRESSIVE APPROACH: Keep forcing the update until it sticks
    let updateAttempts = 0;
    const maxAttempts = 10;
    
    const aggressiveUpdater = setInterval(() => {
        const container = document.querySelector('.auth-container');
        if (container && userName !== 'Khách hàng' && updateAttempts < maxAttempts) {
            const currentHTML = container.innerHTML;
            console.log(`🔄 [AGGRESSIVE-${updateAttempts}] Current HTML:`, currentHTML);
            
            if (!currentHTML.includes(userName)) {
                console.log(`🔄 [AGGRESSIVE-${updateAttempts}] FORCING UPDATE with name:`, userName);
                container.innerHTML = '';
                
                const newSpan = document.createElement('span');
                newSpan.className = 'text-tk user-welcome';
                newSpan.innerHTML = `Xin chào, ${userName}! <i class="fa-sharp fa-solid fa-caret-down"></i>`;
                container.appendChild(newSpan);
                
                // Also try direct text update
                container.style.cssText = 'display: block !important; visibility: visible !important;';
                
                console.log(`✅ [AGGRESSIVE-${updateAttempts}] Updated to:`, container.innerHTML);
            } else {
                console.log(`✅ [AGGRESSIVE-${updateAttempts}] Name found in HTML, stopping updates`);
                clearInterval(aggressiveUpdater);
            }
            
            updateAttempts++;
        } else if (updateAttempts >= maxAttempts) {
            console.warn('⚠️ [AGGRESSIVE] Max update attempts reached');
            clearInterval(aggressiveUpdater);
        }
    }, 200); // Every 200ms
    
    // Stop aggressive updater after 3 seconds
    setTimeout(() => {
        clearInterval(aggressiveUpdater);
        console.log('🛑 [AGGRESSIVE] Stopped after 3 seconds');
    }, 3000);
    
    console.log('✅ [COMPLETE] UI update completed for user:', userName)
}

async function logout() {
    try {
        console.log('🚪 Logging out...');
        await sonFoodAPI.logout();
        currentUser = null;
        window.currentUser = null;
        
        // Clear localStorage
        localStorage.removeItem('currentUser');
        
        // Clear both API and local cart data
        cart = [];
        localStorage.removeItem('cart');
        
        updateCartUI();
        updateCartModal();
        
        // Reset UI to guest state
        resetUIToGuestState();
        
        // Removed logout notification - silent logout
        
    } catch (error) {
        console.error('Error during logout:', error);
        
        // Force logout even if API call fails
        currentUser = null;
        window.currentUser = null;
        cart = [];
        localStorage.removeItem('cart');
        vyFoodAPI.removeToken();
        resetUIToGuestState();
        // Removed logout notification - silent logout
    }
}

function resetUIToGuestState() {
    console.log('🔄 Resetting UI to guest state');
    
    const authContainer = document.querySelector('.auth-container');
    const loginMenu = document.querySelector('.header-middle-right-menu');
    
    if (authContainer) {
        authContainer.innerHTML = `
            <span class="text-dndk">Đăng nhập / Đăng ký</span>
            <span class="text-tk">Tài khoản <i class="fa-sharp fa-solid fa-caret-down"></i></span>
        `;
    }
    
    if (loginMenu) {
        loginMenu.innerHTML = `
            <li><a id="login" href="javascript:;"><i class="fa-light fa-right-to-bracket"></i> Đăng nhập</a></li>
            <li><a id="signup" href="javascript:;"><i class="fa-light fa-user-plus"></i> Đăng ký</a></li>
        `;
        loginMenu.style.display = 'block';
    }
    
    // Re-initialize auth event listeners
    setTimeout(() => {
        if (typeof initializeAuthForms === 'function') {
            initializeAuthForms();
        }
    }, 100);
}

function showUserAccount() {
    // Hide other sections
    document.getElementById('trangchu').classList.add('hide');
    document.getElementById('order-history').classList.remove('open');
    
    // Show account section
    document.getElementById('account-user').classList.add('open');
    
    // Populate user info if available
    if (currentUser || window.currentUser) {
        const user = currentUser || window.currentUser;
        const nameField = document.getElementById('infoname');
        const phoneField = document.getElementById('infophone');
        const emailField = document.getElementById('infoemail');
        
        if (nameField) nameField.value = user.fullname || user.fullName || '';
        if (phoneField) phoneField.value = user.phone || '';
        if (emailField) emailField.value = user.email || '';
    }
}

function showOrderHistory() {
    // Hide other sections
    document.getElementById('trangchu').classList.add('hide');
    document.getElementById('account-user').classList.remove('open');
    
    // Show order history section
    document.getElementById('order-history').classList.add('open');
    
    // Load order history if function exists
    if (typeof loadOrderHistory === 'function') {
        loadOrderHistory();
    }
}

// Order History Functions - 100% Microservices
// localStorage functions removed for pure microservices architecture

async function loadOrderHistory() {
    try {
        const currentUser = getCurrentUser();
        const container = document.querySelector('.order-history-section') || document.getElementById('order-history-container');
        
        if (!container) {
            console.error('Order history container not found');
            return;
        }
        
        if (!currentUser) {
            container.innerHTML = '<p class="empty-order">Vui lòng đăng nhập để xem lịch sử đặt hàng</p>';
            return;
        }
        
    // Show loading state
        container.innerHTML = '<p class="loading-order">Đang tải lịch sử đặt hàng...</p>';
        
        console.log('📋 [ORDER-HISTORY] Starting order history load...');
        
        // Check authentication - use both vyFoodAPI and localStorage
        let apiAvailable = false;
        let isLoggedIn = false;
        
        try {
            apiAvailable = typeof vyFoodAPI !== 'undefined' && vyFoodAPI !== null;
            isLoggedIn = apiAvailable && vyFoodAPI.isLoggedIn();
            console.log('📋 [ORDER-HISTORY] API available:', apiAvailable, 'Logged in:', isLoggedIn);
        } catch (apiError) {
            console.warn('📋 [ORDER-HISTORY] API check failed:', apiError);
        }
        
        const hasStoredUser = localStorage.getItem('currentuser') || localStorage.getItem('vyFoodUser');
        console.log('📋 [ORDER-HISTORY] Has stored user:', !!hasStoredUser);
        
        if (!isLoggedIn && !hasStoredUser) {
            container.innerHTML = '<p class="empty-order">Vui lòng đăng nhập để xem lịch sử đặt hàng</p>';
            return;
        }

        try {
            const normalizePhone = (v) => {
                if (!v) return null;
                const s = String(v).replace(/\D/g, '');
                if (/^0\d{9}$/.test(s)) return s; // 10 digits starting with 0
                if (/^0\d{10}$/.test(s)) return s; // 11 digits starting with 0
                return null;
            };

            // Get phone number from multiple sources (phones only)
            let userPhone = null;
            let possiblePhones = new Set();

            if (currentUser) {
                const p1 = normalizePhone(currentUser.phone);
                const p2 = normalizePhone(currentUser.sdt);
                if (p1) possiblePhones.add(p1);
                if (p2) possiblePhones.add(p2);
                userPhone = p1 || p2 || null;
            }

            try {
                const storedUser1 = JSON.parse(localStorage.getItem('currentuser') || '{}');
                const storedUser2 = JSON.parse(localStorage.getItem('vyFoodUser') || '{}');
                const c1 = normalizePhone(storedUser1.phone) || normalizePhone(storedUser1.sdt);
                const c2 = normalizePhone(storedUser2.phone) || normalizePhone(storedUser2.sdt);
                if (c1) possiblePhones.add(c1);
                if (c2) possiblePhones.add(c2);
                if (!userPhone) userPhone = c1 || c2 || null;
            } catch (e) {}

            if (!userPhone && vyFoodAPI && typeof vyFoodAPI.getCurrentUserPhone === 'function') {
                const apiPhone = normalizePhone(vyFoodAPI.getCurrentUserPhone());
                if (apiPhone) {
                    possiblePhones.add(apiPhone);
                    userPhone = apiPhone;
                }
            }

            // If we just created an order successfully, prefer the exact phone used
            try {
                const lastMsSuccess = localStorage.getItem('ms_lastOrderSuccess') === 'true';
                const lastPhone = localStorage.getItem('lastOrderUserPhone');
                const lp = normalizePhone(lastPhone);
                if (lastMsSuccess && lp) {
                    userPhone = lp;
                }
            } catch (_) {}

            console.log('📋 [ORDER-HISTORY] Resolved userPhone:', userPhone);
            console.log('📋 [ORDER-HISTORY] All possible phones:', Array.from(possiblePhones));
            console.log('📋 [ORDER-HISTORY] Current user data:', currentUser);
            
            if (!userPhone) {
                container.innerHTML = '<p class="empty-order">Không tìm thấy số điện thoại user. Vui lòng đăng nhập lại!</p>';
                return;
            }
            
            // DEBUG: Show which phone number will be used for order lookup
            console.log(`🔍 [ORDER-HISTORY] Searching orders for phone: ${userPhone}`);

            // Check API availability before calling
            if (!apiAvailable) {
                console.error('📋 [ORDER-HISTORY] vyFoodAPI not available');
                container.innerHTML = '<p class="empty-order">Dịch vụ đang bảo trì. Vui lòng thử lại sau!</p>';
                return;
            }

            console.log('📋 [ORDER-HISTORY] Calling getUserOrders with phone:', userPhone);
            let response = await vyFoodAPI.getUserOrders(userPhone);
            
            console.log('📋 [ORDER-HISTORY] Raw API response structure:', {
                hasResponse: !!response,
                hasOrders: !!(response && response.orders),
                ordersLength: response && response.orders ? response.orders.length : 'N/A',
                responseKeys: response ? Object.keys(response) : 'N/A',
                fullResponse: response
            });
            
            console.log('📋 [ORDER-HISTORY] API response for phone', userPhone + ':', response);
            
            if (!response || !response.orders || response.orders.length === 0) {
                const alternativePhones = Array.from(possiblePhones).filter(phone => phone !== userPhone);
                
                for (const phone of alternativePhones) {
                    try {
                        const altResponse = await vyFoodAPI.getUserOrders(phone);
                        if (altResponse && altResponse.orders && altResponse.orders.length > 0) {
                            response = altResponse;
                            break;
                        }
                    } catch(e) {
                        // Silent continue
                    }
                }
            }
            
            console.log('📋 [ORDER-HISTORY] API response received:', response);
            // If we just created an order, wait a bit and retry once to avoid race condition
            if ((!response || !response.orders || response.orders.length === 0) && (localStorage.getItem('ms_lastOrderSuccess') === 'true')) {
                await new Promise(r => setTimeout(r, 800));
                try {
                    response = await vyFoodAPI.getUserOrders(userPhone);
                } catch(_) {}
            }

            if (response && response.orders && response.orders.length > 0) {
                console.log('📋 [ORDER-HISTORY] Found', response.orders.length, 'orders');
                displayOrderHistory(response.orders);
                // Clear the success flag after we showed server data
                try { localStorage.removeItem('ms_lastOrderSuccess'); } catch(_) {}
            } else {
                console.log('📋 [ORDER-HISTORY] No orders from API. Will only show local fallback filtered for this user.');
                // Fallback to localStorage when API has no orders: filter by this user's phone only
                loadOrderHistoryFromLocal(currentUser, container, { filterByPhone: userPhone });
            }
        } catch (apiError) {
            console.error('📋 [ORDER-HISTORY] API error:', apiError);
            console.log('📋 [ORDER-HISTORY] Falling back to localStorage due to API error');
            // Fallback to localStorage when API fails
            loadOrderHistoryFromLocal(currentUser, container);
        }
        
    } catch (error) {
        console.error('❌ [ORDER-HISTORY] Critical error:', error);
        console.error('❌ [ORDER-HISTORY] Error stack:', error.stack);
        
        const container = document.querySelector('.order-history-section') || document.getElementById('order-history-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-order">
                    <p>Có lỗi khi tải lịch sử đặt hàng</p>
                    <small>Chi tiết lỗi: ${error.message}</small>
                    <br><br>
                    <button onclick="loadOrderHistory()" class="btn-reload">Thử lại</button>
                </div>
            `;
        }
    }
}

function loadOrderHistoryFromLocal(currentUser, container, options = {}) {
    try {
        let orders = JSON.parse(localStorage.getItem('order') || '[]');
        let orderDetails = JSON.parse(localStorage.getItem('orderDetails') || '[]');
        
        console.log('📦 Loading from localStorage:');
        console.log('- Total orders:', orders.length);
        console.log('- Total orderDetails:', orderDetails.length);
        console.log('- Current user phone:', currentUser?.phone);
        console.log('- All orders:', orders);
        
        // If requested, filter by the current user's phone
        const userPhone = (currentUser && (currentUser.phone || currentUser.id || currentUser.sdt)) || options.filterByPhone || '';
        let filtered = orders;
        if (userPhone) {
            filtered = orders.filter(o => String(o.khachhang || '').trim() === String(userPhone).trim());
        }
        // Mark as local fallback only for display
        const userOrders = filtered.length > 0 ? filtered.map(o => ({ ...o, __localFallback: true })) : [];
        
        console.log('- User orders found:', userOrders.length);
        
        if (userOrders.length === 0) {
            container.innerHTML = '<p class="empty-order">Bạn chưa có đơn hàng nào. Hãy thử đặt hàng để xem lịch sử.</p>';
            return;
        }
        
        // Helper: map legacy street addresses to UIT branch labels for pickup
        const mapLegacyAddress = (raw) => {
            if (!raw) return raw;
            const normalized = String(raw)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
            if (normalized.includes('273 an duong vuong')) return 'Trường Uit - Cổng A';
            if (normalized.includes('04 ton duc thang') || normalized.includes('4 ton duc thang')) return 'Trường Uit - Cổng B';
            return raw;
        };

        // Convert localStorage format to API format and resolve product details
        const apiOrders = [];
        for (let order of userOrders) {
            const orderItems = orderDetails.filter(detail => detail.id === order.id);
            
            // Resolve product details for each item
            const resolvedItems = [];
            for (let item of orderItems) {
                const product = window.products ? window.products.find(p => p.id == item.id) : null;
                if (product) {
                    resolvedItems.push({
                        ...item,
                        title: product.title,
                        name: product.title,
                        img: product.img,
                        price: product.price,
                        totalPrice: product.price * (item.soluong || item.quantity || 1)
                    });
                } else {
                    // Fallback with stored price data
                    resolvedItems.push({
                        ...item,
                        title: item.title || 'Sản phẩm không xác định',
                        name: item.title || 'Sản phẩm không xác định',
                        img: './assets/img/products/default.jpg',
                        price: item.price || 0,
                        totalPrice: item.thanhtien || ((item.price || 0) * (item.soluong || item.quantity || 1))
                    });
                }
            }
            
            // Normalize address for display
            const normalizedAddress = order.hinhthucgiao && order.hinhthucgiao.includes('Tự đến lấy')
                ? mapLegacyAddress(order.diachinhan || order.deliveryAddress)
                : (order.diachinhan || order.deliveryAddress);

            apiOrders.push({
                ...order,
                diachinhan: normalizedAddress,
                items: resolvedItems
            });
        }
        
    console.log('✅ Displaying orders with resolved products:', apiOrders.length);
        displayOrderHistory(apiOrders);
        
    } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
        container.innerHTML = '<p class="empty-order">Có lỗi khi tải lịch sử đặt hàng</p>';
    }
}

async function displayOrderHistory(orders) {
    console.log('📋 [DISPLAY-ORDER] Starting to display orders:', orders.length);
    
    const container = document.querySelector('.order-history-section') || document.getElementById('order-history-container');
    
    if (!container) {
        console.error('❌ [DISPLAY-ORDER] Container not found!');
        return;
    }
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-order">Bạn chưa có đơn hàng nào</p>';
        return;
    }
    
    console.log('📋 [DISPLAY-ORDER] Container found:', !!container);
    
    // SIMPLIFIED APPROACH - No async resolving to avoid blocking
    let htmlContent = '';
    
    // Helpers to normalize and map addresses
    const normalizeAddress = (raw) => {
        if (!raw) return '';
        try {
            return String(raw)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // strip diacritics
                .replace(/\s+/g, ' ')
                .trim();
        } catch (_) {
            return String(raw).toLowerCase();
        }
    };
    const toUitLabel = (raw) => {
        if (!raw) return 'Không có thông tin';
        const n = normalizeAddress(raw);
        if (n.includes('273 an duong vuong')) return 'Truong Uit - Cong A'.replace('Truong','Trường').replace('Uit','Uit').replace('Cong','Cổng');
        if (n.includes('04 ton duc thang') || n.includes('4 ton duc thang')) return 'Truong Uit - Cong B'.replace('Truong','Trường').replace('Uit','Uit').replace('Cong','Cổng');
        // If already label-like (any case/spacing), keep raw
        if (/tr(ư|u)\w*\s+uit\s*-\s*c(ô|o)ng\s*[ab]/i.test(raw)) return raw;
        return raw;
    };

    for (let order of orders) {
        console.log('📋 [DISPLAY-ORDER] Processing order:', order.id);
        console.log('📋 [DISPLAY-ORDER] Order items raw:', order.items);
        
        // Use items directly without complex resolving
        const orderItems = order.items || [];
        
        // Get product details from global products if available
        const resolvedItems = orderItems.map(item => {
            let resolvedItem = { ...item };
            
            // Try to find product in global products
            if (window.products && Array.isArray(window.products)) {
                const product = window.products.find(p => p.id == item.id || p._id == item.id);
                if (product) {
                    resolvedItem.title = product.title;
                    resolvedItem.img = product.img;
                    resolvedItem.price = product.price;
                }
            }
            
            // Fallback values
            resolvedItem.title = resolvedItem.title || `Sản phẩm #${item.id}`;
            resolvedItem.img = resolvedItem.img || './assets/img/blank-image.png';
            resolvedItem.price = resolvedItem.price || 50000;
            resolvedItem.totalPrice = resolvedItem.price * (item.soluong || item.quantity || 1);
            
            return resolvedItem;
        });
        
        const fallbackBadge = order.__localFallback ? '<span class="badge-local">(Lưu cục bộ)</span>' : '';
        let productHtml = `<div class="order-history-group">
            <div class="order-header">
                <h4>Đơn hàng #${order.id} ${fallbackBadge}</h4>
                <span class="order-date">${new Date(order.createdAt || order.thoigiandat).toLocaleString('vi-VN')}</span>
            </div>`;
        
        resolvedItems.forEach(item => {
            productHtml += `<div class="order-history">
                <div class="order-history-left">
                    <img src="${item.img}" alt="${item.title}" loading="lazy">
                    <div class="order-history-info">
                        <h4>${item.title}</h4>
                        <p class="order-history-note"><i class="fa-light fa-pen"></i> ${item.note || 'Không có ghi chú'}</p>
                        <p class="order-history-quantity">Số lượng: x${item.soluong || item.quantity || 1}</p>
                    </div>
                </div>
                <div class="order-history-right">
                    <div class="order-history-price">
                        <span class="order-history-unit-price">Đơn giá: ${vnd(item.price)}</span>
                        <span class="order-history-current-price">${vnd(item.totalPrice)}</span>
                    </div>
                </div>
            </div>`;
        });
        
        const statusClass = order.status === 'delivered' ? 'completed' : 'pending';
        const statusText = order.status === 'delivered' ? 'Đã giao' : 'Đang xử lý';
        
        // Calculate total from items if not available in order
        let orderTotal = order.totalAmount || order.tongtien || 0;
        if (!orderTotal && resolvedItems.length > 0) {
            orderTotal = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        }
        
        // Normalize address for display (prefer diachinhan)
        const formatOrderAddress = (ord) => toUitLabel((ord.diachinhan || ord.deliveryAddress || '').trim());

        productHtml += `<div class="order-history-control">
            <div class="order-history-status">
                <span class="order-history-status-sp ${statusClass}">${statusText}</span>
                <button class="order-detail-btn" onclick="detailOrder('${order.id}')">
                    <i class="fa-regular fa-eye"></i> Xem chi tiết
                </button>
            </div>
            <div class="order-history-total">
                <div class="order-history-total-detail">
                    <span>Phương thức: ${order.deliveryMethod || order.hinhthucgiao || 'Giao tận nơi'}</span><br>
                    <span>Địa chỉ: ${formatOrderAddress(order)}</span>
                </div>
                <span class="order-history-total-price">Tổng tiền: ${vnd(orderTotal)}</span>
            </div>
        </div></div>`;
        
        htmlContent += productHtml;
    }
    
    console.log('📋 [DISPLAY-ORDER] Setting container HTML, length:', htmlContent.length);
    container.innerHTML = htmlContent;
    console.log('📋 [DISPLAY-ORDER] Container HTML set successfully');
}

// Helper function to resolve product details from Product Service
async function resolveOrderItemDetails(items) {
    const resolvedItems = [];
    
    for (let item of items) {
        let resolvedItem = {
            ...item,
            title: item.title || item.name || `Sản phẩm #${item.id}`,
            name: item.title || item.name || `Sản phẩm #${item.id}`,
            img: './assets/img/blank-image.png',
            price: item.price || 50000,
            totalPrice: (item.price || 50000) * (item.soluong || item.quantity || 1)
        };
        
        // Try to get product details from global products first (faster)
        if (window.products && Array.isArray(window.products)) {
            const product = window.products.find(p => p.id == item.id || p._id == item.id);
            if (product) {
                resolvedItem = {
                    ...item,
                    title: product.title,
                    name: product.title,
                    img: product.img,
                    price: product.price,
                    totalPrice: product.price * (item.soluong || item.quantity || 1)
                };
                resolvedItems.push(resolvedItem);
                continue;
            }
        }
        
        // Fallback: Try Product Service (only if global products not available)
        try {
            const productResponse = await vyFoodAPI.getProduct(item.id);
            if (productResponse && productResponse.product) {
                const product = productResponse.product;
                resolvedItem = {
                    ...item,
                    title: product.title,
                    name: product.title,
                    img: product.img,
                    price: product.price,
                    totalPrice: product.price * (item.soluong || item.quantity || 1)
                };
            }
        } catch (error) {
            // Use default values already set
        }
        
        resolvedItems.push(resolvedItem);
    }
    
    return resolvedItems;
}

async function detailOrder(orderId) {
    try {
        let order = null;
        let items = [];

        // Local helpers for address mapping
        const normalizeAddress = (raw) => {
            if (!raw) return '';
            try {
                return String(raw)
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            } catch (_) {
                return String(raw).toLowerCase();
            }
        };
        const toUitLabelLocal = (raw) => {
            if (!raw) return 'Không có thông tin';
            const n = normalizeAddress(raw);
            if (n.includes('273 an duong vuong')) return 'Trường Uit - Cổng A';
            if (n.includes('04 ton duc thang') || n.includes('4 ton duc thang')) return 'Trường Uit - Cổng B';
            return raw;
        };

        // Microservices-first: try Order Service
        let apiTried = false;
        if (sonFoodAPI && sonFoodAPI.isLoggedIn() && !String(orderId).startsWith('ORDER_')) {
            try {
                apiTried = true;
                const response = await sonFoodAPI.getOrder(orderId);
                if (response && response.order) {
                    order = response.order;
                    // Normalize items
                    if (order.items && order.items.length > 0) {
                        order.items = order.items.map(item => ({
                            ...item,
                            id: item.id || item.productId,
                            soluong: item.soluong || item.quantity || 1,
                            price: item.price || 50000
                        }));
                    }
                    items = await resolveOrderItemDetails(order.items || []);
                } else {
                    throw new Error('Order not found in Order Service');
                }
            } catch (apiError) {
                console.warn('[detailOrder] API path failed:', apiError?.message || apiError);
                // Continue to fallback below
            }
        }

        // Fallback for legacy local orders (ORDER_*) or if API failed/404
        if (!order) {
            try {
                const ordersLS = JSON.parse(localStorage.getItem('order') || '[]');
                const detailsLS = JSON.parse(localStorage.getItem('orderDetails') || '[]');
                const localOrder = ordersLS.find(o => o.id === orderId);

                if (!localOrder) {
                    // If we already tried API and failed, show error
                    const msg = apiTried ? 'Không thể tải chi tiết đơn hàng từ Order Service' : 'Không tìm thấy đơn hàng';
                    showToast({ type: 'error', title: 'Lỗi', message: msg });
                    return;
                }

                order = {
                    id: localOrder.id,
                    tenguoinhan: localOrder.tenguoinhan,
                    sdtnhan: localOrder.sdtnhan,
                    diachinhan: localOrder.diachinhan,
                    createdAt: localOrder.thoigiandat || localOrder.createdAt,
                    deliveryMethod: localOrder.hinhthucgiao,
                    hinhthucgiao: localOrder.hinhthucgiao,
                    status: localOrder.trangthai === 1 ? 'delivered' : 'pending',
                    notes: localOrder.ghichu,
                    tongtien: localOrder.tongtien
                };

                const orderItems = detailsLS.filter(d => d.madon === orderId);
                items = orderItems.map(d => {
                    const product = (window.products || []).find(p => p.id == d.id || p._id == d.id);
                    const price = d.price || product?.price || 50000;
                    const qty = d.soluong || d.quantity || 1;
                    return {
                        id: d.id,
                        title: d.title || product?.title || `Sản phẩm #${d.id}`,
                        name: d.title || product?.title || `Sản phẩm #${d.id}`,
                        img: product?.img || './assets/img/blank-image.png',
                        price,
                        soluong: qty,
                        quantity: qty,
                        note: d.note || ''
                    };
                });
            } catch (fbErr) {
                console.error('[detailOrder] Fallback error:', fbErr);
                showToast({ type: 'error', title: 'Lỗi', message: 'Không thể hiển thị chi tiết đơn hàng' });
                return;
            }
        }

        if (!order) {
            showToast({ type: 'error', title: 'Lỗi', message: 'Không tìm thấy đơn hàng' });
            return;
        }

        let detailHtml = `
            <div class="order-detail-modal">
                <div class="order-detail-content">
                    <div class="order-detail-header">
                        <h3>Chi tiết đơn hàng ${order.id}</h3>
                        <button onclick="closeOrderDetail()" class="close-btn">&times;</button>
                    </div>
                    <div class="order-detail-body">
                        <div class="order-info">
                            <h4>Thông tin đơn hàng (Microservices):</h4>
                            <p><strong>Mã đơn:</strong> ${order.id}</p>
                            <p><strong>Người nhận:</strong> ${order.tenguoinhan || order.recipientName || 'Không có thông tin'}</p>
                            <p><strong>SĐT:</strong> ${order.sdtnhan || order.recipientPhone || 'Không có thông tin'}</p>
                            <p><strong>Địa chỉ:</strong> ${toUitLabelLocal((order.diachinhan || order.deliveryAddress || '').trim())}</p>
                            <p><strong>Thời gian đặt:</strong> ${new Date(order.createdAt || order.thoigiandat).toLocaleString('vi-VN')}</p>
                            <p><strong>Phương thức giao hàng:</strong> ${order.deliveryMethod || order.hinhthucgiao || 'Giao tận nơi'}</p>
                            <p><strong>Trạng thái:</strong> ${order.status === 'delivered' ? 'Đã giao' : 'Đang xử lý'}</p>
                            <p><strong>Ghi chú:</strong> ${order.notes || order.ghichu || 'Không có'}</p>
                        </div>
                        <div class="order-items">
                            <h4>Sản phẩm đã đặt:</h4>
        `;

        
        // Calculate total from items if order total is missing
        let calculatedTotal = order.totalAmount || order.tongtien || 0;
        
        if (items.length === 0) {
            // Show order total even if no item details
            detailHtml += `
                <div class="order-item">
                    <div class="item-info">
                        <h5>Đơn hàng ${order.id}</h5>
                        <p><em>Chi tiết sản phẩm không có sẵn</em></p>
                        <p><strong>Tổng giá trị đơn hàng:</strong> ${vnd(calculatedTotal)}</p>
                    </div>
                </div>
            `;
        } else {
            let itemsTotal = 0;
            items.forEach(item => {
                const itemPrice = item.price || 50000; // Default price if not found
                const itemQuantity = item.soluong || item.quantity || 1;
                const itemTotal = itemPrice * itemQuantity;
                itemsTotal += itemTotal;
                
                detailHtml += `
                    <div class="order-item">
                        <img src="${item.img || './assets/img/blank-image.png'}" alt="${item.title || item.name}" loading="lazy" 
                             onerror="this.src='./assets/img/blank-image.png'">
                        <div class="item-info">
                            <h5>${item.title || item.name || `Sản phẩm #${item.id}`}</h5>
                            <p><strong>Số lượng:</strong> ${itemQuantity}</p>
                            <p><strong>Đơn giá:</strong> ${vnd(itemPrice)}</p>
                            <p><strong>Thành tiền:</strong> ${vnd(itemTotal)}</p>
                            ${item.note ? `<p><strong>Ghi chú:</strong> ${item.note}</p>` : ''}
                        </div>
                    </div>
                `;
            });
            
            // Use calculated total if order total is 0
            if (!calculatedTotal || calculatedTotal === 0) {
                calculatedTotal = itemsTotal;
            }
        }
        
        detailHtml += `
                        </div>
                        <div class="order-total">
                            <h4>Tổng tiền: ${vnd(calculatedTotal)}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                #order-detail-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .order-detail-content {
                    background: white;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    border-radius: 8px;
                    margin: 20px;
                }
                .order-detail-header {
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .order-detail-body {
                    padding: 20px;
                }
                .order-item {
                    display: flex;
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 5px;
                }
                .order-item img {
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 5px;
                    margin-right: 15px;
                }
                .order-total {
                    padding: 15px;
                    background: #f8f9fa;
                    text-align: center;
                    font-size: 18px;
                    color: #dc3545;
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                }
            </style>
        `;
        
        // Create and show modal
        const modalContainer = document.createElement('div');
        modalContainer.id = 'order-detail-modal';
        modalContainer.innerHTML = detailHtml;
        document.body.appendChild(modalContainer);
        
    } catch (error) {
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể hiển thị chi tiết đơn hàng' });
    }
}

function closeOrderDetail() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.remove();
    }
}





// Make functions globally available
window.showOrderHistory = showOrderHistory;
window.loadOrderHistory = loadOrderHistory;
window.detailOrder = detailOrder;
window.closeOrderDetail = closeOrderDetail;

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
        let useAPI = sonFoodAPI && sonFoodAPI.isLoggedIn();
        
        if (useAPI) {
            try {
                console.log('🔢 Updating quantity via API...');
                await sonFoodAPI.updateCartItem(productId, newQuantity);
                await loadCartFromAPI(); // Reload to sync
                
                // Removed toast notification - silent quantity update
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
            
            // Removed toast notification - silent quantity update (offline)
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
        if (sonFoodAPI.isLoggedIn()) {
            try {
                console.log('Creating order via microservices...');
                
                const orderData = {
                    items: cart,
                    total: total,
                    paymentMethod: 'cash',
                    deliveryAddress: 'Default address'
                };
                
                const order = await sonFoodAPI.createOrder(orderData);
                
                // Clear cart via API
                await sonFoodAPI.clearCart();
                await loadCartFromAPI();
                
                showToast({ 
                    type: 'success', 
                    title: 'Thành công', 
                    message: `Đã đặt hàng thành công! Mã đơn: ${order.orderId}` 
                });
                
                // Order is already saved in Order Service database
                console.log('✅ Order saved in microservices database:', order.orderId);
                
                closeCart();
                
                // Mark order as completed for auto refresh when checkout closes
                window.orderCompleted = true;
                
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
        
        // Save order to localStorage for order history (demo mode)
        saveOrderToHistory({
            id: orderId,
            khachhang: currentUser?.phone || 'Guest',
            hinhthucgiao: 'home_delivery',
            ngaygiaohang: new Date().toISOString().split('T')[0],
            thoigiangiao: 'Sớm nhất có thể',
            ghichu: '',
            tenguoinhan: currentUser?.fullName || currentUser?.fullname || 'Khách hàng',
            sdtnhan: currentUser?.phone || '',
            diachinhan: 'Địa chỉ mặc định',
            thoigiandat: new Date(),
            tongtien: total,
            trangthai: 0
        }, cart);
        
        closeCart();
        
        // Mark order as completed for auto refresh when checkout closes (demo mode)
        window.orderCompleted = true;
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast({ 
            type: 'error', 
            title: 'Lỗi', 
            message: 'Không thể thanh toán' 
        });
    }
}

// ===============================
// USER PROFILE MANAGEMENT (SAFE VERSION)
// ===============================

// Email validation utility
function emailIsValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Load user information into form (safe version)
async function userInfo() {
    console.log('👤 Loading user info into form...');
    
    try {
        // Use existing localStorage data for compatibility
        const user = JSON.parse(localStorage.getItem('currentuser') || '{}');
        
        if (user) {
            const nameField = document.getElementById('infoname');
            const phoneField = document.getElementById('infophone'); 
            const emailField = document.getElementById('infoemail');
            const addressField = document.getElementById('infoaddress');
            
            if (nameField) nameField.value = user.fullname || '';
            if (phoneField) phoneField.value = user.phone || '';
            if (emailField) emailField.value = user.email || '';
            if (addressField) addressField.value = user.address || '';
            
            console.log('✅ User info populated in form');
        }
        
    } catch (error) {
        console.error('❌ Error loading user info:', error);
    }
}

// Update user information (safe hybrid version)
async function changeInformation() {
    console.log('👤 Updating user information...');
    
    const infoname = document.getElementById('infoname');
    const infoemail = document.getElementById('infoemail');
    const infoaddress = document.getElementById('infoaddress');
    
    // Clear previous error messages
    const errorElement = document.querySelector('.inforemail-error');
    if (errorElement) errorElement.innerHTML = '';
    
    // Validate email if provided
    if (infoemail.value.length > 0 && !emailIsValid(infoemail.value)) {
        if (errorElement) {
            errorElement.innerHTML = 'Vui lòng nhập lại email hợp lệ!';
            infoemail.focus();
            return;
        }
    }
    
    // Prepare update data - IMPORTANT: Never change phone number
    const updateData = {
        fullname: infoname.value.trim(),
        email: infoemail.value.trim(),
        address: infoaddress.value.trim()
        // Note: phone is intentionally excluded to prevent accidental changes
    };
    
    console.log('📝 Update data:', updateData);
    
    try {
        // Get current user from multiple sources to ensure we have complete data
        let currentUser = getCurrentUser() || {};
        
        console.log('📝 [PROFILE-UPDATE] Current user before update:', currentUser);
        console.log('📝 [PROFILE-UPDATE] Update data to apply:', updateData);
        
        // CRITICAL: Preserve phone number before update
        const originalPhone = currentUser.phone;
        
        // Update current user with new data
        Object.assign(currentUser, updateData);
        
        // CRITICAL: Restore phone number (never allow it to be changed)
        if (originalPhone) {
            currentUser.phone = originalPhone;
        }
        
        console.log('📝 [PROFILE-UPDATE] Current user after update (phone preserved):', currentUser);
        
        // Update ALL localStorage keys to ensure consistency
        localStorage.setItem('currentuser', JSON.stringify(currentUser));
        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // camelCase variant
        localStorage.setItem('vyFoodUser', JSON.stringify(currentUser)); // microservices variant
        
        // Update accounts array (for legacy compatibility)
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const accountIndex = accounts.findIndex(acc => acc.phone === currentUser.phone);
        if (accountIndex !== -1) {
            Object.assign(accounts[accountIndex], updateData);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            console.log('📝 [PROFILE-UPDATE] Updated accounts array');
        }
        
        // Try microservices as enhancement (don't fail if it doesn't work)
        if (vyFoodAPI && vyFoodAPI.isLoggedIn()) {
            try {
                console.log('🔄 Syncing to microservices...');
                const result = await vyFoodAPI.updateProfile(updateData);
                console.log('✅ Synced to microservices');
                // If server returns user, persist it so reload keeps the name
                if (result && result.user) {
                    const merged = { ...result.user };
                    // Ensure phone remains the same as before
                    if (originalPhone) merged.phone = originalPhone;
                    localStorage.setItem('vyFoodUser', JSON.stringify(merged));
                    localStorage.setItem('currentUser', JSON.stringify(merged));
                }
            } catch (microError) {
                console.warn('⚠️ Microservices sync failed (not critical):', microError.message);
            }
        }
        
        console.log('✅ Profile updated successfully');
        
        // CRITICAL: Force refresh UI with new user data
        console.log('🔄 [PROFILE-UPDATE] Forcing UI refresh with new data:', currentUser);
        
        // Update global state immediately
        window.currentUser = currentUser;
        
        // Force UI update with the new data
        updateUIForLoggedInUser();
        
        // Also use the emergency function to ensure it takes effect
        setTimeout(() => {
            forceUpdateUsername();
        }, 100);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast({ title: 'Thành công', message: 'Cập nhật thông tin thành công!', type: 'success' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Success', message: 'Cập nhật thông tin thành công!', type: 'success', duration: 3000 });
        }
        
        // Legacy update display (keep for compatibility)
        if (typeof kiemtradangnhap === 'function') {
            kiemtradangnhap();
        }
        
        console.log('🎉 [PROFILE-UPDATE] UI refresh completed!')
        
    } catch (error) {
        console.error('❌ Update profile error:', error);
        
        if (typeof showToast === 'function') {
            showToast({ title: 'Lỗi', message: 'Không thể cập nhật thông tin: ' + error.message, type: 'error' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Error', message: 'Cập nhật thông tin thất bại!', type: 'error', duration: 3000 });
        }
    }
}

// Change password (safe hybrid version)
async function changePassword() {
    console.log('🔒 Changing password...');
    
    const passwordCur = document.getElementById('password-cur-info');
    const passwordAfter = document.getElementById('password-after-info');
    const passwordConfirm = document.getElementById('password-comfirm-info');
    
    // Clear previous error messages
    const curError = document.querySelector('.password-cur-info-error');
    const afterError = document.querySelector('.password-after-info-error');
    const confirmError = document.querySelector('.password-after-comfirm-error');
    
    if (curError) curError.innerHTML = '';
    if (afterError) afterError.innerHTML = '';
    if (confirmError) confirmError.innerHTML = '';
    
    let isValid = true;
    
    // Validation
    if (!passwordCur.value.trim()) {
        if (curError) curError.innerHTML = 'Vui lòng nhập mật khẩu hiện tại';
        isValid = false;
    }
    
    if (!passwordAfter.value.trim()) {
        if (afterError) afterError.innerHTML = 'Vui lòng nhập mật khẩu mới';
        isValid = false;
    } else if (passwordAfter.value.length < 6) {
        if (afterError) afterError.innerHTML = 'Mật khẩu mới phải có ít nhất 6 ký tự';
        isValid = false;
    }
    
    if (!passwordConfirm.value.trim()) {
        if (confirmError) confirmError.innerHTML = 'Vui lòng nhập lại mật khẩu mới';
        isValid = false;
    } else if (passwordAfter.value !== passwordConfirm.value) {
        if (confirmError) confirmError.innerHTML = 'Mật khẩu xác nhận không khớp';
        isValid = false;
    }
    
    if (!isValid) return;
    
    try {
        // Always use localStorage first for compatibility
        const currentUser = JSON.parse(localStorage.getItem('currentuser') || '{}');
        
        // Verify current password
        if (currentUser.password !== passwordCur.value) {
            if (curError) curError.innerHTML = 'Mật khẩu hiện tại không đúng';
            return;
        }
        
        // Update password in localStorage
        currentUser.password = passwordAfter.value;
        localStorage.setItem('currentuser', JSON.stringify(currentUser));
        
        // Update accounts array
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const accountIndex = accounts.findIndex(acc => acc.phone === currentUser.phone);
        if (accountIndex !== -1) {
            accounts[accountIndex].password = passwordAfter.value;
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }
        
        // Try microservices as enhancement
        if (sonFoodAPI && sonFoodAPI.isLoggedIn()) {
            try {
                console.log('🔄 Syncing password to microservices...');
                const result = await sonFoodAPI.changePassword(passwordCur.value, passwordAfter.value);
                console.log('✅ Password synced to microservices');
            } catch (microError) {
                console.warn('⚠️ Microservices password sync failed (not critical):', microError.message);
            }
        }
        
        // Clear form
        passwordCur.value = '';
        passwordAfter.value = '';
        passwordConfirm.value = '';
        
        console.log('✅ Password changed successfully');
        
        if (typeof showToast === 'function') {
            showToast({ title: 'Thành công', message: 'Đổi mật khẩu thành công!', type: 'success' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Success', message: 'Đổi mật khẩu thành công!', type: 'success', duration: 3000 });
        }
        
    } catch (error) {
        console.error('❌ Change password error:', error);
        
        if (typeof showToast === 'function') {
            showToast({ title: 'Lỗi', message: 'Không thể đổi mật khẩu: ' + error.message, type: 'error' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Error', message: 'Đổi mật khẩu thất bại!', type: 'error', duration: 3000 });
        }
    }
}
