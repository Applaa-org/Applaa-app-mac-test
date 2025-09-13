// SmartContextFilesPicker removed for MVP
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
    <div className="flex flex-wrap items-center justify-between gap-1.5 py-1">
      {/* Left group: Build and Model selection side by side */}
      <div className="flex items-center gap-1">
        {showPlatformSelector && <PlatformSelector />}
        <ModelPicker />
      </div>
      
      {/* Right group: App Type, Spark, and Import App */}
      <div className="flex items-center gap-1">
        <ChatModeSelector />
        <SparkModeSelector />
        {/* 🚀 MVP: Import option hidden for simplicity - can be re-enabled post-MVP */}
        {/* {showImportButton && <ImportAppIcon />} */}
      </div>
      
      {/* <ProModeSelector /> - Hidden for MVP */}
      {/* SmartContextFilesPicker removed for MVP */}
    </div>
  );
}
