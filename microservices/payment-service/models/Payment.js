const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true,
    ref: 'Order'
  },
  userId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'VND'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'momo', 'zalopay'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String
  },
  paymentDetails: {
    cardNumber: {
      type: String,
      set: function(value) {
        // Mask card number for security
        if (value && value.length > 4) {
          return '*'.repeat(value.length - 4) + value.slice(-4);
        }
        return value;
      }
    },
    cardHolderName: String,
    bankName: String,
    phoneNumber: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    referenceCode: String
  },
  failureReason: String,
  processedAt: Date,
  refundedAt: Date,
  refundAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ createdAt: -1 });

// Generate payment ID
paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = 'PAY' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Update processedAt when status changes to completed or failed
paymentSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      (this.status === 'completed' || this.status === 'failed')) {
    this.processedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
