import nodemailer from 'nodemailer';
import type { Order, OrderItem } from '../types';

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendOrderReceiptEmail(order: Order, items: (OrderItem & { name: string })[]) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Email credentials not configured. Skipping email dispatch.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const itemsHtml = items.map(item => {
    const variants = item.selected_variants || [];
    const variantsText = variants.length 
      ? `<br><small style="color: #666;">Modifiers: ${variants.map(v => escapeHtml(v.name)).join(', ')}</small>`
      : '';
    const itemTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${escapeHtml(item.name)}</strong> x${Number(item.quantity) || 1}${variantsText}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          PKR ${itemTotal.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  const deliveryFeeNum = Number(order.delivery_fee) || 0;
  const totalAmountNum = Number(order.total_amount) || 0;

  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #DC2626; margin: 0; font-size: 28px;">Amir Fast Food</h1>
        <p style="color: #666; margin-top: 5px;">Your Order Receipt</p>
      </div>

      <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin-top: 0;">Order #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</h3>
        <p><strong>Name:</strong> ${escapeHtml(order.customer_name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</p>
        <p><strong>Address:</strong> ${escapeHtml(order.delivery_address)}</p>
        <p><strong>Payment Method:</strong> ${escapeHtml(order.payment_method?.toUpperCase())}</p>
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
            <td style="padding: 12px; text-align: right;">PKR ${deliveryFeeNum.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 18px; color: #DC2626;">
            <td style="padding: 12px; text-align: right; font-weight: 800;">Total</td>
            <td style="padding: 12px; text-align: right; font-weight: 800;">PKR ${totalAmountNum.toFixed(2)}</td>
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
