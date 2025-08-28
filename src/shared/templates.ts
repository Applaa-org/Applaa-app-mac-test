export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  githubUrl?: string;
  isOfficial: boolean;
  isExperimental?: boolean;
  requiresNeon?: boolean;
}

// API Template interface from the external API
export interface ApiTemplate {
  githubOrg: string;
  githubRepo: string;
  title: string;
  description: string;
  imageUrl: string;
}

export const DEFAULT_TEMPLATE_ID = "react";
export const DEFAULT_TEMPLATE = {
  id: "react",
  title: "React.js Template",
  description: "Modern React app with Vite, Tailwind CSS, TypeScript and Applaa branding.",
  imageUrl:
    "https://github.com/user-attachments/assets/5b700eab-b28c-498e-96de-8649b14c16d9",
  isOfficial: true,
};

const PORTAL_MINI_STORE_ID = "portal-mini-store";
export const NEON_TEMPLATE_IDS = new Set<string>([PORTAL_MINI_STORE_ID]);

export const localTemplatesData: Template[] = [
  DEFAULT_TEMPLATE,
  {
    id: "next",
    title: "Next.js Template",
    description: "Full-stack Next.js app with App Router, Shadcn/ui, dark mode and Applaa branding.",
    imageUrl:
      "https://github.com/user-attachments/assets/96258e4f-abce-4910-a62a-a9dff77965f2",
    // githubUrl: "https://github.com/dyad-sh/nextjs-template", // Temporarily disabled - using local fallback
    isOfficial: true,
  },
  {
    id: "expo-base-master",
    title: "Mobile Template",
    description: "React Native mobile app with Expo SDK 53, Gluestack UI, and NativeWind.",
    imageUrl: "/assets/mobile-template-icon.svg",
    isOfficial: true,
  },
  {
    id: PORTAL_MINI_STORE_ID,
    title: "Applaa Store Template",
    description: "Complete e-commerce solution with Neon DB, Payload CMS, Stripe payments and admin dashboard.",
    imageUrl:
      "https://github.com/user-attachments/assets/ed86f322-40bf-4fd5-81dc-3b1d8a16e12b",
    // githubUrl: "https://github.com/dyad-sh/portal-mini-store-template", // Temporarily disabled - using local fallback
    isOfficial: true,
    isExperimental: true,
    requiresNeon: true,
  },
];
