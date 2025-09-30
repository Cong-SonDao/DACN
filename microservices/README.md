# Hướng dẫn chạy Microservices Architecture

## Yêu cầu hệ thống
- Docker & Docker Compose
- Node.js 18+ (để phát triển)
- MongoDB (hoặc sử dụng Docker)
- Redis (hoặc sử dụng Docker)

## Cách chạy toàn bộ hệ thống

### 1. Chạy với Docker Compose (Khuyến nghị)

```bash
# Di chuyển vào thư mục microservices
cd microservices

# Chạy toàn bộ hệ thống
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng hệ thống
docker-compose down
```

### 2. Chạy từng service riêng lẻ (Development)

#### Cài đặt dependencies
```bash
# API Gateway
cd microservices/api-gateway
npm install

# User Service
cd ../user-service
npm install

# Product Service
cd ../product-service
npm install
```

#### Chạy databases
```bash
# MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7

# Redis
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Chạy các services theo thứ tự
```bash
# Terminal 1: User Service
cd microservices/user-service
npm run dev

# Terminal 2: Product Service
cd microservices/product-service
npm run dev

# Terminal 3: API Gateway
cd microservices/api-gateway
npm run dev
```

## Endpoints API

### API Gateway: http://localhost:3000

#### User Management
- `POST /api/users/register` - Đăng ký
- `POST /api/users/login` - Đăng nhập
- `GET /api/users/profile` - Thông tin profile
- `PUT /api/users/profile` - Cập nhật profile

#### Product Management
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/:id` - Chi tiết sản phẩm
- `GET /api/products/categories/list` - Danh mục
- `POST /api/products` - Tạo sản phẩm (Admin)
- `PUT /api/products/:id` - Sửa sản phẩm (Admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (Admin)

### Frontend: http://localhost:8080

## Monitoring

### Health Checks
- API Gateway: http://localhost:3000/health
- User Service: http://localhost:3001/health
- Product Service: http://localhost:3002/health

### Database Access
- MongoDB: localhost:27017
- Redis: localhost:6379

## Migration từ Monolithic

### Bước 1: Tích hợp API Client
Thêm vào HTML chính:
```html
<script src="./microservices/frontend-adapter/api-client.js"></script>
```

### Bước 2: Thay thế dần các hàm localStorage
```javascript
// Cũ
let products = JSON.parse(localStorage.getItem('products'));

// Mới
const products = await productService.getProducts();
```

### Bước 3: Cập nhật authentication
```javascript
// Cũ
localStorage.setItem('currentuser', JSON.stringify(user));

// Mới
const response = await userService.login(credentials);
```

## Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra MongoDB
docker ps | grep mongo

# Restart MongoDB
docker restart mongodb
```

### Lỗi CORS
Đảm bảo API Gateway đã cấu hình CORS đúng

### Lỗi JWT
Kiểm tra biến môi trường JWT_SECRET trong tất cả services

## Development

### Thêm service mới
1. Tạo thư mục trong `microservices/`
2. Tạo `package.json`, `server.js`, `Dockerfile`
3. Thêm vào `docker-compose.yml`
4. Cập nhật routing trong API Gateway

### Testing
```bash
# Test individual service
curl http://localhost:3001/health

# Test API Gateway
curl http://localhost:3000/health
```
