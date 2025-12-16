"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, Camera, Monitor, UserPlus } from "lucide-react";
import { toast } from "sonner";
import EventAccessGate from "../event-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Checkin = { id: string; name: string; email: string; createdAt: string };

export default function CheckinPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCheckins() {
    try {
      const response = await fetch("/api/checkins");
      const payload = (await response.json()) as { checkins?: Checkin[]; error?: string };
      if (!response.ok || !payload.checkins) {
        throw new Error(payload.error || "Could not load check-ins.");
      }
      setCheckins(payload.checkins);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load check-ins.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCheckins();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const payload = (await response.json()) as { checkin?: Checkin; error?: string };
      if (!response.ok || !payload.checkin) {
        throw new Error(payload.error || "Unable to check in.");
      }
      toast.success("Guest checked in successfully", {
        description: "The photographer dropdown has been updated.",
      });
      setName("");
      setEmail("");
      loadCheckins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check in.";
      setError(msg);
      toast.error("Check-in failed", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <EventAccessGate>
      <div className="min-h-screen bg-background text-foreground">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(155,92,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_20%),radial-gradient(circle_at_60%_70%,rgba(155,92,255,0.08),transparent_30%)]" />
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <PageHeader
            title="Guest Check-in"
            description="Collect name and email before the photoshoot. The photographer can then select guests from a dropdown."
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/photographer">
                    <Camera className="size-4" />
                    Photographer
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/review">
                    <Monitor className="size-4" />
                    Review
                  </Link>
                </Button>
              </div>
            }
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5" />
                New Check-in
              </CardTitle>
              <CardDescription>
                Enter the guest&apos;s details to add them to the photographer dropdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Taylor Brooks"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="family@example.com"
                  />
                </div>
                <Button type="submit" variant="gradient" disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      Check in guest
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Check-ins</CardTitle>
                  <CardDescription>
                    Guests checked in today
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadCheckins}
                  aria-label="Refresh list"
                >
                  <RefreshCw className="size-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-secondary p-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : checkins.length === 0 ? (
                <EmptyState
                  icon={<UserPlus className="size-6" />}
                  title="No check-ins yet"
                  description="Guests will appear here after they check in"
                />
              ) : (
                <div className="space-y-2">
                  {checkins.slice(0, 6).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-secondary p-3 ring-1 ring-border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                      </div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {new Date(c.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </EventAccessGate>
  );
}
