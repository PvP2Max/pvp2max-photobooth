import Image from "next/image";
import type { Photo } from "./types";

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onTogglePhoto: (id: string) => void;
  withPreview: (url: string, width?: number) => string;
  formatDate: (date: string) => string;
}

export default function PhotoGrid({
  photos,
  selectedPhotos,
  onTogglePhoto,
  withPreview,
  formatDate,
}: PhotoGridProps) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {photos.map((photo) => {
        const isSelected = selectedPhotos.has(photo.id);
        return (
          <article
            key={photo.id}
            className="flex flex-col gap-2 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  {photo.originalName}
                </p>
                <p className="text-xs text-slate-400">
                  Uploaded {formatDate(photo.createdAt)}
                </p>
              </div>
              <button
                onClick={() => onTogglePhoto(photo.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/50"
                    : "bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                }`}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/5">
              <Image
                src={photo.previewUrl || withPreview(photo.cutoutUrl, 900)}
                alt={`Cutout for ${photo.originalName}`}
                width={1200}
                height={800}
                unoptimized
                loading="lazy"
                className="h-48 w-full object-contain bg-gradient-to-br from-slate-900 to-slate-800"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
