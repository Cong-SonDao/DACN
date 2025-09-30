// Microservices-compatible initialization
// This file handles user authentication UI and basic app initialization

document.addEventListener('DOMContentLoaded', function() {
    // Preconnect to microservices for faster auth
    preconnectServices();
    initializeAuthForms();
    initializeModalHandlers();
});

function preconnectServices() {
    const services = [
        'http://localhost:3001', // user-service
        'http://localhost:3002', // product-service  
        'http://localhost:3003', // cart-service
    ];
    
    services.forEach(service => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = service;
        document.head.appendChild(link);
    });
    
    console.log('🚀 Preconnected to microservices for faster auth');
}

function initializeAuthForms() {
    console.log('🔧 Initializing auth forms...');
    
    // Auth modal triggers (header buttons)
    const loginButton = document.querySelector('#login');
    const signupButton = document.querySelector('#signup');
    
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔑 Login button clicked - should show LOGIN form');
            openAuthModal();
            // Add slight delay to ensure modal is open first
            setTimeout(() => {
                showLoginForm();
            }, 100);
        });
        console.log('✅ Login button listener added');
    } else {
        console.error('❌ Login button not found');
    }
    
    if (signupButton) {
        signupButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📝 Signup button clicked - should show REGISTER form');
            openAuthModal();
            // Add slight delay to ensure modal is open first
            setTimeout(() => {
                showRegisterForm();
            }, 100);
        });
        console.log('✅ Signup button listener added');
    } else {
        console.error('❌ Signup button not found');
    }

    // Form handlers
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.signup-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Login form handler added');
    } else {
        console.error('❌ Login form not found with .login-form');
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('✅ Register form handler added');
    } else {
        console.error('❌ Register form not found with .signup-form');
    }

    // Form switchers
    const loginLink = document.querySelector('.login-link');
    const signupLink = document.querySelector('.signup-link');
    
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
        console.log('✅ Login link added');
    }
    
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterForm();
        });
        console.log('✅ Signup link added');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const phone = formData.get('phone');
    const password = formData.get('password');

    console.log('🔑 Login attempt for:', phone);

    if (!phone || !password) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
    }

    // Multiple selectors for submit button
    let submitButton = event.target.querySelector('#login-button') || 
                      event.target.querySelector('.form-submit') ||
                      event.target.querySelector('button[type="submit"]') ||
                      document.querySelector('#login-button');

    try {
        // Safely handle button state
        if (submitButton) {
            console.log('🔑 Found submit button:', submitButton.id || submitButton.className);
            submitButton.disabled = true;
            submitButton.textContent = 'Đang đăng nhập...';
        } else {
            console.warn('⚠️ Submit button not found, continuing without button state change');
        }
        
        console.log('🔑 Calling login API with phone:', phone);
        
        // Debug: Test if vyFoodAPI exists
        if (!vyFoodAPI) {
            throw new Error('vyFoodAPI not initialized');
        }
        
        console.log('🔑 vyFoodAPI ready, making request...');
        
        // Direct API call
        const response = await vyFoodAPI.login(phone, password);
        
        console.log('🔑 Full login response:', response);
        console.log('🔑 Response type:', typeof response);
        console.log('🔑 Has token?:', !!response?.token);
        
        if (response && response.token) {
            console.log('✅ Login successful, token received');
            console.log('🔑 Token:', response.token.substring(0, 20) + '...');
            
            // Update user profile without reload
            if (typeof updateUserProfile === 'function') {
                updateUserProfile();
            }
            
            // Close modal
            closeModal();
            
            // Show success toast instead of alert
            if (typeof showToast === 'function') {
                showToast({ 
                    type: 'success', 
                    title: 'Đăng nhập thành công',
                    message: 'Chào mừng bạn quay lại!' 
                });
            } else {
                alert('Đăng nhập thành công!');
            }
            
        } else {
            console.error('❌ Login failed - no token in response');
            alert('Đăng nhập thất bại - không nhận được token từ server');
        }
    } catch (error) {
        console.error('❌ Login error details:', {
            message: error.message,
            stack: error.stack,
            phone: phone
        });
        
        if (error.message.includes('timeout')) {
            alert('Lỗi kết nối: Server không phản hồi. Vui lòng thử lại.');
        } else if (error.message.includes('401') || error.message.includes('Invalid')) {
            alert('Sai số điện thoại hoặc mật khẩu');
        } else {
            alert('Lỗi đăng nhập: ' + error.message);
        }
    } finally {
        // Safely reset button state
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Đăng nhập';
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const userData = {
        fullname: formData.get('fullname'), // Match HTML field name
        phone: formData.get('phone'),
        address: formData.get('address') || '',
        password: formData.get('password')
    };

    const confirmPassword = formData.get('password_confirmation'); // Match HTML field name

    console.log('📝 Register attempt:', { ...userData, password: '***' });

    // Validation
    if (!userData.fullname || !userData.phone || !userData.password) {
        alert('Vui lòng nhập đầy đủ thông tin');
        return;
    }

    if (userData.password !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp');
        return;
    }

    if (userData.password.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }

    // Multiple selectors for submit button
    let submitButton = event.target.querySelector('#signup-button') || 
                      event.target.querySelector('.form-submit') ||
                      event.target.querySelector('button[type="submit"]') ||
                      document.querySelector('#signup-button');
    
    const originalText = submitButton ? submitButton.textContent : 'Đăng ký';

    try {
        // Show loading state immediately  
        if (submitButton) {
            console.log('📝 Found submit button:', submitButton.id || submitButton.className);
            submitButton.disabled = true;
            submitButton.textContent = 'Đang đăng ký...';
        } else {
            console.warn('⚠️ Submit button not found, continuing without button state change');
        }
        
        console.log('📝 Fast register attempt...');
        
        // Direct API call
        const result = await vyFoodAPI.register(userData);
        console.log('Register result:', result);
        
        alert('Đăng ký thành công! Vui lòng đăng nhập');
        showLoginForm();
        event.target.reset();
        
    } catch (error) {
        console.error('Register error:', error);
        
        if (error.message.includes('already exists')) {
            alert('Số điện thoại đã được đăng ký');
        } else {
            alert('Lỗi đăng ký: ' + error.message);
        }
    } finally {
        // Safely reset button state
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
}

function showLoginForm() {
    console.log('🔑 Showing login form...');
    const formsContainer = document.querySelector('.forms');
    if (formsContainer) {
        formsContainer.classList.remove('show-signup');
        console.log('✅ Login form should be visible now');
        console.log('Forms classes:', formsContainer.className);
        
        // Also hide signup form and show login form explicitly
        const signupForm = document.querySelector('.form-content.sign-up');
        const loginForm = document.querySelector('.form-content.login');
        
        if (signupForm) {
            signupForm.style.display = 'none';
        }
        if (loginForm) {
            loginForm.style.display = 'block';
        }
    } else {
        console.error('❌ Forms container not found');
    }
}

function showRegisterForm() {
    console.log('📝 Showing register form...');
    const formsContainer = document.querySelector('.forms');
    if (formsContainer) {
        formsContainer.classList.add('show-signup');
        console.log('✅ Register form should be visible now');
        console.log('Forms classes:', formsContainer.className);
        
        // Also show signup form and hide login form explicitly
        const signupForm = document.querySelector('.form-content.sign-up');
        const loginForm = document.querySelector('.form-content.login');
        
        if (signupForm) {
            signupForm.style.display = 'block';
        }
        if (loginForm) {
            loginForm.style.display = 'none';
        }
    } else {
        console.error('❌ Forms container not found');
    }
}

function initializeModalHandlers() {
    // Auth modal handler
    const authTriggers = document.querySelectorAll('.auth-modal-trigger');
    authTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            if (!vyFoodAPI.isLoggedIn()) {
                openAuthModal();
            }
        });
    });

    // Cart modal handler
    const cartTrigger = document.querySelector('.cart-trigger');
    if (cartTrigger) {
        cartTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            if (!vyFoodAPI.isLoggedIn()) {
                openAuthModal();
            } else {
                openCartModal();
            }
        });
    }
}

