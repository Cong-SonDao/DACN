// Microservices API Configuration - Enhanced for All Food Categories
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    ENDPOINTS: {
        // User endpoints
        REGISTER: '/users/register',
        LOGIN: '/users/login',
        PROFILE: '/users/profile',
        
        // Product endpoints
        PRODUCTS: '/products',
        PRODUCT_BY_ID: '/products',
        CATEGORIES: '/products/categories/list',
        
        // Cart endpoints
        CART: '/cart',
        
        // Order endpoints
        ORDERS: '/orders',
        
        // Payment endpoints
        PAYMENTS: '/payments'
    }
};

// All supported food categories
const ALL_FOOD_CATEGORIES = [
    'Món chay',
    'Món mặn',
    'Món lẩu',
    'Món ăn vặt', 
    'Món tráng miệng',
    'Nước uống',
    'Món khác'
];

// API Client Class
class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    // Set authorization header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Update token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }
}

// User Service Methods
class UserService extends ApiClient {
    async register(userData) {
        try {
            const response = await this.post(API_CONFIG.ENDPOINTS.REGISTER, userData);
            if (response.token) {
                this.setToken(response.token);
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    async login(credentials) {
        try {
            const response = await this.post(API_CONFIG.ENDPOINTS.LOGIN, credentials);
            if (response.token) {
                this.setToken(response.token);
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getProfile() {
        return this.get(API_CONFIG.ENDPOINTS.PROFILE);
    }

    async updateProfile(userData) {
        return this.put(API_CONFIG.ENDPOINTS.PROFILE, userData);
    }

    logout() {
        this.setToken(null);
        localStorage.removeItem('currentuser');
    }
}

// Product Service Methods - Enhanced for all categories
class ProductService extends ApiClient {
    async getProducts(filters = {}) {
        try {
            return await this.get(API_CONFIG.ENDPOINTS.PRODUCTS, filters);
        } catch (error) {
            console.warn('Product service unavailable, using fallback');
            return this.getFallbackProducts(filters);
        }
    }

    async getProductById(id) {
        try {
            return await this.get(`${API_CONFIG.ENDPOINTS.PRODUCT_BY_ID}/${id}`);
        } catch (error) {
            console.warn('Product service unavailable, using local data');
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            const product = products.find(p => p.id == id);
            return product ? { product } : null;
        }
    }

    async getCategories() {
        try {
            return await this.get(API_CONFIG.ENDPOINTS.CATEGORIES);
        } catch (error) {
            console.warn('Categories service unavailable, using fallback');
            return {
                categories: ALL_FOOD_CATEGORIES
            };
        }
    }

    async createProduct(productData) {
        return this.post(API_CONFIG.ENDPOINTS.PRODUCTS, productData);
    }

    async updateProduct(id, productData) {
        return this.put(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`, productData);
    }

    async deleteProduct(id) {
        return this.delete(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`);
    }

    // Enhanced fallback method supporting all categories
    getFallbackProducts(filters = {}) {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        let filteredProducts = [...products];

        // Filter by category - supports all food categories
        if (filters.category && filters.category !== 'Tất cả') {
            filteredProducts = filteredProducts.filter(product =>
                product.category && product.category.toLowerCase() === filters.category.toLowerCase()
            );
        }

        // Filter by search term
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.title.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm) ||
                (product.desc && product.desc.toLowerCase().includes(searchTerm))
            );
        }

        // Filter by price range
        if (filters.minPrice) {
            filteredProducts = filteredProducts.filter(product => product.price >= filters.minPrice);
        }

        if (filters.maxPrice) {
            filteredProducts = filteredProducts.filter(product => product.price <= filters.maxPrice);
        }

        // Apply sorting
        if (filters.sort === 'price_asc') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (filters.sort === 'price_desc') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (filters.sort === 'name_asc') {
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
        }

        return { products: filteredProducts };
    }
}

// Cart Service Methods
class CartService extends ApiClient {
    async getCart(userId) {
        try {
            return await this.get(`${API_CONFIG.ENDPOINTS.CART}/${userId}`);
        } catch (error) {
            console.warn('Cart service unavailable, using local storage');
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            return { cart };
        }
    }

    async addToCart(userId, item) {
        try {
            return await this.post(`${API_CONFIG.ENDPOINTS.CART}/${userId}/items`, item);
        } catch (error) {
            console.warn('Cart service unavailable, will fallback to localStorage');
            throw error;
        }
    }

    async updateCartItem(userId, itemId, updates) {
        return this.put(`${API_CONFIG.ENDPOINTS.CART}/${userId}/items/${itemId}`, updates);
    }

    async removeFromCart(userId, itemId) {
        return this.delete(`${API_CONFIG.ENDPOINTS.CART}/${userId}/items/${itemId}`);
    }
}

// Order Service Methods
class OrderService extends ApiClient {
    async createOrder(orderData) {
        return this.post(API_CONFIG.ENDPOINTS.ORDERS, orderData);
    }

    async getOrderHistory(userId) {
        return this.get(`${API_CONFIG.ENDPOINTS.ORDERS}/user/${userId}`);
    }

    async getOrderDetails(orderId) {
        return this.get(`${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}`);
    }
}

// Initialize services
const userService = new UserService();
const productService = new ProductService();
const cartService = new CartService();
const orderService = new OrderService();

// Legacy compatibility layer
// This maintains compatibility with existing frontend code
window.microservicesAdapter = {
    userService,
    productService,
    cartService,
    orderService
};

// Migration helper functions to gradually replace localStorage usage
const migrationHelpers = {
    // Convert localStorage user operations to API calls
    async migrateUserAuthentication() {
        const currentUser = localStorage.getItem('currentuser');
        if (currentUser && !localStorage.getItem('authToken')) {
            // If we have old user data but no token, user needs to re-login
            localStorage.removeItem('currentuser');
            return false;
        }
        return true;
    },

    // Convert localStorage product operations to API calls
    async migrateProducts() {
        try {
            const response = await productService.getProducts();
            // Update localStorage for backward compatibility during migration
            localStorage.setItem('products', JSON.stringify(response.products));
            return response.products;
        } catch (error) {
            // Fallback to localStorage if API is not available
            const localProducts = localStorage.getItem('products');
            if (!localProducts) {
                // Create sample data for all categories if no data exists
                this.createSampleData();
                return JSON.parse(localStorage.getItem('products') || '[]');
            }
            return JSON.parse(localProducts);
        }
    },

    // Create sample data for all food categories
    createSampleData() {
        const sampleProducts = [
            // Món chay
            { id: 1, title: 'Đậu hũ sốt cà chua', category: 'Món chay', price: 45000, img: './assets/img/mon-chay-1.jpg', desc: 'Đậu hũ tươi sốt cà chua thơm ngon' },
            { id: 2, title: 'Rau muống xào tỏi', category: 'Món chay', price: 35000, img: './assets/img/mon-chay-2.jpg', desc: 'Rau muống tươi xào tỏi thơm' },
            { id: 3, title: 'Canh chua chay', category: 'Món chay', price: 50000, img: './assets/img/mon-chay-3.jpg', desc: 'Canh chua chay với đậu hũ và rau' },
            
            // Món mặn
            { id: 4, title: 'Thịt kho tàu', category: 'Món mặn', price: 75000, img: './assets/img/mon-man-1.jpg', desc: 'Thịt ba chỉ kho tàu đậm đà' },
            { id: 5, title: 'Cá thu nướng', category: 'Món mặn', price: 120000, img: './assets/img/mon-man-2.jpg', desc: 'Cá thu nướng giấy bạc thơm ngon' },
            { id: 6, title: 'Gà rang muối', category: 'Món mặn', price: 85000, img: './assets/img/mon-man-3.jpg', desc: 'Gà rang muối ớt xanh cay nồng' },
            
            // Món lẩu
            { id: 7, title: 'Lẩu thái', category: 'Món lẩu', price: 200000, img: './assets/img/lau-1.jpg', desc: 'Lẩu thái chua cay đặc trưng' },
            { id: 8, title: 'Lẩu hải sản', category: 'Món lẩu', price: 300000, img: './assets/img/lau-2.jpg', desc: 'Lẩu hải sản tươi ngon' },
            { id: 9, title: 'Lẩu gà lá giang', category: 'Món lẩu', price: 250000, img: './assets/img/lau-3.jpg', desc: 'Lẩu gà lá giang thơm đặc biệt' },
            
            // Món ăn vặt
            { id: 10, title: 'Bánh tráng nướng', category: 'Món ăn vặt', price: 25000, img: './assets/img/an-vat-1.jpg', desc: 'Bánh tráng nướng Đà Lạt' },
            { id: 11, title: 'Chả cá viên chiên', category: 'Món ăn vặt', price: 30000, img: './assets/img/an-vat-2.jpg', desc: 'Chả cá viên chiên giòn tan' },
            { id: 12, title: 'Nem chua rán', category: 'Món ăn vặt', price: 35000, img: './assets/img/an-vat-3.jpg', desc: 'Nem chua rán thơm ngon' },
            
            // Món tráng miệng
            { id: 13, title: 'Chè đậu xanh', category: 'Món tráng miệng', price: 20000, img: './assets/img/trang-mieng-1.jpg', desc: 'Chè đậu xanh mát lạnh' },
            { id: 14, title: 'Bánh flan', category: 'Món tráng miệng', price: 25000, img: './assets/img/trang-mieng-2.jpg', desc: 'Bánh flan mềm mịn' },
            { id: 15, title: 'Kem dừa', category: 'Món tráng miệng', price: 30000, img: './assets/img/trang-mieng-3.jpg', desc: 'Kem dừa tươi mát' },
            
            // Nước uống
            { id: 16, title: 'Nước chanh muối', category: 'Nước uống', price: 15000, img: './assets/img/nuoc-uong-1.jpg', desc: 'Nước chanh muối giải khát' },
            { id: 17, title: 'Trà đá', category: 'Nước uống', price: 10000, img: './assets/img/nuoc-uong-2.jpg', desc: 'Trà đá truyền thống' },
            { id: 18, title: 'Nước cam tươi', category: 'Nước uống', price: 25000, img: './assets/img/nuoc-uong-3.jpg', desc: 'Nước cam tươi vitamin C' },
            
            // Món khác
            { id: 19, title: 'Cơm chiên dương châu', category: 'Món khác', price: 55000, img: './assets/img/mon-khac-1.jpg', desc: 'Cơm chiên dương châu đặc biệt' },
            { id: 20, title: 'Mì xào giòn', category: 'Món khác', price: 65000, img: './assets/img/mon-khac-2.jpg', desc: 'Mì xào giòn hải sản' }
        ];
        
        localStorage.setItem('products', JSON.stringify(sampleProducts));
        console.log('Created sample data for all food categories');
    }
};

// Expose migration helpers globally
window.migrationHelpers = migrationHelpers;
window.ALL_FOOD_CATEGORIES = ALL_FOOD_CATEGORIES;
