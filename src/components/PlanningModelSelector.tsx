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
        value: "gemini-3-pro",
        label: "Gemini 3 Pro",
        description: "Google's next-gen high-performance model. Best for deep reasoning.",
    },
    {
        value: "gemini-3-flash",
        label: "Gemini 3 Flash",
        description: "Google's next-gen fast model. Balanced performance and speed.",
    },
    {
        value: "gemini-2.0-flash-thinking-exp",
        label: "Gemini 2.0 Flash Thinking",
        description: "Best for planning. Includes reasoning process.",
    },
    {
        value: "gemini-2.0-flash-exp",
        label: "Gemini 2.0 Flash",
        description: "Fastest response times. Good for simple plans.",
    },
    {
        value: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        description: "Strong reasoning capabilities for complex tasks.",
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
    const currentValue = settings?.planningModel?.name || "gemini-3-flash";

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
