import React from "react";
import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import { BookMarked, LayoutDashboard, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppyTutorOpenTab,
  AppyTutorPanel,
  useAppyTutorPanelVisibility,
} from "@/components/academy/AppyTutorPanel";
import { AppyTutorFloatingLauncher } from "@/components/academy/AppyTutorLauncher";

const navItems = [
  { to: "/learning-academy", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learning-academy/curriculum", label: "Curriculum", icon: BookMarked },
  { to: "/learning-academy/schedule", label: "Year 11 schedule", icon: Calendar },
];

export function LearningAcademyLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [tutorOpen, setTutorOpen] = useAppyTutorPanelVisibility("learning");

  return (
    <div className="flex h-full min-h-0 bg-gray-50 dark:bg-gray-950">
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0 h-full min-h-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <BookMarked className="h-7 w-7 text-teal-600" />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              Learning Academy
            </span>
          </div>
        </div>
        <nav className="p-2 flex-1 min-h-0 overflow-y-auto">
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
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            aria-label="Back to main menu"
          >
            <Home className="h-4 w-4 shrink-0" />
            Main menu
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 min-h-0 min-w-0">
        <main className="relative flex-1 min-w-0 overflow-auto">
          {!tutorOpen && (
            <AppyTutorFloatingLauncher
              variant="teal"
              onOpen={() => setTutorOpen(true)}
            />
          )}
          <Outlet />
        </main>
        {tutorOpen ? (
          <AppyTutorPanel
            variant="teal"
            academy="learning"
            onDismiss={() => setTutorOpen(false)}
          />
        ) : (
          <AppyTutorOpenTab
            variant="teal"
            onOpen={() => setTutorOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
