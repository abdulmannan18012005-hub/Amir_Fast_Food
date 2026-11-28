import { friendlyMessage } from '../../lib/errors';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutTemplate,
  Save,
  Globe,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { AdminImagePicker } from '../../components/admin/AdminImagePicker';
import { adminCall } from '../../lib/adminSession';
import { getAdminMenuDataFn } from '../../server/menu';
import {
  getAdminLayoutFn,
  saveLayoutDraftFn,
  publishLayoutFn,
  resetLayoutPageDefaultFn,
} from '../../server/layoutApi';
import {
  DEFAULT_SITE_LAYOUT,
  mergeWithLayoutDefaults,
  type HomeSectionId,
  type LayoutContentSection,
  type LayoutPageKey,
  type SiteLayoutConfig,
} from '../../lib/layoutContent';
import type { Category } from '../../types';

export const Route = createFileRoute('/admin/layout')({
  head: () =>
    Object.assign(
      seo({
        title: 'Layout Manager - Amir Fast Food',
        description: 'Manage storefront page content, sections, images, and SEO metadata.',
        path: '/admin/layout',
        noindex: true,
      }),
      { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] }
    ),
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  return (
    <PinGate>
      <AdminProvider>
        <AdminNav />
        <AdminLayoutManager />
      </AdminProvider>
    </PinGate>
  );
}

const PAGE_TABS: Array<{ key: LayoutPageKey; label: string; description: string; previewPath?: string }> = [
  { key: 'home', label: 'Home Page', description: 'Hero copy, hero image, section order & CTAs', previewPath: '/' },
  { key: 'menu', label: 'Menu Page', description: 'Heading, subheading, empty state & SEO', previewPath: '/menu' },
  { key: 'highlights', label: 'Highlights & Subtitles', description: 'Category card subtitles & promo banner', previewPath: '/' },
  { key: 'locations', label: 'Locations Page', description: 'Branch card copy, labels & map toggle', previewPath: '/locations' },
  { key: 'cart', label: 'Cart & AmirBot Page', description: 'Hub copy for /cart and /chat links', previewPath: '/cart' },
  { key: 'terms', label: 'Terms of Service', description: 'Policy header & numbered clauses', previewPath: '/terms' },
  { key: 'privacy', label: 'Privacy Policy', description: 'Privacy header & structured clauses', previewPath: '/privacy' },
  { key: 'site', label: 'Header & Footer', description: 'Footer brand tagline, headings & copyright', previewPath: '/' },
];

const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: 'Hero Banner',
  categories: 'Categories Grid',
  highlights: 'Signature Highlights',
  cta: 'Bottom Call-To-Action',
};

