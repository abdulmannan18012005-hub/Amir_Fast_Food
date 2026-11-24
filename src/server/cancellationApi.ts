import crypto from 'crypto';
import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { requireAdmin, timingSafeCompare } from './auth';
import { UserFacingError, toSafeError } from './errors';
import { sendOrderPush, sendAdminOrderPush } from './push';
import { SHOP_PHONE_LOCAL } from '../lib/shop';

const BUCKET_NAME = 'payment-proofs';

/**
 * Validates cancellation token hash safely using timingSafeEqual
 */
function verifyTokenHash(rawToken: string, storedHash: string | null | undefined): boolean {
  if (!rawToken || !storedHash || typeof rawToken !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  try {
    const computedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    return timingSafeCompare(computedHash, storedHash.trim());
  } catch {
    return false;
  }
}

// 1. Customer: Upload Cancellation Payment Proof (Online Transfer)
export const uploadCancellationProofFn = createServerFn({ method: "POST" })
  .validator((d: {
    orderId: string;
    cancellationToken: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      const { orderId, cancellationToken, fileName, mimeType, base64Data } = data;

      if (!orderId || !cancellationToken || !base64Data) {
        throw new UserFacingError("Missing proof image or order information.", "validation");
      }

      // Allowed MIME types
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        throw new UserFacingError("Invalid file type. Please upload a JPG, PNG, or WebP screenshot.", "validation");
      }

      // Convert base64 to buffer and check size (<= 5 MB)
      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        throw new UserFacingError("Image is too large. Maximum allowed file size is 5 MB.", "validation");
      }
      if (buffer.length < 100) {
        throw new UserFacingError("Invalid image file.", "validation");
      }

      const supabase = getSupabaseServer();

      // Fetch order and verify authorization + eligibility
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('id, status, payment_method, cancellation_token_hash')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchErr || !order) {
        throw new UserFacingError("Order not found.", "validation");
      }

      if (order.status !== 'received') {
        throw new UserFacingError(
          "This order has already entered kitchen preparation and can no longer be canceled.",
          "cancellation_ineligible"
        );
      }

      // Verify token
      if (!verifyTokenHash(cancellationToken, order.cancellation_token_hash)) {
        throw new UserFacingError(
          `Cancellation not authorized for this device. Please call us on ${SHOP_PHONE_LOCAL} for assistance.`,
          "unauthorized"
        );
      }

      // Determine extension
      let ext = 'jpg';
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';

      const sanitizedOrderPrefix = orderId.replace(/[^a-zA-Z0-9-]/g, '');
      const storagePath = `${sanitizedOrderPrefix}/proof_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

      // Upload to private bucket
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadErr) {
        console.error('[uploadCancellationProofFn] Storage upload error:', uploadErr);
        throw new UserFacingError("Failed to store payment proof image. Please try again.", "validation");
      }

      return { success: true, proofPath: storagePath };
    } catch (err: any) {
      return { success: false, error: toSafeError(err) };
    }
  });

// 2. Customer: Submit Order Cancellation
export const cancelOrderCustomerFn = createServerFn({ method: "POST" })
  .validator((d: {
    orderId: string;
    cancellationToken: string;
    reason: string;
    proofPath?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      const { orderId, cancellationToken, reason, proofPath } = data;

      const cleanReason = String(reason || '').trim().replace(/<[^>]*>/g, '');
      if (cleanReason.length < 5 || cleanReason.length > 250) {
        throw new UserFacingError("Please provide a cancellation reason between 5 and 250 characters.", "validation");
      }

      const supabase = getSupabaseServer();

      // 1. Fetch current order state
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('id, status, payment_method, total_amount, customer_name, cancellation_token_hash')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchErr || !order) {
        throw new UserFacingError("Order not found.", "validation");
      }

      // Check eligibility: ONLY 'received' status can be canceled by customer
      if (order.status !== 'received') {
        if (order.status === 'canceled') {
          return { success: true, alreadyCanceled: true, message: "Order is already canceled." };
        }
        throw new UserFacingError(
          "Your order is already being prepared in our kitchen and cannot be canceled. Please call 0301-4265785.",
          "cancellation_ineligible"
        );
      }

      // 2. Verify token ownership
      if (!order.cancellation_token_hash) {
        throw new UserFacingError(
          `This order was placed before cancellation tokens were enabled. Please call us directly on ${SHOP_PHONE_LOCAL} to cancel.`,
          "unauthorized"
        );
      }

      if (!verifyTokenHash(cancellationToken, order.cancellation_token_hash)) {
        throw new UserFacingError(
          `Cancellation authorization failed. Please call us directly on ${SHOP_PHONE_LOCAL} for assistance.`,
          "unauthorized"
        );
      }

      const isOnline = order.payment_method === 'online_transfer';
      if (isOnline && !proofPath) {
        throw new UserFacingError("Please upload a payment proof screenshot to request a refund.", "validation");
      }

      const nowIso = new Date().toISOString();
      const refundStatus = isOnline ? 'pending_review' : 'not_required';

      // 3. Atomic status transition: WHERE id = :orderId AND status = 'received'
      // This prevents race conditions with kitchen staff changing status to 'preparing' simultaneously
      const updates: any = {
        status: 'canceled',
        cancel_reason: cleanReason,
        canceled_at: nowIso,
        status_changed_at: nowIso,
        cancellation_source: 'customer',
        refund_status: refundStatus,
        ...(proofPath ? { refund_proof_path: proofPath } : {})
      };

      let { data: updatedRow, error: updateErr } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .eq('status', 'received')
        .select('id')
        .maybeSingle();

      if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('refund_status') || updateErr.message?.includes('cancellation_source'))) {
        // Fallback if migration columns are not yet applied in production DB
        const fallbackUpdates = {
          status: 'canceled',
          cancel_reason: cleanReason,
          canceled_at: nowIso,
          status_changed_at: nowIso
        };
        const res = await supabase
          .from('orders')
          .update(fallbackUpdates)
          .eq('id', orderId)
          .eq('status', 'received')
          .select('id')
          .maybeSingle();
        updatedRow = res.data;
        updateErr = res.error;
      }

      if (updateErr) {
        console.error('[cancelOrderCustomerFn] Atomic update error:', updateErr);
        throw new UserFacingError("Failed to cancel order due to a database error. Please try again or call us.", "validation");
      }

      if (!updatedRow) {
        // Atomic compare failed: the order status changed from 'received' while the customer was submitting!
        const { data: latest } = await supabase.from('orders').select('status').eq('id', orderId).maybeSingle();
        if (latest?.status === 'canceled') {
          return { success: true, alreadyCanceled: true };
        }
        throw new UserFacingError(
          "Your order just entered kitchen preparation and can no longer be canceled online. Please call us at 0301-4265785.",
          "cancellation_ineligible"
        );
      }

      // 4. Send Notifications
      const code = orderId.slice(0, 8).toUpperCase();
      const customerMsg = isOnline
        ? `Your cancellation request for #${code} has been submitted. Our team will review your payment proof and verify the refund.`
        : `Your COD order #${code} has been canceled successfully.`;

      const adminAlert = isOnline
        ? `[REFUND REVIEW NEEDED] Order #${code} was canceled by customer. Payment proof submitted for review.`
        : `[ORDER CANCELED] COD Order #${code} was canceled by customer (${cleanReason}).`;

      await Promise.allSettled([
        sendOrderPush(orderId, 'canceled', 'Amir Fast Food', customerMsg),
        sendAdminOrderPush(orderId, adminAlert)
      ]);

      return {
        success: true,
        orderId,
        isOnline,
        refundStatus,
        message: isOnline
          ? "Your cancellation request has been submitted successfully. Our team will review your payment proof and order details. Once verified, our team will process your refund. You can follow the refund status here. Thank you."
          : "Your COD order has been canceled successfully."
      };
    } catch (err: any) {
      return { success: false, error: toSafeError(err) };
    }
  });

