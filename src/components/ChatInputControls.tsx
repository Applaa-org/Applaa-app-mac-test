// SmartContextFilesPicker removed for MVP
import { ModelPicker } from "./ModelPicker";
import { ProModeSelector } from "./ProModeSelector";
import { ChatModeSelector } from "./ChatModeSelector";
import { SparkModeSelector } from "./SparkModeSelector";
import { PlatformSelector } from "./PlatformSelector";
import { ImportAppIcon } from "./ImportAppIcon";
import { PromptEnhanceButton } from "./PromptEnhanceButton";
import { CloneWebsiteButton } from "./CloneWebsiteButton";

export function ChatInputControls({
  showContextFilesPicker = false,
  showImportButton = true,
  showPlatformSelector = true,
  inputValue,
  onInputChange,
  appType,
  disabled = false,
  isCloneModeActive = false,
  onCloneModeToggle,
}: {
  showContextFilesPicker?: boolean;
  showImportButton?: boolean;
  showPlatformSelector?: boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  appType?: 'web' | 'expo' | 'flutter' | 'godot' | 'arcade' | 'microbit' | 'minecraft' | 'blockly';
  disabled?: boolean;
  isCloneModeActive?: boolean;
  onCloneModeToggle?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-1 py-0.5">
      {/* Left group: Build and Model selection side by side */}
      <div className="flex items-center gap-0.5">
        {showPlatformSelector && <PlatformSelector />}
        <ModelPicker />
        {/* Add enhance button next to model picker if input value and handler are provided */}
        {inputValue !== undefined && onInputChange && (
          <PromptEnhanceButton
            inputValue={inputValue}
            onEnhanced={onInputChange}
            appType={appType}
            disabled={disabled}
          />
        )}
      </div>

      
      {/* Right group: Clone Website, Spark, and Import App */}

      <div className="flex items-center gap-0.5">
        {/* <ChatModeSelector /> */}
        {/* Show Clone Website button only for web apps - positioned first (leftmost) */}
        {appType === 'web' && onCloneModeToggle && (
          <CloneWebsiteButton
            isActive={isCloneModeActive}
            onClick={onCloneModeToggle}
            disabled={disabled}
          />
        )}
        <SparkModeSelector />
        {/* 🚀 MVP: Import option hidden for simplicity - can be re-enabled post-MVP */}
        {/* {showImportButton && <ImportAppIcon />} */}
      </div>

      {/* <ProModeSelector /> - Hidden for MVP */}
      {/* SmartContextFilesPicker removed for MVP */}
    </div>
  );
}
