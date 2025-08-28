import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type SettingsSection = {
  id: string;
  label: string;
  subSections?: Array<{
    id: string;
    label: string;
  }>;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "general-settings", label: "General" },
  { id: "ai-settings", label: "AI" },
  { id: "provider-settings", label: "AI Providers" },
  { 
    id: "semantic-context", 
    label: "Semantic Context", 
    subSections: [
      { id: "semantic-context-settings", label: "Smart Suggestions" },
      { id: "usage-analytics", label: "Usage Analytics" },
      { id: "privacy-processing", label: "Privacy & Local Processing" }
    ]
  },
  { 
    id: "cloud-services", 
    label: "Cloud Services", 
    subSections: [
      { id: "cloud-services-settings", label: "Authentication & Backup" },
      { id: "supabase-auth", label: "Supabase Auth" },
      { id: "r2-storage", label: "R2 Storage" }
    ]
  },
  { id: "workflow-settings", label: "Workflow" },
  { id: "telemetry", label: "Telemetry" },
  { id: "integrations", label: "Integrations" },
  { id: "experiments", label: "Experiments" },
  { id: "danger-zone", label: "Danger Zone" },
];

export function SettingsList({ show }: { show: boolean }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(
    "general-settings",
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            return;
          }
        }
      },
      { rootMargin: "-20% 0px -80% 0px", threshold: 0 },
    );

    // Observe all sections including sub-sections
    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) {
        observer.observe(el);
      }
      
      // Also observe sub-sections if they exist
      if (section.subSections) {
        for (const subSection of section.subSections) {
          const subEl = document.getElementById(subSection.id);
          if (subEl) {
            observer.observe(subEl);
          }
        }
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!show) {
    return null;
  }

  const handleScrollAndNavigateTo = async (id: string) => {
    await navigate({
      to: "/settings",
    });
    
    // If clicking on "AI", navigate to the AI Providers section since it's more important
    const targetId = id === "ai-settings" ? "provider-settings" : id;
    
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4">
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
      </div>
      <ScrollArea className="flex-grow">
        <div className="space-y-1 p-4 pt-0">
          {SETTINGS_SECTIONS.map((section) => (
            <div key={section.id}>
              {section.subSections ? (
                // Expandable section with sub-items
                <div>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                      "hover:bg-sidebar-accent",
                    )}
                  >
                    <span>{section.label}</span>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {expandedSections.has(section.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {section.subSections.map((subSection) => (
                        <button
                          key={subSection.id}
                          onClick={() => handleScrollAndNavigateTo(subSection.id)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                            activeSection === subSection.id
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent text-muted-foreground",
                          )}
                        >
                          {subSection.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular section
                <button
                  onClick={() => handleScrollAndNavigateTo(section.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "hover:bg-sidebar-accent",
                  )}
                >
                  {section.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
