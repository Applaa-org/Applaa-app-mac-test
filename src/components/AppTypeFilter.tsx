import React, { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone } from "lucide-react";

export type AppFilterType = "web" | "mobile";

interface AppTypeFilterProps {
  onChange: (filterType: AppFilterType) => void;
  defaultValue?: AppFilterType;
}

export function AppTypeFilter({ onChange, defaultValue = "web" }: AppTypeFilterProps) {
  const [selectedFilter, setSelectedFilter] = useState<AppFilterType>(defaultValue);

  // Load from localStorage on initial mount
  useEffect(() => {
    const savedFilter = localStorage.getItem("applaa-app-filter") as AppFilterType | null;
    if (savedFilter && (savedFilter === "web" || savedFilter === "mobile")) {
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
    <div className="px-3 py-2">
      <RadioGroup 
        value={selectedFilter} 
        onValueChange={handleFilterChange}
        className="flex space-x-1"
      >
        <div className="flex items-center">
          <RadioGroupItem value="web" id="filter-web" className="sr-only peer" />
          <Label 
            htmlFor="filter-web"
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors
              ${selectedFilter === "web" 
                ? "bg-blue-600 text-white" 
                : "text-muted-foreground hover:bg-muted"}`}
          >
            <Monitor className="h-3 w-3" />
            <span>Web</span>
          </Label>
        </div>

        <div className="flex items-center">
          <RadioGroupItem value="mobile" id="filter-mobile" className="sr-only peer" />
          <Label 
            htmlFor="filter-mobile"
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md cursor-pointer transition-colors
              ${selectedFilter === "mobile" 
                ? "bg-green-600 text-white" 
                : "text-muted-foreground hover:bg-muted"}`}
          >
            <Smartphone className="h-3 w-3" />
            <span>Mobile</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
