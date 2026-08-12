import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Download, Loader2 } from "lucide-react";
import { CjImportApiError, fetchCjProductDetail } from "@/api/cjImport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { displayPrice, stripHtml } from "@/lib/utils";

export function CjProductPreviewModal({
  cjProductId,
  imported,
  importing,
  onClose,
  onImport,
}: {
  cjProductId: string | null;
  imported: boolean;
  importing: boolean;
  onClose: () => void;
  onImport: (cjProductId: string) => void;
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cj-import", "detail", cjProductId],
    queryFn: () => fetchCjProductDetail(cjProductId as string),
    enabled: cjProductId !== null,
  });

  const image = activeImage ?? detail?.primaryImage ?? detail?.images?.[0] ?? null;

  return (
    <Dialog
      open={cjProductId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setActiveImage(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 pr-6">
            {detail?.name ?? "Product preview"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn't load this product</AlertTitle>
            <AlertDescription>
              {error instanceof CjImportApiError ? error.message : "Something went wrong."}
            </AlertDescription>
          </Alert>
        )}

        {detail && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
                {image ? (
                  <img src={image} alt={detail.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
              {detail.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {detail.images.slice(0, 10).map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`overflow-hidden rounded-lg border-2 transition ${
                        image === img ? "border-primary" : "border-transparent hover:border-border"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {detail.category?.name && (
                <Badge variant="outline" className="w-fit">
                  {detail.category.name}
                </Badge>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">{displayPrice(detail.price)}</span>
                {detail.suggestedPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {displayPrice(detail.suggestedPrice)}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {detail.variants.length} variant{detail.variants.length === 1 ? "" : "s"}
                {detail.colors.length > 0 && ` · ${detail.colors.length} color(s)`}
                {detail.sizes.length > 0 && ` · ${detail.sizes.length} size(s)`}
              </p>

              {(detail.colors.length > 0 || detail.sizes.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.colors.map((c) => (
                    <Badge key={`color-${c}`} variant="secondary" className="font-normal">
                      {c}
                    </Badge>
                  ))}
                  {detail.sizes.map((s) => (
                    <Badge key={`size-${s}`} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {detail.description && (
                <p className="line-clamp-6 text-sm leading-relaxed text-muted-foreground">
                  {stripHtml(detail.description)}
                </p>
              )}

              <Button
                className="mt-auto w-full gap-2 rounded-xl font-semibold"
                disabled={imported || importing}
                onClick={() => onImport(detail.id)}
              >
                {imported ? (
                  <>
                    <Check className="h-4 w-4" /> Already imported
                  </>
                ) : importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Import product
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
