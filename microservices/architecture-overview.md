# Microservices Architecture for Vy Food E-commerce

## Services Overview

### 1. **API Gateway**
- **Port**: 3000
- **Responsibility**: Route requests, Authentication, Rate limiting
- **Technology**: Node.js + Express

### 2. **User Service**
- **Port**: 3001  
- **Responsibility**: User management, Authentication, Authorization
- **Database**: MongoDB
- **Endpoints**: 
  - POST /api/users/register
  - POST /api/users/login
  - GET /api/users/profile
  - PUT /api/users/profile

### 3. **Product Service**
- **Port**: 3002
- **Responsibility**: Product catalog, inventory management
- **Database**: MongoDB
- **Endpoints**:
  - GET /api/products
  - GET /api/products/:id
  - POST /api/products (Admin)
  - PUT /api/products/:id (Admin)
  - DELETE /api/products/:id (Admin)

### 4. **Cart Service**
- **Port**: 3003
- **Responsibility**: Shopping cart management
- **Database**: Redis (for session-based carts)
- **Endpoints**:
  - GET /api/cart/:userId
  - POST /api/cart/:userId/items
  - PUT /api/cart/:userId/items/:itemId
  - DELETE /api/cart/:userId/items/:itemId

### 5. **Order Service**
- **Port**: 3004
- **Responsibility**: Order processing, order history
- **Database**: MongoDB
- **Endpoints**:
  - POST /api/orders
  - GET /api/orders/:userId
  - GET /api/orders/:orderId
  - PUT /api/orders/:orderId/status

### 6. **Payment Service**
- **Port**: 3005
- **Responsibility**: Payment processing, payment methods
- **Database**: MongoDB
- **Endpoints**:
  - POST /api/payments/process
  - GET /api/payments/:paymentId
  - POST /api/payments/verify

### 7. **Notification Service**
- **Port**: 3006
- **Responsibility**: Email, SMS notifications
- **Technology**: Node.js + Nodemailer
- **Endpoints**:
  - POST /api/notifications/email
  - POST /api/notifications/sms

### 8. **Frontend Service**
- **Port**: 8080
- **Responsibility**: Serve static files, client-side routing
- **Technology**: Nginx

## Communication Pattern
- **Synchronous**: HTTP/REST for real-time operations
- **Asynchronous**: Message queues (RabbitMQ) for notifications

## Database Strategy
- **User Service**: MongoDB (users collection)
- **Product Service**: MongoDB (products collection)  
- **Cart Service**: Redis (temporary cart data)
- **Order Service**: MongoDB (orders, orderDetails collections)
- **Payment Service**: MongoDB (payments collection)

## Deployment
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (optional)
- **Service Discovery**: Consul or built-in Docker networking
- **Load Balancer**: Nginx
