import SavingsCalculator from "@/app/components/SavingsCalculator";
import { Card, CardContent } from "@/components/ui/card";

export default function SavingsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">BoothOS vs Traditional Photo Booth Rentals</h1>
        <p className="text-sm text-muted-foreground">
          Most events pay $650 or more to rent a photo booth for a few hours. BoothOS lets you keep
          the fun and lose the rental fee.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Typical rental cost ≈ $650 per event. BoothOS per-event plans: Free, $10, $20, $30. One-time
          gear cost ≈ $200 for tripod + ring light + optional backdrop.
        </p>
        <div className="space-y-4 rounded-2xl bg-secondary p-5 ring-1 ring-border">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Estimate Your Savings</h2>
            <p className="text-sm text-muted-foreground">
              Compare your local rental prices against BoothOS plans and your one-time gear cost.
            </p>
          </div>
          <SavingsCalculator />
        </div>
      </Card>
    </div>
  );
}
