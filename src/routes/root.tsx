import { createRootRoute, Outlet } from "@tanstack/react-router";
import Layout from "../app/layout";
import { AuthGuard } from "../components/auth/AuthGuard";

export const rootRoute = createRootRoute({
  component: () => (
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  ),
});
