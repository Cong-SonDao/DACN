// initialization.js (dùng cho microservices với MongoDB)

// Khởi tạo API client từ api-client.js
const vyFoodAPI = new VyFoodAPI();

// Hàm load sản phẩm từ API và lưu vào localStorage
async function createProduct() {
    try {
        const productsData = await vyFoodAPI.getProducts();
        if (productsData && productsData.products) {
            localStorage.setItem('products', JSON.stringify(productsData.products));
            console.log("Đã load sản phẩm từ API:", productsData.products.length, "món");
        } else {
            console.warn("API không trả về danh sách sản phẩm hợp lệ:", productsData);
        }
    } catch (error) {
        console.error("Không load được sản phẩm từ API:", error);
    }
}

// Hàm load giỏ hàng từ API hoặc khởi tạo mới
async function createCart() {
    try {
        // Giả sử bạn có cơ chế login, lấy userId từ localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) {
            const cartData = await vyFoodAPI.getCart(user.id);
            localStorage.setItem('cart', JSON.stringify(cartData || []));
            console.log("Đã load giỏ hàng từ API");
        } else {
            // Nếu chưa login thì tạo giỏ hàng trống
            localStorage.setItem('cart', JSON.stringify([]));
        }
    } catch (error) {
        console.error("Không load được giỏ hàng từ API:", error);
        localStorage.setItem('cart', JSON.stringify([]));
    }
}

// Hàm load dữ liệu khởi tạo (products + cart)
async function initializeApp() {
    await createProduct();
    await createCart();
}

// Gọi khởi tạo khi trang load xong
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});
