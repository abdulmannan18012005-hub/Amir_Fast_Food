import { createServerFn } from '@tanstack/react-start';
import { requireAdmin } from './auth';
import { toSafeError, UserFacingError } from './errors';
import { getKnowledgeJson, normalizeAndValidateImageInput, writeKnowledgeJson } from './menu';
import { getSupabaseServer } from '../lib/supabase';
import {
  DEFAULT_SITE_LAYOUT,
  mergeWithLayoutDefaults,
  type LayoutPageKey,
  type SiteLayoutConfig,
} from '../lib/layoutContent';

const LAYOUT_TABLE = 'site_layout_content';
const LAYOUT_ROW_ID = 'main';
const KNOWLEDGE_DRAFT_KEY = 'site_layout_draft';
const KNOWLEDGE_PUBLISHED_KEY = 'site_layout_published';

function isMissingLayoutTableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

async function readLayoutStorage(): Promise<{
  draft: SiteLayoutConfig;
  published: SiteLayoutConfig;
  updatedAt: string | null;
  publishedAt: string | null;
  storageMode: 'table' | 'knowledge';
}> {
  const supabase = getSupabaseServer();
  try {
    const { data, error } = await supabase
      .from(LAYOUT_TABLE)
      .select('draft_content, published_content, updated_at, published_at')
      .eq('id', LAYOUT_ROW_ID)
      .maybeSingle();

    if (!error) {
      if (data) {
        return {
          draft: mergeWithLayoutDefaults(data.draft_content),
          published: mergeWithLayoutDefaults(data.published_content),
          updatedAt: data.updated_at || null,
          publishedAt: data.published_at || null,
          storageMode: 'table',
        };
      }
      return {
        draft: mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT),
        published: mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT),
        updatedAt: null,
        publishedAt: null,
        storageMode: 'table',
      };
    }

    if (!isMissingLayoutTableError(error)) {
      console.error('[layoutApi] read table error:', error);
    }
  } catch (err) {
    console.error('[layoutApi] unexpected read error:', err);
  }

  const [rawDraft, rawPublished] = await Promise.all([
    getKnowledgeJson<Record<string, any> | null>(KNOWLEDGE_DRAFT_KEY, null),
    getKnowledgeJson<Record<string, any> | null>(KNOWLEDGE_PUBLISHED_KEY, null),
  ]);

  return {
    draft: mergeWithLayoutDefaults(rawDraft || rawPublished || DEFAULT_SITE_LAYOUT),
    published: mergeWithLayoutDefaults(rawPublished || DEFAULT_SITE_LAYOUT),
    updatedAt: null,
    publishedAt: null,
    storageMode: 'knowledge',
  };
}

async function validateAndNormalizeLayout(rawLayout: unknown): Promise<SiteLayoutConfig> {
  const merged = mergeWithLayoutDefaults(rawLayout);
  if (merged.home.heroImageUrl && merged.home.heroImageUrl !== DEFAULT_SITE_LAYOUT.home.heroImageUrl) {
    merged.home.heroImageUrl = await normalizeAndValidateImageInput(merged.home.heroImageUrl, true);
  }
  return merged;
}