function openAuthModal() {
    console.log('🔑 Opening auth modal...');
    const authModal = document.querySelector('.modal.signup-login');
    if (authModal) {
        authModal.classList.add('open');
        document.body.style.overflow = "hidden";
        console.log('✅ Auth modal opened successfully');
        
        // Default to login form when opening modal
        showLoginForm();
    } else {
        console.error('❌ Auth modal not found with selector .modal.signup-login');
    }
}

function openCartModal() {
    const cartModal = document.querySelector('.modal.cart');
    if (cartModal) {
        cartModal.classList.add('open');
        document.body.style.overflow = "hidden";
        updateCartModal();
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('open');
    });
    document.body.style.overflow = "auto";
}

// Add missing openCart function
function openCart() {
    console.log('🛒 Opening cart modal...');
    const cartModal = document.querySelector('.modal-cart');
    if (cartModal) {
        cartModal.classList.add('open');
        document.body.style.overflow = "hidden";
        updateCartModal();
        console.log('✅ Cart modal opened successfully');
    } else {
        console.error('❌ Cart modal not found - expected .modal-cart');
    }
}

// Add missing closeCart function  
function closeCart() {
    console.log('🛒 Closing cart modal...');
    const cartModal = document.querySelector('.modal-cart');
    if (cartModal) {
        cartModal.classList.remove('open');
        document.body.style.overflow = "";
        console.log('✅ Cart modal closed successfully');
    } else {
        console.error('❌ Cart modal not found for closing');
    }
}

