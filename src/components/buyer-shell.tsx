import Link from "next/link";
import { Building2, CreditCard, LayoutDashboard, LogOut, Settings, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BuyerShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/suppliers/new", label: "Add Supplier", icon: UserPlus },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/pricing", label: "Billing", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-teal-700 text-white">
            <Building2 />
          </span>
          Supplier Onboarding
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((item) => (
            <Button key={item.href} variant="ghost" className="justify-start" render={<Link href={item.href} />}>
              <item.icon data-icon="inline-start" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 flex flex-col gap-3 border-t pt-4 text-xs text-slate-500">
          <span className="truncate">{email}</span>
          <form action="/auth/sign-out" method="post">
            <Button variant="outline" className="w-full justify-start">
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-sm font-semibold">
              Supplier Onboarding
            </Link>
            <Button render={<Link href="/suppliers/new" />}>Add Supplier</Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
