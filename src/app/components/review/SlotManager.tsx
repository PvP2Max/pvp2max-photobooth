import type { Slot, BackgroundState } from "./types";

interface SlotManagerProps {
  slots: Slot[];
  currentSlotId: string | null;
  backgrounds: BackgroundState[];
  onSlotClick: (slotId: string) => void;
  onDuplicateSlot: (slotId: string) => void;
  onRemoveSlot: (slotId: string) => void;
}

export default function SlotManager({
  slots,
  currentSlotId,
  backgrounds,
  onSlotClick,
  onDuplicateSlot,
  onRemoveSlot,
}: SlotManagerProps) {
  const activeSlot = slots.find((s) => s.id === currentSlotId) || slots[0];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const backgroundName = backgrounds.find(
            (bg) => bg.id === slot.backgroundId,
          )?.name;
          const active = slot.id === currentSlotId;
          return (
            <button
              key={slot.id}
              onClick={() => onSlotClick(slot.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-cyan-300 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
              }`}
            >
              {backgroundName || "Slot"} {slot.preview ? "✓" : ""}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-muted)]">
        {activeSlot && (
          <>
            <button
              className="rounded-full bg-[rgba(155,92,255,0.14)] px-3 py-1 font-semibold ring-1 ring-[rgba(155,92,255,0.35)] text-[var(--color-text)]"
              onClick={() => onDuplicateSlot(activeSlot.id)}
            >
              Duplicate slot
            </button>
            {slots.length > 1 && (
              <button
                className="rounded-full bg-[rgba(249,115,115,0.14)] px-3 py-1 font-semibold ring-1 ring-[rgba(249,115,115,0.35)] text-[var(--color-text)]"
                onClick={() => onRemoveSlot(activeSlot.id)}
              >
                Remove slot
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
