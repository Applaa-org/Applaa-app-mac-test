import React from "react";
import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import {
  BookOpen,
  Code2,
  Target,
  FolderKanban,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/academy", label: "Dashboard", icon: LayoutDashboard },
  { to: "/academy/learn", label: "Learn", icon: BookOpen },
  { to: "/academy/playground", label: "Playground", icon: Code2 },
  { to: "/academy/challenges", label: "Challenges", icon: Target },
  { to: "/academy/projects", label: "Projects", icon: FolderKanban },
];

export function AcademyLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <div className="flex h-[calc(100vh-var(--title-bar-height,0px))] bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              AI Academy
            </span>
          </div>
        </div>
        <nav className="p-2 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/academy"
                ? pathname === "/academy" || pathname === "/academy/"
                : to === "/academy/projects"
                  ? pathname === "/academy/projects" || pathname.startsWith("/academy/projects/")
                  : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
