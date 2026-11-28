import { friendlyMessage } from '../../lib/errors';
import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useEffect, useState } from 'react';
import {
  getAdminMenuDataFn,
  createMenuItemFn,
  updateMenuItemFn,
  deleteMenuItemFn,
  reorderMenuItemsFn,
  createCategoryFn,
  updateCategoryFn,
  reorderCategoriesFn,
  reassignCategoryItemsFn,
  deleteCategoryFn,
  createHighlightFn,
  updateHighlightFn,
  reorderHighlightsFn,
  deleteHighlightFn,
} from '../../server/menu';
import {
  ChefHat, Pencil, Trash2, Plus, X, Check, Image as ImageIcon,
  AlertTriangle, Search, Sparkles, ArrowRight, ArrowUp, ArrowDown, Loader2, Tag
} from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminProvider, useAdminContext } from '../../components/admin/AdminContext';
import { AdminImagePicker } from '../../components/admin/AdminImagePicker';
import { adminCall } from '../../lib/adminSession';
import { getValidCompareAtPrice, getSavingsPercent } from '../../lib/cart';
import type { Category, HighlightItem, ItemVariant, MenuItem } from '../../types';

export const Route = createFileRoute('/admin/menu')({
  head: () => Object.assign(
    seo({ title: 'Admin Menu & Catalog - Amir Fast Food', description: 'Admin Menu, Categories & Highlights Manager', path: '/admin/menu', noindex: true }),
    { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] }
  ),
  component: AdminMenuRoute,
});

function AdminMenuRoute() {
  return (
    <PinGate>
      <AdminProvider>
        <AdminNav />
        <AdminMenuEditor />
      </AdminProvider>
    </PinGate>
  );
}

type ItemFormState = {
  id?: string;
  name: string;
  description: string;
  category_id: string;
  sub_category: string;
  price: string;
  original_price: string;
  sort_order: string;
  image_url: string;
  original_image_url?: string;
  is_available: boolean;
  variants: ItemVariant[];
};

type CategoryFormState = {
  id?: string;
  name: string;
  slug: string;
  sort_order: string;
  image_url: string;
  original_image_url?: string;
};

type HighlightFormState = {
  id?: string;
  title: string;
  description: string;
  offer_badge: string;
  image_url: string;
  original_image_url?: string;
  is_available: boolean;
  sort_order: string;
};

