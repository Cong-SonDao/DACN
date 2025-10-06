const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');

const router = express.Router();

// Validation schemas
const productSchema = Joi.object({
  title: Joi.string().min(3).required(),
  category: Joi.string().valid('Món mặn', 'Món chay', 'Món lẩu', 'Món tráng miệng', 'Món nướng', 'Combo').required(),
  price: Joi.number().min(0).required(),
  img: Joi.string().required(),
  desc: Joi.string().min(10).required(),
  inventory: Joi.number().min(0).optional()
});

const updateProductSchema = Joi.object({
  title: Joi.string().min(3).optional(),
  category: Joi.string().valid('Món mặn', 'Món chay', 'Món lẩu', 'Món tráng miệng', 'Món nướng', 'Combo').optional(),
  price: Joi.number().min(0).optional(),
  img: Joi.string().optional(),
  desc: Joi.string().min(10).optional(),
  status: Joi.number().valid(0, 1).optional(),
  inventory: Joi.number().min(0).optional()
});

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      status = 1, 
      search, 
      page = 1, 
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by status (default to active products)
    if (status !== 'all') {
      query.status = parseInt(status);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID (support both custom id field and ObjectId)
router.get('/:id', async (req, res) => {
  try {
    let product;
    
    // Try finding by custom id field first (for integer IDs)
    if (/^\d+$/.test(req.params.id)) {
      product = await Product.findOne({ id: parseInt(req.params.id) });
    }
    
    // If not found, try finding by MongoDB ObjectId
    if (!product && /^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      product = await Product.findById(req.params.id);
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 1 });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (Admin only - middleware should be added in API Gateway)
router.post('/', async (req, res) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { error } = updateProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory after order
router.patch('/:id/inventory', async (req, res) => {
  try {
    const { quantity, operation = 'decrease' } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (operation === 'decrease') {
      if (product.inventory < quantity) {
        return res.status(400).json({ error: 'Insufficient inventory' });
      }
      product.inventory -= quantity;
      product.sold += quantity;
    } else if (operation === 'increase') {
      product.inventory += quantity;
      product.sold = Math.max(0, product.sold - quantity);
    }

    await product.save();

    res.json({
      message: 'Inventory updated successfully',
      product
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