function AdminLayoutManager() {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<LayoutPageKey>('home');
  const [draft, setDraft] = useState<SiteLayoutConfig>(() => mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT));
  const [savedDraft, setSavedDraft] = useState<SiteLayoutConfig>(() => mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT));
  const [published, setPublished] = useState<SiteLayoutConfig>(() => mergeWithLayoutDefaults(DEFAULT_SITE_LAYOUT));
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const hasUnsavedEdits = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft]
  );

  const hasUnpublishedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(published),
    [draft, published]
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 5000);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [layoutRes, menuRes] = await Promise.all([
          adminCall(getAdminLayoutFn),
          adminCall(getAdminMenuDataFn).catch(() => null),
        ]);
        if (!active) return;
        const cleanDraft = mergeWithLayoutDefaults(layoutRes.draft);
        const cleanPub = mergeWithLayoutDefaults(layoutRes.published);
        setDraft(cleanDraft);
        setSavedDraft(cleanDraft);
        setPublished(cleanPub);
        setUpdatedAt(layoutRes.updatedAt || null);
        setPublishedAt(layoutRes.publishedAt || null);
        if (menuRes?.categories) {
          setCategories(menuRes.categories);
        }
      } catch (err) {
        if (active) showToast('error', friendlyMessage(err, 'Failed to load layout configuration.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSection = <K extends LayoutPageKey>(key: K, patch: Partial<SiteLayoutConfig[K]>) => {
    setDraft(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (busy || imgBusy) return;
    try {
      setBusy(true);
      const res = await adminCall(saveLayoutDraftFn, { draft });
      const nextDraft = mergeWithLayoutDefaults(res.draft);
      const nextPub = mergeWithLayoutDefaults(res.published);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setPublished(nextPub);
      setUpdatedAt(res.updatedAt || null);
      showToast('success', 'Draft saved. Changes are private until you click Publish Live.');
    } catch (err) {
      showToast('error', friendlyMessage(err, 'Failed to save draft.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (busy || imgBusy) return;
    try {
      setBusy(true);
      const res = await adminCall(publishLayoutFn, { draft });
      const nextDraft = mergeWithLayoutDefaults(res.draft);
      const nextPub = mergeWithLayoutDefaults(res.published);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setPublished(nextPub);
      setUpdatedAt(res.updatedAt || null);
      setPublishedAt(res.publishedAt || null);
      showToast('success', 'Layout published live to the public storefront.');
    } catch (err) {
      showToast('error', friendlyMessage(err, 'Failed to publish layout.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPageDefaults = async () => {
    if (busy || imgBusy) return;
    const activeInfo = PAGE_TABS.find(t => t.key === activeTab);
    if (!window.confirm(`Restore default copy & settings for "${activeInfo?.label || activeTab}" in draft? You can still review before publishing.`)) {
      return;
    }
    try {
      setBusy(true);
      const res = await adminCall(resetLayoutPageDefaultFn, { pageKey: activeTab, publishImmediately: false });
      const nextDraft = mergeWithLayoutDefaults(res.draft);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      showToast('success', `${activeInfo?.label || activeTab} draft restored to defaults.`);
    } catch (err) {
      showToast('error', friendlyMessage(err, 'Failed to restore defaults.'));
    } finally {
      setBusy(false);
    }
  };

  const moveHomeSection = (index: number, dir: -1 | 1) => {
    const order = [...draft.home.sectionOrder];
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    updateSection('home', { sectionOrder: order });
  };

  const cardBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputCls = isDark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:border-primary'
    : 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:border-primary';
  const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${
    isDark ? 'text-slate-400' : 'text-slate-600'
  }`;

  const activeMeta = PAGE_TABS.find(t => t.key === activeTab);

  return (
    <div className={`min-h-screen pb-16 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Header */}
        <div className={`rounded-2xl border p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${cardBg}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <LayoutTemplate className="text-primary" size={22} />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Layout & Content Manager</h1>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Customize storefront copy, section visibility, order, hero artwork, and SEO metadata without redeploying.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-bold">
              {hasUnsavedEdits ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Unsaved local edits
                </span>
              ) : hasUnpublishedChanges ? (
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Draft differs from Live
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  Live matches Draft
                </span>
              )}
              {publishedAt && (
                <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                  Last published: {new Date(publishedAt).toLocaleString()}
                </span>
              )}
              {updatedAt && (
                <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                  Last saved: {new Date(updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeMeta?.previewPath && (
              <a
                href={activeMeta.previewPath}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <ExternalLink size={14} /> View Live Page
              </a>
            )}
            <button
              type="button"
              onClick={handleResetPageDefaults}
              disabled={busy || loading || imgBusy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RotateCcw size={14} /> Restore Defaults
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={busy || loading || imgBusy}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-50 ${
                isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-slate-900 border-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={busy || loading || imgBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish Live
            </button>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.text}</span>
          </div>
        )}

        {loading ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <Loader2 className="animate-spin mx-auto mb-3 text-primary" size={28} />
            <p className="text-sm font-bold">Loading storefront layout configuration...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Page Switcher */}
            <aside className={`lg:col-span-3 rounded-2xl border p-2.5 flex lg:flex-col gap-1.5 overflow-x-auto ${cardBg}`}>
              {PAGE_TABS.map(tab => {
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 text-left px-3.5 py-2.5 rounded-xl transition-colors border ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : isDark
                          ? 'border-transparent hover:bg-slate-800/80 text-slate-300'
                          : 'border-transparent hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-sm font-bold leading-tight">{tab.label}</div>
                    <div className={`text-[11px] mt-0.5 hidden lg:block ${active ? 'opacity-90' : 'opacity-65'}`}>
                      {tab.description}
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Main Editor Panel */}
            <section className={`lg:col-span-9 rounded-2xl border p-5 sm:p-6 space-y-6 ${cardBg}`}>
              {activeTab === 'home' && (
                <>
                  <div>
                    <h2 className="text-lg font-black mb-1">Home Page Section Order & Visibility</h2>
                    <p className="text-xs text-slate-400 mb-3">
                      Reorder or hide major blocks on the landing page.
                    </p>
                    <div className="space-y-2">
                      {draft.home.sectionOrder.map((secId, idx) => {
                        const visibleKey =
                          secId === 'hero'
                            ? 'heroVisible'
                            : secId === 'categories'
                              ? 'categoriesVisible'
                              : secId === 'highlights'
                                ? 'highlightsVisible'
                                : 'ctaVisible';
                        const isVisible = draft.home[visibleKey];
                        return (
                          <div
                            key={secId}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${
                              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold opacity-60 w-5">{idx + 1}.</span>
                              <span className="text-sm font-bold">{HOME_SECTION_LABELS[secId]}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateSection('home', { [visibleKey]: !isVisible })}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                  isVisible
                                    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                    : isDark
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-slate-200 text-slate-600 border-slate-300'
                                }`}
                              >
                                {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                                {isVisible ? 'Visible' : 'Hidden'}
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${HOME_SECTION_LABELS[secId]} up`}
                                onClick={() => moveHomeSection(idx, -1)}
                                disabled={idx === 0}
                                className="p-1.5 rounded-lg border border-slate-700/40 disabled:opacity-30 hover:bg-primary/10"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${HOME_SECTION_LABELS[secId]} down`}
                                onClick={() => moveHomeSection(idx, 1)}
                                disabled={idx === draft.home.sectionOrder.length - 1}
                                className="p-1.5 rounded-lg border border-slate-700/40 disabled:opacity-30 hover:bg-primary/10"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-800/30 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Hero Eyebrow</label>
                      <input
                        className={inputCls}
                        value={draft.home.heroEyebrow}
                        onChange={e => updateSection('home', { heroEyebrow: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Hero Heading</label>
                      <input
                        className={inputCls}
                        value={draft.home.heroHeading}
                        onChange={e => updateSection('home', { heroHeading: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Hero Subheading</label>
                      <textarea
                        rows={2}
                        className={inputCls}
                        value={draft.home.heroSubheading}
                        onChange={e => updateSection('home', { heroSubheading: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Primary CTA Label</label>
                      <input
                        className={inputCls}
                        value={draft.home.primaryCtaLabel}
                        onChange={e => updateSection('home', { primaryCtaLabel: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Primary CTA Link</label>
                      <input
                        className={inputCls}
                        value={draft.home.primaryCtaHref}
                        onChange={e => updateSection('home', { primaryCtaHref: e.target.value })}
                        placeholder="/menu"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Secondary CTA Label</label>
                      <input
                        className={inputCls}
                        value={draft.home.secondaryCtaLabel}
                        onChange={e => updateSection('home', { secondaryCtaLabel: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Secondary CTA Link</label>
                      <input
                        className={inputCls}
                        value={draft.home.secondaryCtaHref}
                        onChange={e => updateSection('home', { secondaryCtaHref: e.target.value })}
                        placeholder="/menu"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Location Badge</label>
                      <input
                        className={inputCls}
                        value={draft.home.locationBadgeText}
                        onChange={e => updateSection('home', { locationBadgeText: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>ETA Badge</label>
                      <input
                        className={inputCls}
                        value={draft.home.etaBadgeText}
                        onChange={e => updateSection('home', { etaBadgeText: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/30 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div>
                      <label className={labelCls}>Hero Banner Image</label>
                      <AdminImagePicker
                        folder="layout"
                        value={draft.home.heroImageUrl}
                        onChange={heroImageUrl => updateSection('home', { heroImageUrl })}
                        onBusyChange={setImgBusy}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Hero Image Alt Text</label>
                      <input
                        className={inputCls}
                        value={draft.home.heroImageAlt}
                        onChange={e => updateSection('home', { heroImageAlt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/30 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Categories Eyebrow</label>
                      <input
                        className={inputCls}
                        value={draft.home.categoriesEyebrow}
                        onChange={e => updateSection('home', { categoriesEyebrow: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Categories Heading</label>
                      <input
                        className={inputCls}
                        value={draft.home.categoriesHeading}
                        onChange={e => updateSection('home', { categoriesHeading: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Highlights Eyebrow</label>
                      <input
                        className={inputCls}
                        value={draft.home.highlightsEyebrow}
                        onChange={e => updateSection('home', { highlightsEyebrow: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Highlights Heading</label>
                      <input
                        className={inputCls}
                        value={draft.home.highlightsHeading}
                        onChange={e => updateSection('home', { highlightsHeading: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CTA Heading</label>
                      <input
                        className={inputCls}
                        value={draft.home.ctaHeading}
                        onChange={e => updateSection('home', { ctaHeading: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CTA Subheading</label>
                      <input
                        className={inputCls}
                        value={draft.home.ctaSubheading}
                        onChange={e => updateSection('home', { ctaSubheading: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CTA Button Label</label>
                      <input
                        className={inputCls}
                        value={draft.home.ctaButtonLabel}
                        onChange={e => updateSection('home', { ctaButtonLabel: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>CTA Button Link</label>
                      <input
                        className={inputCls}
                        value={draft.home.ctaButtonHref}
                        onChange={e => updateSection('home', { ctaButtonHref: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>SEO Title</label>
                      <input
                        className={inputCls}
                        value={draft.home.seoTitle}
                        onChange={e => updateSection('home', { seoTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>SEO Description</label>
                      <input
                        className={inputCls}
                        value={draft.home.seoDescription}
                        onChange={e => updateSection('home', { seoDescription: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'menu' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Menu Heading</label>
                    <input
                      className={inputCls}
                      value={draft.menu.heading}
                      onChange={e => updateSection('menu', { heading: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.menu.showSubheading}
                        onChange={e => updateSection('menu', { showSubheading: e.target.checked })}
                      />
                      Show Subheading
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.menu.showHoursBadge}
                        onChange={e => updateSection('menu', { showHoursBadge: e.target.checked })}
                      />
                      Show Shop Hours Pill
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Menu Subheading</label>
                    <input
                      className={inputCls}
                      value={draft.menu.subheading}
                      onChange={e => updateSection('menu', { subheading: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Empty Search Title</label>
                    <input
                      className={inputCls}
                      value={draft.menu.emptySearchTitle}
                      onChange={e => updateSection('menu', { emptySearchTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Empty Search Subtitle</label>
                    <input
                      className={inputCls}
                      value={draft.menu.emptySearchSubtitle}
                      onChange={e => updateSection('menu', { emptySearchSubtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SEO Title</label>
                    <input
                      className={inputCls}
                      value={draft.menu.seoTitle}
                      onChange={e => updateSection('menu', { seoTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SEO Description</label>
                    <input
                      className={inputCls}
                      value={draft.menu.seoDescription}
                      onChange={e => updateSection('menu', { seoDescription: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'highlights' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Default Category Subtitle</label>
                      <input
                        className={inputCls}
                        value={draft.highlights.fallbackSubtitle}
                        onChange={e => updateSection('highlights', { fallbackSubtitle: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.highlights.promoBannerEnabled}
                          onChange={e => updateSection('highlights', { promoBannerEnabled: e.target.checked })}
                        />
                        Show Top Promo Strip on Home
                      </label>
                    </div>
                    <div>
                      <label className={labelCls}>Promo Banner Text</label>
                      <input
                        className={inputCls}
                        value={draft.highlights.promoBannerText}
                        onChange={e => updateSection('highlights', { promoBannerText: e.target.value })}
                        placeholder="e.g. Free delivery on orders within 5 km!"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Promo Banner Link</label>
                      <input
                        className={inputCls}
                        value={draft.highlights.promoBannerHref}
                        onChange={e => updateSection('highlights', { promoBannerHref: e.target.value })}
                        placeholder="/menu"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/30 pt-4">
                    <h3 className="text-sm font-black uppercase tracking-wider mb-3">Category Card Subtitles (Home Page)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(categories.length > 0
                        ? categories.map(c => ({ id: c.id, name: c.name }))
                        : Object.keys(draft.highlights.categorySubtitles).map(id => ({ id, name: id }))
                      ).map(cat => (
                        <div key={cat.id}>
                          <label className={labelCls}>{cat.name}</label>
                          <input
                            className={inputCls}
                            value={draft.highlights.categorySubtitles[cat.id] ?? ''}
                            placeholder={draft.highlights.fallbackSubtitle}
                            onChange={e =>
                              updateSection('highlights', {
                                categorySubtitles: {
                                  ...draft.highlights.categorySubtitles,
                                  [cat.id]: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'locations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Heading</label>
                    <input
                      className={inputCls}
                      value={draft.locations.heading}
                      onChange={e => updateSection('locations', { heading: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Subheading</label>
                    <input
                      className={inputCls}
                      value={draft.locations.subheading}
                      onChange={e => updateSection('locations', { subheading: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Branch Card Title</label>
                    <input
                      className={inputCls}
                      value={draft.locations.cardTitle}
                      onChange={e => updateSection('locations', { cardTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Delivery Subtitle</label>
                    <input
                      className={inputCls}
                      value={draft.locations.deliverySubtitle}
                      onChange={e => updateSection('locations', { deliverySubtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Address Label</label>
                    <input
                      className={inputCls}
                      value={draft.locations.addressLabel}
                      onChange={e => updateSection('locations', { addressLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hours Label</label>
                    <input
                      className={inputCls}
                      value={draft.locations.hoursLabel}
                      onChange={e => updateSection('locations', { hoursLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone Label</label>
                    <input
                      className={inputCls}
                      value={draft.locations.phoneLabel}
                      onChange={e => updateSection('locations', { phoneLabel: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.locations.showMap}
                        onChange={e => updateSection('locations', { showMap: e.target.checked })}
                      />
                      Show Interactive Map Embed
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Primary CTA Label</label>
                    <input
                      className={inputCls}
                      value={draft.locations.primaryCtaLabel}
                      onChange={e => updateSection('locations', { primaryCtaLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Primary CTA Link</label>
                    <input
                      className={inputCls}
                      value={draft.locations.primaryCtaHref}
                      onChange={e => updateSection('locations', { primaryCtaHref: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Directions Button Label</label>
                    <input
                      className={inputCls}
                      value={draft.locations.directionsLabel}
                      onChange={e => updateSection('locations', { directionsLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SEO Title</label>
                    <input
                      className={inputCls}
                      value={draft.locations.seoTitle}
                      onChange={e => updateSection('locations', { seoTitle: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>SEO Description</label>
                    <input
                      className={inputCls}
                      value={draft.locations.seoDescription}
                      onChange={e => updateSection('locations', { seoDescription: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'cart' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Cart Page Heading</label>
                    <input
                      className={inputCls}
                      value={draft.cart.cartHeading}
                      onChange={e => updateSection('cart', { cartHeading: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cart Page Button Label</label>
                    <input
                      className={inputCls}
                      value={draft.cart.cartButtonLabel}
                      onChange={e => updateSection('cart', { cartButtonLabel: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Cart Page Description</label>
                    <input
                      className={inputCls}
                      value={draft.cart.cartDescription}
                      onChange={e => updateSection('cart', { cartDescription: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>AmirBot Page Heading</label>
                    <input
                      className={inputCls}
                      value={draft.cart.chatHeading}
                      onChange={e => updateSection('cart', { chatHeading: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>AmirBot Page Button Label</label>
                    <input
                      className={inputCls}
                      value={draft.cart.chatButtonLabel}
                      onChange={e => updateSection('cart', { chatButtonLabel: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>AmirBot Page Subheading</label>
                    <input
                      className={inputCls}
                      value={draft.cart.chatSubheading}
                      onChange={e => updateSection('cart', { chatSubheading: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {(activeTab === 'terms' || activeTab === 'privacy') && (
                <LegalSectionsEditor
                  pageKey={activeTab}
                  value={draft[activeTab]}
                  isDark={isDark}
                  inputCls={inputCls}
                  labelCls={labelCls}
                  onChange={nextVal => updateSection(activeTab, nextVal)}
                />
              )}

              {activeTab === 'site' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Footer Brand Tagline</label>
                    <input
                      className={inputCls}
                      value={draft.site.brandTagline}
                      onChange={e => updateSection('site', { brandTagline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Footer Links Column Title</label>
                    <input
                      className={inputCls}
                      value={draft.site.footerLinksTitle}
                      onChange={e => updateSection('site', { footerLinksTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Footer Social Column Title</label>
                    <input
                      className={inputCls}
                      value={draft.site.footerSocialTitle}
                      onChange={e => updateSection('site', { footerSocialTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Footer Contact Column Title</label>
                    <input
                      className={inputCls}
                      value={draft.site.footerContactTitle}
                      onChange={e => updateSection('site', { footerContactTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Facebook URL</label>
                    <input
                      className={inputCls}
                      value={draft.site.facebookUrl}
                      onChange={e => updateSection('site', { facebookUrl: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Copyright Line</label>
                    <input
                      className={inputCls}
                      value={draft.site.copyrightText}
                      onChange={e => updateSection('site', { copyrightText: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function LegalSectionsEditor({
  pageKey,
  value,
  isDark,
  inputCls,
  labelCls,
  onChange,
}: {
  pageKey: 'terms' | 'privacy';
  value: SiteLayoutConfig['terms'];
  isDark: boolean;
  inputCls: string;
  labelCls: string;
  onChange: (patch: Partial<SiteLayoutConfig['terms']>) => void;
}) {
  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = [...value.sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ sections: next });
  };

  const updateOne = (idx: number, patch: Partial<LayoutContentSection>) => {
    const next = value.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ sections: next });
  };

  const addSection = () => {
    const id = `${pageKey}_${Date.now().toString(36)}`;
    onChange({
      sections: [
        ...value.sections,
        { id, title: `${value.sections.length + 1}. New Section`, body: '', visible: true },
      ],
    });
  };

  const removeSection = (idx: number) => {
    if (value.sections.length <= 1) return;
    onChange({ sections: value.sections.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Page Title</label>
          <input className={inputCls} value={value.title} onChange={e => onChange({ title: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Last Updated Subtitle</label>
          <input
            className={inputCls}
            value={value.lastUpdated}
            onChange={e => onChange({ lastUpdated: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>SEO Title</label>
          <input className={inputCls} value={value.seoTitle} onChange={e => onChange({ seoTitle: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>SEO Description</label>
          <input
            className={inputCls}
            value={value.seoDescription}
            onChange={e => onChange({ seoDescription: e.target.value })}
          />
        </div>
      </div>

      <div className="border-t border-slate-800/30 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-wider">Page Clauses & Sections</h3>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
          >
            <Plus size={14} /> Add Section
          </button>
        </div>

        <div className="space-y-4">
          {value.sections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`rounded-xl border p-4 space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono opacity-60">Section #{idx + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateOne(idx, { visible: !sec.visible })}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      sec.visible
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : isDark
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {sec.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    {sec.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-700/40 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, 1)}
                    disabled={idx === value.sections.length - 1}
                    className="p-1.5 rounded-lg border border-slate-700/40 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    disabled={value.sections.length <= 1}
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <input
                className={inputCls}
                value={sec.title}
                onChange={e => updateOne(idx, { title: e.target.value })}
                placeholder="Section title"
              />
              <textarea
                rows={4}
                className={inputCls}
                value={sec.body}
                onChange={e => updateOne(idx, { body: e.target.value })}
                placeholder="Section body paragraphs (use blank lines or newlines between points)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
