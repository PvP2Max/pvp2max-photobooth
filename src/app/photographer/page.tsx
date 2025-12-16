"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Upload, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import EventAccessGate from "../event-access";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Checkin = { id: string; name: string; email: string; createdAt: string };

export default function PhotographerPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedCheckinId, setSelectedCheckinId] = useState("");
  const [loadingCheckins, setLoadingCheckins] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCheckin = useMemo(
    () => checkins.find((c) => c.id === selectedCheckinId),
    [checkins, selectedCheckinId],
  );

  const loadCheckins = useCallback(async () => {
    setLoadingCheckins(true);
    setError(null);
    try {
      const response = await fetch("/api/checkins");
      const payload = (await response.json()) as {
        checkins?: Checkin[];
        error?: string;
      };
      if (!response.ok || !payload.checkins) {
        throw new Error(payload.error || "Could not load check-ins.");
      }
      setCheckins(payload.checkins);
      if (payload.checkins.length > 0) {
        const stillValid = payload.checkins.find(
          (checkin) => checkin.id === selectedCheckinId,
        );
        setSelectedCheckinId(
          stillValid ? stillValid.id : payload.checkins[0].id,
        );
      } else {
        setSelectedCheckinId("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load check-ins.";
      setError(msg);
    } finally {
      setLoadingCheckins(false);
    }
  }, [selectedCheckinId]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) {
      setError("Choose at least one photo to upload first.");
      return;
    }
    if (!selectedCheckin?.email) {
      setError("Pick a checked-in guest first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("email", selectedCheckin.email);
      for (const file of files) {
        formData.append("file", file);
      }

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        photos?: unknown;
        failures?: { fileName?: string; error?: string }[];
        error?: string;
      };
      if (!response.ok || !payload.photos) {
        throw new Error(payload.error || "Upload failed");
      }

      const successCount = Array.isArray(payload.photos)
        ? payload.photos.length
        : 1;
      const failureCount = payload.failures?.length ?? 0;

      if (failureCount > 0) {
        toast.warning("Upload partially completed", {
          description: `${successCount} photo(s) processed, ${failureCount} failed.`,
        });
      } else {
        toast.success("Photos uploaded successfully", {
          description: `${successCount} photo(s) processed for ${selectedCheckin.name}.`,
        });
      }
      await loadCheckins();
      form.reset();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not upload the photo(s).";
      setError(msg);
      toast.error("Upload failed", { description: msg });
    } finally {
      setUploading(false);
    }
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-background text-foreground">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <PageHeader
            title="Photographer Lane"
            description="Upload photos and automatically remove backgrounds. Select a checked-in guest first, then upload their photos."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/checkin">
                    <UserCheck className="size-4" />
                    Check-in
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={loadCheckins}>
                  <RefreshCw className="size-4" />
                  Refresh
                </Button>
              </div>
            }
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5" />
                Upload Photos
              </CardTitle>
              <CardDescription>
                Select a guest and upload their photos. Backgrounds will be automatically removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="guest">Select Guest</Label>
                  {loadingCheckins ? (
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-input/30 px-3">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-muted-foreground">Loading guests...</span>
                    </div>
                  ) : checkins.length === 0 ? (
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertDescription>
                        No guests checked in yet.{" "}
                        <Link href="/checkin" className="underline text-primary hover:text-primary/80">
                          Add guests on the check-in page
                        </Link>{" "}
                        first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedCheckinId} onValueChange={setSelectedCheckinId}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Select a guest" />
                      </SelectTrigger>
                      <SelectContent>
                        {checkins.map((checkin) => (
                          <SelectItem key={checkin.id} value={checkin.id}>
                            <span className="font-medium">{checkin.name}</span>
                            <span className="ml-2 text-muted-foreground">{checkin.email}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add new guests on the check-in page; refresh to pull the latest list.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Select Photos</Label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept="image/*"
                    required
                    multiple
                    disabled={!selectedCheckin}
                    className="w-full rounded-xl border border-dashed border-border bg-input/30 px-3 py-4 text-sm text-foreground transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:border-primary/50 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={uploading || !selectedCheckin}
                  className="w-full sm:w-auto"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Upload & remove background
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Photos are processed through the MODNet background remover, then stored for review before delivery.
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </EventAccessGate>
  );
}
