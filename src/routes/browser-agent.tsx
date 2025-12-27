import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { ChromiumBrowserPanel } from '@/components/browser-agent/ChromiumBrowserPanel';

export const browserAgentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/browser-agent',
    component: ChromiumBrowserPanel,
});
