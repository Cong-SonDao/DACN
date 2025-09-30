const express = require('express');
const Joi = require('joi');
const axios = require('axios');
const Order = require('../models/Order');

const router = express.Router();

// Validation schema
const orderSchema = Joi.object({
  hinhthucgiao: Joi.string().valid('Giao tận nơi', 'Tự đến lấy').required(),
  ngaygiaohang: Joi.date().required(),
  thoigiangiao: Joi.string().allow('').optional(),
  ghichu: Joi.string().allow('').optional(),
  tenguoinhan: Joi.string().required(),
  sdtnhan: Joi.string().pattern(/^[0-9]{10}$/).required(),
  diachinhan: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      id: Joi.number().required(),
      soluong: Joi.number().min(1).required(),
      note: Joi.string().default('Không có ghi chú')
    })
  ).min(1).required()
});

// Helper function to generate order ID
const generateOrderId = async () => {
  const count = await Order.countDocuments();
  let id = count + 1;
  
  while (await Order.findOne({ id: `DH${id}` })) {
    id++;
  }
  
  return `DH${id}`;
};

// Helper function to get product price
const getProductPrice = async (productId) => {
  try {
    const response = await axios.get(
      `${process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'}/api/products/${productId}`
    );
    return response.data.product.price;
  } catch (error) {
    throw new Error(`Failed to get product price for ID ${productId}`);
  }
};

// Create order
router.post('/', async (req, res) => {
  try {
    // Get user info from JWT token (should be set by API Gateway)
    const userPhone = req.headers['x-user-phone']; // Set by API Gateway
    
    if (!userPhone) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const { error } = orderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Calculate total and get product prices
    let tongtien = 0;
    const processedItems = [];

    for (const item of req.body.items) {
      const price = await getProductPrice(item.id);
      const itemTotal = price * item.soluong;
      tongtien += itemTotal;
      
      processedItems.push({
        ...item,
        price: price
      });
    }

    // Add shipping fee if delivery
    const SHIPPING_FEE = 30000;
    if (req.body.hinhthucgiao === 'Giao tận nơi') {
      tongtien += SHIPPING_FEE;
    }

    const orderId = await generateOrderId();

    const order = new Order({
      id: orderId,
      khachhang: userPhone,
      ...req.body,
      tongtien,
      items: processedItems
    });

    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user orders
router.get('/user/:userPhone', async (req, res) => {
  try {
    const { userPhone } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ khachhang: userPhone })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments({ khachhang: userPhone });

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (Admin only)
router.put('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status === undefined || ![0, 1].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const order = await Order.findOneAndUpdate(
      { id: req.params.orderId },
      { trangthai: status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders (Admin only)
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      search,
      startDate,
      endDate,
      page = 1, 
      limit = 10 
    } = req.query;

    let query = {};
    
    if (status !== undefined && status !== '2') {
      query.trangthai = parseInt(status);
    }

    if (search) {
      query.$or = [
        { id: { $regex: search, $options: 'i' } },
        { tenguoinhan: { $regex: search, $options: 'i' } },
        { khachhang: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
