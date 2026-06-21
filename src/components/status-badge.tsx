import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  invited: "border-amber-200 bg-amber-50 text-amber-800",
  in_progress: "border-blue-200 bg-blue-50 text-blue-800",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expired: "border-red-200 bg-red-50 text-red-800",
  attention: "border-orange-200 bg-orange-50 text-orange-800",
  uploaded: "border-blue-200 bg-blue-50 text-blue-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  const label =
    status === "in_progress"
      ? "In Progress"
      : status
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

  return (
    <Badge variant="outline" className={cn("rounded-md", statusStyles[status])}>
      {label}
    </Badge>
  );
}
