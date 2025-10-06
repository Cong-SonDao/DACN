const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  khachhang: {
    type: String,
    required: true
  },
  hinhthucgiao: {
    type: String,
    required: true
  },
  ngaygiaohang: {
    type: Date,
    required: true
  },
  thoigiangiao: {
    type: String,
    default: ''
  },
  ghichu: {
    type: String,
    default: ''
  },
  tenguoinhan: {
    type: String,
    required: true
  },
  sdtnhan: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  diachinhan: {
    type: String,
    required: true
  },
  tongtien: {
    type: Number,
    required: true,
    min: 0
  },
  trangthai: {
    type: Number,
    default: 0, // 0: pending, 1: completed
    enum: [0, 1]
  },
  items: [{
    id: {
      type: Number,
      required: true
    },
    soluong: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      default: 'Không có ghi chú'
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
orderSchema.index({ khachhang: 1 });
orderSchema.index({ trangthai: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
