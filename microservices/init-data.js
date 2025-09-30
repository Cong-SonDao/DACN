// Script to initialize sample products data
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = 'mongodb://admin:password123@localhost:27017/vy_food_products?authSource=admin';
const DATABASE_NAME = 'vy_food_products';

// Sample products data
const sampleProducts = [
  {
    name: 'Bánh Tráng Nướng',
    price: 15000,
    image: './assets/img/products/banh-trang-nuong.jpg',
    category: 'Món Ăn Vặt',
    description: 'Bánh tráng nướng thơm ngon, giòn rụm với trứng cút và pa tê',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bún Cá Hành Phi',
    price: 25000,
    image: './assets/img/products/bun_ca_hanh_phi.jpeg',
    category: 'Bún Noodles',
    description: 'Bún cá với hành phi thơm lừng, nước dùng đậm đà',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bánh Cookie Dừa',
    price: 20000,
    image: './assets/img/products/banh_cookie_dua.jpeg',
    category: 'Tráng Miệng',
    description: 'Bánh cookie dừa giòn tan, thơm mùi dừa tự nhiên',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bánh Lava Phô Mai Nướng',
    price: 35000,
    image: './assets/img/products/banh_lava_pho_mai_nuong.jpeg',
    category: 'Tráng Miệng',
    description: 'Bánh lava phô mai nướng tan chảy, ngọt ngào',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bánh Bông Lan Chanh Dây',
    price: 18000,
    image: './assets/img/products/banh-bong-lan-chanh-day.jpeg',
    category: 'Tráng Miệng',
    description: 'Bánh bông lan chanh dây mềm mịn, vị chua ngọt hài hòa',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bánh Chuối Nướng',
    price: 12000,
    image: './assets/img/products/banh-chuoi-nuong.jpeg',
    category: 'Món Ăn Vặt',
    description: 'Bánh chuối nướng thơm ngon, ngọt thanh từ chuối chín',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bánh Tráng Trộn',
    price: 10000,
    image: './assets/img/products/banh-trang-tron.jpg',
    category: 'Món Ăn Vặt',
    description: 'Bánh tráng trộn với khô bò, tôm khô, đậu phộng',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bột Chiên',
    price: 22000,
    image: './assets/img/products/bot-chien.jpg',
    category: 'Món Chính',
    description: 'Bột chiên giòn bên ngoài, mềm bên trong với trứng và hành lá',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bún Riêu Chay',
    price: 30000,
    image: './assets/img/products/bun-rieu-chay.png',
    category: 'Bún Noodles',
    description: 'Bún riêu chay thanh mát, nhiều rau củ bổ dưỡng',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Bún Trộn Chay',
    price: 28000,
    image: './assets/img/products/bun-tron-chay.png',
    category: 'Bún Noodles',
    description: 'Bún trộn chay với nhiều loại rau thơm và nước mắm chay',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializeProducts() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const productsCollection = db.collection('products');
    
    // Clear existing products (optional)
    console.log('🗑️ Clearing existing products...');
    await productsCollection.deleteMany({});
    
    // Insert sample products
    console.log('📦 Inserting sample products...');
    const result = await productsCollection.insertMany(sampleProducts);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} products`);
    
    // Create indexes for better performance
    console.log('📋 Creating indexes...');
    await productsCollection.createIndex({ name: 'text', description: 'text' });
    await productsCollection.createIndex({ category: 1 });
    await productsCollection.createIndex({ status: 1 });
    
    console.log('🎉 Database initialization completed!');
    
    // Show inserted products
    const products = await productsCollection.find({}).toArray();
    console.log('\n📋 Inserted products:');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.price}đ`);
    });
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 MongoDB connection closed');
    }
  }
}

// Run the initialization
initializeProducts();