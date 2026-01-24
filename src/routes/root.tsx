import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import Layout from "../app/layout";
import { AuthGuard } from "../components/auth/AuthGuard"; // ENABLED: WordPress auth is now mandatory

export const rootRoute = createRootRoute({
  component: () => (
    // ENABLED: WordPress authentication is now mandatory
    <AuthGuard>
      <Layout>
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Outlet />
        </Suspense>
      </Layout>
    </AuthGuard>
  ),
});
