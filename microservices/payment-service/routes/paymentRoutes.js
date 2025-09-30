const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Joi = require('joi');
const axios = require('axios');

// Validation schemas
const createPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('cash', 'credit_card', 'bank_transfer', 'momo', 'zalopay').required(),
  paymentDetails: Joi.object({
    cardNumber: Joi.string().when('...paymentMethod', {
      is: 'credit_card',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    cardHolderName: Joi.string().when('...paymentMethod', {
      is: 'credit_card', 
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    bankName: Joi.string().optional(),
    phoneNumber: Joi.string().optional()
  }).optional(),
  metadata: Joi.object({
    referenceCode: Joi.string().optional()
  }).optional()
});

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded').optional(),
  transactionId: Joi.string().optional(),
  failureReason: Joi.string().optional()
});

// CREATE - Process payment for order
router.post('/', async (req, res) => {
  try {
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Check if order exists and get order details
    try {
      const orderResponse = await axios.get(`http://order-service:3004/api/orders/${value.orderId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-phone': req.headers['x-user-phone'],
          'x-user-type': req.headers['x-user-type']
        }
      });

      const order = orderResponse.data;
      if (order.status !== 'pending') {
        return res.status(400).json({ error: 'Order is not in pending status' });
      }

      // Verify amount matches order total
      if (Math.abs(value.amount - order.totalAmount) > 0.01) {
        return res.status(400).json({ error: 'Payment amount does not match order total' });
      }
    } catch (orderError) {
      console.error('Error fetching order:', orderError.message);
      return res.status(400).json({ error: 'Invalid order ID or order not found' });
    }

    // Check for existing payment for this order
    const existingPayment = await Payment.findOne({ orderId: value.orderId });
    if (existingPayment && existingPayment.status !== 'failed' && existingPayment.status !== 'cancelled') {
      return res.status(400).json({ error: 'Payment already exists for this order' });
    }

    // Create payment record
    const payment = new Payment({
      ...value,
      userId,
      metadata: {
        ...value.metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Process payment based on method
    switch (value.paymentMethod) {
      case 'cash':
        payment.status = 'completed';
        payment.transactionId = 'CASH_' + Date.now();
        break;
      case 'credit_card':
        // Simulate credit card processing
        payment.status = 'processing';
        payment.transactionId = 'CC_' + Date.now();
        // In real implementation, integrate with payment gateway
        setTimeout(async () => {
          try {
            payment.status = 'completed';
            await payment.save();
            // Update order status
            await updateOrderStatus(value.orderId, 'confirmed', userId, req.headers);
          } catch (err) {
            console.error('Error updating payment status:', err);
          }
        }, 3000);
        break;
      case 'bank_transfer':
      case 'momo':
      case 'zalopay':
        payment.status = 'pending';
        payment.transactionId = value.paymentMethod.toUpperCase() + '_' + Date.now();
        break;
      default:
        payment.status = 'pending';
    }

    await payment.save();

    // If payment is immediately completed, update order status
    if (payment.status === 'completed') {
      await updateOrderStatus(value.orderId, 'confirmed', userId, req.headers);
    }

    res.status(201).json({
      message: 'Payment processed successfully',
      payment: {
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// READ - Get payment by ID
router.get('/:paymentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const payment = await Payment.findOne({ 
      paymentId: req.params.paymentId,
      userId: userId
    }).select('-paymentDetails.cardNumber -__v');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// READ - Get payments by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const payments = await Payment.find({ 
      orderId: req.params.orderId,
      userId: userId
    }).select('-paymentDetails.cardNumber -__v').sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payments by order error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// READ - Get user's payment history
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const status = req.query.status;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .select('-paymentDetails.cardNumber -__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// UPDATE - Update payment status (internal use)
router.put('/:paymentId/status', async (req, res) => {
  try {
    const { error, value } = updatePaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const payment = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment
    Object.assign(payment, value);
    await payment.save();

    // Update order status based on payment status
    if (value.status === 'completed') {
      await updateOrderStatus(payment.orderId, 'confirmed', payment.userId, req.headers);
    } else if (value.status === 'failed' || value.status === 'cancelled') {
      await updateOrderStatus(payment.orderId, 'cancelled', payment.userId, req.headers);
    }

    res.json({
      message: 'Payment status updated successfully',
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        transactionId: payment.transactionId,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// POST - Process refund
router.post('/:paymentId/refund', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const userId = req.headers['x-user-id'];
    const userType = req.headers['x-user-type'];

    // Only admin can process refunds
    if (userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const payment = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed payments' });
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > (payment.amount - payment.refundAmount)) {
      return res.status(400).json({ error: 'Refund amount exceeds available balance' });
    }

    // Process refund
    payment.refundAmount += refundAmount;
    payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'completed';
    payment.refundedAt = new Date();
    if (reason) payment.failureReason = reason;

    await payment.save();

    // Update order status if fully refunded
    if (payment.status === 'refunded') {
      await updateOrderStatus(payment.orderId, 'cancelled', userId, req.headers);
    }

    res.json({
      message: 'Refund processed successfully',
      refund: {
        paymentId: payment.paymentId,
        refundAmount,
        totalRefunded: payment.refundAmount,
        status: payment.status,
        refundedAt: payment.refundedAt
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Helper function to update order status
async function updateOrderStatus(orderId, status, userId, headers) {
  try {
    await axios.put(`http://order-service:3004/api/orders/${orderId}/status`, 
      { status },
      {
        headers: {
          'x-user-id': userId,
          'x-user-phone': headers['x-user-phone'],
          'x-user-type': headers['x-user-type']
        }
      }
    );
  } catch (error) {
    console.error('Error updating order status:', error.message);
  }
}

module.exports = router;
