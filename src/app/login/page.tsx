import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r bg-white px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="text-sm font-semibold">
          Supplier Onboarding
        </Link>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Give suppliers one secure path from invitation to approved documents.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Buyers manage completion, suppliers submit without an account, and expiry reminders keep
            records clean after onboarding.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <LoginForm />
      </section>
    </main>
  );
}
