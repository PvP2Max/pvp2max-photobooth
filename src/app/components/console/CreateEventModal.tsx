"use client";

import { useState, type FormEvent } from "react";

export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  newEventName: string;
  setNewEventName: (value: string) => void;
  newPlan: string;
  setNewPlan: (value: string) => void;
  newMode: "self-serve" | "photographer";
  setNewMode: (value: "self-serve" | "photographer") => void;
  newAllowedSelections: number;
  setNewAllowedSelections: (value: number) => void;
  newEventDate: string;
  setNewEventDate: (value: string) => void;
  newEventTime: string;
  setNewEventTime: (value: string) => void;
  newAllowBgRemoval: boolean;
  setNewAllowBgRemoval: (value: boolean) => void;
  newAllowAiBg: boolean;
  setNewAllowAiBg: (value: boolean) => void;
  newAllowAiFilters: boolean;
  setNewAllowAiFilters: (value: boolean) => void;
  newDeliverySms: boolean;
  setNewDeliverySms: (value: boolean) => void;
  newGalleryPublic: boolean;
  setNewGalleryPublic: (value: boolean) => void;
  newOverlayTheme: string;
  setNewOverlayTheme: (value: string) => void;
  hasPhotographerSubscription: boolean;
}

// Helper to determine mode from plan
function getModeForPlan(plan: string): "self-serve" | "photographer" {
  return plan.startsWith("photographer") ? "photographer" : "self-serve";
}

// Helper to check if plan is a paid plan
function isPaidPlan(plan: string, hasSubscription: boolean): boolean {
  if (plan === "free") return false;
  if (plan === "photographer-event" && hasSubscription) return false;
  return true;
}

// Get plan price
function getPlanPrice(plan: string, hasSubscription: boolean): number {
  if (plan === "free") return 0;
  if (plan === "photographer-event" && hasSubscription) return 0;
  const prices: Record<string, number> = {
    basic: 10,
    pro: 20,
    unlimited: 30,
    "photographer-event": 100,
  };
  return prices[plan] ?? 0;
}

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  newEventName,
  setNewEventName,
  newPlan,
  setNewPlan,
  setNewMode,
  newAllowedSelections,
  setNewAllowedSelections,
  newEventDate,
  setNewEventDate,
  newEventTime,
  setNewEventTime,
  newAllowBgRemoval,
  setNewAllowBgRemoval,
  newAllowAiBg,
  setNewAllowAiBg,
  newAllowAiFilters,
  setNewAllowAiFilters,
  newDeliverySms,
  setNewDeliverySms,
  newGalleryPublic,
  setNewGalleryPublic,
  newOverlayTheme,
  setNewOverlayTheme,
  hasPhotographerSubscription,
}: CreateEventModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const isPhotographerPlan = newPlan.startsWith("photographer");
  const requiresPayment = isPaidPlan(newPlan, hasPhotographerSubscription);
  const price = getPlanPrice(newPlan, hasPhotographerSubscription);

  // Auto-update mode when plan changes
  const handlePlanChange = (plan: string) => {
    setNewPlan(plan);
    setNewMode(getModeForPlan(plan));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] md:items-center md:px-4">
      <div className="flex h-[90vh] w-full flex-col rounded-t-2xl bg-[var(--color-surface)] text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)] md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] p-4 md:p-6">
          <h2 className="text-lg font-semibold">Create event</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)] md:h-auto md:w-auto md:rounded-full md:px-3 md:py-1"
          >
            <span className="hidden md:inline">Close</span>
            <svg className="h-5 w-5 md:hidden" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <form id="create-event-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            {/* Event name - full width */}
            <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
              Event name
              <input
                required
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g. Sarah's Wedding"
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>

            {/* Plan selection - full width */}
            <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
              Plan
              <select
                value={newPlan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
              >
                <option value="free">Free - 10 photos (watermarked)</option>
                <option value="basic">Basic - $10 (50 photos)</option>
                <option value="pro">Pro - $20 (100 photos)</option>
                <option value="unlimited">Unlimited - $30 (unlimited + 10 AI)</option>
                {hasPhotographerSubscription ? (
                  <option value="photographer-event">Photographer Event (FREE - included with subscription)</option>
                ) : (
                  <option value="photographer-event">Photographer Event - $100 (unlimited + collaborators)</option>
                )}
              </select>
            </label>

            {/* Allowed selections - only show for photographer plans */}
            {isPhotographerPlan && (
              <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
                Allowed selections per guest
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newAllowedSelections}
                  onChange={(e) => setNewAllowedSelections(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                />
              </label>
            )}

            {/* Date and Time */}
            <label className="text-sm text-[var(--color-text-muted)]">
              Event date (optional)
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>
            <label className="text-sm text-[var(--color-text-muted)]">
              Event time (optional)
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
              />
            </label>

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="mt-2 flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] md:col-span-2"
            >
              <svg
                className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Advanced options
            </button>

            {/* Advanced options - collapsible */}
            {showAdvanced && (
              <>
                <label className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={newAllowBgRemoval}
                    onChange={(e) => setNewAllowBgRemoval(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  Allow background removal
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={newAllowAiBg}
                    onChange={(e) => setNewAllowAiBg(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  Allow AI backgrounds
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={newAllowAiFilters}
                    onChange={(e) => setNewAllowAiFilters(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  Allow AI filters
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={newDeliverySms}
                    onChange={(e) => setNewDeliverySms(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  Enable SMS (coming soon)
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text-muted)]">
                  <input
                    type="checkbox"
                    checked={newGalleryPublic}
                    onChange={(e) => setNewGalleryPublic(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                  Public gallery
                </label>
                <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
                  Overlay theme
                  <select
                    value={newOverlayTheme}
                    onChange={(e) => setNewOverlayTheme(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="custom-request">Custom (Arctic Aura Designs)</option>
                  </select>
                </label>
              </>
            )}
          </form>
        </div>

        {/* Footer with actions */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] p-4 md:justify-end md:p-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)] md:flex-initial"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            className="flex-1 rounded-full bg-[var(--gradient-brand)] px-5 py-3 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90 md:flex-initial"
          >
            {requiresPayment ? `Continue to Payment ($${price})` : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