// 3. Admin: List Cancellations with Tab Filtering & Counts
export const listCancellationsAdminFn = createServerFn({ method: "POST" })
  .validator((d: {
    pin?: string;
    token?: string;
    tab?: 'pending_review' | 'approved' | 'paid' | 'rejected' | 'history' | 'all';
    search?: string;
    page?: number;
    pageSize?: number;
  }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();

    const page = Math.max(1, Number(data.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(data.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const tab = data.tab || 'all';

    // Base query for counts: all canceled orders
    let query = supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, delivery_fee, customer_name, customer_phone, delivery_address, payment_trx_id, payment_review_status, payment_verified_at, cancel_reason, canceled_at, cancellation_source, refund_status, refund_proof_path, refund_reviewed_at, refund_paid_at, refund_trx_ref, refund_admin_note, created_at, order_items(*, menu_items(name))', { count: 'exact' })
      .eq('status', 'canceled')
      .order('canceled_at', { ascending: false });

    // Apply tab filter
    if (tab === 'pending_review') {
      query = query.eq('refund_status', 'pending_review');
    } else if (tab === 'approved') {
      query = query.eq('refund_status', 'approved');
    } else if (tab === 'paid') {
      query = query.eq('refund_status', 'paid');
    } else if (tab === 'rejected') {
      query = query.eq('refund_status', 'rejected');
    }

    // Search filter (name, phone, orderId, TID)
    if (data.search && data.search.trim()) {
      const q = data.search.trim();
      query = query.or(`customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,id.ilike.%${q}%,payment_trx_id.ilike.%${q}%`);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data: rows, count: totalFiltered, error } = await query;

    if (error && (error.code === '42703' || error.message?.includes('refund_status'))) {
      // Safe fallback if migration columns are missing
      const fallbackQuery = supabase
        .from('orders')
        .select('id, status, payment_method, total_amount, delivery_fee, customer_name, customer_phone, delivery_address, payment_trx_id, cancel_reason, canceled_at, created_at, order_items(*, menu_items(name))', { count: 'exact' })
        .eq('status', 'canceled')
        .order('canceled_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const res = await fallbackQuery;
      return {
        orders: res.data || [],
        totalCount: res.count || 0,
        counts: { pending_review: 0, approved: 0, paid: 0, rejected: 0, history: res.count || 0 }
      };
    }

    if (error) {
      console.error('[listCancellationsAdminFn] Error:', error);
      throw new UserFacingError("Failed to fetch cancellations.");
    }

    // Fetch counts for all tabs
    const { count: pendingCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'canceled').eq('refund_status', 'pending_review');
    const { count: approvedCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'canceled').eq('refund_status', 'approved');
    const { count: paidCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'canceled').eq('refund_status', 'paid');
    const { count: rejectedCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'canceled').eq('refund_status', 'rejected');
    const { count: historyCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'canceled');

    return {
      orders: rows || [],
      totalCount: totalFiltered || 0,
      counts: {
        pending_review: pendingCount || 0,
        approved: approvedCount || 0,
        paid: paidCount || 0,
        rejected: rejectedCount || 0,
        history: historyCount || 0
      }
    };
  });

// 4. Admin: Generate Signed URL for Payment Proof
export const getProofSignedUrlFn = createServerFn({ method: "POST" })
  .validator((d: { proofPath: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const { proofPath } = data;
    if (!proofPath || typeof proofPath !== 'string') {
      throw new UserFacingError("Invalid proof image path.", "validation");
    }

    const supabase = getSupabaseServer();
    // Create 15-minute temporary signed URL
    const { data: signedRes, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(proofPath.trim(), 900); // 15 mins

    if (error || !signedRes?.signedUrl) {
      console.error('[getProofSignedUrlFn] Error generating signed URL:', error);
      throw new UserFacingError("Could not retrieve payment proof image. Please check storage bucket configuration.", "validation");
    }

    return { success: true, signedUrl: signedRes.signedUrl };
  });

// 5. Admin: Review Refund (Approve or Reject)
export const reviewRefundFn = createServerFn({ method: "POST" })
  .validator((d: {
    orderId: string;
    decision: 'approved' | 'rejected';
    adminNote?: string;
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const { orderId, decision, adminNote } = data;

    const cleanNote = String(adminNote || '').trim().replace(/<[^>]*>/g, '');
    if (decision === 'rejected' && cleanNote.length < 5) {
      throw new UserFacingError("Please provide an explanation note when rejecting a refund request.", "validation");
    }

    const supabase = getSupabaseServer();

    const { data: current, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, payment_method, refund_status')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !current) {
      throw new UserFacingError("Order not found.", "validation");
    }

    if (current.payment_method !== 'online_transfer') {
      throw new UserFacingError("Refund workflow only applies to online transfer orders.", "validation");
    }

    if (current.refund_status === 'paid') {
      throw new UserFacingError("This refund has already been paid and finalized.", "validation");
    }

    const nowIso = new Date().toISOString();
    const updates: any = {
      refund_status: decision,
      refund_reviewed_at: nowIso,
      refund_admin_note: cleanNote || null
    };

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (updateErr) {
      console.error('[reviewRefundFn] Error:', updateErr);
      throw new UserFacingError("Failed to update refund status.", "validation");
    }

    // Customer push notification
    const code = orderId.slice(0, 8).toUpperCase();
    const pushMsg = decision === 'approved'
      ? `Refund Approved: Your refund for Order #${code} has been approved. Our staff will transfer the amount to your account shortly.`
      : `Refund Update: Your refund request for Order #${code} was rejected. Note: ${cleanNote}`;

    await Promise.race([
      sendOrderPush(orderId, 'canceled', 'Amir Fast Food - Refund Update', pushMsg),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    return { success: true, decision };
  });

// 6. Admin: Mark Refund as Paid (Completed Transfer)
export const markRefundPaidFn = createServerFn({ method: "POST" })
  .validator((d: {
    orderId: string;
    refundTrxRef?: string;
    adminNote?: string;
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    requireAdmin(data.token || data.pin);
    const { orderId, refundTrxRef, adminNote } = data;

    const cleanRef = String(refundTrxRef || '').trim().replace(/<[^>]*>/g, '');
    const cleanNote = String(adminNote || '').trim().replace(/<[^>]*>/g, '');

    const supabase = getSupabaseServer();

    const { data: current, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, payment_method, refund_status, total_amount, delivery_fee')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !current) {
      throw new UserFacingError("Order not found.", "validation");
    }

    if (current.refund_status !== 'approved') {
      throw new UserFacingError("Only approved refunds can be marked as paid. Please approve the refund review first.", "validation");
    }

    const nowIso = new Date().toISOString();
    const updates: any = {
      refund_status: 'paid',
      refund_paid_at: nowIso,
      refund_trx_ref: cleanRef || null,
      refund_admin_note: cleanNote || null
    };

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (updateErr) {
      console.error('[markRefundPaidFn] Error:', updateErr);
      throw new UserFacingError("Failed to record refund payment.", "validation");
    }

    // Push notification to customer
    const code = orderId.slice(0, 8).toUpperCase();
    const refText = cleanRef ? ` (Ref: ${cleanRef})` : '';
    const refundTotal = Number(current.total_amount || 0) + Number(current.delivery_fee || 0);
    const pushMsg = `Refund Completed! We have sent your refund of PKR ${refundTotal} to your account${refText}. Thank you!`;

    await Promise.race([
      sendOrderPush(orderId, 'canceled', 'Amir Fast Food - Refund Paid', pushMsg),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});

    return { success: true };
  });
