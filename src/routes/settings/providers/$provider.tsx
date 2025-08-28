import { createRoute } from "@tanstack/react-router";
import { settingsRoute } from "@/routes/settings";
import { ProviderSettingsPage } from "@/components/settings/ProviderSettingsPage";
import { GeminiSettings } from "@/components/settings/GeminiSettings";

interface ProviderSettingsParams {
  provider: string;
}

export const providerSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/providers/$provider",
  params: {
    parse: (params: { provider: string }): ProviderSettingsParams => ({
      provider: params.provider,
    }),
  },
  component: function ProviderSettingsRouteComponent() {
    const { provider } = providerSettingsRoute.useParams();

    // Use specialized Gemini settings component for OAuth-based authentication
    if (provider === "gemini") {
      return <GeminiSettings />;
    }

    return <ProviderSettingsPage provider={provider} />;
  },
});
