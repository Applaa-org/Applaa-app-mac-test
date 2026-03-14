import React from "react";
import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import { BookMarked, LayoutDashboard, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/learning-academy", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learning-academy/curriculum", label: "Curriculum", icon: BookMarked },
  { to: "/learning-academy/schedule", label: "Year 11 schedule", icon: Calendar },
];

export function LearningAcademyLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <div className="flex h-[calc(100vh-var(--title-bar-height,0px))] bg-gray-50 dark:bg-gray-950">
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-teal-600" />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              Learning Academy
            </span>
          </div>
        </div>
        <nav className="p-2 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/learning-academy"
                ? pathname === "/learning-academy" || pathname === "/learning-academy/"
                : to === "/learning-academy/schedule"
                  ? pathname === "/learning-academy/schedule"
                  : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-200 dark:border-gray-800">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Home className="h-4 w-4 shrink-0" />
            Main page
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
