import React, { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone, Gamepad2 } from "lucide-react";

export type AppFilterType = "web" | "mobile" | "game";

interface AppTypeFilterProps {
  onChange: (filterType: AppFilterType) => void;
  defaultValue?: AppFilterType;
}

export function AppTypeFilter({ onChange, defaultValue = "web" }: AppTypeFilterProps) {
  const [selectedFilter, setSelectedFilter] = useState<AppFilterType>(defaultValue);

  // Load from localStorage on initial mount
  useEffect(() => {
    const savedFilter = localStorage.getItem("applaa-app-filter") as AppFilterType | null;
    if (savedFilter && (savedFilter === "web" || savedFilter === "mobile" || savedFilter === "game")) {
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

  return (
    <div className="px-2 py-2">
      <RadioGroup 
        value={selectedFilter} 
        onValueChange={handleFilterChange}
        className="flex gap-0.5"
      >
        <div className="flex items-center flex-1 min-w-0">
          <RadioGroupItem value="game" id="filter-game" className="sr-only peer" />
          <Label 
            htmlFor="filter-game"
            className={`flex items-center gap-1 px-1.5 py-1 text-xs rounded-md cursor-pointer transition-colors flex-1 justify-center
              ${selectedFilter === "game" 
                ? "bg-purple-600 text-white" 
                : "text-muted-foreground hover:bg-muted"}`}
          >
            <Gamepad2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Game</span>
          </Label>
        </div>

        <div className="flex items-center flex-1 min-w-0">
          <RadioGroupItem value="web" id="filter-web" className="sr-only peer" />
          <Label 
            htmlFor="filter-web"
            className={`flex items-center gap-1 px-1.5 py-1 text-xs rounded-md cursor-pointer transition-colors flex-1 justify-center
              ${selectedFilter === "web" 
                ? "bg-blue-600 text-white" 
                : "text-muted-foreground hover:bg-muted"}`}
          >
            <Monitor className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Web</span>
          </Label>
        </div>

        <div className="flex items-center flex-1 min-w-0">
          <RadioGroupItem value="mobile" id="filter-mobile" className="sr-only peer" />
          <Label 
            htmlFor="filter-mobile"
            className={`flex items-center gap-1 px-1.5 py-1 text-xs rounded-md cursor-pointer transition-colors flex-1 justify-center
              ${selectedFilter === "mobile" 
                ? "bg-green-600 text-white" 
                : "text-muted-foreground hover:bg-muted"}`}
          >
            <Smartphone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Mobile</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
