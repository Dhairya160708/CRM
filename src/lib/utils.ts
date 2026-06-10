import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD"
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${year}-${random}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  INQUIRY: "Inquiry",
  SOURCING: "Sourcing",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In Production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  INQUIRY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SOURCING: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  QUOTED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  NEGOTIATING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CONFIRMED: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  IN_PRODUCTION: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  SHIPPED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  DELIVERED: "bg-green-500/20 text-green-400 border-green-500/30",
  CLOSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-500/20 text-gray-400",
  NORMAL: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  URGENT: "bg-red-500/20 text-red-400",
};
