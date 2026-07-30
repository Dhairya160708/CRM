import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClients } from "@/lib/queries/clients";
import { ClientsTable } from "@/components/clients/clients-table";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  const clients = await getClients(session!);
  const serialized = clients.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));

  return <ClientsTable initialClients={serialized} />;
}
