import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Gamepad2, GraduationCap, Box, ChevronDown } from "lucide-react";
import { useSetAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AppFilterType = "web" | "mobile" | "game" | "minecraft" | "learn";

interface AppTypeFilterProps {
  onChange: (filterType: AppFilterType) => void;
  defaultValue?: AppFilterType;
}

const filterOptions = [
  { value: "game", label: "Game Apps", icon: Gamepad2, color: "text-purple-600" },
  { value: "web", label: "Web Apps", icon: Monitor, color: "text-blue-600" },
  { value: "mobile", label: "Mobile Apps", icon: Smartphone, color: "text-green-600" },
  { value: "minecraft", label: "Minecraft Mods", icon: Box, color: "text-lime-600" },
  { value: "learn", label: "Learning Apps", icon: GraduationCap, color: "text-indigo-600" },
] as const;

export function AppTypeFilter({ onChange, defaultValue = "web" }: AppTypeFilterProps) {
  const [selectedFilter, setSelectedFilter] = useState<AppFilterType>(defaultValue);
  const setDropdownOpen = useSetAtom(dropdownOpenAtom);

  // Load from localStorage on initial mount
  useEffect(() => {
    const savedFilter = localStorage.getItem("applaa-app-filter") as AppFilterType | null;
    if (savedFilter && ["web", "mobile", "game", "minecraft", "learn"].includes(savedFilter)) {
      setSelectedFilter(savedFilter);
      onChange(savedFilter);
    }
  }, [onChange]);

  const handleFilterChange = (value: string) => {
    const filterType = value as AppFilterType;
    setSelectedFilter(filterType);
    onChange(filterType);

    // Save to localStorage
    localStorage.setItem("applaa-app-filter", filterType);
  };

  const selectedOption = filterOptions.find(opt => opt.value === selectedFilter);
  const SelectedIcon = selectedOption?.icon || Monitor;

  return (
    <div className="px-2 py-2">
      <Select
        value={selectedFilter}
        onValueChange={handleFilterChange}
        onOpenChange={(open) => setDropdownOpen(open)}
      >
        <SelectTrigger
          className="w-full h-10 bg-background border-input hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center gap-2 w-full">
            <SelectedIcon className={`h-4 w-4 ${selectedOption?.color || 'text-foreground'}`} />
            <SelectValue placeholder="Filter apps..." />
          </div>
        </SelectTrigger>
        <SelectContent className="z-50 max-h-[300px]">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem
                key={option.value}
                value={option.value}
                className="cursor-pointer py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${option.color}`} />
                  <span className="font-medium">{option.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
