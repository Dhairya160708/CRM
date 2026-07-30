import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProducts } from "@/lib/queries/products";
import { ProductsTable } from "@/components/products/products-table";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await getServerSession(authOptions);
  const products = await getProducts(session!);

  return <ProductsTable initialProducts={products} />;
}
