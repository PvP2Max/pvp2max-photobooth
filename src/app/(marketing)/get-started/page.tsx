import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const gear = [
  "iPad or modern smartphone",
  "Sturdy tripod or tablet stand",
  '12" bi-color LED ring light (dimmable, up to ~6 ft tall)',
  "Light gray wall or backdrop placed 2–3 feet behind guests",
];

const steps = [
  "Create your BoothOS account and choose an event plan.",
  "Mount your iPad on a tripod at about 5–5.3 feet eye level.",
  "Place your ring light just above and in front of the iPad, tilted slightly downward.",
  "Position your backdrop 2–3 feet behind where guests will stand.",
  "Open your event link in BoothOS, tap into booth mode, and run a quick test shot.",
];

export default function GetStartedPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Get Started with BoothOS</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t need expensive hardware to run a great booth. Here&apos;s what we recommend for a
          clean, reliable setup.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Recommended Gear</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {gear.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Basic Setup Steps</h2>
        <ol className="space-y-3 text-sm text-muted-foreground">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-[2px] h-6 w-6 rounded-full bg-secondary text-center text-xs font-semibold leading-6 ring-1 ring-border">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              Ready to host your first event?
            </p>
            <p className="text-sm text-muted-foreground">
              Set up your event, open booth mode, and you&apos;re ready to welcome guests.
            </p>
          </div>
          <Button variant="gradient" asChild>
            <Link href="/app/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
