import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, ShieldCheck, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { LiveOrder } from '../../hooks/useLiveOrder';
import { getCancellationToken } from '../../lib/activeOrders';
import { uploadCancellationProofFn, cancelOrderCustomerFn } from '../../server/cancellationApi';
import { SHOP_PHONE_LOCAL } from '../../lib/shop';

interface CustomerCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LiveOrder;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'Ordered by mistake',
  'Delivery time too long',
  'Changed my mind',
  'Wrong delivery address',
  'Need to change items',
  'Other reason'
];

export function CustomerCancelModal({ isOpen, onClose, order, onSuccess }: CustomerCancelModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isOnline = order.payment_method === 'online_transfer';

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    if (!reason || PRESET_REASONS.includes(reason)) {
      setReason(preset);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(selected.type.toLowerCase())) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5 MB. Please select a smaller screenshot.');
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setErrorMsg('Please enter a cancellation reason of at least 5 characters.');
      return;
    }
    if (cleanReason.length > 250) {
      setErrorMsg('Cancellation reason must be 250 characters or fewer.');
      return;
    }

    if (isOnline && !file) {
      setErrorMsg('Please attach a screenshot of your payment transfer proof for refund verification.');
      return;
    }

    const token = getCancellationToken(order.id);
    if (!token) {
      setErrorMsg(`Cancellation token not found on this device. Please call ${SHOP_PHONE_LOCAL} directly to cancel your order.`);
      return;
    }

    setLoading(true);

    try {
      let proofPath: string | undefined = undefined;

      // 1. Upload proof if online transfer
      if (isOnline && file) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image file.'));
          reader.readAsDataURL(file);
        });

        const uploadRes = await uploadCancellationProofFn({
          data: {
            orderId: order.id,
            cancellationToken: token,
            fileName: file.name,
            mimeType: file.type,
            base64Data
          }
        });

        if (!uploadRes.success || !uploadRes.proofPath) {
          throw new Error(typeof uploadRes.error === 'string' ? uploadRes.error : 'Failed to upload payment proof. Please try again.');
        }

        proofPath = uploadRes.proofPath;
      }

      // 2. Submit cancellation
      const cancelRes = await cancelOrderCustomerFn({
        data: {
          orderId: order.id,
          cancellationToken: token,
          reason: cleanReason,
          proofPath
        }
      });

      if (!cancelRes.success) {
        throw new Error(typeof cancelRes.error === 'string' ? cancelRes.error : 'Could not cancel order. Please call the shop.');
      }

      // Success — notify live trackers immediately
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: { orderId: order.id } }));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while canceling the order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="cancel-modal-title"
        className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-foreground relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 id="cancel-modal-title" className="text-lg font-black">Cancel Order #{order.shortCode}</h2>
              <p className="text-xs text-muted-foreground">Order status: Received (Before Kitchen Preparation)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Brief Summary */}
        <div className="bg-muted/50 rounded-2xl p-3.5 border border-border text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Items:</span>
            <span className="font-semibold">{order.items?.length || 0} items</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-semibold">{isOnline ? 'Online Transfer' : 'Cash on Delivery'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="font-black text-primary text-sm">PKR {order.total}</span>
          </div>
        </div>

        {/* Notice by Payment Method */}
        {isOnline ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <ShieldCheck size={16} /> Online Transfer Refund Review
            </div>
            <p>
              Because your payment was sent via online transfer, your cancellation will be sent to the restaurant manager for refund review. Please upload a screenshot of your transfer proof below so we can verify and return your money.
            </p>
          </div>
        ) : (
          <div className="bg-muted rounded-2xl p-3 text-xs text-muted-foreground">
            Since this is a Cash on Delivery order, canceling now will cancel your order immediately with no charges.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Select Reason <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_REASONS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedPreset === preset
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label htmlFor="cancel-reason" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reason Details <span className="text-destructive">*</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you are canceling this order..."
              maxLength={250}
              className="w-full text-sm bg-background border border-border rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60"
            />
            <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
              <span>Minimum 5 characters</span>
              <span>{reason.length}/250</span>
            </div>
          </div>

          {/* Online Transfer Proof Upload */}
          {isOnline && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Transfer Proof Screenshot <span className="text-destructive">*</span>
              </label>

              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-border bg-card p-2 flex items-center gap-3">
                  <img 
                    src={previewUrl} 
                    alt="Proof preview" 
                    className="w-16 h-16 object-cover rounded-xl border border-border" 
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-foreground truncate">{file?.name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {file ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                >
                  <Upload className="mx-auto text-muted-foreground mb-1.5" size={22} />
                  <p className="text-xs font-semibold text-foreground">Click to upload payment screenshot</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WebP up to 5 MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold border border-border hover:bg-muted text-foreground transition-colors disabled:opacity-50"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-black bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>{isOnline ? 'Submit Refund & Cancel' : 'Confirm Cancellation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
