import { isApplaaProEnabled, type LargeLanguageModel } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useLocalModels } from "@/hooks/useLocalModels";
import { useLocalLMSModels } from "@/hooks/useLMStudioModels";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";

import { LocalModel } from "@/ipc/ipc_types";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { ChevronDown, Brain } from "lucide-react";

export function ModelPicker() {
  const { settings, updateSettings } = useSettings();
  
  // Debug: Log current settings
  console.log('ModelPicker: Current settings:', settings);
  console.log('ModelPicker: Selected model:', settings?.selectedModel);
  const onModelSelect = (model: LargeLanguageModel) => {
    console.log('ModelPicker: Selecting model:', model);
    updateSettings({ selectedModel: model }).then(() => {
      console.log('ModelPicker: Settings updated successfully');
    }).catch((error) => {
      console.error('ModelPicker: Failed to update settings:', error);
    });
  };

  const [open, setOpen] = useState(false);

  // Cloud models from providers
  const { data: modelsByProviders, isLoading: modelsByProvidersLoading } =
    useLanguageModelsByProviders();

  const { data: providers, isLoading: providersLoading } =
    useLanguageModelProviders();

  const loading = modelsByProvidersLoading || providersLoading;
  // Ollama Models Hook
  const {
    models: ollamaModels,
    loading: ollamaLoading,
    error: ollamaError,
    loadModels: loadOllamaModels,
  } = useLocalModels();

  // LM Studio Models Hook
  const {
    models: lmStudioModels,
    loading: lmStudioLoading,
    error: lmStudioError,
    loadModels: loadLMStudioModels,
  } = useLocalLMSModels();

  // Load models when the dropdown opens
  useEffect(() => {
    if (open) {
      loadOllamaModels();
      loadLMStudioModels();
    }
  }, [open, loadOllamaModels, loadLMStudioModels]);

  // Get display name for the selected model
  const getModelDisplayName = () => {
    if (selectedModel.provider === "ollama") {
      return (
        ollamaModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name
      );
    }
    if (selectedModel.provider === "lmstudio") {
      return (
        lmStudioModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name // Fallback to path if not found
      );
    }

    // For cloud models, look up in the modelsByProviders data
    if (modelsByProviders && modelsByProviders[selectedModel.provider]) {
      const customFoundModel = modelsByProviders[selectedModel.provider].find(
        (model) =>
          model.type === "custom" && model.id === selectedModel.customModelId,
      );
      if (customFoundModel) {
        return customFoundModel.displayName;
      }
      const foundModel = modelsByProviders[selectedModel.provider].find(
        (model) => model.apiName === selectedModel.name,
      );
      if (foundModel) {
        return foundModel.displayName;
      }
    }

    // Fallback if not found
    return selectedModel.name;
  };

  // Get auto provider models (if any)
  const autoModels =
    !loading && modelsByProviders && modelsByProviders["auto"]
      ? modelsByProviders["auto"]
      : [];

  // Determine availability of local models
  const hasOllamaModels =
    !ollamaLoading && !ollamaError && ollamaModels.length > 0;
  const hasLMStudioModels =
    !lmStudioLoading && !lmStudioError && lmStudioModels.length > 0;

  if (!settings) {
    return null;
  }
  const selectedModel = settings?.selectedModel;
  const isSmartAutoEnabled =
    settings.enableProSmartFilesContextMode && isApplaaProEnabled(settings);
  const modelDisplayName = getModelDisplayName();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-6 max-w-[140px] px-2 text-xs !bg-white hover:!bg-gray-50 !text-gray-700 hover:!text-gray-700 border-gray-300 shadow-sm"
            >
              <div className="flex items-center gap-0.5">
                <Brain className="h-2.5 w-2.5" />
                <span className="truncate text-xs text-gray-700">
                  {modelDisplayName === "Auto" ? "Auto" : (
                    modelDisplayName.length > 20 
                      ? modelDisplayName.replace(/\s*\(.*?\)/g, '').substring(0, 18) + "..."
                      : modelDisplayName
                  )}
                </span>
                <ChevronDown className="h-2 w-2 opacity-70" />
              </div>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{modelDisplayName}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        className="w-64"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel>AI Models</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Cloud models - loading state */}
        {loading ? (
          <div className="text-xs text-center py-2 text-muted-foreground">
            Loading models...
          </div>
        ) : !modelsByProviders ||
          Object.keys(modelsByProviders).length === 0 ? (
          <div className="text-xs text-center py-2 text-muted-foreground">
            No cloud models available
          </div>
        ) : (
          /* Cloud models loaded */
          <>
            {/* Auto models at top level if any */}
            {autoModels.length > 0 && (
              <>
                {autoModels.map((model) => (
                  <Tooltip key={`auto-${model.apiName}`}>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        className={
                          selectedModel.provider === "auto" &&
                          selectedModel.name === model.apiName
                            ? "bg-secondary"
                            : ""
                        }
                        onClick={() => {
                          onModelSelect({
                            name: model.apiName,
                            provider: "auto",
                          });
                          setOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="flex flex-col items-start">
                            <span>
                              {isSmartAutoEnabled
                                ? "Smart Auto"
                                : model.displayName}
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isSmartAutoEnabled && (
                              <span className="text-[10px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-[length:200%_100%] animate-[shimmer_5s_ease-in-out_infinite] text-white px-1.5 py-0.5 rounded-full font-medium">
                                Applaa Pro
                              </span>
                            )}
                            {model.tag && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                {model.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {isSmartAutoEnabled ? (
                        <p>
                          <strong>Smart Auto</strong> uses a cheaper model for
                          easier tasks
                          <br /> and a flagship model for harder tasks
                        </p>
                      ) : (
                        model.description
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {Object.keys(modelsByProviders).length > 1 && (
                  <DropdownMenuSeparator />
                )}
              </>
            )}

            {/* Group "Other AI providers" into a single submenu like Dyad */}
            {(() => {
              // Define which providers should be in "Other AI providers" group
              const otherProviders = ["azure-openai", "google-vertex", "amazon-bedrock", "groq", "cerebras", "xai"];
              const otherProvidersWithModels = Object.entries(modelsByProviders).filter(([providerId]) => 
                otherProviders.includes(providerId)
              );

              // Group remaining providers individually
              const individualProviders = Object.entries(modelsByProviders).filter(([providerId]) => 
                providerId !== "auto" && !otherProviders.includes(providerId)
              );

              return (
                <>
                  {/* Individual providers (like OpenRouter, etc.) - shown first */}
                  {individualProviders.map(([providerId, models]) => {
                    // Skip auto provider as it's already handled
                    if (providerId === "auto") return null;

                    const provider = providers?.find((p) => p.id === providerId);
                    if (!provider) return null;

                    return (
                      <DropdownMenuSub key={providerId}>
                        <DropdownMenuSubTrigger className="w-full font-normal">
                          <div className="flex flex-col items-start">
                            <span>{provider?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {models.length} models
                            </span>
                          </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          <DropdownMenuLabel>
                            {provider?.name} Models
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {models.map((model) => (
                            <Tooltip key={`${providerId}-${model.apiName}`}>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  className={
                                    selectedModel.provider === providerId &&
                                    selectedModel.name === model.apiName
                                      ? "bg-secondary"
                                      : ""
                                  }
                                  onClick={() => {
                                    const customModelId =
                                      model.type === "custom" ? model.id : undefined;
                                    onModelSelect({
                                      name: model.apiName,
                                      provider: providerId,
                                      customModelId,
                                    });
                                    setOpen(false);
                                  }}
                                >
                                  <div className="flex justify-between items-start w-full">
                                    <span>{model.displayName}</span>
                                    {model.tag && (
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                        {model.tag}
                                      </span>
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {model.description}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}

                  {/* Other AI providers grouped submenu - shown after individual providers */}
                  {otherProvidersWithModels.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="w-full font-normal">
                        <div className="flex flex-col items-start">
                          <span>Other AI providers</span>
                          <span className="text-xs text-muted-foreground">
                            {otherProvidersWithModels.length} providers
                          </span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuLabel>Other AI providers</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {otherProvidersWithModels.map(([providerId, models]) => {
                          const provider = providers?.find((p) => p.id === providerId);
                          if (!provider) return null;

                          return (
                            <DropdownMenuSub key={providerId}>
                              <DropdownMenuSubTrigger className="w-full font-normal">
                                <div className="flex flex-col items-start">
                                  <span>{provider.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {models.length} models
                                  </span>
                                </div>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-56">
                                <DropdownMenuLabel>{provider.name} Models</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {models.map((model) => (
                                  <Tooltip key={`${providerId}-${model.apiName}`}>
                                    <TooltipTrigger asChild>
                                      <DropdownMenuItem
                                        className={
                                          selectedModel.provider === providerId &&
                                          selectedModel.name === model.apiName
                                            ? "bg-secondary"
                                            : ""
                                        }
                                        onClick={() => {
                                          const customModelId =
                                            model.type === "custom" ? model.id : undefined;
                                          onModelSelect({
                                            name: model.apiName,
                                            provider: providerId,
                                            customModelId,
                                          });
                                          setOpen(false);
                                        }}
                                      >
                                        <div className="flex justify-between items-start w-full">
                                          <span>{model.displayName}</span>
                                          {model.tag && (
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                              {model.tag}
                                            </span>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      {model.description}
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                </>
              );
            })()}
          </>
        )}

        <DropdownMenuSeparator />
        {/* Local Models Parent SubMenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full font-normal">
            <div className="flex flex-col items-start">
              <span>Local models</span>
              <span className="text-xs text-muted-foreground">
                LM Studio, Ollama
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {/* Ollama Models SubMenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={ollamaLoading && !hasOllamaModels} // Disable if loading and no models yet
                className="w-full font-normal"
              >
                <div className="flex flex-col items-start">
                  <span>Ollama</span>
                  {ollamaLoading ? (
                    <span className="text-xs text-muted-foreground">
                      Loading...
                    </span>
                  ) : ollamaError ? (
                    <span className="text-xs text-red-500">Error loading</span>
                  ) : !hasOllamaModels ? (
                    <span className="text-xs text-muted-foreground">
                      None available
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {ollamaModels.length} models
                    </span>
                  )}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuLabel>Ollama Models</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {ollamaLoading && ollamaModels.length === 0 ? ( // Show loading only if no models are loaded yet
                  <div className="text-xs text-center py-2 text-muted-foreground">
                    Loading models...
                  </div>
                ) : ollamaError ? (
                  <div className="px-2 py-1.5 text-sm text-red-600">
                    <div className="flex flex-col">
                      <span>Error loading models</span>
                      <span className="text-xs text-muted-foreground">
                        Is Ollama running?
                      </span>
                    </div>
                  </div>
                ) : !hasOllamaModels ? (
                  <div className="px-2 py-1.5 text-sm">
                    <div className="flex flex-col">
                      <span>No local models found</span>
                      <span className="text-xs text-muted-foreground">
                        Ensure Ollama is running and models are pulled.
                      </span>
                    </div>
                  </div>
                ) : (
                  ollamaModels.map((model: LocalModel) => (
                    <DropdownMenuItem
                      key={`ollama-${model.modelName}`}
                      className={
                        selectedModel.provider === "ollama" &&
                        selectedModel.name === model.modelName
                          ? "bg-secondary"
                          : ""
                      }
                      onClick={() => {
                        onModelSelect({
                          name: model.modelName,
                          provider: "ollama",
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{model.displayName}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {model.modelName}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* LM Studio Models SubMenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={lmStudioLoading && !hasLMStudioModels} // Disable if loading and no models yet
                className="w-full font-normal"
              >
                <div className="flex flex-col items-start">
                  <span>LM Studio</span>
                  {lmStudioLoading ? (
                    <span className="text-xs text-muted-foreground">
                      Loading...
                    </span>
                  ) : lmStudioError ? (
                    <span className="text-xs text-red-500">Error loading</span>
                  ) : !hasLMStudioModels ? (
                    <span className="text-xs text-muted-foreground">
                      None available
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {lmStudioModels.length} models
                    </span>
                  )}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuLabel>LM Studio Models</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {lmStudioLoading && lmStudioModels.length === 0 ? ( // Show loading only if no models are loaded yet
                  <div className="text-xs text-center py-2 text-muted-foreground">
                    Loading models...
                  </div>
                ) : lmStudioError ? (
                  <div className="px-2 py-1.5 text-sm text-red-600">
                    <div className="flex flex-col">
                      <span>Error loading models</span>
                      <span className="text-xs text-muted-foreground">
                        {lmStudioError.message} {/* Display specific error */}
                      </span>
                    </div>
                  </div>
                ) : !hasLMStudioModels ? (
                  <div className="px-2 py-1.5 text-sm">
                    <div className="flex flex-col">
                      <span>No loaded models found</span>
                      <span className="text-xs text-muted-foreground">
                        Ensure LM Studio is running and models are loaded.
                      </span>
                    </div>
                  </div>
                ) : (
                  lmStudioModels.map((model: LocalModel) => (
                    <DropdownMenuItem
                      key={`lmstudio-${model.modelName}`}
                      className={
                        selectedModel.provider === "lmstudio" &&
                        selectedModel.name === model.modelName
                          ? "bg-secondary"
                          : ""
                      }
                      onClick={() => {
                        onModelSelect({
                          name: model.modelName,
                          provider: "lmstudio",
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        {/* Display the user-friendly name */}
                        <span>{model.displayName}</span>
                        {/* Show the path as secondary info */}
                        <span className="text-xs text-muted-foreground truncate">
                          {model.modelName}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
