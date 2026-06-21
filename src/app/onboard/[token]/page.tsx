import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingByToken } from "@/lib/data";

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const onboarding = await getOnboardingByToken(params.token);

  if (!onboarding) {
    return <TokenMessage title="Invalid link" body="This onboarding link could not be found. Contact your buyer for a new invitation." />;
  }

  if (onboarding.isExpired) {
    return (
      <TokenMessage
        title="Link expired"
        body={`Contact ${onboarding.buyerSettings.company_name || "your buyer"} for a new supplier onboarding link.`}
      />
    );
  }

  if (onboarding.supplier.status === "complete") {
    return <TokenMessage title="Already submitted" body="Thank you. This supplier onboarding package has already been submitted." />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <OnboardingWizard
        token={params.token}
        supplierName={onboarding.supplier.company_name}
        buyerCompany={onboarding.buyerSettings.company_name || "your buyer"}
        documents={onboarding.documents}
      />
    </main>
  );
}

function TokenMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="max-w-md rounded-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">{body}</CardContent>
      </Card>
    </main>
  );
}
