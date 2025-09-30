const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Món mặn',
      'Món chay', 
      'Món lẩu',
      'Món tráng miệng',
      'Món nướng',
      'Combo'
    ]
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  img: {
    type: String,
    required: true
  },
  desc: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: Number,
    default: 1, // 1: active, 0: inactive
    enum: [0, 1]
  },
  inventory: {
    type: Number,
    default: 100,
    min: 0
  },
  sold: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for search
productSchema.index({ title: 'text', desc: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model('Product', productSchema);
