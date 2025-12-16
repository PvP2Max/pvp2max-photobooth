"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check, Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Photo = { id: string; originalUrl: string; cutoutUrl: string; previewUrl?: string; originalName: string };
type Background = { id: string; name: string; description?: string; asset: string; previewAsset?: string };

export default function SelectionPage() {
  const params = useParams<{ token: string }>();
  const search = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [allowed, setAllowed] = useState(3);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<Record<string, { backgroundId: string }>>({});

  const business = search.get("business") ?? "";
  const event = search.get("event") ?? "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/selections/${params.token}?business=${business}&event=${event}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          email?: string;
          photos?: Photo[];
          backgrounds?: Background[];
          allowedSelections?: number;
          error?: string;
        };
        if (!res.ok || !data.photos || !data.backgrounds) {
          setError(data.error || "Selection link invalid or expired.");
          return;
        }
        setEmail(data.email ?? "");
        setPhotos(data.photos);
        setBackgrounds(data.backgrounds);
        setAllowed(data.allowedSelections ?? 3);
        if (data.backgrounds.length > 0) {
          const first = data.backgrounds[0].id;
          const defaults: Record<string, { backgroundId: string }> = {};
          for (const photo of data.photos) {
            defaults[photo.id] = { backgroundId: first };
          }
          setSelection(defaults);
        }
      } catch {
        setError("Failed to load selection.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token, business, event]);

  const selectedIds = useMemo(() => Object.keys(selection), [selection]);

  function toggleSelect(photoId: string) {
    setSelection((prev) => {
      if (prev[photoId]) {
        const clone = { ...prev };
        delete clone[photoId];
        return clone;
      }
      if (Object.keys(prev).length >= allowed) {
        toast.warning("Selection limit reached", {
          description: `You can only select up to ${allowed} photos.`,
        });
        return prev;
      }
      const firstBg = backgrounds[0]?.id;
      return { ...prev, [photoId]: { backgroundId: firstBg || "" } };
    });
  }

  async function submit() {
    setError(null);
    setStatus(null);
    if (Object.keys(selection).length === 0) {
      toast.error("No photos selected", {
        description: "Please select at least one photo.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        selections: Object.entries(selection).map(([photoId, cfg]) => ({
          photoId,
          backgroundId: cfg.backgroundId,
        })),
      };
      const res = await fetch(
        `/api/selections/${params.token}?business=${business}&event=${event}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to send selections.");
        toast.error("Failed to send", { description: data.error });
        return;
      }
      setStatus("Your photos are on the way! Check your email.");
      toast.success("Photos sent!", {
        description: "Check your inbox for your photos.",
      });
    } catch {
      setError("Failed to send selections.");
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading your photos...</p>
        </div>
      </main>
    );
  }

  if (error && !photos.length) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <EmptyState
              icon={<ImageIcon className="size-6" />}
              title="Unable to load photos"
              description={error}
            />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (status) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="size-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Photos Sent!</h2>
            <p className="text-muted-foreground">
              {status}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground relative">
      {submitting && <LoadingOverlay message="Sending your photos..." />}

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Select your photos
            </p>
            <h1 className="text-3xl font-semibold">
              Hi {email.split("@")[0] || "there"}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose up to {allowed} photo{allowed === 1 ? "" : "s"} and pick a background for each.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            {selectedIds.length} / {allowed} selected
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {photos.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="size-6" />}
            title="No photos available"
            description="There are no photos available for selection."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => {
              const selected = !!selection[photo.id];
              const preview = photo.previewUrl || photo.cutoutUrl || photo.originalUrl;
              return (
                <Card
                  key={photo.id}
                  className={cn(
                    "overflow-hidden transition-all cursor-pointer group",
                    selected
                      ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                      : "hover:ring-1 hover:ring-border"
                  )}
                  onClick={() => toggleSelect(photo.id)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={photo.originalName}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                    {selected && (
                      <div className="absolute top-3 right-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                          <Check className="size-5" />
                        </div>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <Button
                        variant={selected ? "default" : "secondary"}
                        size="sm"
                        onClick={() => toggleSelect(photo.id)}
                      >
                        {selected ? (
                          <>
                            <Check className="size-4" />
                            Selected
                          </>
                        ) : (
                          "Select"
                        )}
                      </Button>
                      {selected && backgrounds.length > 1 && (
                        <Select
                          value={selection[photo.id]?.backgroundId}
                          onValueChange={(value) =>
                            setSelection((prev) => ({
                              ...prev,
                              [photo.id]: { backgroundId: value },
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="Background" />
                          </SelectTrigger>
                          <SelectContent>
                            {backgrounds.map((bg) => (
                              <SelectItem key={bg.id} value={bg.id}>
                                {bg.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button
            variant="gradient"
            size="lg"
            onClick={submit}
            disabled={submitting || selectedIds.length === 0}
            className="px-8"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send {selectedIds.length} photo{selectedIds.length === 1 ? "" : "s"} to my email
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
