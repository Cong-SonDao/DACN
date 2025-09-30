// Frontend API Client for Vy Food Microservices
class VyFoodAPI {
  constructor() {
    // Use direct microservices endpoints to bypass API Gateway timeout issues
    this.services = {
      user: 'http://localhost:3001/api',
      product: 'http://localhost:3002/api', 
      cart: 'http://localhost:3003/api',
      order: 'http://localhost:3004/api',
      payment: 'http://localhost:3005/api'
    };
    this.baseURL = 'http://localhost:3000/api'; // Fallback
    this.token = this.getToken();
  }

  // Auth helpers
  getToken() {
    return localStorage.getItem('vyFoodToken');
  }

  setToken(token) {
    localStorage.setItem('vyFoodToken', token);
    this.token = token;
  }

  removeToken() {
    localStorage.removeItem('vyFoodToken');
    localStorage.removeItem('vyFoodUser');
    this.token = null;
  }

  getCurrentUserId() {
    const userData = localStorage.getItem('vyFoodUser');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id || user._id || user.phone; // Use phone as fallback userId
    }
    return null;
  }

  isLoggedIn() {
    return !!this.token && !!this.getCurrentUserId();
  }

  getAuthHeaders() {
    return this.token ? {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  // Direct service request method (bypass API Gateway)
  async requestDirect(service, endpoint, options = {}) {
    const serviceURL = this.services[service];
    if (!serviceURL) {
      throw new Error(`Service '${service}' not configured`);
    }
    
    const url = `${serviceURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      mode: 'cors',
      ...options
    };

    console.log(`🚀 Direct ${service.toUpperCase()} Request:`, {
      method: config.method || 'GET',
      url,
      service
    });

    try {
      // Fast timeout for direct calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`✅ ${service.toUpperCase()} Response:`, response.status);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`${service} service returned non-JSON: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `${service} error: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`${service} service timeout - không phản hồi`);
      }
      console.error(`❌ ${service.toUpperCase()} Error:`, error.message);
      throw error;
    }
  }

  // Generic API request method (fallback)
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      mode: 'cors',
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`API endpoint returned non-JSON response`);
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  // Direct service request (bypass API Gateway)
  async requestDirect(service, endpoint, options = {}) {
    const serviceURL = this.services[service];
    if (!serviceURL) {
      console.warn(`Unknown service: ${service}, falling back to API Gateway`);
      return await this.request(endpoint, options);
    }

    const url = `${serviceURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      mode: 'cors',
      ...options
    };

    console.log(`🌐 Direct ${service.toUpperCase()} Request:`, {
      method: config.method || 'GET',
      url,
      headers: config.headers
    });

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`🌐 ${service.toUpperCase()} Response:`, {
        status: response.status,
        statusText: response.statusText
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Service returned non-JSON response: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`🌐 ${service.toUpperCase()} Data:`, data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`${service.toUpperCase()} Request Timeout:`, url);
        throw new Error(`${service} service không phản hồi`);
      }
      console.error(`${service.toUpperCase()} Request Error:`, {
        url,
        error: error.message
      });
      throw error;
    }
  }

  // User Management  
  async register(userData) {
    const response = await this.requestDirect('user', '/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    // If registration includes automatic login (token returned)
    if (response.token) {
      this.setToken(response.token);
      
      // Store user data
      if (response.user) {
        localStorage.setItem('vyFoodUser', JSON.stringify(response.user));
      } else {
        localStorage.setItem('vyFoodUser', JSON.stringify({ 
          phone: userData.phone, 
          id: userData.phone,
          fullname: userData.fullname 
        }));
      }
    }
    
    return response;
  }

  async login(phone, password) {
    const response = await this.requestDirect('user', '/users/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    
    if (response.token) {
      this.setToken(response.token);
      
      // Store user data for cart operations
      if (response.user) {
        localStorage.setItem('vyFoodUser', JSON.stringify(response.user));
      } else {
        // Create minimal user object with phone as ID
        localStorage.setItem('vyFoodUser', JSON.stringify({ 
          phone: phone, 
          id: phone // Use phone as user ID for cart operations 
        }));
      }
    }
    
    return response;
  }

  async logout() {
    this.removeToken();
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser() {
    try {
      return await this.requestDirect('user', '/users/profile');
    } catch (error) {
      // Fallback to localStorage data
      const userData = localStorage.getItem('vyFoodUser');
      if (userData) {
        return JSON.parse(userData);
      }
      throw error;
    }
  }

  async updateProfile(userData) {
    return await this.requestDirect('user', '/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async changePassword(oldPassword, newPassword) {
    return await this.requestDirect('user', '/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // Product Management
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.requestDirect('product', `/products${queryString ? '?' + queryString : ''}`);
  }

  async getProduct(id) {
    return await this.requestDirect('product', `/products/${id}`);
  }

  async searchProducts(query, filters = {}) {
    const params = { search: query, ...filters };
    return await this.getProducts(params);
  }

  async getProductsByCategory(category) {
    return await this.getProducts({ category });
  }

  // Admin: Product Management
  async createProduct(productData) {
    return await this.requestDirect('product', '/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async updateProduct(id, productData) {
    return await this.requestDirect('product', `/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  async deleteProduct(id) {
    return await this.requestDirect('product', `/products/${id}`, {
      method: 'DELETE'
    });
  }

  // Cart Management
  async getCart() {
    return await this.requestDirect('cart', '/cart');
  }

  // Cart Management - Updated to match cart service API
  async getCart() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }
    return await this.requestDirect('cart', `/${userId}`);
  }

  async addToCart(productId, quantity = 1) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }
    return await this.requestDirect('cart', `/${userId}/items`, {
      method: 'POST',
      body: JSON.stringify({ 
        id: parseInt(productId), 
        soluong: quantity,
        note: '' 
      })
    });
  }

  async updateCartItem(productId, quantity) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }
    return await this.requestDirect('cart', `/${userId}/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ soluong: quantity })
    });
  }

  async removeFromCart(productId) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }
    return await this.requestDirect('cart', `/${userId}/items/${productId}`, {
      method: 'DELETE'
    });
  }

  async clearCart() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not logged in');
    }
    return await this.requestDirect('cart', `/${userId}`, {
      method: 'DELETE'
    });
  }

  // Order Management
  async createOrder(orderData) {
    return await this.requestDirect('order', '/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async getOrders(page = 1, limit = 10) {
    return await this.requestDirect('order', `/orders?page=${page}&limit=${limit}`);
  }

  async getOrder(orderId) {
    return await this.requestDirect('order', `/orders/${orderId}`);
  }

  async updateOrderStatus(orderId, status) {
    return await this.requestDirect('order', `/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async cancelOrder(orderId, reason) {
    return await this.requestDirect('order', `/orders/${orderId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }

  // Payment Management
  async processPayment(paymentData) {
    return await this.requestDirect('payment', '/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async getPayment(paymentId) {
    return await this.request(`/payments/${paymentId}`);
  }

  async getPaymentsByOrder(orderId) {
    return await this.request(`/payments/order/${orderId}`);
  }

  async getPaymentHistory(page = 1, limit = 10) {
    return await this.request(`/payments?page=${page}&limit=${limit}`);
  }

  // Utility methods for backward compatibility

  getUserType() {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.userType || 'customer';
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  getUserId() {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.id;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  getUserPhone() {
    if (!this.token) return null;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.phone;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
}

// Create global API instance
window.vyFoodAPI = new VyFoodAPI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VyFoodAPI;
}
