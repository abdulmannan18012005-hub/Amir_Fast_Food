import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { getClientIp } from './auth';
import { checkRateLimit } from './rateLimit';
import { toSafeError, UserFacingError } from './errors';

export const PREDEFINED_FEEDBACK_CHIPS = [
  'The food was fresh and delicious.',
  'The order arrived on time.',
  'The food was tasty and well-packed.',
  'The portion size was good.',
  'The ordering process was easy.',
  'The delivery service was good.',
  'Everything was great. I enjoyed my meal.',
] as const;

export interface FeedbackSubmissionPayload {
  orderId: string;
  rating: number; // 1 to 5
  chips: string[];
  comment?: string;
}

export interface FeedbackData {
  id?: string;
  order_id: string;
  rating: number;
  chips: string[];
  comment: string | null;
  created_at?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const submitFeedbackFn = createServerFn({ method: 'POST' })
  .validator((d: FeedbackSubmissionPayload) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string; feedback?: FeedbackData; pendingMigration?: boolean }> => {
    try {
      const ip = getClientIp();
      const allowed = await checkRateLimit(ip, 'submit_feedback', 15, 60 * 1000);
      if (!allowed) {
        throw new UserFacingError('Too many feedback requests. Please wait a moment and try again.', 'rate_limited');
      }

      const { orderId, rating, chips = [], comment } = data;

      // 1. Validate orderId
      if (!orderId || !UUID_REGEX.test(orderId)) {
        throw new UserFacingError('Invalid order reference.', 'validation');
      }

      // 2. Validate rating
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new UserFacingError('Rating must be between 1 and 5 stars.', 'validation');
      }

      // 3. Validate chips and comment
      const validChips = chips.filter(c => typeof c === 'string' && c.trim().length > 0 && c.length <= 200);
      const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

      if (trimmedComment.length > 1000) {
        throw new UserFacingError('Comment cannot exceed 1,000 characters.', 'validation');
      }

      if (validChips.length === 0 && trimmedComment.length === 0) {
        throw new UserFacingError('Please select at least one feedback option or enter a comment.', 'validation');
      }

      const supabase = getSupabaseServer();

      // 4. Verify authoritative order status from DB
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .single();

      if (orderErr || !order) {
        throw new UserFacingError('Order not found.', 'validation');
      }

      if (order.status !== 'delivered') {
        throw new UserFacingError('Feedback can only be submitted after your order has been delivered.', 'validation');
      }

      // 5. Check if feedback already exists for this order
      const { data: existingFeedback, error: checkErr } = await supabase
        .from('customer_feedback')
        .select('id, rating, chips, comment, created_at')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingFeedback) {
        return {
          success: true,
          feedback: {
            order_id: orderId,
            rating: existingFeedback.rating,
            chips: existingFeedback.chips || [],
            comment: existingFeedback.comment || null,
            created_at: existingFeedback.created_at,
          }
        };
      }

      if (checkErr && (checkErr.code === '42P01' || checkErr.message?.includes('customer_feedback'))) {
        console.warn('[Feedback] Table customer_feedback does not exist in Supabase yet.');
        return {
          success: false,
          error: 'Feedback service is currently updating. Your review is appreciated, please try again shortly.',
          pendingMigration: true,
        };
      }

      // 6. Insert feedback record
      const insertRecord = {
        order_id: orderId,
        rating,
        chips: validChips,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('customer_feedback')
        .insert(insertRecord)
        .select('id, rating, chips, comment, created_at')
        .single();

      if (insertErr) {
        if (insertErr.code === '23505' || insertErr.message?.includes('unique')) {
          // Duplicate insertion race condition: fetch and return existing
          return {
            success: true,
            feedback: {
              order_id: orderId,
              rating,
              chips: validChips,
              comment: trimmedComment.length > 0 ? trimmedComment : null,
            }
          };
        }
        if (insertErr.code === '42P01' || insertErr.message?.includes('customer_feedback')) {
          return {
            success: false,
            error: 'Feedback service is currently updating. Your review is appreciated, please try again shortly.',
            pendingMigration: true,
          };
        }
        console.error('[Feedback] Insert error:', insertErr);
        throw new UserFacingError('Unable to save feedback at this time. Please try again.', 'validation');
      }

      return {
        success: true,
        feedback: {
          id: inserted?.id,
          order_id: orderId,
          rating: inserted?.rating ?? rating,
          chips: inserted?.chips ?? validChips,
          comment: inserted?.comment ?? (trimmedComment || null),
          created_at: inserted?.created_at,
        }
      };
    } catch (err: any) {
      return { success: false, error: toSafeError(err) };
    }
  });

export const getFeedbackForOrderFn = createServerFn({ method: 'GET' })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; feedback: FeedbackData | null; error?: string }> => {
    try {
      if (!data.orderId || !UUID_REGEX.test(data.orderId)) {
        return { success: true, feedback: null };
      }

      const supabase = getSupabaseServer();
      const { data: record, error } = await supabase
        .from('customer_feedback')
        .select('id, order_id, rating, chips, comment, created_at')
        .eq('order_id', data.orderId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' || error.message?.includes('customer_feedback')) {
          return { success: true, feedback: null };
        }
        console.warn('[Feedback] getFeedback error:', error);
        return { success: false, feedback: null, error: error.message };
      }

      if (!record) {
        return { success: true, feedback: null };
      }

      return {
        success: true,
        feedback: {
          id: record.id,
          order_id: record.order_id,
          rating: record.rating,
          chips: record.chips || [],
          comment: record.comment || null,
          created_at: record.created_at,
        }
      };
    } catch (err: any) {
      return { success: false, feedback: null, error: toSafeError(err) };
    }
  });
