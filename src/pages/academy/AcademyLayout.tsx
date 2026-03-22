import React from "react";
import { Link, useRouterState, Outlet } from "@tanstack/react-router";
import {
  BookOpen,
  Code2,
  Target,
  FolderKanban,
  LayoutDashboard,
  GraduationCap,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppyTutorOpenTab,
  AppyTutorPanel,
  useAppyTutorPanelVisibility,
} from "@/components/academy/AppyTutorPanel";
import { AppyTutorFloatingLauncher } from "@/components/academy/AppyTutorLauncher";
import { AcademyTutorEditorProvider } from "@/contexts/AcademyTutorEditorContext";

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
  const [tutorOpen, setTutorOpen] = useAppyTutorPanelVisibility("ai");

  return (
    <AcademyTutorEditorProvider>
    <div className="flex h-full min-h-0 bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shrink-0 h-full min-h-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              AI Academy
            </span>
          </div>
        </div>
        <nav className="p-2 flex-1 min-h-0 overflow-y-auto">
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
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            aria-label="Back to main menu"
          >
            <Home className="h-4 w-4 shrink-0" />
            Main menu
          </Link>
        </div>
      </aside>
      {/* Main + Appy Buddy */}
      <div className="flex flex-1 min-h-0 min-w-0">
        <main className="relative flex-1 min-w-0 overflow-auto">
          {!tutorOpen && (
            <AppyTutorFloatingLauncher
              variant="indigo"
              onOpen={() => setTutorOpen(true)}
            />
          )}
          <Outlet />
        </main>
        {tutorOpen ? (
          <AppyTutorPanel
            variant="indigo"
            academy="ai"
            onDismiss={() => setTutorOpen(false)}
          />
        ) : (
          <AppyTutorOpenTab
            variant="indigo"
            onOpen={() => setTutorOpen(true)}
          />
        )}
      </div>
    </div>
    </AcademyTutorEditorProvider>
  );
}
