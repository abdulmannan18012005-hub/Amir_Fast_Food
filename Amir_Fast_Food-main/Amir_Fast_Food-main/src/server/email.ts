import nodemailer from 'nodemailer';
import type { Order, OrderItem } from '../types';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOrderReceiptEmail(order: Order, items: (OrderItem & { name: string })[]) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Email credentials not configured. Skipping email dispatch.');
    return;
  }

  const itemsHtml = items.map(item => {
    const variantsText = item.selected_variants.length 
      ? `<br><small style="color: #666;">Modifiers: ${item.selected_variants.map(v => v.name).join(', ')}</small>`
      : '';
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong> x${item.quantity}${variantsText}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          PKR ${(item.unit_price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #DC2626; margin: 0; font-size: 28px;">Amir Fast Food</h1>
        <p style="color: #666; margin-top: 5px;">Your Order Receipt</p>
      </div>

      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0;">Order #${order.id.slice(0, 8).toUpperCase()}</h3>
        <p><strong>Name:</strong> ${order.customer_name}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Address:</strong> ${order.delivery_address}</p>
        <p><strong>Payment Method:</strong> ${order.payment_method.toUpperCase()}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f4f4f4;">
            <th style="padding: 12px; text-align: left;">Item</th>
            <th style="padding: 12px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr>
            <td style="padding: 12px; text-align: right; font-weight: bold;">Delivery Fee</td>
            <td style="padding: 12px; text-align: right;">PKR ${order.delivery_fee.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 18px; color: #DC2626;">
            <td style="padding: 12px; text-align: right; font-weight: 800;">Total</td>
            <td style="padding: 12px; text-align: right; font-weight: 800;">PKR ${order.total_amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="text-align: center; color: #888; font-size: 12px; margin-top: 40px;">
        <p>Thank you for choosing Amir Fast Food!</p>
        <p>You can track your order live on our website.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Amir Fast Food" <${process.env.GMAIL_USER}>`,
    to: order.customer_email,
    subject: `Order Confirmation - Amir Fast Food #${order.id.slice(0, 8).toUpperCase()}`,
    html,
  });
}
