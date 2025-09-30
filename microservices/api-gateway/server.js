const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3003',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006'
};

// JWT Middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    // Add user info to headers for downstream services
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-phone'] = user.phone;
    req.headers['x-user-type'] = user.userType;
    req.user = user;
    next();
  });
};

// Proxy configurations
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyReq: (proxyReq, req, res) => {
      // Forward user information to downstream services
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        proxyReq.setHeader('x-user-phone', req.headers['x-user-phone']);
        proxyReq.setHeader('x-user-type', req.headers['x-user-type']);
      }
    },
    onError: (err, req, res) => {
      console.error(`Proxy Error for ${target}:`, err.message);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  });
};

// Routes
app.use('/api/users', createProxy(services.user, { '^/api/users': '/api/users' }));
app.use('/api/products', createProxy(services.product, { '^/api/products': '/api/products' }));

// Protected routes
app.use('/api/cart', authenticateToken, createProxy(services.cart, { '^/api/cart': '/api/cart' }));
app.use('/api/orders', authenticateToken, createProxy(services.order, { '^/api/orders': '/api/orders' }));
app.use('/api/payments', authenticateToken, createProxy(services.payment, { '^/api/payments': '/api/payments' }));
app.use('/api/notifications', createProxy(services.notification, { '^/api/notifications': '/api/notifications' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: Object.keys(services)
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service mappings:', services);
});
