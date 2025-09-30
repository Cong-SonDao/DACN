const PHIVANCHUYEN = 30000;

// Safe function to update total price without affecting cart data
function updateTotalPrice(cartTotal, includeShipping = false) {
    // If cartTotal is 0, try to recalculate it
    if (cartTotal === 0) {
        console.warn('⚠️ Cart total is 0, attempting to recalculate...');
        cartTotal = calculateCurrentCartTotal();
    }
    
    const finalTotal = includeShipping ? cartTotal + PHIVANCHUYEN : cartTotal;
    console.log(`💰 Updating total: cart=${vnd(cartTotal)} shipping=${includeShipping ? vnd(PHIVANCHUYEN) : '0'} final=${vnd(finalTotal)}`);
    
    // If still 0, show warning but continue
    if (finalTotal === 0 || (finalTotal === PHIVANCHUYEN && !cartTotal)) {
        console.warn('⚠️ Final total seems incorrect:', finalTotal, 'cart:', cartTotal, 'shipping:', includeShipping);
    }
    
    // Find price element dynamically with more selectors
    const priceFinalElement = document.getElementById("checkout-cart-price-final") || 
                             document.querySelector(".total-price") ||
                             document.querySelector(".final-total") ||
                             document.querySelector(".cart-total") ||
                             document.querySelector("[class*='total']") ||
                             document.querySelector(".checkout-total") ||
                             // Look for elements containing currency symbol
                             Array.from(document.querySelectorAll('*')).find(el => 
                                 el.textContent && el.textContent.includes(' đ') && 
                                 el.offsetParent !== null
                             );
    
    if (priceFinalElement) {
        priceFinalElement.innerText = vnd(finalTotal);
        console.log('✅ Total price updated successfully to:', vnd(finalTotal));
        return true;
    } else {
        console.warn('⚠️ Could not find price element to update');
        // Try to create and append total display
        const checkoutArea = document.querySelector('.checkout, .modal, .total-bill-order');
        if (checkoutArea) {
            let customTotal = checkoutArea.querySelector('.custom-total-display');
            if (!customTotal) {
                customTotal = document.createElement('div');
                customTotal.className = 'custom-total-display';
                customTotal.style.cssText = 'font-size: 18px; font-weight: bold; color: #dc3545; text-align: right; margin: 10px; padding: 10px; border: 1px solid #ddd;';
                checkoutArea.appendChild(customTotal);
            }
            customTotal.innerHTML = `<strong>Tổng tiền: ${vnd(finalTotal)}</strong>`;
            console.log('✅ Created custom total display:', vnd(finalTotal));
            return true;
        }
        return false;
    }
}

// Helper function to calculate current cart total - MULTIPLE SOURCE FALLBACK
function calculateCurrentCartTotal() {
    let total = 0;
    
    // Try to get cart from multiple sources
    let currentCart = window.cart || [];
    
    // Fallback 1: Try localStorage
    if (currentCart.length === 0) {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
            try {
                currentCart = JSON.parse(storedCart);
                console.log('� Retrieved cart from localStorage:', currentCart);
            } catch (e) {
                console.warn('Failed to parse stored cart');
            }
        }
    }
    
    // Fallback 2: Try to read cart items from DOM if available
    if (currentCart.length === 0) {
        const cartItems = document.querySelectorAll('.cart-item, .checkout-item');
        if (cartItems.length > 0) {
            console.log('📦 Found cart items in DOM, reconstructing cart...');
            currentCart = [];
            cartItems.forEach(item => {
                const id = item.dataset.id || item.getAttribute('data-id');
                const quantity = item.querySelector('.quantity, .soluong, input[type="number"]');
                if (id && quantity) {
                    currentCart.push({
                        id: parseInt(id),
                        soluong: parseInt(quantity.value || quantity.textContent || 1)
                    });
                }
            });
        }
    }
    
    console.log('🛒 Final cart for calculation (count: ' + currentCart.length + '):', currentCart);
    console.log('📋 Available products (count: ' + (window.products ? window.products.length : 0) + ')');
    
    if (currentCart.length === 0) {
        console.warn('⚠️ No cart data found from any source - returning 0 total');
        return 0;
    }
    
    // Ensure products are available
    if (!window.products || window.products.length === 0) {
        console.warn('⚠️ Products not loaded - cannot calculate total');
        // Try to get products from localStorage as fallback
        const storedProducts = localStorage.getItem('products');
        if (storedProducts) {
            try {
                window.products = JSON.parse(storedProducts);
                console.log('📋 Retrieved products from localStorage');
            } catch (e) {
                console.warn('Failed to parse stored products');
                return 0;
            }
        } else {
            return 0;
        }
    }
    
    currentCart.forEach(item => {
        const product = window.products.find(p => p.id == item.id || p._id == item.id);
        if (product) {
            const itemTotal = product.price * item.soluong;
            total += itemTotal;
            console.log(`✅ Item ${item.id}: ${item.soluong} x ${product.price} = ${itemTotal}`);
        } else {
            console.warn(`❌ Product not found for item:`, item);
        }
    });
    console.log('💰 Current cart total:', vnd(total), '(items: ' + currentCart.length + ')');
    return total;
}

