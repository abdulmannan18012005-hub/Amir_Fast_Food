import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '../lib/supabase';
import { requireAdmin, getClientIp } from './auth';
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

export interface AdminFeedbackQuery {
  token?: string;
  pin?: string;
  search?: string;
  rating?: string; // 'all' | '5' | '4' | '3' | '2' | '1' | 'low'
  date?: string; // YYYY-MM-DD
  sort?: 'newest' | 'oldest';
  page?: number;
  pageSize?: number;
}

export interface AdminFeedbackItem {
  id: string;
  orderId: string;
  rating: number;
  chips: string[];
  comment: string | null;
  createdAt: string;
  customerName: string;
  customerPhoneMasked: string;
  orderTotal: number;
  orderShortCode: string;
  orderCreatedAt: string;
}

export interface AdminFeedbackStats {
  totalCount: number;
  averageRating: number;
  fiveStarCount: number;
  lowRatingCount: number;
}

export interface AdminFeedbackResponse {
  success: boolean;
  items: AdminFeedbackItem[];
  totalFiltered: number;
  stats: AdminFeedbackStats;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingMigration: boolean;
  error?: string;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return `${start}-***-${end}`;
}

export const getAdminFeedbackListFn = createServerFn({ method: 'POST' })
  .validator((d: AdminFeedbackQuery) => d)
  .handler(async ({ data }): Promise<AdminFeedbackResponse> => {
    try {
      requireAdmin(data.token || data.pin);

      const supabase = getSupabaseServer();

      // 1. Fetch all ratings to calculate authoritative summary stats
      const { data: allRatings, error: statsErr } = await supabase
        .from('customer_feedback')
        .select('rating');

      if (statsErr) {
        if (statsErr.code === '42P01' || statsErr.message?.includes('customer_feedback')) {
          return {
            success: true,
            items: [],
            totalFiltered: 0,
            stats: { totalCount: 0, averageRating: 0, fiveStarCount: 0, lowRatingCount: 0 },
            page: 1,
            pageSize: 15,
            totalPages: 1,
            pendingMigration: true,
          };
        }
        console.error('[AdminFeedback] stats error:', statsErr);
        throw new UserFacingError('Failed to load feedback statistics.', 'validation');
      }

      const totalCount = allRatings?.length || 0;
      const sum = (allRatings || []).reduce((acc, curr) => acc + (curr.rating || 0), 0);
      const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : 0;
      const fiveStarCount = (allRatings || []).filter(r => r.rating === 5).length;
      const lowRatingCount = (allRatings || []).filter(r => r.rating === 1 || r.rating === 2).length;

      // 2. Build filtered and paginated query
      let query = supabase
        .from('customer_feedback')
        .select('*', { count: 'exact' });

      // Rating filter
      const ratingFilter = data.rating || 'all';
      if (ratingFilter === '5') {
        query = query.eq('rating', 5);
      } else if (ratingFilter === '4') {
        query = query.eq('rating', 4);
      } else if (ratingFilter === '3') {
        query = query.eq('rating', 3);
      } else if (ratingFilter === '2') {
        query = query.eq('rating', 2);
      } else if (ratingFilter === '1') {
        query = query.eq('rating', 1);
      } else if (ratingFilter === 'low') {
        query = query.in('rating', [1, 2]);
      }

      // Date filter (PKT UTC+5 bounds)
      if (data.date) {
        const startIso = new Date(`${data.date}T00:00:00+05:00`).toISOString();
        const endIso = new Date(`${data.date}T23:59:59.999+05:00`).toISOString();
        query = query.gte('created_at', startIso).lte('created_at', endIso);
      }

      // Search filter across comments, order IDs, or customer names
      if (data.search && data.search.trim()) {
        const term = data.search.trim().replace(/[,()%*\\]/g, '').slice(0, 50);
        const { data: matchedOrders } = await supabase
          .from('orders')
          .select('id')
          .or(`customer_name.ilike.%${term}%,id.ilike.%${term}%`)
          .limit(100);

        const orderIds = (matchedOrders || []).map(o => o.id);
        if (orderIds.length > 0) {
          query = query.or(`comment.ilike.%${term}%,order_id.in.(${orderIds.join(',')})`);
        } else {
          query = query.or(`comment.ilike.%${term}%,order_id.ilike.%${term}%`);
        }
      }

      // Sort
      const ascending = data.sort === 'oldest';
      query = query.order('created_at', { ascending });

      // Pagination
      const page = Math.max(1, Number(data.page) || 1);
      const pageSize = Math.min(50, Math.max(5, Number(data.pageSize) || 15));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rows, count: filteredCount, error: listErr } = await query;

      if (listErr) {
        console.error('[AdminFeedback] query error:', listErr);
        throw new UserFacingError('Failed to load feedback entries.', 'validation');
      }

      // 3. Fetch linked order information for enriched display
      const uniqueOrderIds = Array.from(new Set((rows || []).map(r => r.order_id).filter(Boolean)));
      const orderMap = new Map<string, any>();

      if (uniqueOrderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, customer_name, customer_phone, total, created_at')
          .in('id', uniqueOrderIds);

        (orders || []).forEach(o => orderMap.set(o.id, o));
      }

      // 4. Transform into final DTOs with masked phones
      const items: AdminFeedbackItem[] = (rows || []).map(row => {
        const order = orderMap.get(row.order_id);
        return {
          id: row.id,
          orderId: row.order_id,
          rating: row.rating,
          chips: Array.isArray(row.chips) ? row.chips : [],
          comment: row.comment || null,
          createdAt: row.created_at,
          customerName: order?.customer_name || 'Customer',
          customerPhoneMasked: maskPhone(order?.customer_phone),
          orderTotal: order?.total || 0,
          orderShortCode: (row.order_id || '').slice(0, 8).toUpperCase(),
          orderCreatedAt: order?.created_at || row.created_at,
        };
      });

      const totalFiltered = filteredCount || 0;
      const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

      return {
        success: true,
        items,
        totalFiltered,
        stats: {
          totalCount,
          averageRating,
          fiveStarCount,
          lowRatingCount,
        },
        page,
        pageSize,
        totalPages,
        pendingMigration: false,
      };
    } catch (err: any) {
      return {
        success: false,
        items: [],
        totalFiltered: 0,
        stats: { totalCount: 0, averageRating: 0, fiveStarCount: 0, lowRatingCount: 0 },
        page: 1,
        pageSize: 15,
        totalPages: 1,
        pendingMigration: false,
        error: toSafeError(err),
      };
    }
  });