function AdminMenuEditor() {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'highlights'>('items');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeAdminCategory, setActiveAdminCategory] = useState<string>('all');
  const [itemSearch, setItemSearch] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Shared modal states
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Menu Item Add / Edit Modal
  const [itemModal, setItemModal] = useState<{ mode: 'add' | 'edit'; step: 'form' | 'review'; form: ItemFormState } | null>(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('0');

  // Category Add / Edit Modal
  const [catModal, setCatModal] = useState<{ mode: 'add' | 'edit'; step: 'form' | 'review'; form: CategoryFormState } | null>(null);

  // Highlight Add / Edit Modal
  const [hlModal, setHlModal] = useState<{ mode: 'add' | 'edit'; step: 'form' | 'review'; form: HighlightFormState } | null>(null);

  // Delete Modals
  const [deleteItemTarget, setDeleteItemTarget] = useState<MenuItem | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [reassignTargetCatId, setReassignTargetCatId] = useState<string>('');
  const [reassignBusy, setReassignBusy] = useState(false);
  const [reassignDoneMsg, setReassignDoneMsg] = useState('');
  const [deleteHlTarget, setDeleteHlTarget] = useState<HighlightItem | null>(null);

  const loadAll = async () => {
    if (items.length === 0 && categories.length === 0) {
      setLoading(true);
    }
    setLoadError('');
    try {
      const data = await adminCall(getAdminMenuDataFn, {});
      setItems(data.items || []);
      setCategories(data.categories || []);
      setHighlights(data.highlights || []);
    } catch (e: any) {
      setLoadError(friendlyMessage(e, 'Failed to load admin menu data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const categoryNameMap = new Map(categories.map(c => [c.id, c.name]));

  // ---------------- ITEM HANDLERS ----------------
  const openAddItem = () => {
    setModalError('');
    setImageError(false);
    setNewVariantName('');
    setNewVariantPrice('0');
    setItemModal({
      mode: 'add',
      step: 'form',
      form: {
        name: '',
        description: '',
        category_id: activeAdminCategory !== 'all' ? activeAdminCategory : (categories[0]?.id || ''),
        sub_category: 'General',
        price: '',
        original_price: '',
        sort_order: String(items.length + 1),
        image_url: '',
        is_available: true,
        variants: [],
      },
    });
  };

  const openEditItem = (item: MenuItem) => {
    setModalError('');
    setImageError(false);
    setNewVariantName('');
    setNewVariantPrice('0');
    setItemModal({
      mode: 'edit',
      step: 'form',
      form: {
        id: item.id,
        name: item.name,
        description: item.description || '',
        category_id: item.category_id,
        sub_category: item.sub_category || 'General',
        price: String(item.price),
        original_price: item.original_price && item.original_price > item.price ? String(item.original_price) : '',
        sort_order: String(item.sort_order && item.sort_order > 0 ? item.sort_order : ''),
        image_url: item.image_url || '',
        original_image_url: item.image_url || '',
        is_available: item.is_available,
        variants: Array.isArray(item.variants) ? [...item.variants] : [],
      },
    });
  };

  const validateItemForm = (form: ItemFormState): string | null => {
    if (form.name.trim().length < 2) return 'Product name must be at least 2 characters.';
    if (!form.category_id) return 'Please select a category.';
    const p = Number(form.price);
    if (!form.price || !Number.isFinite(p) || !Number.isInteger(p) || p < 0 || p > 500000) {
      return 'Please enter a valid whole non-negative selling price.';
    }
    const compRaw = form.original_price.trim();
    if (compRaw !== '') {
      const comp = Number(compRaw);
      if (!Number.isFinite(comp) || !Number.isInteger(comp) || comp <= 0 || comp > 500000) {
        return 'Compare-at price must be a valid whole number between 1 and 500,000.';
      }
      if (comp <= p) {
        return `Compare-at price (PKR ${comp}) must be higher than selling price (PKR ${p}), or leave it blank.`;
      }
    }
    if (form.sort_order.trim() !== '') {
      const so = Number(form.sort_order);
      if (!Number.isFinite(so) || !Number.isInteger(so) || so < 1 || so > 99999) {
        return 'Sort order must be a positive whole number.';
      }
    }
    if (!form.image_url.trim()) return 'Please upload an image or verify an HTTPS image URL.';
    if (imageError) return 'Please fix or verify the image before continuing.';
    return null;
  };

  const handleSaveItemConfirm = async () => {
    if (!itemModal || submitting || imageBusy) return;
    const err = validateItemForm(itemModal.form);
    if (err) { setModalError(err); return; }

    setSubmitting(true);
    setModalError('');
    try {
      const f = itemModal.form;
      const compareAtVal = f.original_price.trim() === '' ? null : Number(f.original_price.trim());
      const sortOrderVal = f.sort_order.trim() === '' ? undefined : Number(f.sort_order.trim());
      if (itemModal.mode === 'add') {
        const res = await adminCall(createMenuItemFn, {
          name: f.name.trim(),
          description: f.description.trim(),
          category_id: f.category_id,
          sub_category: f.sub_category.trim() || 'General',
          price: Number(f.price),
          original_price: compareAtVal,
          sort_order: sortOrderVal,
          image_url: f.image_url.trim(),
          is_available: f.is_available,
          variants: f.variants,
        });
        if (res?.item) {
          showToast(`Added "${res.item.name}" to ${categoryNameMap.get(res.item.category_id) || 'menu'}.`);
        }
      } else if (f.id) {
        const res = await adminCall(updateMenuItemFn, {
          id: f.id,
          name: f.name.trim(),
          description: f.description.trim(),
          category_id: f.category_id,
          sub_category: f.sub_category.trim() || 'General',
          price: Number(f.price),
          original_price: compareAtVal,
          sort_order: sortOrderVal,
          image_url: f.image_url.trim(),
          is_available: f.is_available,
          variants: f.variants,
        });
        if (res?.item) {
          showToast(`Updated "${res.item.name}" successfully.`);
        }
      }
      setItemModal(null);
      await loadAll();
    } catch (e: any) {
      setModalError(friendlyMessage(e, 'Failed to save menu item.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget || submitting) return;
    setSubmitting(true);
    try {
      const res = await adminCall(deleteMenuItemFn, { id: deleteItemTarget.id });
      showToast(res?.message || `Removed "${deleteItemTarget.name}".`);
      setDeleteItemTarget(null);
      await loadAll();
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to delete menu item.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- CATEGORY HANDLERS ----------------
  const openAddCategory = () => {
    setModalError('');
    setImageError(false);
    setCatModal({
      mode: 'add',
      step: 'form',
      form: {
        name: '',
        slug: '',
        sort_order: String(categories.length + 1),
        image_url: '',
      },
    });
  };

  const openEditCategory = (cat: Category) => {
    setModalError('');
    setImageError(false);
    setCatModal({
      mode: 'edit',
      step: 'form',
      form: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        sort_order: String(cat.sort_order),
        image_url: cat.image_url || '',
        original_image_url: cat.image_url || '',
      },
    });
  };

  const validateCategoryForm = (form: CategoryFormState): string | null => {
    if (form.name.trim().length < 2) return 'Category name must be at least 2 characters.';
    if (!form.image_url.trim()) return 'Please upload an image or verify an HTTPS image URL.';
    if (imageError) return 'Please fix or verify the image before continuing.';
    return null;
  };

  const handleSaveCategoryConfirm = async () => {
    if (!catModal || submitting || imageBusy) return;
    const err = validateCategoryForm(catModal.form);
    if (err) { setModalError(err); return; }

    setSubmitting(true);
    setModalError('');
    try {
      const f = catModal.form;
      if (catModal.mode === 'add') {
        const res = await adminCall(createCategoryFn, {
          name: f.name.trim(),
          slug: f.slug.trim() || undefined,
          sort_order: Number(f.sort_order) || undefined,
          image_url: f.image_url.trim(),
        });
        if (res?.category) showToast(`Category "${res.category.name}" created.`);
      } else if (f.id) {
        const res = await adminCall(updateCategoryFn, {
          id: f.id,
          name: f.name.trim(),
          slug: f.slug.trim() || undefined,
          sort_order: Number(f.sort_order) || undefined,
          image_url: f.image_url.trim(),
        });
        if (res?.category) showToast(`Category "${res.category.name}" updated.`);
      }
      setCatModal(null);
      await loadAll();
    } catch (e: any) {
      setModalError(friendlyMessage(e, 'Failed to save category.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteCategory = (cat: Category) => {
    setModalError('');
    setReassignDoneMsg('');
    const others = categories.filter(c => c.id !== cat.id);
    setReassignTargetCatId(others[0]?.id || '');
    setDeleteCatTarget(cat);
  };

  const handleReassignProducts = async () => {
    if (!deleteCatTarget || !reassignTargetCatId || reassignBusy) return;
    setReassignBusy(true);
    setModalError('');
    try {
      const res = await adminCall(reassignCategoryItemsFn, {
        fromCategoryId: deleteCatTarget.id,
        toCategoryId: reassignTargetCatId,
      });
      await loadAll();
      setReassignDoneMsg(`Reassigned ${res.movedCount} product(s) to ${res.toCategoryName}. 0 products remain — you may now delete "${deleteCatTarget.name}".`);
      showToast(`Reassigned ${res.movedCount} product(s) successfully.`);
    } catch (e: any) {
      setModalError(friendlyMessage(e, 'Reassignment failed.'));
    } finally {
      setReassignBusy(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deleteCatTarget || submitting) return;
    setSubmitting(true);
    setModalError('');
    try {
      await adminCall(deleteCategoryFn, { id: deleteCatTarget.id });
      showToast(`Deleted category "${deleteCatTarget.name}".`);
      if (activeAdminCategory === deleteCatTarget.id) setActiveAdminCategory('all');
      setDeleteCatTarget(null);
      await loadAll();
    } catch (e: any) {
      setModalError(friendlyMessage(e, 'Could not delete category.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- HIGHLIGHT HANDLERS ----------------
  const openAddHighlight = () => {
    setModalError('');
    setImageError(false);
    setHlModal({
      mode: 'add',
      step: 'form',
      form: {
        title: '',
        description: '',
        offer_badge: '',
        image_url: '',
        is_available: true,
        sort_order: String(highlights.length + 1),
      },
    });
  };

  const openEditHighlight = (hl: HighlightItem) => {
    setModalError('');
    setImageError(false);
    setHlModal({
      mode: 'edit',
      step: 'form',
      form: {
        id: hl.id,
        title: hl.title,
        description: hl.description,
        offer_badge: hl.offer_badge || '',
        image_url: hl.image_url || '',
        original_image_url: hl.image_url || '',
        is_available: hl.is_available !== false,
        sort_order: String(hl.sort_order || 1),
      },
    });
  };

  const validateHighlightForm = (form: HighlightFormState): string | null => {
    if (form.title.trim().length < 2) return 'Highlight title must be at least 2 characters.';
    if (form.description.trim().length < 2) return 'Highlight description is required.';
    if (!form.image_url.trim()) return 'Please upload an image or verify an HTTPS image URL.';
    if (imageError) return 'Please fix or verify the image before continuing.';
    return null;
  };

  const handleSaveHighlightConfirm = async () => {
    if (!hlModal || submitting || imageBusy) return;
    const err = validateHighlightForm(hlModal.form);
    if (err) { setModalError(err); return; }

    setSubmitting(true);
    setModalError('');
    try {
      const f = hlModal.form;
      if (hlModal.mode === 'add') {
        const res = await adminCall(createHighlightFn, {
          title: f.title.trim(),
          description: f.description.trim(),
          offer_badge: f.offer_badge.trim() || undefined,
          image_url: f.image_url.trim(),
          is_available: f.is_available,
          sort_order: Number(f.sort_order) || undefined,
        });
        if (res?.highlight) showToast(`Highlight "${res.highlight.title}" created.`);
      } else if (f.id) {
        const res = await adminCall(updateHighlightFn, {
          id: f.id,
          title: f.title.trim(),
          description: f.description.trim(),
          offer_badge: f.offer_badge.trim() || undefined,
          image_url: f.image_url.trim(),
          is_available: f.is_available,
          sort_order: Number(f.sort_order) || undefined,
        });
        if (res?.highlight) showToast(`Highlight "${res.highlight.title}" updated.`);
      }
      setHlModal(null);
      await loadAll();
    } catch (e: any) {
      setModalError(friendlyMessage(e, 'Failed to save highlight.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteHighlight = async () => {
    if (!deleteHlTarget || submitting) return;
    setSubmitting(true);
    try {
      await adminCall(deleteHighlightFn, { id: deleteHlTarget.id });
      showToast(`Deleted highlight "${deleteHlTarget.title}".`);
      setDeleteHlTarget(null);
      await loadAll();
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to delete highlight.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [reordering, setReordering] = useState(false);

  const handleMoveItem = async (itemId: string, dir: -1 | 1) => {
    if (reordering) return;
    const visibleIdx = filteredItems.findIndex(i => i.id === itemId);
    const swapIdx = visibleIdx + dir;
    if (visibleIdx < 0 || swapIdx < 0 || swapIdx >= filteredItems.length) return;
    const targetId = filteredItems[swapIdx].id;
    const globalList = [...items];
    const idxA = globalList.findIndex(i => i.id === itemId);
    const idxB = globalList.findIndex(i => i.id === targetId);
    if (idxA < 0 || idxB < 0) return;
    [globalList[idxA], globalList[idxB]] = [globalList[idxB], globalList[idxA]];

    setReordering(true);
    try {
      await adminCall(reorderMenuItemsFn, { orderedIds: globalList.map(i => i.id) });
      await loadAll();
      showToast('Product order updated.');
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to reorder products.'), 'error');
    } finally {
      setReordering(false);
    }
  };

  const handleMoveCategory = async (catId: string, dir: -1 | 1) => {
    if (reordering) return;
    const idx = categories.findIndex(c => c.id === catId);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= categories.length) return;
    const next = [...categories];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

    setReordering(true);
    try {
      await adminCall(reorderCategoriesFn, { orderedIds: next.map(c => c.id) });
      await loadAll();
      showToast('Category order updated.');
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to reorder categories.'), 'error');
    } finally {
      setReordering(false);
    }
  };

  const handleMoveHighlight = async (hlId: string, dir: -1 | 1) => {
    if (reordering) return;
    const idx = highlights.findIndex(h => h.id === hlId);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= highlights.length) return;
    const next = [...highlights];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

    setReordering(true);
    try {
      await adminCall(reorderHighlightsFn, { orderedIds: next.map(h => h.id) });
      await loadAll();
      showToast('Highlight order updated.');
    } catch (e: any) {
      showToast(friendlyMessage(e, 'Failed to reorder highlights.'), 'error');
    } finally {
      setReordering(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchCat = activeAdminCategory === 'all' || item.category_id === activeAdminCategory;
    const q = itemSearch.trim().toLowerCase();
    const matchQuery = !q || item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const deleteCatItems = deleteCatTarget ? items.filter(i => i.category_id === deleteCatTarget.id) : [];

  const inputClass = `w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
    isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className={`min-h-[100dvh] pb-20 transition-colors ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast */}
      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 z-[90] px-4 py-3 rounded-2xl shadow-xl font-bold text-xs sm:text-sm flex items-center gap-2 animate-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Sub-header & Section Tabs */}
      <header className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center sticky top-0 z-20 border-b transition-colors ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <ChefHat className="text-primary shrink-0" size={26} />
          <div>
            <h1 className={`text-lg sm:text-xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Menu &amp; Showcase Manager</h1>
            <p className="text-xs text-muted-foreground">Manage menu items, categories, and homepage highlights</p>
          </div>
        </div>

        <div className={`flex rounded-xl p-1 w-full sm:w-auto transition-colors ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
          {(['items', 'categories', 'highlights'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition-colors ${
                activeTab === tab
                  ? isDark ? 'bg-slate-800 shadow text-primary' : 'bg-white shadow text-primary'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'items' ? `Items (${items.length})` : tab === 'categories' ? `Categories (${categories.length})` : `Highlights (${highlights.length})`}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {loadError && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold text-sm flex items-center gap-2">
            <AlertTriangle size={18} /> {loadError}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-semibold">Loading catalog...</p>
          </div>
        ) : (
          <>
            {/* ======================= TAB 1: MENU ITEMS ======================= */}
            {activeTab === 'items' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      placeholder="Filter products by name or description..."
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-primary ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openAddItem}
                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-colors"
                  >
                    <Plus size={18} /> Add Item
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAdminCategory('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${
                      activeAdminCategory === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : isDark ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All Items ({items.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveAdminCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${
                        activeAdminCategory === cat.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isDark ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {filteredItems.length === 0 ? (
                  <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="font-bold text-base">No menu items match this filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredItems.map((item, idx) => {
                      const validCompareAt = getValidCompareAtPrice(item.price, item.original_price);
                      const savePct = getSavingsPercent(item.price, validCompareAt);
                      return (
                      <div
                        key={item.id}
                        className={`h-full rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-colors ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className={`aspect-[4/3] w-full relative shrink-0 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-muted-foreground">
                              <ImageIcon size={30} />
                              <span className="text-xs font-medium">No Image</span>
                            </div>
                          )}
                          {validCompareAt && savePct > 0 && (
                            <div className="absolute top-2.5 left-2.5 bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow">
                              Save {savePct}%
                            </div>
                          )}
                          <div className="absolute top-2.5 right-2.5 bg-black/70 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                            #{item.sort_order && item.sort_order > 0 ? item.sort_order : idx + 1}
                          </div>
                          {!item.is_available && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                              <span className="bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black uppercase tracking-wider text-primary truncate">
                                {categoryNameMap.get(item.category_id) || item.category_id.replace('cat_', '')}
                              </p>
                              <h3 className={`font-bold text-base leading-snug line-clamp-2 min-h-[2.75rem] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {item.name}
                              </h3>
                            </div>
                            <div className="text-right shrink-0">
                              {validCompareAt && (
                                <span className="block text-[11px] text-muted-foreground line-through leading-none mb-0.5 whitespace-nowrap">
                                  PKR {validCompareAt.toLocaleString()}
                                </span>
                              )}
                              <span className={`font-black text-sm px-2.5 py-1 rounded-lg whitespace-nowrap inline-block ${
                                isDark ? 'text-white bg-slate-700' : 'text-slate-900 bg-slate-100'
                              }`}>
                                PKR {item.price}
                              </span>
                            </div>
                          </div>

                          <p className={`text-xs line-clamp-2 min-h-[2rem] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.description || 'No description provided.'}
                          </p>

                          <div className="mb-3 min-h-[1.5rem] flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                              item.variants && item.variants.length > 0
                                ? 'bg-primary/10 text-primary'
                                : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.variants && item.variants.length > 0 ? `${item.variants.length} option(s)` : 'Standard'}
                            </span>
                            {item.sub_category && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                {item.sub_category}
                              </span>
                            )}
                          </div>

                          <div className={`mt-auto pt-3 border-t flex gap-1.5 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button
                              type="button"
                              disabled={reordering || idx === 0}
                              onClick={() => handleMoveItem(item.id, -1)}
                              aria-label={`Move ${item.name} up`}
                              title="Move earlier"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={reordering || idx === filteredItems.length - 1}
                              onClick={() => handleMoveItem(item.id, 1)}
                              aria-label={`Move ${item.name} down`}
                              title="Move later"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                                isDark
                                  ? 'border-slate-700 text-slate-200 hover:border-primary hover:text-primary'
                                  : 'border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                              }`}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteItemTarget(item)}
                              aria-label={`Delete ${item.name}`}
                              title={`Delete ${item.name}`}
                              className="py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB 2: CATEGORIES ======================= */}
            {activeTab === 'categories' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Menu Categories</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Add, rename, update cover images, or safely reassign and delete categories.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddCategory}
                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-colors self-start sm:self-auto"
                  >
                    <Plus size={18} /> Add Item
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categories.map((cat, idx) => {
                    const prodCount = items.filter(i => i.category_id === cat.id).length;
                    return (
                      <div
                        key={cat.id}
                        className={`h-full rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-colors ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className={`aspect-[4/3] w-full relative shrink-0 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          <img
                            src={cat.image_url || '/placeholder.webp'}
                            alt={cat.name}
                            onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 right-2.5 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                            {prodCount} product{prodCount === 1 ? '' : 's'}
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className={`font-bold text-base line-clamp-1 min-h-[1.75rem] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {cat.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono mb-4 truncate">
                            slug: {cat.slug} · order: {cat.sort_order}
                          </p>

                          <div className={`mt-auto pt-3 border-t flex gap-1.5 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button
                              type="button"
                              disabled={reordering || idx === 0}
                              onClick={() => handleMoveCategory(cat.id, -1)}
                              aria-label={`Move category ${cat.name} up`}
                              title="Move earlier"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={reordering || idx === categories.length - 1}
                              onClick={() => handleMoveCategory(cat.id, 1)}
                              aria-label={`Move category ${cat.name} down`}
                              title="Move later"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCategory(cat)}
                              className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                                isDark
                                  ? 'border-slate-700 text-slate-200 hover:border-primary hover:text-primary'
                                  : 'border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                              }`}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteCategory(cat)}
                              aria-label={`Delete category ${cat.name}`}
                              title={`Delete ${cat.name}`}
                              className="py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================= TAB 3: HIGHLIGHTS ======================= */}
            {activeTab === 'highlights' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Homepage Highlights</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage featured offers, trending deals, and highlight cards displayed on the home page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddHighlight}
                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-colors self-start sm:self-auto"
                  >
                    <Plus size={18} /> Add Item
                  </button>
                </div>

                {highlights.length === 0 ? (
                  <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className="font-bold text-base">No highlights configured yet. Click &ldquo;Add Item&rdquo; to create one.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {highlights.map((hl, idx) => (
                      <div
                        key={hl.id}
                        className={`h-full rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-colors ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className={`aspect-[4/3] w-full relative shrink-0 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          <img
                            src={hl.image_url || '/placeholder.webp'}
                            alt={hl.title}
                            onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                            className="w-full h-full object-cover"
                          />
                          {hl.offer_badge && (
                            <div className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-[11px] font-black px-2.5 py-1 rounded-full shadow">
                              {hl.offer_badge}
                            </div>
                          )}
                          <div className={`absolute top-2.5 right-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            hl.is_available !== false ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-200'
                          }`}>
                            #{hl.sort_order} · {hl.is_available !== false ? 'Active' : 'Hidden'}
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className={`font-bold text-base line-clamp-1 min-h-[1.75rem] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {hl.title}
                          </h3>
                          <p className={`text-xs line-clamp-2 min-h-[2.25rem] mt-1 mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {hl.description}
                          </p>

                          <div className={`mt-auto pt-3 border-t flex gap-1.5 flex-wrap ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <button
                              type="button"
                              disabled={reordering || idx === 0}
                              onClick={() => handleMoveHighlight(hl.id, -1)}
                              aria-label={`Move highlight ${hl.title} up`}
                              title="Move earlier"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={reordering || idx === highlights.length - 1}
                              onClick={() => handleMoveHighlight(hl.id, 1)}
                              aria-label={`Move highlight ${hl.title} down`}
                              title="Move later"
                              className={`p-2 rounded-xl border text-xs disabled:opacity-35 transition-colors ${isDark ? 'border-slate-700 hover:border-primary' : 'border-slate-200 hover:border-primary'}`}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditHighlight(hl)}
                              className={`flex-1 py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                                isDark
                                  ? 'border-slate-700 text-slate-200 hover:border-primary hover:text-primary'
                                  : 'border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                              }`}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteHlTarget(hl)}
                              aria-label={`Delete highlight ${hl.title}`}
                              title={`Delete ${hl.title}`}
                              className="py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ====================================================================
          MODAL 1: ADD / EDIT MENU ITEM (With Review & Confirm Step for Add)
      ==================================================================== */}
      {itemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-lg max-h-[92dvh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-black text-lg">
                {itemModal.step === 'review' ? 'Review & Confirm New Item' : itemModal.mode === 'add' ? 'Add New Menu Item' : `Edit "${itemModal.form.name}"`}
              </h2>
              <button type="button" onClick={() => setItemModal(null)} aria-label="Close modal" className="p-1.5 rounded-full hover:bg-accent">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {modalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} /> {modalError}
                </div>
              )}

              {itemModal.step === 'form' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={itemModal.form.name}
                      onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, name: e.target.value } })}
                      placeholder="e.g. Zinger Burger"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Category *</label>
                    <select
                      value={itemModal.form.category_id}
                      onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, category_id: e.target.value } })}
                      className={inputClass}
                    >
                      <option value="">Select category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Selling Price (PKR) *</label>
                      <input
                        type="number"
                        min={0}
                        value={itemModal.form.price}
                        onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, price: e.target.value } })}
                        placeholder="e.g. 450"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Compare-at Price (Optional PKR)</label>
                      <input
                        type="number"
                        min={0}
                        value={itemModal.form.original_price}
                        onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, original_price: e.target.value } })}
                        placeholder="Higher original price, e.g. 550"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sub-category</label>
                      <input
                        type="text"
                        value={itemModal.form.sub_category}
                        onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, sub_category: e.target.value } })}
                        placeholder="e.g. Classic / Special"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sort Order</label>
                      <input
                        type="number"
                        min={1}
                        value={itemModal.form.sort_order}
                        onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, sort_order: e.target.value } })}
                        placeholder="e.g. 1"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itemModal.form.is_available}
                          onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, is_available: e.target.checked } })}
                          className="w-5 h-5 accent-primary rounded"
                        />
                        <span className="font-bold text-sm">Available (In Stock)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={itemModal.form.description}
                      onChange={e => setItemModal({ ...itemModal, form: { ...itemModal.form, description: e.target.value } })}
                      placeholder="Short product description..."
                      className={inputClass}
                    />
                  </div>

                  {/* Sizes / Variants Builder */}
                  <div className={`rounded-2xl border p-3.5 space-y-2.5 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Sizes / Variants (Optional)</span>
                    {itemModal.form.variants.length > 0 && (
                      <div className="space-y-1.5">
                        {itemModal.form.variants.map((v, idx) => (
                          <div key={idx} className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <span className="font-semibold">{v.name} (+PKR {v.price})</span>
                            <button
                              type="button"
                              onClick={() => setItemModal({
                                ...itemModal,
                                form: { ...itemModal.form, variants: itemModal.form.variants.filter((_, i) => i !== idx) }
                              })}
                              className="text-rose-500 hover:underline font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newVariantName}
                        onChange={e => setNewVariantName(e.target.value)}
                        placeholder="Option (e.g. Large / Extra Cheese)"
                        className={`flex-1 rounded-xl px-3 py-1.5 text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                      />
                      <input
                        type="number"
                        min={0}
                        value={newVariantPrice}
                        onChange={e => setNewVariantPrice(e.target.value)}
                        placeholder="+PKR"
                        className={`w-20 rounded-xl px-2.5 py-1.5 text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const n = newVariantName.trim();
                          const p = Number(newVariantPrice) || 0;
                          if (!n) return;
                          setItemModal({
                            ...itemModal,
                            form: { ...itemModal.form, variants: [...itemModal.form.variants, { name: n, price: Math.max(0, p) }] }
                          });
                          setNewVariantName('');
                          setNewVariantPrice('0');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 font-bold text-xs"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <AdminImagePicker
                    folder="items"
                    value={itemModal.form.image_url}
                    originalValue={itemModal.form.original_image_url}
                    onChange={(url) => setItemModal(prev => prev ? { ...prev, form: { ...prev.form, image_url: url } } : prev)}
                    onBusyChange={setImageBusy}
                    onValidationErrorChange={setImageError}
                  />
                </>
              ) : (
                /* Step 2: Review & Confirm */
                <div className="space-y-4">
                  <div className="aspect-[4/3] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border border-border bg-muted">
                    <img src={itemModal.form.image_url} alt={itemModal.form.name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`rounded-2xl p-4 border space-y-2 text-xs ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-bold">{itemModal.form.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Category:</span><span className="font-bold">{categoryNameMap.get(itemModal.form.category_id)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Selling Price:</span><span className="font-bold text-primary">PKR {itemModal.form.price}</span></div>
                    {itemModal.form.original_price.trim() && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Compare-at Price:</span><span className="font-bold line-through text-muted-foreground">PKR {itemModal.form.original_price}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Sort Order:</span><span className="font-bold">{itemModal.form.sort_order || 'Auto'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Availability:</span><span className="font-bold">{itemModal.form.is_available ? 'In Stock' : 'Out of Stock'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Options:</span><span className="font-bold">{itemModal.form.variants.length > 0 ? itemModal.form.variants.map(v => `${v.name} (+${v.price})`).join(', ') : 'None'}</span></div>
                    {itemModal.form.description && (
                      <p className="pt-2 border-t border-border text-muted-foreground">{itemModal.form.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
              {itemModal.step === 'form' ? (
                <>
                  <button type="button" onClick={() => setItemModal(null)} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Cancel</button>
                  {itemModal.mode === 'add' ? (
                    <button
                      type="button"
                      disabled={imageBusy}
                      onClick={() => {
                        const err = validateItemForm(itemModal.form);
                        if (err) { setModalError(err); return; }
                        setModalError('');
                        setItemModal({ ...itemModal, step: 'review' });
                      }}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Review &amp; Confirm <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting || imageBusy}
                      onClick={handleSaveItemConfirm}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" disabled={submitting} onClick={() => setItemModal({ ...itemModal, step: 'form' })} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Back to Edit</button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSaveItemConfirm}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm &amp; Create Item
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD / EDIT CATEGORY (With Review & Confirm Step for Add)
      ==================================================================== */}
      {catModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-lg max-h-[92dvh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-black text-lg">
                {catModal.step === 'review' ? 'Review & Confirm New Category' : catModal.mode === 'add' ? 'Add New Category' : `Edit "${catModal.form.name}"`}
              </h2>
              <button type="button" onClick={() => setCatModal(null)} aria-label="Close modal" className="p-1.5 rounded-full hover:bg-accent">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {modalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} /> {modalError}
                </div>
              )}

              {catModal.step === 'form' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Category Name *</label>
                    <input
                      type="text"
                      value={catModal.form.name}
                      onChange={e => setCatModal({ ...catModal, form: { ...catModal.form, name: e.target.value } })}
                      placeholder="e.g. Beverages / Ice Cream / Desserts"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">URL Slug (Optional)</label>
                      <input
                        type="text"
                        value={catModal.form.slug}
                        onChange={e => setCatModal({ ...catModal, form: { ...catModal.form, slug: e.target.value } })}
                        placeholder="auto-generated if blank"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sort Order</label>
                      <input
                        type="number"
                        min={1}
                        value={catModal.form.sort_order}
                        onChange={e => setCatModal({ ...catModal, form: { ...catModal.form, sort_order: e.target.value } })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <AdminImagePicker
                    folder="categories"
                    value={catModal.form.image_url}
                    originalValue={catModal.form.original_image_url}
                    onChange={(url) => setCatModal(prev => prev ? { ...prev, form: { ...prev.form, image_url: url } } : prev)}
                    onBusyChange={setImageBusy}
                    onValidationErrorChange={setImageError}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-[4/3] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border border-border bg-muted">
                    <img src={catModal.form.image_url} alt={catModal.form.name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`rounded-2xl p-4 border space-y-2 text-xs ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between"><span className="text-muted-foreground">Category Name:</span><span className="font-bold">{catModal.form.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Slug:</span><span className="font-mono font-bold">{catModal.form.slug || '(auto)'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sort Order:</span><span className="font-bold">{catModal.form.sort_order}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
              {catModal.step === 'form' ? (
                <>
                  <button type="button" onClick={() => setCatModal(null)} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Cancel</button>
                  {catModal.mode === 'add' ? (
                    <button
                      type="button"
                      disabled={imageBusy}
                      onClick={() => {
                        const err = validateCategoryForm(catModal.form);
                        if (err) { setModalError(err); return; }
                        setModalError('');
                        setCatModal({ ...catModal, step: 'review' });
                      }}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Review &amp; Confirm <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting || imageBusy}
                      onClick={handleSaveCategoryConfirm}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Category
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" disabled={submitting} onClick={() => setCatModal({ ...catModal, step: 'form' })} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Back to Edit</button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSaveCategoryConfirm}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm &amp; Create Category
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: ADD / EDIT HIGHLIGHT (With Review & Confirm Step for Add)
      ==================================================================== */}
      {hlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-lg max-h-[92dvh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h2 className="font-black text-lg">
                {hlModal.step === 'review' ? 'Review & Confirm New Highlight' : hlModal.mode === 'add' ? 'Add New Highlight' : `Edit "${hlModal.form.title}"`}
              </h2>
              <button type="button" onClick={() => setHlModal(null)} aria-label="Close modal" className="p-1.5 rounded-full hover:bg-accent">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {modalError && (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} /> {modalError}
                </div>
              )}

              {hlModal.step === 'form' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Title *</label>
                    <input
                      type="text"
                      value={hlModal.form.title}
                      onChange={e => setHlModal({ ...hlModal, form: { ...hlModal.form, title: e.target.value } })}
                      placeholder="e.g. Trending Deal / Buy 1 Get 1 Free"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description *</label>
                    <textarea
                      rows={2}
                      value={hlModal.form.description}
                      onChange={e => setHlModal({ ...hlModal, form: { ...hlModal.form, description: e.target.value } })}
                      placeholder="Exact promotional details to show customers..."
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Offer Badge (Optional)</label>
                      <input
                        type="text"
                        value={hlModal.form.offer_badge}
                        onChange={e => setHlModal({ ...hlModal, form: { ...hlModal.form, offer_badge: e.target.value } })}
                        placeholder="e.g. Limited Offer / 20% Off"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hlModal.form.is_available}
                          onChange={e => setHlModal({ ...hlModal, form: { ...hlModal.form, is_available: e.target.checked } })}
                          className="w-5 h-5 accent-primary rounded"
                        />
                        <span className="font-bold text-sm">Active on Homepage</span>
                      </label>
                    </div>
                  </div>

                  <AdminImagePicker
                    folder="highlights"
                    value={hlModal.form.image_url}
                    originalValue={hlModal.form.original_image_url}
                    onChange={(url) => setHlModal(prev => prev ? { ...prev, form: { ...prev.form, image_url: url } } : prev)}
                    onBusyChange={setImageBusy}
                    onValidationErrorChange={setImageError}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-[4/3] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border border-border bg-muted">
                    <img src={hlModal.form.image_url} alt={hlModal.form.title} className="w-full h-full object-cover" />
                  </div>
                  <div className={`rounded-2xl p-4 border space-y-2 text-xs ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between"><span className="text-muted-foreground">Title:</span><span className="font-bold">{hlModal.form.title}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Offer Badge:</span><span className="font-bold">{hlModal.form.offer_badge || 'None'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Visibility:</span><span className="font-bold">{hlModal.form.is_available ? 'Active' : 'Hidden'}</span></div>
                    <p className="pt-2 border-t border-border text-muted-foreground">{hlModal.form.description}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
              {hlModal.step === 'form' ? (
                <>
                  <button type="button" onClick={() => setHlModal(null)} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Cancel</button>
                  {hlModal.mode === 'add' ? (
                    <button
                      type="button"
                      disabled={imageBusy}
                      onClick={() => {
                        const err = validateHighlightForm(hlModal.form);
                        if (err) { setModalError(err); return; }
                        setModalError('');
                        setHlModal({ ...hlModal, step: 'review' });
                      }}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Review &amp; Confirm <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting || imageBusy}
                      onClick={handleSaveHighlightConfirm}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Highlight
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" disabled={submitting} onClick={() => setHlModal({ ...hlModal, step: 'form' })} className="px-4 py-2 rounded-xl bg-accent font-bold text-xs">Back to Edit</button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSaveHighlightConfirm}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm &amp; Create Highlight
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DELETE MODAL 1: MENU ITEM
      ==================================================================== */}
      {deleteItemTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-500">
              <Trash2 size={22} />
              <h3 className="font-black text-lg">Delete Menu Item?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">&ldquo;{deleteItemTarget.name}&rdquo;</strong> from{' '}
              <strong>{categoryNameMap.get(deleteItemTarget.category_id)}</strong>? It will be removed from the live website immediately.
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={submitting} onClick={() => setDeleteItemTarget(null)} className="flex-1 py-2.5 rounded-xl bg-accent font-bold text-xs">Cancel</button>
              <button type="button" disabled={submitting} onClick={handleConfirmDeleteItem} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50">
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DELETE MODAL 2: CATEGORY (Mandatory Reassignment When Products Exist)
      ==================================================================== */}
      {deleteCatTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertTriangle size={24} />
              <h3 className="font-black text-lg">Delete Category &ldquo;{deleteCatTarget.name}&rdquo;</h3>
            </div>

            {modalError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
                {modalError}
              </div>
            )}
            {reassignDoneMsg && (
              <div role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {reassignDoneMsg}
              </div>
            )}

            {deleteCatItems.length > 0 ? (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold">Category Currently in Use ({deleteCatItems.length} product{deleteCatItems.length === 1 ? '' : 's'})</p>
                  <p className="text-xs">
                    You cannot delete this category while products are assigned to it. Reassign all associated products to another existing category first.
                  </p>
                </div>

                <div className="max-h-28 overflow-y-auto rounded-xl border border-border p-2.5 text-xs space-y-1">
                  {deleteCatItems.map(i => (
                    <div key={i.id} className="flex justify-between">
                      <span className="font-semibold">{i.name}</span>
                      <span className="text-muted-foreground">PKR {i.price}</span>
                    </div>
                  ))}
                </div>

                {categories.filter(c => c.id !== deleteCatTarget.id).length === 0 ? (
                  <p className="text-xs text-rose-500 font-bold">Create another category first before deleting this one.</p>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Reassign all {deleteCatItems.length} product(s) to:
                    </label>
                    <select
                      value={reassignTargetCatId}
                      onChange={e => setReassignTargetCatId(e.target.value)}
                      className={inputClass}
                    >
                      {categories.filter(c => c.id !== deleteCatTarget.id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={reassignBusy || !reassignTargetCatId}
                      onClick={handleReassignProducts}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50"
                    >
                      {reassignBusy ? 'Reassigning products...' : `Reassign ${deleteCatItems.length} Product(s) & Verify`}
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button type="button" disabled={reassignBusy} onClick={() => setDeleteCatTarget(null)} className="flex-1 py-2.5 rounded-xl bg-accent font-bold text-xs">Cancel</button>
                  <button
                    type="button"
                    disabled
                    title="Reassign all products first"
                    className="flex-1 py-2.5 rounded-xl bg-rose-600/40 text-white/60 font-bold text-xs cursor-not-allowed"
                  >
                    Delete Locked (Products Remain)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This category has <strong className="text-foreground">0 products</strong> assigned. Confirming will permanently delete <strong className="text-foreground">&ldquo;{deleteCatTarget.name}&rdquo;</strong>.
                </p>
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={submitting} onClick={() => setDeleteCatTarget(null)} className="flex-1 py-2.5 rounded-xl bg-accent font-bold text-xs">Cancel</button>
                  <button type="button" disabled={submitting} onClick={handleConfirmDeleteCategory} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50">
                    {submitting ? 'Deleting...' : 'Confirm Delete Category'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          DELETE MODAL 3: HIGHLIGHT
      ==================================================================== */}
      {deleteHlTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2.5 text-rose-500">
              <Trash2 size={22} />
              <h3 className="font-black text-lg">Delete Highlight?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Are you sure you want to delete the homepage highlight <strong className="text-foreground">&ldquo;{deleteHlTarget.title}&rdquo;</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button type="button" disabled={submitting} onClick={() => setDeleteHlTarget(null)} className="flex-1 py-2.5 rounded-xl bg-accent font-bold text-xs">Cancel</button>
              <button type="button" disabled={submitting} onClick={handleConfirmDeleteHighlight} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50">
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