function calculateCurrentCartAmount() {
    let amount = 0;
    const currentCart = window.cart || [];
    currentCart.forEach(item => {
        amount += item.soluong;
    });
    console.log('📦 Current cart amount:', amount);
    return amount;
}
// Trang thanh toan
async function thanhtoanpage(option,product) {
    console.log('🛒 Starting checkout page setup...');
    
    // Ensure products are loaded
    if (!window.products || window.products.length === 0) {
        console.warn('⚠️ Products not loaded yet, waiting...');
        // Try to reload products if needed
        if (window.vyFoodAPI && typeof window.vyFoodAPI.getProducts === 'function') {
            try {
                const products = await window.vyFoodAPI.getProducts();
                window.products = products;
                console.log('✅ Products loaded for checkout:', products.length);
            } catch (error) {
                console.error('❌ Failed to load products:', error);
            }
        }
    }
    
    // Xu ly ngay nhan hang
    let today = new Date();
    let ngaymai = new Date();
    let ngaykia = new Date();
    ngaymai.setDate(today.getDate() + 1);
    ngaykia.setDate(today.getDate() + 2);
    let dateorderhtml = `<a href="javascript:;" class="pick-date active" data-date="${today}">
        <span class="text">Hôm nay</span>
        <span class="date">${today.getDate()}/${today.getMonth() + 1}</span>
        </a>
        <a href="javascript:;" class="pick-date" data-date="${ngaymai}">
            <span class="text">Ngày mai</span>
            <span class="date">${ngaymai.getDate()}/${ngaymai.getMonth() + 1}</span>
        </a>

        <a href="javascript:;" class="pick-date" data-date="${ngaykia}">
            <span class="text">Ngày kia</span>
            <span class="date">${ngaykia.getDate()}/${ngaykia.getMonth() + 1}</span>
    </a>`
    document.querySelector('.date-order').innerHTML = dateorderhtml;
    let pickdate = document.getElementsByClassName('pick-date')
    for(let i = 0; i < pickdate.length; i++) {
        pickdate[i].onclick = function () {
            document.querySelector(".pick-date.active").classList.remove("active");
            this.classList.add('active');
        }
    }

    let totalBillOrder = document.querySelector('.total-bill-order');
    let totalBillOrderHtml;
    // Xu ly don hang
    switch (option) {
        case 1: // Truong hop thanh toan san pham trong gio
            // Hien thi don hang
            await showProductCart(); // Now properly await the async function
            
            // Calculate total from current cart using helper functions
            const cartTotal = calculateCurrentCartTotal();
            const cartAmount = calculateCurrentCartAmount();
            
            console.log('💰 Calculated totals:', { cartTotal, cartAmount });
            
            // Tinh tien
            totalBillOrderHtml = `<div class="priceFlx">
            <div class="text">
                Tiền hàng 
                <span class="count">${cartAmount} món</span>
            </div>
            <div class="price-detail">
                <span id="checkout-cart-total">${vnd(cartTotal)}</span>
            </div>
        </div>
        <div class="priceFlx chk-ship">
            <div class="text">Phí vận chuyển</div>
            <div class="price-detail chk-free-ship">
                <span>${vnd(PHIVANCHUYEN)}</span>
            </div>
        </div>`;
            // Tong tien (default with shipping)
            updateTotalPrice(cartTotal, true);
            break;
        case 2: // Truong hop mua ngay
            // Hien thi san pham
            showProductBuyNow(product);
            // Tinh tien
            totalBillOrderHtml = `<div class="priceFlx">
                <div class="text">
                    Tiền hàng 
                    <span class="count">${product.soluong} món</span>
                </div>
                <div class="price-detail">
                    <span id="checkout-cart-total">${vnd(product.soluong * product.price)}</span>
                </div>
            </div>
            <div class="priceFlx chk-ship">
                <div class="text">Phí vận chuyển</div>
                <div class="price-detail chk-free-ship">
                    <span>${vnd(PHIVANCHUYEN)}</span>
                </div>
            </div>`
            // Tong tien (buy now with shipping)
            updateTotalPrice((product.soluong * product.price), true);
            break;
    }

    // Tinh tien
    totalBillOrder.innerHTML = totalBillOrderHtml;

    // Xu ly hinh thuc giao hang - ENHANCED VERSION  
    setTimeout(() => {
        const giaotannoi = document.querySelector('#giaotannoi');
        const tudenlay = document.querySelector('#tudenlay');
        const tudenlayGroup = document.querySelector('#tudenlay-group');
        const chkShip = document.querySelectorAll(".chk-ship");
        
        if (giaotannoi && tudenlay) {
            console.log('✅ Delivery buttons found and initialized');
            
            // Force CSS styles for active state
            const activeStyle = `
                border: 2px solid #dc3545 !important;
                background: rgba(220, 53, 69, 0.1) !important;
                color: #dc3545 !important;
                font-weight: bold !important;
            `;
            
            tudenlay.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚚 Clicked Tự đến lấy button');
                console.log('📦 Cart before pickup switch:', window.cart);
                
                // Remove active from giao tan noi
                giaotannoi.classList.remove("active");
                giaotannoi.style.cssText = '';
                
                // Add active to tu den lay with force CSS
                tudenlay.classList.add("active");
                tudenlay.style.cssText = activeStyle;
                
                console.log('✅ Tự đến lấy is now active');
                
                chkShip.forEach(item => item.style.display = "none");
                if (tudenlayGroup) tudenlayGroup.style.display = "block";
                
                // Update total price (remove shipping for pickup) - SAFE METHOD
                console.log('🚚 Pickup selected - updating total without shipping');
                console.log('📦 Cart after pickup switch:', window.cart);
                console.log('📦 localStorage cart:', localStorage.getItem('cart'));
                
                if (typeof option !== 'undefined') {
                    switch (option) {
                        case 1:
                            const cartTotalPickup = calculateCurrentCartTotal();
                            console.log('🧮 Calculated pickup total:', cartTotalPickup);
                            updateTotalPrice(cartTotalPickup, false); // No shipping for pickup
                            break;
                        case 2:
                            if (product && product.soluong && product.price) {
                                const buyNowTotal = product.soluong * product.price;
                                console.log('🧮 Calculated buy now pickup total:', buyNowTotal);
                                updateTotalPrice(buyNowTotal, false); // No shipping for pickup
                            }
                            break;
                    }
                }
            };

            giaotannoi.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏠 Clicked Giao tận nơi button');
                console.log('📦 Cart before delivery switch:', window.cart);
                
                // Remove active from tu den lay
                tudenlay.classList.remove("active");
                tudenlay.style.cssText = '';
                
                // Add active to giao tan noi with force CSS
                giaotannoi.classList.add("active");
                giaotannoi.style.cssText = activeStyle;
                
                console.log('✅ Giao tận nơi is now active');
                
                if (tudenlayGroup) tudenlayGroup.style.display = "none";
                chkShip.forEach(item => item.style.display = "flex");
                
                // Update total price (add shipping for delivery) - SAFE METHOD
                console.log('🏠 Delivery selected - updating total with shipping');
                console.log('📦 Cart after delivery switch:', window.cart);
                console.log('📦 localStorage cart:', localStorage.getItem('cart'));
                
                if (typeof option !== 'undefined') {
                    switch (option) {
                        case 1:
                            const cartTotalDelivery = calculateCurrentCartTotal();
                            console.log('🧮 Calculated delivery total:', cartTotalDelivery);
                            updateTotalPrice(cartTotalDelivery, true); // Include shipping for delivery
                            break;
                        case 2:
                            if (product && product.soluong && product.price) {
                                const buyNowTotal = product.soluong * product.price;
                                console.log('🧮 Calculated buy now delivery total:', buyNowTotal);
                                updateTotalPrice(buyNowTotal, true); // Include shipping for delivery
                            }
                            break;
                    }
                }
            };
        } else {
            console.log('⚠️ Delivery buttons not found');
        }
    }, 200);

    // Su kien khu nhan nut dat hang
    const checkoutBtn = document.querySelector(".complete-checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            console.log('🛒 Checkout button clicked, option:', option);
            switch (option) {
                case 1:
                    xulyDathang();
                    break;
                case 2:
                    xulyDathang(product);
                    break;
            }
        }
    } else {
        console.warn('⚠️ Complete checkout button not found');
    }
}

