import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  createProductReview,
  fetchProductReviews,
  ReviewApiError,
  type ReviewSort,
} from "@/api/reviews";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "rating-desc", label: "Highest Rated" },
  { value: "rating-asc", label: "Lowest Rated" },
];

function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${size} ${
            i < Math.round(rating) ? "fill-primary text-primary" : "fill-muted text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function WriteReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createProductReview(productId, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        images: imageUrl.trim() ? [imageUrl.trim()] : undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted - awaiting moderation");
      setRating(0);
      setTitle("");
      setBody("");
      setImageUrl("");
      onSubmitted();
    },
    onError: (err) => {
      setError(err instanceof ReviewApiError ? err.message : "Failed to submit review.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-card p-5">
      <p className="text-sm font-semibold">Write a review</p>
      <StarPicker value={rating} onChange={setRating} />
      <Input
        placeholder="Review title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Share your thoughts about this product..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
      />
      <Input
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={mutation.isPending} className="rounded-full">
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit review"
        )}
      </Button>
    </form>
  );
}

export function ProductReviews({
  productId,
  fallbackAvgRating,
  fallbackReviewCount,
}: {
  productId: string;
  fallbackAvgRating: number;
  fallbackReviewCount: number;
}) {
  const { isAuthenticated } = useAuth();
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", productId, sort, page],
    queryFn: () => fetchProductReviews(productId, { sort, page, limit: 10 }),
  });

  const avgRating = Number(data?.summary.avgRating ?? fallbackAvgRating) || 0;
  const reviewCount = data?.summary.reviewCount ?? fallbackReviewCount;
  const distribution = data?.summary.distribution;

  const handleSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-5xl font-extrabold">{avgRating.toFixed(1)}</p>
            <div className="mt-1 flex justify-center">
              <StarRow rating={avgRating} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const starCount = distribution?.[String(star) as "1" | "2" | "3" | "4" | "5"] ?? 0;
              const pct = reviewCount > 0 ? Math.round((starCount / reviewCount) * 100) : 0;
              return (
                <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                  <span className="w-3 text-right">{star}</span>
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{starCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setShowForm((s) => !s)}
            >
              {showForm ? "Cancel" : "Write a review"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>{" "}
              to write a review.
            </p>
          )}

          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as ReviewSort);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showForm && <WriteReviewForm productId={productId} onSubmitted={handleSubmitted} />}

      {/* Review cards */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : data && data.reviews.length > 0 ? (
        <>
          {data.reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {r.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{r.authorName}</p>
                      {r.verifiedPurchase && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Verified Purchase
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StarRow rating={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.title && <p className="mb-1 text-sm font-semibold">{r.title}</p>}
              {r.body && <p className="text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
              {r.images && r.images.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {r.images.map((img) => (
                    <img
                      key={img}
                      src={img}
                      alt="Review"
                      loading="lazy"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No reviews yet - be the first to share your thoughts!
        </div>
      )}
    </div>
  );
}
