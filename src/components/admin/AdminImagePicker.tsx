import React, { useRef, useState } from 'react';
import { Upload, Link2, CheckCircle2, AlertTriangle, Loader2, Image as ImageIcon } from 'lucide-react';
import { adminCall } from '../../lib/adminSession';
import { uploadAdminImageFn, validateExternalImageUrlFn } from '../../server/menu';
import { useAdminContext } from './AdminContext';

interface AdminImagePickerProps {
  folder: 'items' | 'categories' | 'highlights';
  value: string;
  originalValue?: string;
  onChange: (nextUrl: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onValidationErrorChange?: (hasErr: boolean) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function AdminImagePicker({
  folder,
  value,
  originalValue,
  onChange,
  onBusyChange,
  onValidationErrorChange,
}: AdminImagePickerProps) {
  const { theme } = useAdminContext();
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>(value || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verifyingUrl, setVerifyingUrl] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setBusy = (busy: boolean) => {
    onBusyChange?.(busy);
  };

  const setErrorState = (hasErr: boolean) => {
    onValidationErrorChange?.(hasErr);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);
    setErrorState(false);

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      const msg = 'Unsupported format. Please select a JPG, JPEG, PNG, or WebP image.';
      setStatusMsg({ type: 'error', text: msg });
      setErrorState(true);
      return;
    }

    if (file.size > MAX_BYTES) {
      const msg = 'File exceeds 5 MB limit. Please choose a smaller image.';
      setStatusMsg({ type: 'error', text: msg });
      setErrorState(true);
      return;
    }

    setUploading(true);
    setBusy(true);
    setUploadProgress(20);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file from device.'));
        reader.readAsDataURL(file);
      });
      setUploadProgress(55);

      const res = await adminCall(uploadAdminImageFn, {
        folder,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });

      setUploadProgress(95);

      if (!res?.success || !res?.publicUrl) {
        throw new Error(res?.error || 'Image upload failed.');
      }

      setPreviewBroken(false);
      onChange(res.publicUrl);
      setUrlInput(res.publicUrl);
      setUploadProgress(100);
      setStatusMsg({ type: 'success', text: `Uploaded "${file.name}" (${Math.round(file.size / 1024)} KB) successfully.` });
      setErrorState(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Could not upload image.' });
      setErrorState(true);
    } finally {
      setUploading(false);
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVerifyExternalUrl = async () => {
    const trimmed = urlInput.trim();
    setStatusMsg(null);

    if (!trimmed) {
      setStatusMsg({ type: 'error', text: 'Please paste an HTTPS image URL first.' });
      setErrorState(true);
      return;
    }

    // If unchanged from existing record, accept without re-verifying
    if (originalValue && trimmed === originalValue.trim()) {
      setPreviewBroken(false);
      onChange(trimmed);
      setStatusMsg({ type: 'success', text: 'Using existing image.' });
      setErrorState(false);
      return;
    }

    setVerifyingUrl(true);
    setBusy(true);
    try {
      const res = await adminCall(validateExternalImageUrlFn, { url: trimmed });
      if (!res || !res.valid) {
        setStatusMsg({ type: 'error', text: res?.error || 'URL is not a valid accessible image.' });
        setErrorState(true);
        return;
      }
      if (!res.url) {
        setStatusMsg({ type: 'error', text: 'URL is not a valid accessible image.' });
        setErrorState(true);
        return;
      }

      // Also verify image renders in browser via Image() probe
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => (img.naturalWidth > 0 ? resolve() : reject(new Error('Image has zero dimensions.')));
        img.onerror = () => reject(new Error('Browser could not display image from this URL.'));
        img.src = res.url!;
      });

      setPreviewBroken(false);
      onChange(res.url);
      setUrlInput(res.url);
      setStatusMsg({ type: 'success', text: `Verified image (${res.contentType || 'image'}).` });
      setErrorState(false);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'External image URL failed verification.' });
      setErrorState(true);
    } finally {
      setVerifyingUrl(false);
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-3.5 space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Image Source
        </span>
        <div className={`inline-flex rounded-xl p-1 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <button
            type="button"
            onClick={() => { setMode('upload'); setStatusMsg(null); setErrorState(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              mode === 'upload'
                ? 'bg-primary text-primary-foreground'
                : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload size={13} /> Upload from Device
          </button>
          <button
            type="button"
            onClick={() => { setMode('url'); setStatusMsg(null); setErrorState(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              mode === 'url'
                ? 'bg-primary text-primary-foreground'
                : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Link2 size={13} /> Use Image URL
          </button>
        </div>
      </div>

      {/* Preview Box (Uniform 4:3) */}
      <div className={`aspect-[4/3] w-full max-w-[260px] mx-auto rounded-xl overflow-hidden border relative flex items-center justify-center ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        {value && !previewBroken ? (
          <img
            src={value}
            alt="Selected preview"
            onError={() => {
              setPreviewBroken(true);
              setStatusMsg({ type: 'error', text: 'Preview failed to load this image. Please upload or verify another URL.' });
              setErrorState(true);
            }}
            onLoad={() => setPreviewBroken(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4 text-muted-foreground space-y-1">
            <ImageIcon size={28} className="mx-auto opacity-60" />
            <p className="text-xs font-medium">{previewBroken ? 'Preview failed to load' : 'No image selected'}</p>
          </div>
        )}
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-2.5 px-4 rounded-xl border-2 border-dashed font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
              isDark
                ? 'border-slate-600 hover:border-primary text-slate-200 bg-slate-800/50'
                : 'border-slate-300 hover:border-primary text-slate-700 bg-white'
            } disabled:opacity-50`}
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="animate-spin text-primary" />
                <span>Uploading ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <Upload size={15} className="text-primary" />
                <span>{value ? 'Replace with Device Image (JPG, PNG, WebP ≤ 5 MB)' : 'Choose Image from Device (JPG, PNG, WebP ≤ 5 MB)'}</span>
              </>
            )}
          </button>
          {uploading && (
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorState(true);
                setStatusMsg(null);
              }}
              placeholder="https://example.com/photo.jpg"
              className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="button"
              disabled={verifyingUrl || !urlInput.trim()}
              onClick={handleVerifyExternalUrl}
              className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {verifyingUrl ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>{verifyingUrl ? 'Checking...' : 'Verify & Use'}</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Must be a direct HTTPS image URL (JPG, PNG, WebP). Click &ldquo;Verify &amp; Use&rdquo; to validate and preview.
          </p>
        </div>
      )}

      {statusMsg && (
        <div role="status" className={`p-2.5 rounded-xl text-xs font-medium flex items-start gap-2 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-destructive/10 text-destructive border border-destructive/30'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}