// Hien thi hang trong gio
async function showProductCart() {
    console.log('🛒 Loading cart for checkout...');
    
    try {
        // Use global cart variable first (this is most up-to-date)
        let cartItems = window.cart || [];
        
        console.log('📦 Cart from global variable:', cartItems);
        
        // If global cart is empty, try other sources
        if (cartItems.length === 0) {
            if (window.vyFoodAPI && window.vyFoodAPI.isLoggedIn()) {
                try {
                    const cartData = await window.vyFoodAPI.getCart();
                    cartItems = cartData.cart || [];
                    console.log('📦 Cart from API:', cartItems);
                } catch (apiError) {
                    console.warn('API failed, using localStorage cart:', apiError);
                }
            }
            
            // Final fallback to localStorage
            if (cartItems.length === 0) {
                const savedCart = localStorage.getItem('cart');
                cartItems = savedCart ? JSON.parse(savedCart) : [];
                console.log('📦 Cart from localStorage:', cartItems);
            }
        }
        
        let listOrder = document.getElementById("list-order-checkout");
        let listOrderHtml = '';
        
        if (cartItems.length === 0) {
            listOrderHtml = '<p>Giỏ hàng trống</p>';
        } else {
            // Get product details for each cart item
            for (const item of cartItems) {
                let product = null;
                
                // Find product in global products array
                if (window.products && Array.isArray(window.products)) {
                    product = window.products.find(p => p.id == item.id || p._id == item.id);
                }
                
                console.log(`🔍 Looking for product ID: ${item.id}, found:`, product ? product.title : 'Not found');
                
                if (product) {
                    listOrderHtml += `<div class="food-total">
                        <div class="count">${item.soluong}x</div>
                        <div class="info-food">
                            <div class="name-food">${product.title}</div>
                            <div class="price-food">${vnd(product.price)}</div>
                        </div>
                    </div>`;
                } else {
                    listOrderHtml += `<div class="food-total">
                        <div class="count">${item.soluong}x</div>
                        <div class="info-food">
                            <div class="name-food">Sản phẩm #${item.id}</div>
                            <div class="price-food">50,000₫</div>
                        </div>
                    </div>`;
                }
            }
        }
        
        listOrder.innerHTML = listOrderHtml;
        
        // Update total price
        await updateCheckoutTotal();
        
    } catch (error) {
        console.error('Error showing product cart:', error);
        document.getElementById("list-order-checkout").innerHTML = '<p>Lỗi tải giỏ hàng</p>';
    }
}

