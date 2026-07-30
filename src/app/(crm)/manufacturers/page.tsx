import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManufacturers } from "@/lib/queries/manufacturers";
import { ManufacturersTable } from "@/components/manufacturers/manufacturers-table";

export const metadata: Metadata = { title: "Manufacturers" };

export default async function ManufacturersPage() {
  const session = await getServerSession(authOptions);
  const manufacturers = await getManufacturers(session!);
  const serialized = manufacturers.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));

  return <ManufacturersTable initialManufacturers={serialized} />;
}
