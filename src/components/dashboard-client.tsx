"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import type { ExpiringDocumentItem, SupplierListItem } from "@/lib/data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function DashboardClient({
  initialSuppliers,
  expiringDocuments,
}: {
  initialSuppliers: SupplierListItem[];
  expiringDocuments: ExpiringDocumentItem[];
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("buyer-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_documents" }, refresh)
      .subscribe();

    async function refresh() {
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const data = (await response.json()) as { suppliers: SupplierListItem[] };
        setSuppliers(data.suppliers);
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesQuery =
        supplier.companyName.toLowerCase().includes(query.toLowerCase()) ||
        supplier.contactEmail.toLowerCase().includes(query.toLowerCase());
      const effectiveStatus = supplier.attention ? "attention" : supplier.status;
      const matchesStatus = status === "all" || effectiveStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status, suppliers]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="rounded-lg">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Suppliers</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 text-muted-foreground" />
              <Input className="pl-8 sm:w-72" placeholder="Search suppliers" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select
              className="h-8 rounded-lg border border-input bg-white px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="invited">Invited</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="expired">Expired</option>
              <option value="attention">Attention</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No suppliers match this view.</p>
              <p className="mt-1 text-sm text-muted-foreground">Invite a supplier or adjust your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.companyName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{supplier.contactName}</span>
                        <span className="text-xs text-muted-foreground">{supplier.contactEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={supplier.attention ? "attention" : supplier.status} />
                    </TableCell>
                    <TableCell className="min-w-40">
                      <div className="flex items-center gap-3">
                        <Progress value={supplier.completion} className="w-28" />
                        <span className="text-sm tabular-nums">{supplier.completion}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.lastActivity}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" render={<Link href={`/suppliers/${supplier.id}`} />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Documents Expiring</CardTitle>
        </CardHeader>
        <CardContent>
          {expiringDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents expire in the next 90 days.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {expiringDocuments.map((item) => (
                <div key={`${item.supplierId}-${item.document.id}`} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <Link href={`/suppliers/${item.supplierId}`} className="font-medium">
                    {item.supplierName}
                  </Link>
                  <span className="text-sm text-muted-foreground">{item.document.label}</span>
                  <span className={item.daysLeft < 30 ? "text-sm font-semibold text-red-700" : "text-sm font-semibold text-amber-700"}>
                    {item.daysLeft} days left
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
