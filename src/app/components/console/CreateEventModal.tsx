"use client";

import { useState, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function getModeForPlan(plan: string): "self-serve" | "photographer" {
  return plan.startsWith("photographer") ? "photographer" : "self-serve";
}

function isPaidPlan(plan: string, hasSubscription: boolean): boolean {
  if (plan === "free") return false;
  if (plan === "photographer-event" && hasSubscription) return false;
  return true;
}

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

  const isPhotographerPlan = newPlan.startsWith("photographer");
  const requiresPayment = isPaidPlan(newPlan, hasPhotographerSubscription);
  const price = getPlanPrice(newPlan, hasPhotographerSubscription);

  const handlePlanChange = (plan: string) => {
    setNewPlan(plan);
    setNewMode(getModeForPlan(plan));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            Set up a new photobooth event for your guests
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <form id="create-event-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            {/* Event name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="event-name">Event name</Label>
              <Input
                id="event-name"
                required
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g. Sarah's Wedding"
              />
            </div>

            {/* Plan selection */}
            <div className="space-y-2 md:col-span-2">
              <Label>Plan</Label>
              <Select value={newPlan} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free - 10 photos (watermarked)</SelectItem>
                  <SelectItem value="basic">Basic - $10 (50 photos)</SelectItem>
                  <SelectItem value="pro">Pro - $20 (100 photos)</SelectItem>
                  <SelectItem value="unlimited">Unlimited - $30 (unlimited + 10 AI)</SelectItem>
                  <SelectItem value="photographer-event">
                    {hasPhotographerSubscription
                      ? "Photographer Event (FREE - included)"
                      : "Photographer Event - $100"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Allowed selections for photographer plans */}
            {isPhotographerPlan && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="allowed-selections">Allowed selections per guest</Label>
                <Input
                  id="allowed-selections"
                  type="number"
                  min={1}
                  max={20}
                  value={newAllowedSelections}
                  onChange={(e) => setNewAllowedSelections(Number(e.target.value))}
                />
              </div>
            )}

            {/* Date and Time */}
            <div className="space-y-2">
              <Label htmlFor="event-date">Event date (optional)</Label>
              <Input
                id="event-date"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Event time (optional)</Label>
              <Input
                id="event-time"
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
              />
            </div>

            {/* Advanced options toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground md:col-span-2"
            >
              <ChevronRight className={`size-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
              Advanced options
            </button>

            {/* Advanced options */}
            {showAdvanced && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Checkbox
                    id="allow-bg-removal"
                    checked={newAllowBgRemoval}
                    onCheckedChange={(checked) => setNewAllowBgRemoval(checked === true)}
                  />
                  <Label htmlFor="allow-bg-removal" className="text-sm font-normal cursor-pointer">
                    Allow background removal
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Checkbox
                    id="allow-ai-bg"
                    checked={newAllowAiBg}
                    onCheckedChange={(checked) => setNewAllowAiBg(checked === true)}
                  />
                  <Label htmlFor="allow-ai-bg" className="text-sm font-normal cursor-pointer">
                    Allow AI backgrounds
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Checkbox
                    id="allow-ai-filters"
                    checked={newAllowAiFilters}
                    onCheckedChange={(checked) => setNewAllowAiFilters(checked === true)}
                  />
                  <Label htmlFor="allow-ai-filters" className="text-sm font-normal cursor-pointer">
                    Allow AI filters
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Checkbox
                    id="delivery-sms"
                    checked={newDeliverySms}
                    onCheckedChange={(checked) => setNewDeliverySms(checked === true)}
                  />
                  <Label htmlFor="delivery-sms" className="text-sm font-normal cursor-pointer">
                    Enable SMS (coming soon)
                  </Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Checkbox
                    id="gallery-public"
                    checked={newGalleryPublic}
                    onCheckedChange={(checked) => setNewGalleryPublic(checked === true)}
                  />
                  <Label htmlFor="gallery-public" className="text-sm font-normal cursor-pointer">
                    Public gallery
                  </Label>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Overlay theme</Label>
                  <Select value={newOverlayTheme} onValueChange={setNewOverlayTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="custom-request">Custom (Arctic Aura Designs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </form>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-event-form" variant="gradient">
            {requiresPayment ? `Continue to Payment ($${price})` : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
