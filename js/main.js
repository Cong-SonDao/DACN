// Định dạng tiền tệ VND
function vnd(price) {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Lấy tất cả sản phẩm đang hoạt động
function getAllActiveProducts() {
    return JSON.parse(localStorage.getItem('products') || '[]').filter(item => item.status == 1);
}

// Phân trang sản phẩm
let perPage = 12;
let currentPage = 1;

// Hiển thị sản phẩm ra giao diện
function renderProducts(productArr) {
    let productHtml = '';
    if (productArr.length === 0) {
        document.getElementById("home-title").style.display = "none";
        productHtml = `<div class="no-result"><div class="no-result-h">Tìm kiếm không có kết quả</div><div class="no-result-p">Xin lỗi, chúng tôi không thể tìm được kết quả hợp với tìm kiếm của bạn</div><div class="no-result-i"><i class="fa-light fa-face-sad-cry"></i></div></div>`;
    } else {
        document.getElementById("home-title").style.display = "block";
        productArr.forEach(product => {
            productHtml += `<div class="col-product">
                <article class="card-product">
                    <div class="card-header">
                        <a href="#" class="card-image-link" onclick="detailProduct(${product.id}); return false;">
                            <img class="card-image" src="${product.img}" alt="${product.title}">
                        </a>
                    </div>
                    <div class="food-info">
                        <div class="card-content">
                            <div class="card-title">
                                <a href="#" class="card-title-link" onclick="detailProduct(${product.id}); return false;">${product.title}</a>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="product-price">
                                <span class="current-price">${vnd(product.price)}</span>
                            </div>
                            <div class="product-buy">
                                <button onclick="detailProduct(${product.id})" class="card-button order-item"><i class="fa-regular fa-cart-shopping-fast"></i> Đặt món</button>
                            </div>
                        </div>
                    </div>
                </article>
            </div>`;
        });
    }
    document.getElementById('home-products').innerHTML = productHtml;
}

// Hiển thị sản phẩm trên trang chủ
function showHomeProduct(products) {
    displayList(products, perPage, currentPage);
    setupPagination(products, perPage, currentPage);
}

// Phân trang
function displayList(productArr, perPage, currentPage) {
    let start = (currentPage - 1) * perPage;
    let end = start + perPage;
    let productShow = productArr.slice(start, end);
    renderProducts(productShow);
}

function setupPagination(productArr, perPage, currentPage) {
    const pageNavList = document.querySelector('.page-nav-list');
    if (!pageNavList) return;
    pageNavList.innerHTML = '';
    let pageCount = Math.ceil(productArr.length / perPage);
    for (let i = 1; i <= pageCount; i++) {
        let li = paginationChange(i, productArr, currentPage);
        pageNavList.appendChild(li);
    }
}

function paginationChange(page, productArr, currentPage) {
    let node = document.createElement('li');
    node.classList.add('page-nav-item');
    node.innerHTML = `<a href="javascript:;">${page}</a>`;
    if (currentPage == page) node.classList.add('active');
    node.addEventListener('click', function () {
        currentPage = page;
        displayList(productArr, perPage, currentPage);
        let t = document.querySelectorAll('.page-nav-item.active');
        t.forEach(el => el.classList.remove('active'));
        node.classList.add('active');
        document.getElementById("home-service")?.scrollIntoView();
    });
    return node;
}

// Tìm kiếm, lọc sản phẩm
function searchProducts() {
    let valueSearchInput = document.querySelector('.form-search-input')?.value || '';
    let valueCategory = document.getElementById("advanced-search-category-select")?.value || 'Tất cả';
    let minPrice = document.getElementById("min-price")?.value || '';
    let maxPrice = document.getElementById("max-price")?.value || '';
    let products = getAllActiveProducts();

    if (valueCategory !== "Tất cả") {
        products = products.filter(item => item.category === valueCategory);
    }
    if (valueSearchInput) {
        products = products.filter(item => item.title.toUpperCase().includes(valueSearchInput.toUpperCase()));
    }
    if (minPrice) {
        products = products.filter(item => item.price >= parseInt(minPrice));
    }
    if (maxPrice) {
        products = products.filter(item => item.price <= parseInt(maxPrice));
    }

    showHomeProduct(products);
}

// Chi tiết sản phẩm
function detailProduct(id) {
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    let infoProduct = products.find(sp => sp.id === id);
    if (!infoProduct) return;
    let modal = document.querySelector('.modal.product-detail');
    let modalHtml = `<div class="modal-header">
        <img class="product-image" src="${infoProduct.img}" alt="">
    </div>
    <div class="modal-body">
        <h2 class="product-title">${infoProduct.title}</h2>
        <div class="product-control">
            <div class="priceBox">
                <span class="current-price">${vnd(infoProduct.price)}</span>
            </div>
            <div class="buttons_added">
                <input class="minus is-form" type="button" value="-" onclick="decreasingNumber(this)">
                <input class="input-qty" max="100" min="1" name="" type="number" value="1">
                <input class="plus is-form" type="button" value="+" onclick="increasingNumber(this)">
            </div>
        </div>
        <p class="product-description">${infoProduct.desc}</p>
    </div>
    <div class="notebox">
        <p class="notebox-title">Ghi chú</p>
        <textarea class="text-note" id="popup-detail-note" placeholder="Nhập thông tin cần lưu ý..."></textarea>
    </div>
    <div class="modal-footer">
        <div class="price-total">
            <span class="thanhtien">Thành tiền</span>
            <span class="price">${vnd(infoProduct.price)}</span>
        </div>
        <div class="modal-footer-control">
            <button class="button-dathangngay" data-product="${infoProduct.id}">Đặt hàng ngay</button>
            <button class="button-dat" id="add-cart" onclick="animationCart()"><i class="fa-light fa-basket-shopping"></i></button>
        </div>
    </div>`;
    document.querySelector('#product-detail-content').innerHTML = modalHtml;
    modal.classList.add('open');
    document.body.style.overflow = "hidden";

    // Cập nhật giá khi tăng giảm số lượng
    let tgbtn = document.querySelectorAll('.is-form');
    let qty = document.querySelector('.product-control .input-qty');
    let priceText = document.querySelector('.price');
    tgbtn.forEach(element => {
        element.addEventListener('click', () => {
            let price = infoProduct.price * parseInt(qty.value);
            priceText.innerHTML = vnd(price);
        });
    });
    // Thêm vào giỏ hàng
    let productbtn = document.querySelector('.button-dat');
    productbtn.addEventListener('click', (e) => {
        if (localStorage.getItem('currentuser')) {
            addCart(infoProduct.id);
        } else {
            toast({ title: 'Warning', message: 'Chưa đăng nhập tài khoản !', type: 'warning', duration: 3000 });
        }
    });
    // Mua ngay
    dathangngay();
}

// Hàm tăng/giảm số lượng
function increasingNumber(e) {
    let qty = e.parentNode.querySelector('.input-qty');
    if (parseInt(qty.value) < qty.max) {
        qty.value = parseInt(qty.value) + 1;
    } else {
        qty.value = qty.max;
    }
}
function decreasingNumber(e) {
    let qty = e.parentNode.querySelector('.input-qty');
    if (qty.value > qty.min) {
        qty.value = parseInt(qty.value) - 1;
    } else {
        qty.value = qty.min;
    }
}

// Thêm sản phẩm vào giỏ hàng
function addCart(index) {
    let currentuser = localStorage.getItem('currentuser') ? JSON.parse(localStorage.getItem('currentuser')) : [];
    let soluong = document.querySelector('.input-qty').value;
    let popupDetailNote = document.querySelector('#popup-detail-note').value;
    let note = popupDetailNote == "" ? "Không có ghi chú" : popupDetailNote;
    let productcart = {
        id: index,
        soluong: parseInt(soluong),
        note: note
    }
    let vitri = currentuser.cart.findIndex(item => item.id == productcart.id);
    if (vitri == -1) {
        currentuser.cart.push(productcart);
    } else {
        currentuser.cart[vitri].soluong = parseInt(currentuser.cart[vitri].soluong) + parseInt(productcart.soluong);
    }
    localStorage.setItem('currentuser', JSON.stringify(currentuser));
    updateAmount();
    closeModal();
    toast({ title: 'Success', message: 'Thêm thành công sản phẩm vào giỏ hàng', type: 'success', duration: 3000 });
}

// Hiển thị số lượng sản phẩm trong giỏ hàng
function getAmountCart() {
    let currentuser = JSON.parse(localStorage.getItem('currentuser'))
    let amount = 0;
    currentuser.cart.forEach(element => {
        amount += parseInt(element.soluong);
    });
    return amount;
}
function updateAmount() {
    if (localStorage.getItem('currentuser') != null) {
        let amount = getAmountCart();
        document.querySelector('.count-product-cart').innerText = amount;
    }
}

// Hoạt ảnh giỏ hàng
function animationCart() {
    let el = document.querySelector(".count-product-cart");
    if (el) {
        el.style.animation = "slidein ease 1s";
        setTimeout(() => {
            el.style.animation = "none";
        }, 1000);
    }
}

// Mua ngay (tùy chỉnh cho project bạn)
function dathangngay() {
    // ... (viết code mua ngay tùy thuộc vào logic project của bạn)
}

// Đóng popup
function closeModal() {
    document.querySelectorAll('.modal').forEach(item => {
        item.classList.remove('open');
    });
    document.body.style.overflow = "auto";
}

// Toast message (hoặc import từ toast-message.js)
function toast({ title = 'Success', message = '', type = 'success', duration = 3000 }) {
    const main = document.getElementById('toast');
    if (main) {
        const toast = document.createElement('div');
        const autoRemove = setTimeout(function () {
            main.removeChild(toast);
        }, duration + 1000);
        toast.onclick = function (e) {
            if (e.target.closest('.fa-regular')) {
                main.removeChild(toast);
                clearTimeout(autoRemove);
            }
        }
        const colors = {
            success: '#47d864',
            info: '#2f86eb',
            warning: '#ffc021',
            error: '#ff6243'
        }
        const icons = {
            success: 'fa-light fa-check',
            info: 'fa-solid fa-circle-info',
            warning: 'fa-solid fa-triangle-exclamation',
            error: 'fa-solid fa-bug'
        };
        const color = colors[type];
        const icon = icons[type];
        const delay = (duration / 1000).toFixed(2);
        toast.classList.add('toast', `toast--${type}`);
        toast.style.animation = `slideInLeft ease 0.3s, fadeOut linear 1s ${delay}s forwards`;
        toast.innerHTML = `<div class="toast__private">
        <div class="toast__icon">
            <i class="${icon}"></i>
        </div>
        <div class="toast__body">
            <h3 class="toast__title">${title}</h3>
            <p class="toast__msg">
                ${message}
            </p>
        </div>
        <div class="toast__close">
            <i class="fa-regular fa-circle-xmark"></i>
        </div>
    </div>
    <div class="toast__background"style="background-color: ${color};">
    </div>`
        main.appendChild(toast);
    }
}

// Xử lý sự kiện load trang và các event tìm kiếm
document.addEventListener('DOMContentLoaded', function () {
    showHomeProduct(getAllActiveProducts());
    updateAmount();
    // Sự kiện tìm kiếm
    document.querySelector('.form-search-input')?.addEventListener('input', searchProducts);
    document.getElementById("advanced-search-category-select")?.addEventListener('change', searchProducts);
    document.getElementById("min-price")?.addEventListener('input', searchProducts);
    document.getElementById("max-price")?.addEventListener('input', searchProducts);
});

// Các hàm bổ sung về giỏ hàng, đăng nhập, user... bạn có thể ghép lại từ code cũ nếu cần thiết.
