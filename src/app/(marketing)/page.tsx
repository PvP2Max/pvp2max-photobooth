import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const benefits = [
  "Save hundreds vs traditional booth rentals",
  "Works with any modern iPad or smartphone",
  "AI background removal and custom overlays",
  "Guests get instant download links by email or text",
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 overflow-hidden rounded-3xl bg-card px-8 py-12 ring-1 ring-border lg:grid-cols-[1.25fr,1fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI-powered booth software
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Turn Any iPad Into a Smart Photo Booth
            </h1>
            <p className="text-lg text-muted-foreground">
              BoothOS is an AI-powered photo booth for events. Skip the $650 rental and run your own
              booth with just an iPad, a ring light, and our software.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="gradient" size="lg" asChild>
                <Link href="/get-started">
                  Start Free Booth
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <Link href="#">
                  Watch 60-second demo
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Free plan includes 50 photos. No credit card required.
            </p>
          </div>
        </div>

        <div className="relative isolate rounded-3xl bg-secondary p-6 ring-1 ring-border">
          <div className="absolute -right-8 top-6 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -left-6 bottom-4 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Live Booth Session</p>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/35">
                Background-free
              </Badge>
            </div>
            <div className="grid gap-3">
              {[
                "Background-free capture",
                "Countdown + filters",
                "Email or text link delivery",
                "Auto cleanup after send",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border"
                >
                  <span className="text-sm">{item}</span>
                  <span className="h-2 w-2 rounded-full bg-primary/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Trusted for weddings, school dances, military balls, graduations, birthdays, and small business pop-ups.
      </p>

      <section className="space-y-6">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold">Why BoothOS?</h2>
          <p className="text-sm text-muted-foreground">
            Keep the booth experience guests love while you stay in control of costs, branding, and
            delivery.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {benefits.map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <p className="text-base">{item}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" asChild>
            <Link href="/how-it-works">
              See how it works
            </Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/pricing">
              View pricing
            </Link>
          </Button>
        </div>
      </section>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold">Perfect for these kinds of events</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "House parties & birthdays",
            "Weddings & receptions",
            "School dances & graduations",
            "Military balls & unit events",
            "Small business promos & pop-ups",
          ].map((label) => (
            <Badge key={label} variant="secondary" className="px-4 py-2 text-sm">
              {label}
            </Badge>
          ))}
        </div>
      </Card>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold">Two ways to run your booth</h2>
          <p className="text-sm text-muted-foreground">
            Choose the flow that matches your event size and staffing.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Self-Service Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Set up an iPad or iPhone with a ring light and let guests run the booth themselves.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                <li>• Perfect for parties, school dances, and unit socials</li>
                <li>• Guests tap, pose, and snap</li>
                <li>• AI background removal on paid plans</li>
                <li>• Instant delivery via email or text</li>
              </ul>
              <Button variant="secondary" asChild>
                <Link href="/pricing">
                  See self-service plans
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Photographer Mode</h3>
                <p className="text-sm text-muted-foreground">
                  You or a hired photographer control the camera. Guests check in and pick their favorites.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                <li>• Check-in by name, email, or phone</li>
                <li>• Upload sets of photos for each guest</li>
                <li>• Guests select their favorites on a tablet</li>
                <li>• Great for weddings, formal events, and premium packages</li>
              </ul>
              <Button variant="secondary" asChild>
                <Link href="/photographers">
                  Learn about Photographer Mode
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="p-6 space-y-5">
        <h2 className="text-3xl font-semibold">BoothOS vs traditional photo booth rentals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl bg-secondary p-4 ring-1 ring-border">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">BoothOS</p>
            <ul className="space-y-2 text-sm">
              <li>• $0–$30 per event</li>
              <li>• One-time gear cost around $200</li>
              <li>• Unlimited reuse across multiple events</li>
              <li>• AI backgrounds, overlays, and instant downloads</li>
              <li>• You control the experience</li>
            </ul>
          </div>
          <div className="space-y-2 rounded-2xl bg-secondary p-4 ring-1 ring-border">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Traditional rental</p>
            <ul className="space-y-2 text-sm">
              <li>• $400–$1,000 per event</li>
              <li>• Limited to a 3–4 hour window</li>
              <li>• No reuse after the event</li>
              <li>• Often generic templates</li>
              <li>• Vendor schedule and rules</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4 ring-1 ring-border">
          <p className="text-sm text-muted-foreground">
            Even if you only run one event, BoothOS can be cheaper than renting a traditional booth once.
          </p>
          <Button variant="gradient" asChild>
            <Link href="/pricing">
              View plans &amp; pricing
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-3xl font-semibold">Real-world example</h2>
        <p className="text-base text-muted-foreground">
          At a unit holiday party with 120 guests, BoothOS ran on a single iPad with a ring light. Guests took over
          230 photos in three hours. The host saved more than $400 compared to renting a traditional booth and had a
          full gallery ready before the event ended.
        </p>
      </Card>

      <Card className="p-6 text-center space-y-4">
        <h2 className="text-3xl font-semibold">Ready to run your first booth?</h2>
        <p className="text-base text-muted-foreground">
          Have a party, ball, or event coming up? You can be set up in under 15 minutes with BoothOS.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="gradient" size="lg" asChild>
            <Link href="/get-started">
              Start Free Booth
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/photographers">
              Learn about Photographer Mode
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