// Update checkout total for microservices
async function updateCheckoutTotal() {
    try {
        console.log('🧮 Updating checkout total...');
        
        // Use global cart variable first (most up-to-date)
        let cartItems = window.cart || [];
        
        console.log('📦 Cart items for total calculation:', cartItems);
        
        // If global cart is empty, try other sources
        if (cartItems.length === 0) {
            if (window.vyFoodAPI && window.vyFoodAPI.isLoggedIn()) {
                try {
                    const cartData = await window.vyFoodAPI.getCart();
                    cartItems = cartData.cart || [];
                } catch (apiError) {
                    console.warn('API failed, using localStorage cart:', apiError);
                }
            }
            
            // Final fallback to localStorage
            if (cartItems.length === 0) {
                const savedCart = localStorage.getItem('cart');
                cartItems = savedCart ? JSON.parse(savedCart) : [];
            }
        }
        
        console.log('🛒 Cart items for checkout:', cartItems);
        console.log('📦 Cart items count:', cartItems.length);
        
        let total = 0;
        let itemCount = 0;
        
        // Calculate total from cart items
        for (const item of cartItems) {
            let product = null;
            
            // Find product in global products array
            if (window.products && Array.isArray(window.products)) {
                product = window.products.find(p => p.id == item.id || p._id == item.id);
            }
            
            const price = product ? product.price : 50000; // Default price
            const itemTotal = price * item.soluong;
            
            console.log(`💰 Item ${item.id}: ${item.soluong}x ${vnd(price)} = ${vnd(itemTotal)}`);
            
            total += itemTotal;
            itemCount += item.soluong;
        }
        
        console.log(`💵 Final total: ${vnd(total)}, items: ${itemCount}`);
        
        // Update DOM elements
        const checkoutTotal = document.getElementById("checkout-cart-total");
        const checkoutFinal = document.getElementById("checkout-cart-price-final");
        const countElement = document.querySelector('.count');
        
        if (checkoutTotal) checkoutTotal.textContent = vnd(total);
        if (checkoutFinal) checkoutFinal.textContent = vnd(total + PHIVANCHUYEN);
        if (countElement) countElement.textContent = `${itemCount} món`;
        
        // Enable/disable order button
        const orderButton = document.querySelector('.bill-payment button');
        if (orderButton) {
            if (total > 0) {
                orderButton.disabled = false;
                orderButton.style.opacity = '1';
                orderButton.style.cursor = 'pointer';
            } else {
                orderButton.disabled = true;
                orderButton.style.opacity = '0.5';
                orderButton.style.cursor = 'not-allowed';
            }
        }
        
        return total;
        
    } catch (error) {
        console.error('Error updating checkout total:', error);
        return 0;
    }
}

// Complete checkout function
async function completeCheckout() {
    try {
        const userId = api.getUserId();
        if (!userId) {
            showToast({ type: 'error', title: 'Lỗi', message: 'Vui lòng đăng nhập để đặt hàng' });
            return;
        }

        // Get current cart
        const cartData = await api.getCart();
        if (!cartData || !cartData.cart || cartData.cart.length === 0) {
            showToast({ type: 'error', title: 'Lỗi', message: 'Giỏ hàng trống!' });
            return;
        }

        // Get form data
        const tenguoinhan = document.getElementById('tennguoinhan')?.value || 'Khách hàng';
        const sdtnhan = document.getElementById('sdtnhan')?.value || '0123456789';
        const diachinhan = document.getElementById('diachinhan')?.value || 'Địa chỉ mặc định';
        const ghichu = document.querySelector('.note-order')?.value || '';

        // Get delivery method
        const giaotannoi = document.getElementById('giaotannoi')?.checked;
        const hinhthucgiao = giaotannoi ? 'Giao tận nơi' : 'Tự đến lấy';

        // Get delivery date
        const activeDate = document.querySelector('.pick-date.active');
        const ngaygiaohang = activeDate ? activeDate.getAttribute('data-date') : new Date().toISOString().split('T')[0];

        // Get delivery time
        const thoigiangiao = document.querySelector('.choise-time')?.value || '';

        // Calculate items with prices
        const itemsWithPrices = [];
        for (const item of cartData.cart) {
            let product = null;
            if (window.products && Array.isArray(window.products)) {
                product = window.products.find(p => p.id === item.id);
            }
            
            itemsWithPrices.push({
                id: item.id,
                soluong: item.soluong,
                note: item.note || 'Không có ghi chú'
            });
        }

        // Create order data
        const orderData = {
            hinhthucgiao: hinhthucgiao,
            ngaygiaohang: ngaygiaohang,
            thoigiangiao: thoigiangiao,
            ghichu: ghichu,
            tenguoinhan: tenguoinhan,
            sdtnhan: sdtnhan,
            diachinhan: diachinhan,
            items: itemsWithPrices
        };

        showToast({ type: 'info', title: 'Đang xử lý', message: 'Đang tạo đơn hàng...' });

        const token = api.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const order = await response.json();
            
            // Clear cart after successful order
            await fetch(`http://localhost:3003/api/cart/${userId}`, {
                method: 'DELETE'
            });

            showToast({ type: 'success', title: 'Thành công', message: 'Đặt hàng thành công!' });
            
            // Redirect back to home page after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } else {
            const errorText = await response.text();
            console.error('Order creation failed:', response.status, errorText);
            throw new Error(`Failed to create order: ${response.status} - ${errorText}`);
        }

    } catch (error) {
        console.error('Error during checkout:', error);
        showToast({ type: 'error', title: 'Lỗi', message: `Không thể đặt hàng: ${error.message}` });
    }
}

