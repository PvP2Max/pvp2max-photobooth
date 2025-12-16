"use client";

import type { FormEvent } from "react";

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

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  newEventName,
  setNewEventName,
  newPlan,
  setNewPlan,
  newMode,
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] px-4">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create event</h2>
          <button
            onClick={onClose}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Close
          </button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--color-text-muted)]">
            Event name
            <input
              required
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Plan
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            >
              <option value="event-basic">Event Basic ($10)</option>
              <option value="event-unlimited">Event Unlimited ($20)</option>
              <option value="event-ai">Event AI ($30)</option>
              <option value="photographer-event">Photographer Event ($100)</option>
              {hasPhotographerSubscription && (
                <option value="photographer-monthly">Photographer Monthly ($250)</option>
              )}
            </select>
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Mode
            <select
              value={newMode}
              onChange={(e) => setNewMode(e.target.value as "self-serve" | "photographer")}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            >
              <option value="self-serve">Self-serve</option>
              <option value="photographer">Photographer</option>
            </select>
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Allowed selections (photographer mode)
            <input
              type="number"
              min={1}
              value={newAllowedSelections}
              onChange={(e) => setNewAllowedSelections(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Event date
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="text-sm text-[var(--color-text-muted)]">
            Event time
            <input
              type="time"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={newAllowBgRemoval}
              onChange={(e) => setNewAllowBgRemoval(e.target.checked)}
            />
            Allow background removal
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={newAllowAiBg}
              onChange={(e) => setNewAllowAiBg(e.target.checked)}
            />
            Allow AI backgrounds
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={newAllowAiFilters}
              onChange={(e) => setNewAllowAiFilters(e.target.checked)}
            />
            Allow AI filters
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={newDeliverySms}
              onChange={(e) => setNewDeliverySms(e.target.checked)}
            />
            Enable SMS (coming soon)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={newGalleryPublic}
              onChange={(e) => setNewGalleryPublic(e.target.checked)}
            />
            Public gallery
          </label>
          <label className="text-sm text-[var(--color-text-muted)] md:col-span-2">
            Overlay theme
            <select
              value={newOverlayTheme}
              onChange={(e) => setNewOverlayTheme(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--color-text)] focus:border-[var(--input-border-focus)] focus:outline-none"
            >
              <option value="none">None</option>
              <option value="custom-request">Custom (Arctic Aura Designs)</option>
            </select>
          </label>
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border-subtle)] transition hover:bg-[var(--color-surface-elevated)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[var(--gradient-brand)] px-5 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-[0_12px_30px_rgba(155,92,255,0.3)] transition hover:opacity-90"
            >
              Save event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
