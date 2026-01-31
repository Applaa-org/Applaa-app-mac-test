import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { providerSettingsRoute } from "@/routes/settings/providers/$provider";
import type { LanguageModelProvider } from "@/ipc/ipc_types";

import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useCustomLanguageModelProvider } from "@/hooks/useCustomLanguageModelProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfile } from "@/hooks/useProfile";
import {
  isProviderDisabledForTier,
  getProviderDisabledMessage,
  type SubscriptionTier,
} from "@/lib/ai-provider-tiers";
import { GiftIcon, PlusIcon, MoreVertical, Trash2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState, Fragment } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CreateCustomProviderDialog } from "./CreateCustomProviderDialog";

export function ProviderSettingsGrid() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);

  const {
    data: providers,
    isLoading,
    error,
    isProviderSetup,
    refetch,
  } = useLanguageModelProviders();

  const { data: subscription } = useSubscription();
  const { profile } = useProfile();
  const tier = (subscription?.tier ?? profile?.subscription_tier ?? "free") as SubscriptionTier;

  const { deleteProvider, isDeleting } = useCustomLanguageModelProvider();

  const handleProviderClick = (providerId: string, disabled: boolean) => {
    if (disabled) return;
    navigate({
      to: "/settings/providers/$provider",
      params: { provider: providerId },
    });
  };

  const handleDeleteProvider = async () => {
    if (providerToDelete) {
      await deleteProvider(providerToDelete);
      setProviderToDelete(null);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-medium mb-6">AI Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border">
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-medium mb-6">AI Providers</h2>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load AI providers: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-medium mb-6">AI Providers</h2>
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers
            ?.filter((p) => p.type !== "local" && p.id !== "gemini") // Remove Gemini OAuth for MVP
            .map((provider: LanguageModelProvider) => {
              const isCustom = provider.type === "custom";
              const tierDisabled =
                !isCustom && isProviderDisabledForTier(provider.id, tier);
              const disabledMessage = tierDisabled
                ? getProviderDisabledMessage(provider.id, tier)
                : "";
              const showOpenRouterHint =
                tier === "free" &&
                provider.id === "openrouter" &&
                !isProviderSetup(provider.id);

              const cardContent = (
                <div
                  key={provider.id}
                  className={`relative transition-all border border-gray-200 dark:border-gray-700 rounded-lg ${
                    tierDisabled
                      ? "opacity-60 cursor-not-allowed bg-gray-50/50 dark:bg-gray-900/30"
                      : "hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProviderClick(provider.id, tierDisabled);
                  }}
                >
                  <div className="p-4">
                    <div className="text-lg font-medium flex items-center justify-between">
                      {provider.name}
                      {isProviderSetup(provider.id) ? (
                        <span className="ml-3 text-sm font-medium text-green-500 bg-green-50 dark:bg-green-900/30 border border-green-500/50 dark:border-green-500/50 px-2 py-1 rounded-full">
                          Ready
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 dark:text-gray-300 px-2 py-1 rounded-full">
                          Needs Setup
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                      {showOpenRouterHint && (
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-medium bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full inline-flex items-center">
                          Add your own key
                        </span>
                      )}
                      {provider.hasFreeTier && !showOpenRouterHint && (
                        <span className="text-blue-600 mt-2 dark:text-blue-400 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full inline-flex items-center">
                          <GiftIcon className="w-4 h-4 mr-1" />
                          Free tier available
                        </span>
                      )}
                    </div>
                  </div>

                  {isCustom && (
                  <div
                    className="absolute top-2 right-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 hover:bg-muted rounded-full focus:outline-none"
                          data-testid="custom-provider-more-options"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setProviderToDelete(provider.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Provider
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                </div>
              );

              return disabledMessage ? (
                <Tooltip key={provider.id}>
                  <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                  <TooltipContent>{disabledMessage}</TooltipContent>
                </Tooltip>
              ) : (
                <Fragment key={provider.id}>{cardContent}</Fragment>
              );
            })}

        {/* Add custom provider button */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md border-border border-dashed hover:border-primary/70"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardHeader className="p-4 flex flex-col items-center justify-center h-full">
            <PlusIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <CardTitle className="text-lg font-medium text-center">
              Add custom provider
            </CardTitle>
            <CardDescription className="text-center">
              Connect to a custom LLM API endpoint
            </CardDescription>
          </CardHeader>
        </Card>
        </div>
      </TooltipProvider>

      <CreateCustomProviderDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          refetch();
        }}
      />

      <AlertDialog
        open={!!providerToDelete}
        onOpenChange={(open) => !open && setProviderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Provider</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this custom provider and all its
              associated models. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProvider}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Provider"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
