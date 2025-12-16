import Image from "next/image";
import type { Transform, Slot } from "./types";

interface TransformControlsProps {
  activeSlot: Slot | undefined;
  transform: Transform;
  previewLoading: boolean;
  onTransformChange: (transform: Transform) => void;
  onMatchBackgroundChange: (checked: boolean) => void;
  onReset: () => void;
}

export default function TransformControls({
  activeSlot,
  transform,
  previewLoading,
  onTransformChange,
  onMatchBackgroundChange,
  onReset,
}: TransformControlsProps) {
  if (!activeSlot) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-4 text-sm text-slate-300">
        Add a background slot to start.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-300">
          Final preview
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-200/80">
          <input
            type="checkbox"
            checked={activeSlot.matchBackground ?? false}
            onChange={(e) => onMatchBackgroundChange(e.target.checked)}
          />
          Auto-match to background
        </label>
      </div>
      {activeSlot.preview && (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-white/5">
          <Image
            src={activeSlot.preview as string}
            alt="Preview with background"
            width={1920}
            height={1080}
            unoptimized
            className="w-full rounded-xl"
            style={{ aspectRatio: "16/9", objectFit: "cover" }}
          />
          {previewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
              Rendering…
            </div>
          )}
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-3">
        <label className="text-xs text-slate-300/80">
          Scale
          <input
            type="range"
            min="0.25"
            max="2.5"
            step="0.01"
            value={transform.scale}
            onChange={(e) => {
              const next: Transform = {
                ...transform,
                scale: parseFloat(e.target.value),
              };
              onTransformChange(next);
            }}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-slate-300/80">
          Offset X
          <input
            type="range"
            min="-1500"
            max="1500"
            step="1"
            value={transform.offsetX}
            onChange={(e) => {
              const next: Transform = {
                ...transform,
                offsetX: parseFloat(e.target.value),
              };
              onTransformChange(next);
            }}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-slate-300/80">
          Offset Y
          <input
            type="range"
            min="-1500"
            max="1500"
            step="1"
            value={transform.offsetY}
            onChange={(e) => {
              const next: Transform = {
                ...transform,
                offsetY: parseFloat(e.target.value),
              };
              onTransformChange(next);
            }}
            className="mt-1 w-full"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
          onClick={onReset}
        >
          Reset transforms
        </button>
      </div>
    </div>
  );
}
