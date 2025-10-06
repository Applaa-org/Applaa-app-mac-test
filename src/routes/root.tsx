import { createRootRoute, Outlet } from "@tanstack/react-router";
import Layout from "../app/layout";
import { AuthGuard } from "../components/auth/AuthGuard"; // ENABLED: WordPress auth is now mandatory

export const rootRoute = createRootRoute({
  component: () => (
    // ENABLED: WordPress authentication is now mandatory
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  ),
});
