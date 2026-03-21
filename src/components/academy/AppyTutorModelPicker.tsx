import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import {
  isProviderDisabledForTier,
  getProviderDisabledMessage,
  type SubscriptionTier,
} from "@/lib/ai-provider-tiers";
import type { LargeLanguageModel } from "@/lib/schemas";
import type { LanguageModel } from "@/ipc/ipc_types";
import { ChevronDown, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_APPY_TUTOR_FALLBACK,
  filterAppyTutorModelsForPicker,
  getAppyTutorPrimaryModel,
} from "@/lib/appyTutorModels";

const TUTOR_PROVIDERS = ["anthropic", "azure-openai", "openrouter"] as const;

/** @deprecated use DEFAULT_APPY_TUTOR_FALLBACK or getAppyTutorPrimaryModel(settings) */
export const DEFAULT_TUTOR_MODEL = DEFAULT_APPY_TUTOR_FALLBACK;

/** Above dialogs and layout layers */
const MENU_Z = "z-[400]";

export function AppyTutorModelPicker({
  className,
  fullWidth,
}: {
  className?: string;
  /** Own row, full width (matches main chat model control layout) */
  fullWidth?: boolean;
}) {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);

  const { data: modelsByProviders, isLoading: modelsLoading } =
    useLanguageModelsByProviders();
  const { data: providers, isLoading: providersLoading } =
    useLanguageModelProviders();
  const { data: subscription } = useSubscription();
  const { profile } = useProfile();
  const tier = (subscription?.tier ??
    profile?.subscription_tier ??
    "free") as SubscriptionTier;

  const loading = modelsLoading || providersLoading;

  if (!settings) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className={cn(
          "h-8 gap-1.5 border-gray-300 bg-white text-gray-500 shadow-sm dark:border-gray-600 dark:bg-gray-900/50",
          fullWidth
            ? "w-full max-w-none justify-between px-2.5 text-xs font-normal"
            : "max-w-[11rem] px-2 text-[10px] justify-start",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="truncate">Loading model…</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-40" />
      </Button>
    );
  }

  const selectedModel = getAppyTutorPrimaryModel(settings);

  const onModelSelect = (model: LargeLanguageModel) => {
    updateSettings({ appyTutorModel: model }).catch((err) => {
      console.error("AppyTutorModelPicker: failed to save model", err);
    });
  };

  const getModelDisplayName = (): string => {
    if (modelsByProviders?.[selectedModel.provider]) {
      const customFound = modelsByProviders[selectedModel.provider].find(
        (m) => m.type === "custom" && m.id === selectedModel.customModelId,
      );
      if (customFound) return customFound.displayName;
      const found = modelsByProviders[selectedModel.provider].find(
        (m) => m.apiName === selectedModel.name,
      );
      if (found) return found.displayName;
    }
    return selectedModel.name;
  };

  const displayName = getModelDisplayName();

  const providerEntries = TUTOR_PROVIDERS.map((id) => {
    const raw = modelsByProviders?.[id];
    const models = raw
      ? filterAppyTutorModelsForPicker(raw, id)
      : undefined;
    const provider = providers?.find((p) => p.id === id);
    return models && provider && models.length > 0
      ? { providerId: id, models, provider }
      : null;
  }).filter(Boolean) as {
    providerId: string;
    models: LanguageModel[];
    provider: NonNullable<(typeof providers)[number]>;
  }[];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={displayName}
          className={cn(
            "h-8 gap-1.5 border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 dark:hover:bg-gray-800",
            fullWidth
              ? "w-full max-w-none justify-between px-2.5 text-xs font-normal"
              : "max-w-[11rem] px-2 text-[10px] justify-start",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate font-medium text-left">{displayName}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn("w-72 max-h-[min(24rem,70vh)] overflow-y-auto", MENU_Z)}
        align={fullWidth ? "start" : "end"}
        sideOffset={4}
        collisionPadding={12}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          Appy Buddy model
          <span className="text-[10px] font-normal text-muted-foreground uppercase">
            {tier}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="text-xs text-center py-2 text-muted-foreground">
            Loading…
          </div>
        ) : providerEntries.length === 0 ? (
          <div className="text-xs text-center py-2 text-muted-foreground px-2">
            No curated Appy Buddy models available. Add keys in Settings and
            ensure deployments include the allowed models (OpenRouter: GLM / Kimi;
            Anthropic: Claude Sonnet 4 / 4.5; Azure: GPT-5.2, 5.1 chat, Nano, Claude Sonnet 4.5).
          </div>
        ) : (
          providerEntries.map(({ providerId, models, provider }, idx) => {
            const providerDisabled = isProviderDisabledForTier(
              providerId,
              tier,
            );
            const disabledMessage = providerDisabled
              ? getProviderDisabledMessage(providerId, tier)
              : "";
            const orderIndex = TUTOR_PROVIDERS.indexOf(
              providerId as (typeof TUTOR_PROVIDERS)[number],
            );
            const speedLevel =
              orderIndex === 0 ? 3 : orderIndex <= 2 ? 2 : 1;

            return (
              <div key={providerId}>
                {idx > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel
                  className={cn(
                    "text-[11px] font-semibold text-muted-foreground py-1.5 flex items-center justify-between gap-2",
                    providerDisabled && "opacity-50",
                  )}
                  title={providerDisabled ? disabledMessage : undefined}
                >
                  <span className="truncate">{provider.name}</span>
                  <span
                    className="flex items-center gap-0.5 text-amber-500 shrink-0"
                    title="Speed"
                  >
                    {Array.from({ length: speedLevel }, (_, i) => (
                      <Zap key={i} className="h-3 w-3 shrink-0" />
                    ))}
                  </span>
                </DropdownMenuLabel>
                {models.map((model) => (
                  <DropdownMenuItem
                    key={`${providerId}-${model.apiName}`}
                    disabled={providerDisabled}
                    className={cn(
                      "pl-3 text-xs",
                      selectedModel.provider === providerId &&
                        selectedModel.name === model.apiName &&
                        "bg-secondary",
                    )}
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
                    <div className="flex justify-between items-start w-full gap-2 min-w-0">
                      <span className="truncate">{model.displayName}</span>
                      {model.tag && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded shrink-0">
                          {model.tag}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
