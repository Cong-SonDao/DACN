const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/vy_food_notifications', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Notification Service: MongoDB Connected'))
.catch(err => console.log('Notification Service: MongoDB Connection Error:', err));

// Routes
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Notification Service Error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
