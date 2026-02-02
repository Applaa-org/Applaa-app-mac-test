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
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import {
  isProviderDisabledForTier,
  getProviderDisabledMessage,
  type SubscriptionTier,
} from "@/lib/ai-provider-tiers";
import { ChevronDown, Brain, Zap } from "lucide-react";


export function ModelPicker() {
  const { settings, updateSettings } = useSettings();

  // 🔍 DEBUG: Log when component renders and what model is selected

  const onModelSelect = (model: LargeLanguageModel) => {
    updateSettings({ selectedModel: model }).then((updatedSettings) => {
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

  const { data: subscription } = useSubscription();
  const { profile } = useProfile();
  const tier = (subscription?.tier ?? profile?.subscription_tier ?? "free") as SubscriptionTier;

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

  // ✅ FIX: Define selectedModel BEFORE using it in functions
  if (!settings) {
    return null;
  }
  const selectedModel = settings.selectedModel;

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

  // ✅ selectedModel now defined earlier (see above)
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
              className="flex items-center gap-1 h-8 px-2 mr-2 max-w-[340px] px-1 text-xs !bg-white hover:!bg-gray-50 !text-gray-700 hover:!text-gray-700 border-gray-300 shadow-sm"
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
        <DropdownMenuLabel className="flex items-center justify-between">
          AI Models
          <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wide">
            {tier}
          </span>
        </DropdownMenuLabel>
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

            {/* Top-level cloud providers: order Anthropic (3 speed), Azure OpenAI, OpenRouter, OpenAI, Google; exclude google-vertex, bedrock, groq, cerebras, xai */}
            {(() => {
              const excludedProviders = ["google-vertex", "amazon-bedrock", "groq", "cerebras", "xai"];
              const providerOrder = ["anthropic", "azure-openai", "openrouter", "openai", "google"];

              const individualProviders = Object.entries(modelsByProviders)
                .filter(
                  ([providerId]) =>
                    providerId !== "auto" && !excludedProviders.includes(providerId)
                )
                .sort(([idA], [idB]) => {
                  const iA = providerOrder.indexOf(idA);
                  const iB = providerOrder.indexOf(idB);
                  return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
                });

              return (
                <>
                  {/* Individual providers (Google, OpenRouter, OpenAI, Anthropic, Azure OpenAI, custom) - grey out by tier */}
                  {individualProviders.map(([providerId, models]) => {
                    if (providerId === "auto") return null;

                    const provider = providers?.find((p) => p.id === providerId);
                    if (!provider) return null;

                    const providerDisabled = isProviderDisabledForTier(providerId, tier);
                    const disabledMessage = providerDisabled
                      ? getProviderDisabledMessage(providerId, tier)
                      : "";

                    const orderIndex = providerOrder.indexOf(providerId);
                    const speedLevel = orderIndex === 0 ? 3 : orderIndex <= 2 ? 2 : orderIndex <= 4 ? 1 : null;

                    return (
                      <DropdownMenuSub key={providerId}>
                        <DropdownMenuSubTrigger
                          disabled={providerDisabled}
                          title={providerDisabled ? disabledMessage : undefined}
                          className={`w-full font-normal ${providerDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex flex-col items-start w-full min-w-0">
                            <div className="flex items-center w-full gap-2 min-w-0">
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="truncate">{provider?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {models.length} models
                                </span>
                              </div>
                              {speedLevel != null && (
                                <span
                                  className="flex items-center justify-end gap-0.5 text-amber-500 shrink-0 w-10"
                                  title="Speed"
                                >
                                  {Array.from({ length: speedLevel }, (_, i) => (
                                    <Zap key={i} className="h-3 w-3 shrink-0" />
                                  ))}
                                </span>
                              )}
                            </div>
                          </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          <DropdownMenuLabel>
                            {provider?.name} Models
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {models.map((model) => {
                            return (
                              <Tooltip key={`${providerId}-${model.apiName}`}>
                                <TooltipTrigger asChild>
                                  <DropdownMenuItem
                                    disabled={providerDisabled}
                                    className={
                                      selectedModel.provider === providerId &&
                                      selectedModel.name === model.apiName
                                        ? "bg-secondary"
                                        : providerDisabled
                                          ? "opacity-60 cursor-not-allowed"
                                          : ""
                                    }
                                    onClick={() => {
                                      if (providerDisabled) return;
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
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}
                </>
              );
            })()}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
