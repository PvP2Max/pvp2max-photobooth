import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string;
  tagline: string;
  bullets: string[];
  cta: string;
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0 / event",
    tagline: "Test the booth or run small events.",
    bullets: [
      "Up to 10 photos",
      "Self-service booth mode",
      "Basic overlays",
      "No AI features",
      "BoothOS watermark on photos",
    ],
    cta: "Start Free",
  },
  {
    name: "Basic",
    price: "$10 / event",
    tagline: "Perfect for small parties.",
    bullets: [
      "Up to 50 photos",
      "AI background removal",
      "Email delivery",
      "Host gallery with ZIP download",
      "No watermarks",
    ],
    cta: "Choose Basic",
  },
  {
    name: "Pro",
    price: "$20 / event",
    tagline: "Great for medium-sized events.",
    bullets: [
      "Up to 100 photos",
      "AI background removal",
      "Email & SMS delivery",
      "Host gallery with ZIP download",
      "Premium filters",
    ],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    name: "Unlimited",
    price: "$30 / event",
    tagline: "For hosts who want full control and AI features.",
    bullets: [
      "Unlimited photos",
      "AI background removal",
      "10 AI credits for backgrounds & filters",
      "Email & SMS delivery",
      "Host gallery with ZIP download",
    ],
    cta: "Choose Unlimited",
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Plans & Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Run your own booth for less than the cost of renting a traditional photo booth.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "relative flex h-full flex-col",
              plan.highlight && "ring-2 ring-primary"
            )}
          >
            <CardContent className="flex flex-col gap-4 p-5 h-full">
              {plan.highlight && (
                <Badge variant="default" className="absolute right-4 top-4">
                  Most Popular
                </Badge>
              )}
              <div className="space-y-1">
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className="text-sm text-primary">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight ? "gradient" : "secondary"}
                className="mt-auto w-fit"
                asChild
              >
                <Link href="/get-started">
                  {plan.cta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Photographer Plans</h2>
          <p className="text-sm text-muted-foreground">
            Offer on-site selection and instant delivery as part of your photo packages.
            Perfect for professional photographers and event businesses.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Photographer Event</p>
                <p className="text-sm text-primary">$100 / event</p>
                <p className="text-sm text-muted-foreground">
                  One-time event purchase with full features.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Unlimited photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>10 AI credits (backgrounds & filters)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Add collaborators to event</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Photographer mode with guest selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Email & SMS delivery</span>
                </li>
              </ul>
              <Button variant="secondary" className="mt-auto w-fit" asChild>
                <Link href="/get-started">
                  Choose Event Plan
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Photographer Subscription</p>
                <p className="text-sm text-primary">$250 / month</p>
                <p className="text-sm text-muted-foreground">
                  Monthly subscription for unlimited events.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Unlimited events per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>10 AI credits/month (shared across events)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Add collaborators to events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Photographer mode with guest selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <span>Email & SMS delivery</span>
                </li>
              </ul>
              <Button variant="secondary" className="mt-auto w-fit" asChild>
                <Link href="/get-started">
                  Choose Subscription
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground">
          Most traditional photo booth rentals cost between $400 and $1,000 per event. With BoothOS,
          you only pay per event or get unlimited events with a monthly subscription.
        </p>
      </Card>
    </div>
  );
}
