import { createRootRoute, Outlet } from "@tanstack/react-router";
import Layout from "../app/layout";
// import { AuthGuard } from "../components/auth/AuthGuard"; // DISABLED: WordPress auth temporarily disabled

export const rootRoute = createRootRoute({
  component: () => (
    // DISABLED: WordPress authentication temporarily disabled
    // <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    // </AuthGuard>
  ),
});
