import React from "react";
import { useSettings } from "@/hooks/useSettings";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LargeLanguageModel } from "@/lib/schemas";

interface OptionInfo {
    value: string;
    label: string;
    description: string;
}

const options: OptionInfo[] = [
    {
        value: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        description: "Google's Gemini 2.5 Pro model for high-quality planning.",
    },
    {
        value: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        description: "Google's fast Gemini 2.5 Flash model for responsive planning.",
    },
    {
        value: "gemini-3-flash-preview",
        label: "Gemini 3 Flash",
        description: "Google's next-gen Gemini 3 Flash model (Preview).",
    },
];

export const PlanningModelSelector: React.FC = () => {
    const { settings, updateSettings } = useSettings();

    const handleValueChange = (value: string) => {
        // Assuming google provider for now since we use Gemini SDK
        const newModel: LargeLanguageModel = {
            name: value,
            provider: 'google'
        };
        updateSettings({ planningModel: newModel });
    };

    // Determine the current value
    const currentValue = settings?.planningModel?.name || "gemini-2.5-flash";

    // Find the current option to display its description
    const currentOption =
        options.find((opt) => opt.value === currentValue) || options[0];

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-4">
                <label
                    htmlFor="planning-model"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Planning Model
                </label>
                <Select value={currentValue} onValueChange={handleValueChange}>
                    <SelectTrigger className="w-[200px]" id="planning-model">
                        <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {currentOption.description}
            </div>
        </div>
    );
};
