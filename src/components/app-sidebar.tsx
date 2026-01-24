import {
  Sparkles,
  MessageSquareCode,
  Sliders,
  HelpCircle,
  Zap,
  BookOpenText,
  User,
  LogIn,
  Target,
  Bot,
  Crown
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
import { useWordPressAuth } from "@/hooks/useWordPressAuth";

import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useProfile } from "@/hooks/useProfile";
import { CombinedAuthDialog } from "@/components/auth/CombinedAuthDialog";
import { WordPressAuthDialog } from "@/components/auth/WordPressAuthDialog";



// Menu items with dynamic colors - blue for active, gray for inactive
const items = [
  {
    title: "Apps",
    to: "/",
    icon: Sparkles, // AI magic for app creation
  },
  {
    title: "Buddy",
    to: "/browser-agent",
    icon: Bot, // Applaa Buddy - AI browser automation
  },
  // 🚀 MVP: Chat tab removed - chat is integrated within each app context
  // {
  //   title: "Chat",
  //   to: "/chat", 
  //   icon: MessageSquareCode, // Code-focused chat
  // },
  // {
  //   title: "Library",
  //   to: "/library",
  //   icon: BookOpen,
  // }, // Disabled for MVP

  {
    title: "Hub",
    to: "/hub",
    icon: Zap, // Energy/power for marketplace
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Sliders, // More modern settings icon
  },
  {
    title: "Docs",
    to: "/docs",
    icon: BookOpenText,
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

  const { isAuthenticated: isWordPressAuthenticated, user: wordpressUser, isLoading: isWordPressLoading } = useWordPressAuth();
  const { isAuthenticated: isSupabaseAuthenticated, user: supabaseUser, isLoading: isSupabaseLoading } = useSupabaseAuth();
  const { profile } = useProfile();
  const isAuthenticated = isWordPressAuthenticated || isSupabaseAuthenticated;
  const isAuthLoading = isWordPressLoading || isSupabaseLoading;
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Get subscription tier from profile
  const subscriptionTier = (profile?.subscription_tier || 'free') as 'free' | 'pro' | 'ultra' | 'business';
  const isPro = subscriptionTier === 'pro' || subscriptionTier === 'ultra' || subscriptionTier === 'business';
  const isPaidTier = isPro;


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
  const isProfileRoute = routerState.location.pathname.startsWith("/profile");
  const isHubRoute = routerState.location.pathname.startsWith("/hub");
  const isDocsRoute = routerState.location.pathname.startsWith("/docs");
  const isBrowserAgentRoute = routerState.location.pathname.startsWith("/browser-agent");

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
    } else if (isProfileRoute) {
      selectedItem = "Profile";
    } else if (isHubRoute) {
      selectedItem = "Hub";
    } else if (isDocsRoute) {
      selectedItem = "Docs";
    } else if (isBrowserAgentRoute) {
      selectedItem = "Agent";
    }
  }

  // Determine if sidebar should be expanded (18rem) or collapsed (5rem)
  const shouldExpand = selectedItem === "Apps" || selectedItem === "Settings";

  return (
    <Sidebar
      collapsible="icon"
      style={{
        '--sidebar-width': shouldExpand ? '18rem' : '5rem',
        '--sidebar-width-icon': '5rem'
      } as React.CSSProperties}
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
          {/* Right Column: Content Section - only show when there's content to display */}
          {(selectedItem === "Apps" || selectedItem === "Settings") && (
            <div className="w-[240px] flex flex-col min-h-0 flex-1">
              <AppList show={selectedItem === "Apps"} />
              {/* 🚀 MVP: ChatList removed - chat integrated within apps */}
              {/* <ChatList show={selectedItem === "Chat"} /> */}
              <SettingsList show={selectedItem === "Settings"} />
            </div>
          )}
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
                    navigate({ to: '/profile' });
                  } else {
                    setIsAuthDialogOpen(true);
                  }
                }}

              >
                <div className={`relative p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${isAuthenticated && isPro
                  ? "bg-gradient-to-r from-yellow-500 via-yellow-500 to-amber-600"
                  : isAuthenticated
                    ? "bg-gradient-to-r from-gray-500 to-gray-600"
                    : "bg-gradient-to-r from-gray-400 to-gray-500"
                  }`}>
                  {isAuthenticated ? (
                    <>
                      <User className="h-5 w-5 text-white" />
                      {isPro && (
                        <div className="absolute -top-1 -right-1 bg-yellow-600 rounded-full p-0.5">
                          <Crown className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <LogIn className="h-5 w-5 text-white" />
                  )}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${isAuthenticated && isPro
                  ? "text-yellow-700 dark:text-yellow-400 font-bold"
                  : "text-gray-700 dark:text-gray-300"
                  }`}>
                  {isAuthLoading ? "..." : isAuthenticated ? (

                    <>
                      {isSupabaseAuthenticated
                        ? (supabaseUser?.fullName || supabaseUser?.full_name || supabaseUser?.email || "U").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : wordpressUser?.display_name
                          ? wordpressUser.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          : wordpressUser?.username?.[0]?.toUpperCase() || "U"}
                      {isPro && (
                        <span className="ml-1 text-[10px]">
                          {subscriptionTier.toUpperCase()}
                        </span>
                      )}
                    </>

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
                <div className="p-2 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Help
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>

          {/* Dialogs */}
          <WordPressAuthDialog
            open={isAuthDialogOpen}
            onOpenChange={setIsAuthDialogOpen}
          />
          <HelpDialog
            isOpen={isHelpDialogOpen}
            onClose={() => setIsHelpDialogOpen(false)}
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
                    className={`flex flex-col items-center gap-2 py-3 px-2 mb-2 rounded-2xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${isActive ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20" : ""
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
                      <div className={`p-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${isActive
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : "bg-gradient-to-r from-gray-500 to-gray-600"
                        }`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className={`text-xs font-medium whitespace-nowrap ${isActive
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                        }`}>
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
