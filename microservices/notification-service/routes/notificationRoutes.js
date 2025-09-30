const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Joi = require('joi');

// Email transporter setup
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Validation schemas
const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().required(),
  message: Joi.string().required(),
  type: Joi.string().valid('welcome', 'order_confirmation', 'order_status', 'payment_confirmation', 'general').optional()
});

// Send email notification
router.post('/send-email', async (req, res) => {
  try {
    const { error, value } = sendEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { to, subject, message, type } = value;

    // Create transporter
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: generateEmailTemplate(message, type)
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({
      message: 'Email sent successfully',
      to: to,
      subject: subject
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Send welcome email
router.post('/welcome', async (req, res) => {
  try {
    const { userEmail, userName } = req.body;

    if (!userEmail || !userName) {
      return res.status(400).json({ error: 'User email and name are required' });
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: 'Chào mừng bạn đến với Vy Food!',
      html: generateWelcomeEmail(userName)
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: 'Welcome email sent successfully',
      to: userEmail
    });
  } catch (error) {
    console.error('Send welcome email error:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send order confirmation
router.post('/order-confirmation', async (req, res) => {
  try {
    const { userEmail, orderId, orderDetails, totalAmount } = req.body;

    if (!userEmail || !orderId || !orderDetails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: `Xác nhận đơn hàng #${orderId}`,
      html: generateOrderConfirmationEmail(orderId, orderDetails, totalAmount)
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: 'Order confirmation email sent successfully',
      orderId: orderId,
      to: userEmail
    });
  } catch (error) {
    console.error('Send order confirmation error:', error);
    res.status(500).json({ error: 'Failed to send order confirmation email' });
  }
});

// Send order status update
router.post('/order-status', async (req, res) => {
  try {
    const { userEmail, orderId, status, message } = req.body;

    if (!userEmail || !orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: `Cập nhật đơn hàng #${orderId}`,
      html: generateOrderStatusEmail(orderId, status, message)
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: 'Order status email sent successfully',
      orderId: orderId,
      status: status,
      to: userEmail
    });
  } catch (error) {
    console.error('Send order status email error:', error);
    res.status(500).json({ error: 'Failed to send order status email' });
  }
});

// Email template generators
function generateEmailTemplate(message, type) {
  const baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vy Food</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Vy Food</h1>
            </div>
            <div class="content">
                ${message}
            </div>
            <div class="footer">
                <p>© 2025 Vy Food. Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
                <p>Email: support@vyfood.com | Hotline: 0123 456 789</p>
            </div>
        </div>
    </body>
    </html>
  `;
  return baseTemplate;
}

function generateWelcomeEmail(userName) {
  const message = `
    <h2>Chào mừng ${userName}!</h2>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại Vy Food.</p>
    <p>Chúng tôi rất vui mừng có bạn trong cộng đồng những người yêu thích ẩm thực của chúng tôi.</p>
    <p>Hãy khám phá những món ăn ngon và đặt hàng ngay hôm nay!</p>
    <div style="text-align: center; margin: 20px 0;">
        <a href="http://localhost:8080" style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Bắt đầu mua sắm</a>
    </div>
  `;
  return generateEmailTemplate(message, 'welcome');
}

function generateOrderConfirmationEmail(orderId, orderDetails, totalAmount) {
  let itemsHtml = '';
  if (orderDetails && orderDetails.items) {
    itemsHtml = orderDetails.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.price)}</td>
        <td style="text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');
  }

  const message = `
    <h2>Xác nhận đơn hàng #${orderId}</h2>
    <p>Cảm ơn bạn đã đặt hàng tại Vy Food. Đơn hàng của bạn đã được xác nhận.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #ddd;">Sản phẩm</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Số lượng</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Đơn giá</th>
          <th style="padding: 10px; border: 1px solid #ddd;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f8f9fa; font-weight: bold;">
          <td colspan="3" style="padding: 10px; border: 1px solid #ddd;">Tổng cộng:</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(totalAmount || 0)}</td>
        </tr>
      </tfoot>
    </table>
    
    <p><strong>Thông tin giao hàng:</strong></p>
    <p>${orderDetails.deliveryAddress || 'Chưa cung cấp'}</p>
    
    <p>Chúng tôi sẽ liên hệ với bạn sớm nhất để xác nhận thông tin giao hàng.</p>
  `;
  return generateEmailTemplate(message, 'order_confirmation');
}

function generateOrderStatusEmail(orderId, status, message) {
  const statusText = getStatusText(status);
  const content = `
    <h2>Cập nhật đơn hàng #${orderId}</h2>
    <p>Trạng thái đơn hàng của bạn đã được cập nhật:</p>
    <div style="background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 15px 0;">
      <strong>Trạng thái hiện tại: ${statusText}</strong>
    </div>
    ${message ? `<p>${message}</p>` : ''}
    <p>Cảm ơn bạn đã tin tưởng Vy Food!</p>
  `;
  return generateEmailTemplate(content, 'order_status');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(amount);
}

function getStatusText(status) {
  const statusMap = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'preparing': 'Đang chuẩn bị',
    'shipping': 'Đang giao hàng',
    'delivered': 'Đã giao hàng',
    'cancelled': 'Đã hủy'
  };
  return statusMap[status] || status;
}

module.exports = router;
