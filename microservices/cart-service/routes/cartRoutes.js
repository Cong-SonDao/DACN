const express = require('express');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const cartItemSchema = Joi.object({
  id: Joi.number().required(),
  soluong: Joi.number().min(1).required(),
  note: Joi.string().default('Không có ghi chú')
});

// Get cart for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const redisClient = req.app.get('redisClient');
    
    const cartData = await redisClient.get(`cart:${userId}`);
    const cart = cartData ? JSON.parse(cartData) : [];
    
    res.json({ cart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
router.post('/:userId/items', async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = cartItemSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const redisClient = req.app.get('redisClient');
    const cartData = await redisClient.get(`cart:${userId}`);
    let cart = cartData ? JSON.parse(cartData) : [];
    
    const existingItemIndex = cart.findIndex(item => item.id === req.body.id);
    
    if (existingItemIndex !== -1) {
      // Update existing item
      cart[existingItemIndex].soluong += req.body.soluong;
      cart[existingItemIndex].note = req.body.note;
    } else {
      // Add new item
      cart.push(req.body);
    }
    
    await redisClient.setEx(`cart:${userId}`, 3600, JSON.stringify(cart)); // Expire in 1 hour
    
    res.json({ 
      message: 'Item added to cart successfully',
      cart 
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item
router.put('/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const { soluong, note } = req.body;
    
    if (!soluong || soluong < 1) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const redisClient = req.app.get('redisClient');
    const cartData = await redisClient.get(`cart:${userId}`);
    let cart = cartData ? JSON.parse(cartData) : [];
    
    const itemIndex = cart.findIndex(item => item.id === parseInt(itemId));
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    cart[itemIndex].soluong = soluong;
    if (note) cart[itemIndex].note = note;
    
    await redisClient.setEx(`cart:${userId}`, 3600, JSON.stringify(cart));
    
    res.json({ 
      message: 'Cart item updated successfully',
      cart 
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/:userId/items/:itemId', async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    
    const redisClient = req.app.get('redisClient');
    const cartData = await redisClient.get(`cart:${userId}`);
    let cart = cartData ? JSON.parse(cartData) : [];
    
    cart = cart.filter(item => item.id !== parseInt(itemId));
    
    await redisClient.setEx(`cart:${userId}`, 3600, JSON.stringify(cart));
    
    res.json({ 
      message: 'Item removed from cart successfully',
      cart 
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear cart
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const redisClient = req.app.get('redisClient');
    
    await redisClient.del(`cart:${userId}`);
    
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
