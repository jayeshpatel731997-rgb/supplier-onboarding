import Link from "next/link";
import { ArrowRight, CheckCircle2, FileWarning, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: MailCheck,
    title: "Invite by secure link",
    copy: "Send a supplier one email with the exact documents your procurement process requires.",
  },
  {
    icon: ShieldCheck,
    title: "No supplier account",
    copy: "Vendors complete the package through a time-limited token without creating another login.",
  },
  {
    icon: FileWarning,
    title: "Expiry intelligence",
    copy: "Claude reads uploaded PDFs and turns certificate dates into dashboard alerts.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Supplier Onboarding
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/pricing" />}>
              Pricing
            </Button>
            <Button render={<Link href="/login" />}>Log in</Button>
          </nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-slate-950">
            Supplier onboarding for manufacturers that need clean records before the first PO.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Invite suppliers, collect banking and compliance documents, extract expiry dates from PDFs,
            and keep procurement teams ahead of missing or stale paperwork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/login" />}>
              Start onboarding
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/pricing" />}>
              View pricing
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-slate-50 p-4 shadow-sm">
          <div className="rounded-md border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
                <h2 className="text-lg font-semibold">Supplier readiness</h2>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                Live
              </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {["Invited", "In Progress", "Complete", "Expiring Soon"].map((label, index) => (
                <div key={label} className="rounded-md border bg-white p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold">{[12, 8, 34, 5][index]}</p>
                </div>
              ))}
            </div>
            <div className="border-t p-4">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm font-medium text-slate-500">
                <span>Supplier</span>
                <span>Status</span>
                <span>Completion</span>
              </div>
              {["Apex Metals", "Midwest Fasteners", "Union Tooling"].map((supplier, index) => (
                <div key={supplier} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t py-3 text-sm">
                  <span className="font-medium">{supplier}</span>
                  <span>{["Complete", "Attention", "In Progress"][index]}</span>
                  <span>{[100, 78, 42][index]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-lg">
              <CardHeader>
                <feature.icon className="text-teal-700" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{feature.copy}</CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-10 text-sm text-slate-600">
        <CheckCircle2 className="text-teal-700" />
        Built for 50-500 person manufacturers onboarding 5-50 suppliers per year.
      </section>
    </main>
  );
}