async function persistLayoutStorage(params: {
  draft: SiteLayoutConfig;
  published: SiteLayoutConfig;
  markPublished?: boolean;
}): Promise<{ updatedAt: string; publishedAt: string | null; storageMode: 'table' | 'knowledge' }> {
  const supabase = getSupabaseServer();
  const nowIso = new Date().toISOString();

  try {
    const existing = await supabase
      .from(LAYOUT_TABLE)
      .select('published_at')
      .eq('id', LAYOUT_ROW_ID)
      .maybeSingle();

    if (!existing.error) {
      const nextPublishedAt = params.markPublished
        ? nowIso
        : existing.data?.published_at || nowIso;

      const { error: upsertErr } = await supabase.from(LAYOUT_TABLE).upsert(
        {
          id: LAYOUT_ROW_ID,
          draft_content: params.draft,
          published_content: params.published,
          updated_at: nowIso,
          published_at: nextPublishedAt,
        },
        { onConflict: 'id' }
      );

      if (!upsertErr) {
        return { updatedAt: nowIso, publishedAt: nextPublishedAt, storageMode: 'table' };
      }
      if (!isMissingLayoutTableError(upsertErr)) {
        throw new Error(upsertErr.message);
      }
    } else if (!isMissingLayoutTableError(existing.error)) {
      throw new Error(existing.error.message);
    }
  } catch (err: any) {
    if (!isMissingLayoutTableError(err)) {
      throw err;
    }
  }

  await writeKnowledgeJson(KNOWLEDGE_DRAFT_KEY, params.draft);
  if (params.markPublished) {
    await writeKnowledgeJson(KNOWLEDGE_PUBLISHED_KEY, params.published);
  }
  return { updatedAt: nowIso, publishedAt: params.markPublished ? nowIso : null, storageMode: 'knowledge' };
}

export const getPublishedLayoutFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SiteLayoutConfig> => {
    try {
      const state = await readLayoutStorage();
      return state.published;
    } catch (err) {
      console.error('[getPublishedLayoutFn] fallback to default:', err);
      return mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT);
    }
  }
);

export const getAdminLayoutFn = createServerFn({ method: 'POST' })
  .validator((data: { pin?: string }) => data)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data?.pin);
      return await readLayoutStorage();
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });

export const saveLayoutDraftFn = createServerFn({ method: 'POST' })
  .validator((data: { pin?: string; draft: SiteLayoutConfig }) => data)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data?.pin);
      if (!data?.draft || typeof data.draft !== 'object') {
        throw new UserFacingError('Invalid layout configuration payload.', 'validation');
      }
      const cleanDraft = await validateAndNormalizeLayout(data.draft);
      const current = await readLayoutStorage();
      const meta = await persistLayoutStorage({
        draft: cleanDraft,
        published: current.published,
        markPublished: false,
      });
      return {
        draft: cleanDraft,
        published: current.published,
        ...meta,
      };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });

export const publishLayoutFn = createServerFn({ method: 'POST' })
  .validator((data: { pin?: string; draft?: SiteLayoutConfig }) => data)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data?.pin);
      const current = await readLayoutStorage();
      const toPublish = data?.draft
        ? await validateAndNormalizeLayout(data.draft)
        : current.draft;
      const meta = await persistLayoutStorage({
        draft: toPublish,
        published: toPublish,
        markPublished: true,
      });
      return {
        draft: toPublish,
        published: toPublish,
        ...meta,
      };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });

export const resetLayoutPageDefaultFn = createServerFn({ method: 'POST' })
  .validator((data: { pin?: string; pageKey: LayoutPageKey | 'all'; publishImmediately?: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data?.pin);
      const current = await readLayoutStorage();
      const validKeys = Object.keys(DEFAULT_SITE_LAYOUT) as LayoutPageKey[];

      let nextDraft: SiteLayoutConfig;
      if (data.pageKey === 'all') {
        nextDraft = mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT);
      } else if (validKeys.includes(data.pageKey)) {
        nextDraft = mergeWithLayoutDefaults({
          ...current.draft,
          [data.pageKey]: structuredClone(DEFAULT_SITE_LAYOUT[data.pageKey]),
        });
      } else {
        throw new UserFacingError('Unknown layout page key.', 'validation');
      }

      const publishNow = Boolean(data.publishImmediately);
      const nextPublished = publishNow ? nextDraft : current.published;
      const meta = await persistLayoutStorage({
        draft: nextDraft,
        published: nextPublished,
        markPublished: publishNow,
      });
      return {
        draft: nextDraft,
        published: nextPublished,
        ...meta,
      };
    } catch (err: any) {
      throw new Error(toSafeError(err));
    }
  });
