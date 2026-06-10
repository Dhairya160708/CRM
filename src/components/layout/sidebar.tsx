"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Factory,
  Mail,
  Package,
  BarChart3,
  Settings,
  Shield,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { href: "/clients", label: "Clients", icon: Users, roles: ["ADMIN", "MANAGER"] },
  { href: "/manufacturers", label: "Manufacturers", icon: Factory, roles: ["ADMIN", "MANAGER"] },
  { href: "/emails", label: "Email Inbox", icon: Mail, roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { href: "/products", label: "Products", icon: Package, roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER", "VIEWER"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "VIEWER";
  const isDemo = !!session?.user?.isDemo;
  const DEMO_DISABLED_HREFS = ["/reports", "/settings"];

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      item.roles.includes(role) ||
      (isDemo && DEMO_DISABLED_HREFS.includes(item.href))
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-navy-900 border-r border-border flex flex-col z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-teal-crm/20 border border-teal-crm/40 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-teal-crm" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-none">MedTrade</div>
          <div className="text-xs text-muted-foreground mt-0.5">CRM</div>
        </div>
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isDisabledForDemo = isDemo && DEMO_DISABLED_HREFS.includes(item.href);

            if (isDisabledForDemo) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground/40 cursor-not-allowed select-none"
                      aria-disabled="true"
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    This feature is not available for demo
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-teal-crm/15 text-teal-crm border border-teal-crm/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-teal-crm" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-teal-crm opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* User info */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
          <div className="w-7 h-7 rounded-full bg-teal-crm/20 border border-teal-crm/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-teal-crm">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {session?.user?.name ?? "User"}
            </div>
            <div className="text-xs text-muted-foreground">{role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
