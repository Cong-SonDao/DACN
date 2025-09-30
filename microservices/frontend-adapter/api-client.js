// Microservices API Configuration
const API_CONFIG = {
    BASE_URL: '/api',
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

// Product Service Methods
class ProductService extends ApiClient {
    async getProducts(filters = {}) {
        return this.get(API_CONFIG.ENDPOINTS.PRODUCTS, filters);
    }

    async getProductById(id) {
        return this.get(`${API_CONFIG.ENDPOINTS.PRODUCT_BY_ID}/${id}`);
    }

    async getCategories() {
        return this.get(API_CONFIG.ENDPOINTS.CATEGORIES);
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
}

// Cart Service Methods
class CartService extends ApiClient {
    async getCart(userId) {
        return this.get(`${API_CONFIG.ENDPOINTS.CART}/${userId}`);
    }

    async addToCart(userId, item) {
        return this.post(`${API_CONFIG.ENDPOINTS.CART}/${userId}/items`, item);
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
        return this.get(`${API_CONFIG.ENDPOINTS.ORDERS}/${userId}`);
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
            return localProducts ? JSON.parse(localProducts) : [];
        }
    }
};

// Expose migration helpers globally
window.migrationHelpers = migrationHelpers;
