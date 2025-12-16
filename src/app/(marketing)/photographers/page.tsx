import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  "Check-in guests by name, email, or phone",
  "Upload sets of photos for each guest",
  "Let guests pick their favorites on a tablet",
  "Apply AI backgrounds and overlays to selected images",
  "Deliver final photos instantly via download link",
];

export default function PhotographersPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">BoothOS for Photographers & Event Pros</h1>
        <p className="text-sm text-muted-foreground">
          Add a smart photo booth to your packages without buying a $2,000 hardware rig.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Photographer Mode Features</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Photographer Mode starts at $100 per event or $250 per month for unlimited events. It's
              designed to be resold as a premium add-on in your packages.
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link href="#">
              Book a Photographer Mode demo
            </Link>
          </Button>
        </Card>

        <div className="flex h-full items-center">
          <div className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-secondary p-8 text-center text-sm text-muted-foreground">
            <div className="h-20 w-20 rounded-2xl bg-card ring-1 ring-border" />
            <p>Photographer workflow mockup</p>
            <p>Drop an illustration here to show guest selection and instant delivery.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