// Hien thi hang mua ngay
function showProductBuyNow(product) {
    let listOrder = document.getElementById("list-order-checkout");
    let listOrderHtml = `<div class="food-total">
        <div class="count">${product.soluong}x</div>
        <div class="info-food">
            <div class="name-food">${product.title}</div>
        </div>
    </div>`;
    listOrder.innerHTML = listOrderHtml;
}

//Open Page Checkout
let nutthanhtoan = document.querySelector('.thanh-toan')
let checkoutpage = document.querySelector('.checkout-page');
nutthanhtoan.addEventListener('click', async () => {
    checkoutpage.classList.add('active');
    await thanhtoanpage(1);
    closeCart();
    body.style.overflow = "hidden"
})

// Đặt hàng ngay
function dathangngay() {
    let productInfo = document.getElementById("product-detail-content");
    let datHangNgayBtn = productInfo.querySelector(".button-dathangngay");
    datHangNgayBtn.onclick = () => {
        if(localStorage.getItem('currentuser')) {
            let productId = datHangNgayBtn.getAttribute("data-product");
            let soluong = parseInt(productInfo.querySelector(".buttons_added .input-qty").value);
            let notevalue = productInfo.querySelector("#popup-detail-note").value;
            let ghichu = notevalue == "" ? "Không có ghi chú" : notevalue;
            let products = JSON.parse(localStorage.getItem('products'));
            let a = products.find(item => item.id == productId);
            a.soluong = parseInt(soluong);
            a.note = ghichu;
            checkoutpage.classList.add('active');
            thanhtoanpage(2,a);
            closeCart();
            body.style.overflow = "hidden"
        } else {
            toast({ title: 'Warning', message: 'Chưa đăng nhập tài khoản !', type: 'warning', duration: 3000 });
        }
    }
}

// Close Page Checkout
function closecheckout() {
    checkoutpage.classList.remove('active');
    body.style.overflow = "auto"
}

// Global delivery method selector - RADIO BUTTON STYLE
window.selectDeliveryMethod = function(selectedMethod) {
    console.log('🎯 Selected delivery method:', selectedMethod);
    
    const giaotannoi = document.getElementById('giaotannoi');
    const tudenlay = document.getElementById('tudenlay');
    const chkShip = document.querySelectorAll('.chk-ship');
    
    // Active and inactive styles
    const activeStyle = 'border: 2px solid #dc3545 !important; background: rgba(220, 53, 69, 0.1) !important; color: #dc3545 !important; font-weight: bold !important;';
    const inactiveStyle = 'border: 1px solid #ddd !important; background: white !important; color: #666 !important; font-weight: normal !important;';
    
    if (selectedMethod === 'giaotannoi') {
        // Activate "Giao tận nơi"
        giaotannoi.classList.add('active');
        giaotannoi.style.cssText = activeStyle;
        
        // Deactivate "Tự đến lấy" 
        tudenlay.classList.remove('active');
        tudenlay.style.cssText = inactiveStyle;
        
        // Show shipping address field
        chkShip.forEach(item => item.style.display = 'flex');
        
        console.log('✅ GIAO TẬN NƠI được chọn - yêu cầu địa chỉ');
        
    } else if (selectedMethod === 'tudenlay') {
        // Activate "Tự đến lấy"
        tudenlay.classList.add('active');
        tudenlay.style.cssText = activeStyle;
        
        // Deactivate "Giao tận nơi"
        giaotannoi.classList.remove('active');
        giaotannoi.style.cssText = inactiveStyle;
        
        // Hide shipping address field
        chkShip.forEach(item => item.style.display = 'none');
        
        console.log('✅ TỰ ĐẾN LẤY được chọn - không cần địa chỉ');
    }
};

// Set default method on page load
window.addEventListener('load', function() {
    setTimeout(function() {
        selectDeliveryMethod('giaotannoi'); // Default to "Giao tận nơi"
    }, 500);
});

