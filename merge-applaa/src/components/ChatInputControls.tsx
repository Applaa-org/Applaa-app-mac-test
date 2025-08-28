import { ContextFilesPicker } from "./ContextFilesPicker";
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
    <div className="flex flex-wrap items-center gap-1.5">
      <ChatModeSelector />
      {showPlatformSelector && <PlatformSelector />}
      <ModelPicker />
      <SparkModeSelector />
      {showImportButton && <ImportAppIcon />}
      {/* <ProModeSelector /> - Hidden for MVP */}
      {showContextFilesPicker && <ContextFilesPicker />}
    </div>
  );
}
