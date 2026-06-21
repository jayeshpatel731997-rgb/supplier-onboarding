import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "$0",
    copy: "For light supplier onboarding.",
    features: ["Up to 5 suppliers", "Document collection", "Buyer dashboard", "Manual reminders"],
    action: "Start free",
    href: "/login",
  },
  {
    name: "Pro",
    price: "$199/month",
    copy: "For procurement teams that need automation.",
    features: ["Unlimited suppliers", "Claude PDF expiry extraction", "Automated reminder cron", "Expiry alerts at 90/60/30/7 days"],
    action: "Upgrade to Pro",
    href: "/api/create-checkout",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold">
            Supplier Onboarding
          </Link>
          <Button variant="outline" render={<Link href="/login" />}>
            Log in
          </Button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">Simple pricing for supplier onboarding.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Start with manual collection, then upgrade when automation and unlimited supplier records save real procurement time.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.name} className="rounded-lg">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-3xl font-semibold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">{plan.copy}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="text-teal-700" />
                    {feature}
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                {plan.name === "Pro" ? (
                  <form action="/api/create-checkout" method="post" className="w-full">
                    <Button className="w-full">{plan.action}</Button>
                  </form>
                ) : (
                  <Button className="w-full" variant="outline" render={<Link href={plan.href} />}>
                    {plan.action}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