async function updateCartModal() {
    if (!vyFoodAPI.isLoggedIn()) return;

    try {
        const cartData = await vyFoodAPI.getCart();
        const cartItems = cartData.items || [];
        
        const cartContainer = document.querySelector('.cart-list');
        if (!cartContainer) return;

        if (cartItems.length === 0) {
            cartContainer.innerHTML = `
                <div class="cart-empty">
                    <img src="./assets/img/empty-order.jpg" alt="Empty cart">
                    <p>Giỏ hàng của bạn đang trống</p>
                </div>
            `;
            updateCartTotal(0);
            return;
        }

        let cartHtml = '';
        let totalAmount = 0;

        for (const item of cartItems) {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            
            cartHtml += `
                <div class="cart-item" data-product-id="${item.productId}">
                    <div class="cart-item-info">
                        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <span class="cart-item-price">${vnd(item.price)}</span>
                        </div>
                    </div>
                    <div class="cart-item-quantity">
                        <button onclick="updateCartItemQuantity('${item.productId}', ${item.quantity - 1})" class="quantity-btn minus">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button onclick="updateCartItemQuantity('${item.productId}', ${item.quantity + 1})" class="quantity-btn plus">+</button>
                    </div>
                    <div class="cart-item-total">${vnd(itemTotal)}</div>
                    <button onclick="removeCartItem('${item.productId}')" class="remove-item-btn">
                        <i class="fa-light fa-trash"></i>
                    </button>
                </div>
            `;
        }

        cartContainer.innerHTML = cartHtml;
        updateCartTotal(totalAmount);

    } catch (error) {
        console.error('Error updating cart modal:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải giỏ hàng' });
    }
}

async function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        await removeCartItem(productId);
        return;
    }

    try {
        await updateCartQuantity(productId, newQuantity);
        await updateCartModal();
    } catch (error) {
        console.error('Error updating cart item quantity:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể cập nhật số lượng' });
    }
}

async function removeCartItem(productId) {
    try {
        await removeFromCart(productId);
        await updateCartModal();
    } catch (error) {
        console.error('Error removing cart item:', error);
        showToast({ type: 'error', title: 'Lỗi', message: 'Không thể xóa sản phẩm' });
    }
}

function updateCartTotal(total) {
    const totalElements = document.querySelectorAll('.cart-total-price');
    totalElements.forEach(element => {
        element.textContent = vnd(total);
    });
}

function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });

    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
        button.disabled = show;
        button.textContent = show ? 'Đang xử lý...' : button.getAttribute('data-original-text') || button.textContent;
        if (!show) {
            button.setAttribute('data-original-text', button.textContent);
        }
    });
}

// Utility functions for backward compatibility
function openCity(evt, city) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(city).style.display = "block";
    evt.currentTarget.className += " active";
}

// Show toast message helper
function showToast(options) {
    if (typeof toast !== 'undefined' && toast.showSuccessToast) {
        // Use the existing toast system
        switch(options.type) {
            case 'success':
                toast.showSuccessToast(options.title, options.message);
                break;
            case 'error':
                toast.showErrorToast(options.title, options.message);
                break;
            case 'warning':
                toast.showWarningToast(options.title, options.message);
                break;
            default:
                toast.showInfoToast(options.title, options.message);
        }
    } else {
        // Fallback to alert
        alert(`${options.title}: ${options.message}`);
    }
}
