import { 
  Sparkles, 
  MessageSquareCode, 
  Sliders, 
  HelpCircle, 
  Zap,
  BookOpenText,
  User,
  LogIn,
  Target
} from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { HelpDialog } from "./HelpDialog"; // Import the new dialog
import { SettingsList } from "./SettingsList";
// Advanced features temporarily disabled for core stability
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { UserDropdown } from "@/components/UserDropdown";
// import { UserProfile } from "@/components/auth/UserProfile";

// Menu items with custom Applaa-themed icons.
const items = [
  {
    title: "Apps",
    to: "/",
    icon: Sparkles, // AI magic for app creation
    gradient: "from-purple-500 to-pink-500",
  },
  // 🚀 MVP: Chat tab removed - chat is integrated within each app context
  // {
  //   title: "Chat",
  //   to: "/chat", 
  //   icon: MessageSquareCode, // Code-focused chat
  //   gradient: "from-blue-500 to-cyan-500",
  // },
  // {
  //   title: "Library",
  //   to: "/library",
  //   icon: BookOpen,
  // }, // Disabled for MVP

  {
    title: "Settings",
    to: "/settings",
    icon: Sliders, // More modern settings icon
    gradient: "from-gray-500 to-gray-600",
  },
  {
    title: "Hub",
    to: "/hub",
    icon: Zap, // Energy/power for marketplace
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Docs",
    to: "/docs",
    icon: BookOpenText,
    gradient: "from-emerald-500 to-teal-500",
  },
];

// Hover state types
type HoverState =
  | "start-hover:app"
  | "start-hover:chat"
  | "start-hover:settings"
  | "clear-hover"
  | "no-hover";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false); // State for dialog
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);
  
  // Authentication state
  // Advanced features temporarily disabled for core stability
  const { isAuthenticated, user, isLoading: isAuthLoading } = useSupabaseAuth();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  
  // Authentication state is now managed by useSupabaseAuth hook

  useEffect(() => {
    if (hoverState.startsWith("start-hover") && state === "collapsed") {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);

  const routerState = useRouterState();
  const isAppRoute =
    routerState.location.pathname === "/" ||
    routerState.location.pathname.startsWith("/app-details");
  const isChatRoute = routerState.location.pathname === "/chat";
  const isSettingsRoute = routerState.location.pathname.startsWith("/settings");

  let selectedItem: string | null = null;
  if (hoverState === "start-hover:app") {
    selectedItem = "Apps";
  } else if (hoverState === "start-hover:chat") {
    selectedItem = "Chat";
  } else if (hoverState === "start-hover:settings") {
    selectedItem = "Settings";
  } else if (state === "expanded") {
    if (isAppRoute) {
      selectedItem = "Apps";
    } else if (isChatRoute) {
      selectedItem = "Chat";
    } else if (isSettingsRoute) {
      selectedItem = "Settings";
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
    >
      <SidebarContent className="overflow-hidden flex flex-col h-full">
        <div className="flex flex-1 mt-8 min-h-0">
          {/* Left Column: Menu items */}
          <div className="flex-shrink-0">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
            />
            <AppIcons onHoverChange={setHoverState} />
          </div>
          {/* Right Column: Chat List Section */}
          <div className="w-[240px] flex flex-col min-h-0 flex-1">
            <AppList show={selectedItem === "Apps"} />
            {/* 🚀 MVP: ChatList removed - chat integrated within apps */}
            {/* <ChatList show={selectedItem === "Chat"} /> */}
            <SettingsList show={selectedItem === "Settings"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <div className="flex flex-col gap-2">
            {/* Authentication Button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                size="sm"
                className="font-medium w-14 h-auto flex flex-col items-center gap-2 py-3 px-2 mb-2 rounded-2xl"
                onClick={() => {
                  if (isAuthenticated) {
                    setIsUserDropdownOpen(!isUserDropdownOpen);
                  } else {
                    setIsAuthDialogOpen(true);
                  }
                }}
              >
                <div className={`p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${
                  isAuthenticated 
                    ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                }`}>
                  {isAuthenticated ? (
                    <User className="h-5 w-5 text-white" />
                  ) : (
                    <LogIn className="h-5 w-5 text-white" />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {isAuthLoading ? "..." : isAuthenticated ? (
                    user?.fullName 
                      ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : user?.email?.[0].toUpperCase() || "U"
                  ) : "Sign In"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Help Button */}
            <SidebarMenuItem>
              <SidebarMenuButton
                size="sm"
                className="font-medium w-14 h-auto flex flex-col items-center gap-2 py-3 px-2 mb-2 rounded-2xl"
                onClick={() => setIsHelpDialogOpen(true)}
              >
                <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Help
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>

          {/* Dialogs */}
          <AuthDialog
            open={isAuthDialogOpen}
            onOpenChange={setIsAuthDialogOpen}
          />
          <HelpDialog
            isOpen={isHelpDialogOpen}
            onClose={() => setIsHelpDialogOpen(false)}
          />
          <UserDropdown
            isOpen={isUserDropdownOpen}
            onClose={() => setIsUserDropdownOpen(false)}
          />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
}: {
  onHoverChange: (state: HoverState) => void;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    // When collapsed: only show the main menu
    <SidebarGroup className="pr-0">
      {/* <SidebarGroupLabel>Applaa</SidebarGroupLabel> */}

      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  className="font-medium w-14 h-auto"
                >
                  <Link
                    to={item.to}
                    className={`flex flex-col items-center gap-2 py-3 px-2 mb-2 rounded-2xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      isActive ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20" : ""
                    }`}
                    onMouseEnter={() => {
                      if (item.title === "Apps") {
                        onHoverChange("start-hover:app");
                      } else if (item.title === "Chat") {
                        onHoverChange("start-hover:chat");
                      } else if (item.title === "Settings") {
                        onHoverChange("start-hover:settings");
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={`p-2 rounded-xl bg-gradient-to-r ${item.gradient} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {item.title}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
