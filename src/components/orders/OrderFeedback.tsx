import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, MessageSquareHeart, Loader2, Sparkles, Check, X } from 'lucide-react';
import { 
  submitFeedbackFn, 
  getFeedbackForOrderFn, 
  PREDEFINED_FEEDBACK_CHIPS, 
  type FeedbackData 
} from '../../server/feedbackApi';

interface Props {
  orderId: string;
  status: string;
}

export function OrderFeedback({ orderId, status }: Props) {
  // Only available if order is delivered
  if (status !== 'delivered') {
    return null;
  }

  const storageKey = `order_feedback_${orderId}`;
  const skipKey = `order_feedback_skipped_${orderId}`;

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSkipped, setIsSkipped] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(skipKey) === 'true';
      } catch { /* ignore */ }
    }
    return false;
  });

  const [submittedData, setSubmittedData] = useState<FeedbackData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) return JSON.parse(cached);
      } catch { /* ignore */ }
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchingExisting, setFetchingExisting] = useState(false);

  // Check if feedback was already submitted on server
  useEffect(() => {
    let isMounted = true;
    if (!orderId || submittedData) return;

    setFetchingExisting(true);
    getFeedbackForOrderFn({ data: { orderId } })
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.feedback) {
          setSubmittedData(res.feedback);
          try {
            localStorage.setItem(storageKey, JSON.stringify(res.feedback));
            localStorage.removeItem(skipKey);
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        if (isMounted) setFetchingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleSkip = () => {
    setIsSkipped(true);
    try {
      localStorage.setItem(skipKey, 'true');
    } catch { /* ignore */ }
  };

  const handleUnskip = () => {
    setIsSkipped(false);
    try {
      localStorage.removeItem(skipKey);
    } catch { /* ignore */ }
  };

  const toggleChip = (chip: string) => {
    if (submittedData || submitting) return;
    setErrorMessage('');
    setSelectedChips(prev => 
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submittedData) return;

    const trimmedComment = comment.trim();
    if (selectedChips.length === 0 && trimmedComment.length === 0) {
      setErrorMessage('Please pick at least one suggestion chip or write a comment.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await submitFeedbackFn({
        data: {
          orderId,
          rating,
          chips: selectedChips,
          comment: trimmedComment,
        }
      });

      if (res.success && res.feedback) {
        setSubmittedData(res.feedback);
        setIsSkipped(false);
        try {
          localStorage.setItem(storageKey, JSON.stringify(res.feedback));
          localStorage.removeItem(skipKey);
        } catch { /* ignore */ }
      } else {
        setErrorMessage(res.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;
  const isSubmitDisabled = submitting || (selectedChips.length === 0 && comment.trim().length === 0);

  // 1. Render Already Submitted State
  if (submittedData) {
    return (
      <div className="bg-card border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base sm:text-lg">Thank You for Your Feedback!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Your review helps us maintain our quality and taste.</p>
          </div>
        </div>

        {/* Rating summary */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= submittedData.rating
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-sm text-foreground ml-1">{submittedData.rating}/5</span>
        </div>

        {/* Selected chips */}
        {submittedData.chips && submittedData.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {submittedData.chips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
              >
                <Check className="w-3 h-3" />
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Comment */}
        {submittedData.comment && (
          <div className="bg-muted/40 rounded-2xl p-3 text-sm text-foreground/90 italic border border-border">
            &ldquo;{submittedData.comment}&rdquo;
          </div>
        )}
      </div>
    );
  }

  // 2. Render Compact "Leave Feedback Later" option if customer chose "Not Now"
  if (isSkipped) {
    return (
      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">How was your order?</p>
            <p className="text-xs text-muted-foreground">Leave a quick review whenever you are ready</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUnskip}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          Leave Feedback
        </button>
      </div>
    );
  }

  // 3. Render Full Feedback Form
  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base sm:text-lg">How was your order?</h3>
            <p className="text-xs text-muted-foreground">Feedback is completely optional and appreciated</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fetchingExisting && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip feedback for now"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors text-xs inline-flex items-center gap-1"
          >
            <span className="hidden sm:inline">Not Now</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating Section */}
        <div className="flex flex-col items-center sm:items-start gap-2 bg-muted/30 rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rating:
            </span>
            <span className="font-black text-sm text-primary">{activeRating}/5</span>
          </div>

          <div className="flex items-center gap-1.5 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                    star <= activeRating
                      ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                      : 'text-muted-foreground/30 hover:text-amber-400'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* 7 Predefined Feedback Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            What went well? <span className="normal-case font-normal">(tap all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_FEEDBACK_CHIPS.map((chip, idx) => {
              const isSelected = selectedChips.includes(chip);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all text-left border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Feedback Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="customer-comment" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Additional Comments <span className="normal-case font-normal">(optional)</span>
            </label>
            <span className={`text-[11px] font-mono ${comment.length > 950 ? 'text-amber-600 font-bold' : 'text-muted-foreground'}`}>
              {comment.length}/1000
            </span>
          </div>
          <textarea
            id="customer-comment"
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setErrorMessage('');
            }}
            placeholder="Tell us about the taste, packaging, delivery speed, or anything else..."
            className="w-full rounded-2xl bg-background border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
          />
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm rounded-xl p-3">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons: Not Now + Submit Feedback */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="py-3 px-5 rounded-2xl font-bold text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-[0.99]"
          >
            Not Now
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`flex-1 py-3 px-5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md ${
              isSubmitDisabled
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 active:scale-[0.99]'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Feedback...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