// Global delivery switcher function - ALWAYS WORKS  
window.switchDelivery = function(type) {
    console.log('🔄 switchDelivery called with:', type);
    
    const giaotannoi = document.getElementById('giaotannoi');
    const tudenlay = document.getElementById('tudenlay');
    const tudenlayGroup = document.getElementById('tudenlay-group');
    const chkShip = document.querySelectorAll('.chk-ship');
    
    // Force active styles
    const activeStyle = 'border: 2px solid #dc3545 !important; background: rgba(220, 53, 69, 0.1) !important; color: #dc3545 !important;';
    const inactiveStyle = 'border: 1px solid #ddd !important; background: white !important; color: #333 !important;';
    
    if (type === 'tudenlay') {
        console.log('✅ Switching to TỰ ĐẾN LẤY');
        
        // Remove active from giao tan noi
        if (giaotannoi) {
            giaotannoi.classList.remove('active');
            giaotannoi.style.cssText = inactiveStyle;
        }
        
        // Add active to tu den lay  
        if (tudenlay) {
            tudenlay.classList.add('active');
            tudenlay.style.cssText = activeStyle;
        }
        
        // Hide shipping fields
        chkShip.forEach(item => item.style.display = 'none');
        if (tudenlayGroup) tudenlayGroup.style.display = 'block';
        
    } else if (type === 'giaotannoi') {
        console.log('✅ Switching to GIAO TẬN NƠI');
        
        // Remove active from tu den lay
        if (tudenlay) {
            tudenlay.classList.remove('active');
            tudenlay.style.cssText = inactiveStyle;
        }
        
        // Add active to giao tan noi
        if (giaotannoi) {
            giaotannoi.classList.add('active');
            giaotannoi.style.cssText = activeStyle;
        }
        
        // Show shipping fields
        chkShip.forEach(item => item.style.display = 'flex');
        if (tudenlayGroup) tudenlayGroup.style.display = 'none';
    }
    
    console.log('🎯 Switch completed!');
};

// Auto-fill user info when page loads
function fillUserInfo() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentuser'));
        if (currentUser) {
            const nameInput = document.getElementById('tennguoinhan');
            const phoneInput = document.getElementById('sdtnhan');
            const addressInput = document.getElementById('diachinhan');

            if (nameInput && !nameInput.value) {
                nameInput.value = currentUser.ho + ' ' + currentUser.ten || '';
            }
            if (phoneInput && !phoneInput.value) {
                phoneInput.value = currentUser.sodienthoai || '';
            }
            if (addressInput && !addressInput.value) {
                addressInput.value = currentUser.diachi || '';
            }
        }
    } catch (error) {
        console.log('Auto-fill user info failed:', error);
    }
}

// Call fillUserInfo when checkout page loads
document.addEventListener('DOMContentLoaded', fillUserInfo);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillUserInfo);
} else {
    fillUserInfo();
}

