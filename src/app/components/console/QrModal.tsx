"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface QrModalProps {
  qrData: string | null;
  qrLink: string | null;
  qrLabel: string | null;
  onClose: () => void;
}

export function QrModal({ qrData, qrLink, qrLabel, onClose }: QrModalProps) {
  return (
    <Dialog open={!!qrData} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-normal">
            {qrLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qrData && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrData}
              alt="QR code"
              className="size-48 rounded-xl bg-white p-2"
            />
          )}
          <p className="break-all text-xs text-muted-foreground max-w-full px-4">
            {qrLink}
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
