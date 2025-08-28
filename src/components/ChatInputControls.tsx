import { SmartContextFilesPicker } from "./context/SmartContextFilesPicker";
import { ModelPicker } from "./ModelPicker";
import { ProModeSelector } from "./ProModeSelector";
import { ChatModeSelector } from "./ChatModeSelector";
import { SparkModeSelector } from "./SparkModeSelector";
import { PlatformSelector } from "./PlatformSelector";
import { ImportAppIcon } from "./ImportAppIcon";

export function ChatInputControls({
  showContextFilesPicker = false,
  showImportButton = true,
  showPlatformSelector = true,
}: {
  showContextFilesPicker?: boolean;
  showImportButton?: boolean;
  showPlatformSelector?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Left group: Build and Model selection side by side */}
      <div className="flex items-center gap-1.5">
        {showPlatformSelector && <PlatformSelector />}
        <ModelPicker />
      </div>
      
      {/* Right group: App Type, Spark, and Import App */}
      <div className="flex items-center gap-1.5">
        <ChatModeSelector />
        <SparkModeSelector />
        {showImportButton && <ImportAppIcon />}
      </div>
      
      {/* <ProModeSelector /> - Hidden for MVP */}
      {showContextFilesPicker && <SmartContextFilesPicker />}
    </div>
  );
}