// Thong tin cac don hang da mua - Xu ly khi nhan nut dat hang
function xulyDathang(product) {
    console.log('🛍️ Processing order...', { product });
    
    let diachinhan = "";
    let hinhthucgiao = "";
    let thoigiangiao = "";
    let giaotannoi = document.querySelector("#giaotannoi");
    let tudenlay = document.querySelector("#tudenlay");
    let giaongay = document.querySelector("#giaongay");
    let giaovaogio = document.querySelector("#deliverytime");
    
    // Get current user - handle both old and new structure
    let currentUser = null;
    if (window.vyFoodAPI && window.vyFoodAPI.isLoggedIn()) {
        const userData = localStorage.getItem('vyFoodUser');
        currentUser = userData ? JSON.parse(userData) : null;
    } else {
        // Fallback for old structure or guest user
        const oldUser = localStorage.getItem('currentuser');
        currentUser = oldUser ? JSON.parse(oldUser) : { phone: 'guest' };
    }
    
    console.log('👤 Current user:', currentUser);
    // Hinh thuc giao & Dia chi nhan hang
    if(giaotannoi.classList.contains("active")) {
        diachinhan = document.querySelector("#diachinhan").value;
        hinhthucgiao = giaotannoi.innerText;
    }
    if(tudenlay.classList.contains("active")){
        let chinhanh1 = document.querySelector("#chinhanh-1");
        let chinhanh2 = document.querySelector("#chinhanh-2");
        if(chinhanh1.checked) {
            diachinhan = "273 An Dương Vương, Phường 3, Quận 5";
        }
        if(chinhanh2.checked) {
            diachinhan = "04 Tôn Đức Thắng, Phường Bến Nghé, Quận 1";
        }
        hinhthucgiao = tudenlay.innerText;
    }

    // Thoi gian nhan hang
    if(giaongay.checked) {
        thoigiangiao = "Giao ngay khi xong";
    }

    if(giaovaogio.checked) {
        thoigiangiao = document.querySelector(".choise-time").value;
    }

    let orderDetails = localStorage.getItem("orderDetails") ? JSON.parse(localStorage.getItem("orderDetails")) : [];
    let order = localStorage.getItem("order") ? JSON.parse(localStorage.getItem("order")) : [];
    let madon = createId(order);
    let tongtien = 0;
    
    if(product == undefined) {
        // Get cart from global variable (microservices compatible)
        let cartItems = window.cart || [];
        console.log('🛒 Processing cart items:', cartItems);
        
        cartItems.forEach(item => {
            let orderItem = {
                ...item,
                madon: madon,
                price: getpriceProduct(item.id)
            };
            tongtien += orderItem.price * orderItem.soluong;
            orderDetails.push(orderItem);
        });
    } else {
        product.madon = madon;
        product.price = getpriceProduct(product.id);
        tongtien += product.price * product.soluong;
        orderDetails.push(product);
    }   
    
    let tennguoinhan = document.querySelector("#tennguoinhan").value;
    let sdtnhan = document.querySelector("#sdtnhan").value

    if(tennguoinhan == "" || sdtnhan == "" || diachinhan == "") {
        // Use showToast if available, fallback to toast or alert
        if (typeof showToast === 'function') {
            showToast({ title: 'Chú ý', message: 'Vui lòng nhập đầy đủ thông tin !', type: 'warning' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Chú ý', message: 'Vui lòng nhập đầy đủ thông tin !', type: 'warning', duration: 4000 });
        } else {
            alert('Vui lòng nhập đầy đủ thông tin !');
        }
    } else {
        let donhang = {
            id: madon,
            khachhang: currentUser.phone,
            hinhthucgiao: hinhthucgiao,
            ngaygiaohang: document.querySelector(".pick-date.active").getAttribute("data-date"),
            thoigiangiao: thoigiangiao,
            ghichu: document.querySelector(".note-order").value,
            tenguoinhan: tennguoinhan,
            sdtnhan: sdtnhan,
            diachinhan: diachinhan,
            thoigiandat: new Date(),
            tongtien:tongtien,
            trangthai: 0
        }
    
        order.unshift(donhang);
        
        // Clear cart after successful order
        if(product == null) {
            // Clear microservices cart
            window.cart = [];
            localStorage.setItem('cart', JSON.stringify([]));
            
            // Update UI
            if (typeof updateCartUI === 'function') updateCartUI();
            if (typeof updateCartModal === 'function') updateCartModal();
            
            // Clear API cart if logged in
            if (window.vyFoodAPI && window.vyFoodAPI.isLoggedIn()) {
                window.vyFoodAPI.clearCart().catch(console.warn);
            }
        }
    
        localStorage.setItem("order",JSON.stringify(order));
        localStorage.setItem("orderDetails",JSON.stringify(orderDetails));
        
        console.log('✅ Order completed successfully!', donhang);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast({ title: 'Thành công', message: 'Đặt hàng thành công !', type: 'success' });
        } else if (typeof toast === 'function') {
            toast({ title: 'Thành công', message: 'Đặt hàng thành công !', type: 'success', duration: 1000 });
        }
        
        // Close checkout and redirect
        setTimeout(() => {
            if (typeof closecheckout === 'function') {
                closecheckout();
            } else {
                window.location.href = "/";
            }
        }, 2000);  
    }
}

function getpriceProduct(id) {
    // Use global products array from microservices
    if (window.products && Array.isArray(window.products)) {
        const product = window.products.find(item => item.id == id);
        return product ? product.price : 50000; // Default price
    }
    
    // Fallback to localStorage
    const products = localStorage.getItem('products');
    if (products) {
        const parsedProducts = JSON.parse(products);
        const sp = parsedProducts.find(item => item.id == id);
        return sp ? sp.price : 50000;
    }
    
    return 50000; // Default price if nothing found
}

function createId(arr) {
    let id = arr.length + 1;
    let check = arr.find(item => item.id == "DH" + id)
    while (check != null) {
        id++;
        check = arr.find(item => item.id == "DH" + id)
    }
    return "DH" + id;
}

// Complete checkout with microservices - OPTIMIZED VERSION
async function completeCheckout() {
    console.log('🚀 Starting FAST checkout...');
    
    // Show loading immediately
    const submitBtn = document.querySelector('.complete-checkout-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Đang xử lý...';
    submitBtn.disabled = true;
    
    try {
        // Get form values with debug
        const deliveryMethodBtn = document.querySelector('.type-order-btn.active');
        const deliveryTime = document.querySelector('input[name="delivery-time"]:checked');
        const customerName = document.getElementById('tennguoinhan')?.value?.trim();
        const customerPhone = document.getElementById('sdtnhan')?.value?.trim();
        const customerAddress = document.getElementById('diachinhan')?.value?.trim();
        const note = document.getElementById('note')?.value?.trim();
        const userId = api.getUserId();

        // Get delivery method from active button
        const deliveryMethod = deliveryMethodBtn ? deliveryMethodBtn.id : null;

        console.log('🔍 Form validation debug:', {
            deliveryMethodBtn: deliveryMethodBtn,
            deliveryMethod: deliveryMethod,
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            userId: userId
        });

        // Detailed validation with specific messages
        if (!userId) {
            throw new Error('Vui lòng đăng nhập lại!');
        }

        if (!customerName || customerName.length < 2) {
            throw new Error('Vui lòng nhập tên người nhận (ít nhất 2 ký tự)!');
        }

        if (!customerPhone || customerPhone.length < 10) {
            throw new Error('Vui lòng nhập số điện thoại hợp lệ (10 số)!');
        }

        if (!deliveryMethod) {
            throw new Error('Vui lòng chọn hình thức giao hàng!');
        }

        if (deliveryMethod === 'giaotannoi' && !customerAddress) {
            throw new Error('Vui lòng nhập địa chỉ giao hàng!');
        }

        // Use cached cart total instead of recalculating
        const totalElement = document.querySelector('.cart-item-total');
        const totalAmount = parseInt(totalElement.textContent.replace(/[^\d]/g, '')) || 0;
        
        if (totalAmount === 0) {
            throw new Error('Giỏ hàng trống hoặc có lỗi!');
        }

        console.log('💰 Using cached total:', totalAmount);

        // Get cart items for order
        const cartData = await api.getCart(userId);
        if (!cartData.cart || cartData.cart.length === 0) {
            throw new Error('Giỏ hàng trống!');
        }

        // Validate phone number format (must be exactly 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(customerPhone)) {
            throw new Error('Số điện thoại phải có đúng 10 chữ số!');
        }

        // Prepare order data with PRICES included to avoid Product Service calls
        const orderData = {
            hinhthucgiao: deliveryMethod === 'giaotannoi' ? 'Giao tận nơi' : 'Tự đến lấy',
            ngaygiaohang: new Date(), // Date object, not string
            thoigiangiao: deliveryTime?.value || '',
            ghichu: note || '',
            tenguoinhan: customerName,
            sdtnhan: customerPhone, // Must be exactly 10 digits
            diachinhan: deliveryMethod === 'giaotannoi' ? customerAddress : 'Lấy tại cửa hàng',
            tongtien: totalAmount, // Include total amount
            items: cartData.cart.map(item => {
                // Find product price from window.products to avoid API call
                const product = window.products ? window.products.find(p => p.id == item.id) : null;
                const price = product ? product.price : 50000; // Default fallback price
                
                return {
                    id: parseInt(item.id),
                    soluong: parseInt(item.soluong),
                    note: item.note || 'Không có ghi chú',
                    price: price // Include price to avoid Product Service lookup
                };
            })
        };

        console.log('📋 VALIDATED order data:', {
            ...orderData,
            ngaygiaohang: orderData.ngaygiaohang.toISOString(), // Log as string for readability
            phoneValid: phoneRegex.test(orderData.sdtnhan),
            itemCount: orderData.items.length
        });

        console.log('📋 Fast order data:', orderData);

        // HYBRID APPROACH: Fast UX + Microservices Architecture
        console.log('🚀 HYBRID: Fast local + async microservices sync');
        
        // 1. IMMEDIATE LOCAL SAVE for fast UX
        const currentUser = JSON.parse(localStorage.getItem('currentuser') || '{}');
        const existingOrders = JSON.parse(localStorage.getItem('order') || '[]');
        const tempOrderId = `TEMP${Date.now()}`;
        
        const localOrder = {
            id: tempOrderId,
            khachhang: currentUser.id || userId,
            hinhthucgiao: orderData.hinhthucgiao,
            ngaygiaohang: new Date().toISOString(),
            tenguoinhan: orderData.tenguoinhan,
            sdtnhan: orderData.sdtnhan,
            diachinhan: orderData.diachinhan,
            ghichu: orderData.ghichu || 'Không có ghi chú',
            tongtien: totalAmount,
            trangthai: -1, // -1: Đang xử lý, 0: Chờ xác nhận, 1: Đã xác nhận
            synced: false, // Track if synced to server
            items: cartData.cart.map(item => {
                const product = window.products ? window.products.find(p => p.id == item.id) : null;
                return {
                    id: item.id,
                    name: product ? product.title : `Sản phẩm #${item.id}`,
                    soluong: item.soluong,
                    price: product ? product.price : 50000,
                    note: item.note || 'Không có ghi chú'
                };
            }),
            createdAt: new Date().toISOString()
        };
        
        // Save locally immediately for fast UX
        existingOrders.unshift(localOrder);
        localStorage.setItem('order', JSON.stringify(existingOrders));
        
        // Clear cart immediately
        api.clearCart(userId).catch(() => {});
        
        // Show success immediately
        toast({ 
            title: 'Thành công', 
            message: 'Đặt hàng thành công! Đang xử lý...', 
            type: 'success', 
            duration: 1500 
        });
        
        // Redirect immediately for better UX
        setTimeout(() => {
            window.location.href = '/';
        }, 800);
        
        // 2. ASYNC SYNC TO MICROSERVICES (in background)
        setTimeout(async () => {
            try {
                console.log('🔄 Background sync to Order Service...');
                const serverOrderResult = await api.createOrder(orderData);
                
                if (serverOrderResult && (serverOrderResult.orderId || serverOrderResult.id)) {
                    // Update local order with server ID
                    const orders = JSON.parse(localStorage.getItem('order') || '[]');
                    const orderIndex = orders.findIndex(o => o.id === tempOrderId);
                    
                    if (orderIndex !== -1) {
                        orders[orderIndex].id = serverOrderResult.orderId || serverOrderResult.id;
                        orders[orderIndex].trangthai = 0; // Server confirmed
                        orders[orderIndex].synced = true;
                        localStorage.setItem('order', JSON.stringify(orders));
                        console.log('✅ Order synced to server successfully!');
                    }
                } else {
                    console.log('⚠️ Server sync failed, order remains local only');
                }
            } catch (error) {
                console.log('⚠️ Background sync failed (order saved locally):', error.message);
                // Order still exists locally, just not synced to server
            }
        }, 100); // Start sync immediately after redirect

    } catch (error) {
        console.error('❌ Fast checkout error:', error);
        toast({ title: 'Lỗi', message: error.message || 'Không thể đặt hàng!', type: 'error', duration: 2000 });
        
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}