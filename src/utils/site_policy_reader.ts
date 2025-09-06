import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import log from "electron-log";

const logger = log.scope("site-policy");

export interface SitePolicy {
  site_policy: {
    archetype: "marketing" | "saas" | "docs" | "blog" | "store" | "portfolio";
    locales: string[];
    accessibility: {
      wcag_2_2_aa: boolean;
      min_contrast: number;
      focus_visible: boolean;
      skip_links: boolean;
      aria_labels: boolean;
      alt_text_required: boolean;
      reduced_motion_support: boolean;
      keyboard_navigation: boolean;
    };
    performance_budgets: {
      lcp_ms: number;
      cls: number;
      inp_ms: number;
      ttfb_ms: number;
      fcp_ms: number;
      lighthouse_min_scores: {
        performance: number;
        accessibility: number;
        best_practices: number;
        seo: number;
      };
    };
    seo: {
      canonical: boolean;
      json_ld: string[];
      og_cards: boolean;
      twitter_cards: boolean;
      sitemap: boolean;
      robots: boolean;
      meta_descriptions: boolean;
      structured_data: boolean;
      clean_urls: boolean;
      hreflang: boolean;
    };
    pwa: {
      enabled: boolean;
      manifest: boolean;
      service_worker: boolean;
      offline_shell_routes: string[];
      install_prompt: "immediate" | "engagement_based" | "disabled";
      cache_strategy: string;
    };
    security_headers: {
      csp: string;
      hsts: boolean;
      x_content_type_options: string;
      x_frame_options: string;
      referrer_policy: string;
      permissions_policy: string[];
    };
    analytics: {
      provider: "privacy_first" | "google_analytics" | "plausible" | "none";
      consent_required: boolean;
      dnt_respect: boolean;
      data_minimization: boolean;
      cookie_consent: "always" | "geo_aware" | "never";
    };
    observability: {
      error_tracking: boolean;
      performance_monitoring: boolean;
      rum_vitals: boolean;
      uptime_monitoring: boolean;
      lighthouse_ci: boolean;
    };
    legal_pages: string[];
    defaults: {
      dark_mode: "system" | "light" | "dark";
      reduced_motion: boolean;
      responsive_images: boolean;
      lazy_loading: boolean;
      form_validation: string;
      form_spam_protection: string[];
      loading_states: "skeleton" | "spinner" | "progress";
      empty_states: boolean;
      error_boundaries: boolean;
      toast_notifications: boolean;
    };
    content: {
      no_lorem_ipsum: boolean;
      industry_specific: boolean;
      readability_grade: number;
      professional_tone: boolean;
      call_to_actions: boolean;
      varied_content_length: boolean;
    };
    design_system: {
      tokenized: boolean;
      color_psychology: boolean;
      glassmorphism: boolean;
      gradient_backgrounds: boolean;
      micro_interactions: boolean;
      premium_shadows: boolean;
      responsive_typography: boolean;
      component_library: boolean;
    };
    navigation: {
      auto_generate: boolean;
      breadcrumbs: boolean;
      global_search: boolean;
      mobile_optimized: boolean;
      consistent_header_footer: boolean;
    };
    features: {
      newsletter_signup: boolean;
      social_sharing: boolean;
      testimonials: boolean;
      pricing_tables: boolean;
      blog_integration: boolean;
      search_functionality: boolean;
      contact_forms: boolean;
      feedback_widget: boolean;
    };
  };
}

/**
 * Reads site policy from app directory or returns default policy
 */
export async function readSitePolicy(appPath: string): Promise<SitePolicy> {
  const sitePolicyPath = path.join(appPath, "site_policy.yaml");
  
  try {
    if (await fs.pathExists(sitePolicyPath)) {
      logger.info(`Reading site policy from: ${sitePolicyPath}`);
      const content = await fs.readFile(sitePolicyPath, "utf8");
      const policy = yaml.load(content) as SitePolicy;
      return policy;
    }
  } catch (error) {
    logger.warn(`Failed to read site policy from ${sitePolicyPath}:`, error);
  }
  
  // Return default policy
  logger.info("Using default site policy");
  return getDefaultSitePolicy();
}

/**
 * Creates site_policy.yaml in the app directory with default or custom settings
 */
export async function createSitePolicyFile(appPath: string, customPolicy?: Partial<SitePolicy>): Promise<void> {
  const sitePolicyPath = path.join(appPath, "site_policy.yaml");
  
  try {
    const defaultPolicy = getDefaultSitePolicy();
    const finalPolicy = customPolicy ? mergeDeep(defaultPolicy, customPolicy) : defaultPolicy;
    
    const yamlContent = yaml.dump(finalPolicy, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    await fs.writeFile(sitePolicyPath, yamlContent, "utf8");
    logger.info(`Created site policy file: ${sitePolicyPath}`);
  } catch (error) {
    logger.error(`Failed to create site policy file at ${sitePolicyPath}:`, error);
    throw error;
  }
}

/**
 * Generates site policy context for the AI system prompt
 */
export function generateSitePolicyContext(policy: SitePolicy): string {
  const { site_policy } = policy;
  
  return `
# 🏗️ SITE POLICY & PROFESSIONAL STANDARDS (MANDATORY)

**This app follows Applaa Pro Site Starter standards. You MUST implement these requirements:**

## 📋 Site Archetype: ${site_policy.archetype.toUpperCase()}
${getArchetypeGuidelines(site_policy.archetype)}

## ♿ Accessibility (WCAG 2.2 AA)
- Minimum contrast ratio: ${site_policy.accessibility.min_contrast}:1
- Focus visible indicators required
- Skip links for keyboard navigation
- ARIA labels where needed (not overused)
- Alt text for all images
- Reduced motion support via prefers-reduced-motion

## ⚡ Performance Budgets (MANDATORY)
- LCP < ${site_policy.performance_budgets.lcp_ms}ms
- CLS < ${site_policy.performance_budgets.cls}
- INP < ${site_policy.performance_budgets.inp_ms}ms
- Lighthouse scores: Perf ≥${site_policy.performance_budgets.lighthouse_min_scores.performance}, A11y ≥${site_policy.performance_budgets.lighthouse_min_scores.accessibility}, BP ≥${site_policy.performance_budgets.lighthouse_min_scores.best_practices}, SEO ≥${site_policy.performance_budgets.lighthouse_min_scores.seo}

## 🔍 SEO Requirements
${site_policy.seo.canonical ? '- Canonical URLs for all pages' : ''}
${site_policy.seo.og_cards ? '- OpenGraph meta tags' : ''}
${site_policy.seo.twitter_cards ? '- Twitter Card meta tags' : ''}
${site_policy.seo.json_ld.length > 0 ? `- JSON-LD structured data: ${site_policy.seo.json_ld.join(', ')}` : ''}
${site_policy.seo.meta_descriptions ? '- Unique meta descriptions for each page' : ''}

## 📱 PWA Features
${site_policy.pwa.enabled ? `
- Web app manifest
- Service worker with ${site_policy.pwa.cache_strategy} strategy
- Offline shell for: ${site_policy.pwa.offline_shell_routes.join(', ')}
- Install prompt: ${site_policy.pwa.install_prompt}` : '- PWA features disabled'}

## 🔒 Security & Privacy
- Content Security Policy (strict)
- HSTS headers
- Privacy-first analytics (${site_policy.analytics.provider})
${site_policy.analytics.consent_required ? '- Cookie consent required' : ''}
${site_policy.analytics.dnt_respect ? '- Respect Do Not Track' : ''}

## 🎨 Design System Requirements
${site_policy.design_system.color_psychology ? '- Industry-appropriate color psychology' : ''}
${site_policy.design_system.glassmorphism ? '- Glassmorphism effects (backdrop-blur, transparency)' : ''}
${site_policy.design_system.gradient_backgrounds ? '- Gradient backgrounds' : ''}
${site_policy.design_system.micro_interactions ? '- Micro-interactions on all interactive elements' : ''}
${site_policy.design_system.premium_shadows ? '- Premium shadow effects' : ''}
${site_policy.design_system.responsive_typography ? '- Responsive typography with clamp()' : ''}

## 🧭 Navigation & UX
${site_policy.navigation.auto_generate ? '- Auto-generated navigation based on archetype' : ''}
${site_policy.navigation.breadcrumbs ? '- Breadcrumb navigation' : ''}
${site_policy.navigation.global_search ? '- Global search functionality' : ''}
${site_policy.navigation.mobile_optimized ? '- Mobile-optimized navigation' : ''}

## 📄 Required Pages
${site_policy.legal_pages.map(page => `- ${page.charAt(0).toUpperCase() + page.slice(1)} page`).join('\n')}

## 🎯 Content Standards
${site_policy.content.no_lorem_ipsum ? '- NO Lorem Ipsum - use realistic content' : ''}
${site_policy.content.industry_specific ? '- Industry-specific content and terminology' : ''}
- Target reading level: Grade ${site_policy.content.readability_grade}
${site_policy.content.professional_tone ? '- Professional, authentic tone' : ''}
${site_policy.content.call_to_actions ? '- Clear call-to-actions on every page' : ''}

## 🚀 Default Behaviors
- Dark mode: ${site_policy.defaults.dark_mode}
- Loading states: ${site_policy.defaults.loading_states}
${site_policy.defaults.error_boundaries ? '- Error boundaries for graceful failures' : ''}
${site_policy.defaults.toast_notifications ? '- Toast notifications for user feedback' : ''}
${site_policy.defaults.lazy_loading ? '- Lazy loading for images and components' : ''}

**CRITICAL: Every component and page you create must follow these standards. This is not optional.**
`;
}

function getArchetypeGuidelines(archetype: string): string {
  const guidelines = {
    marketing: `
- Navigation: Home, About, Services/Features, Pricing, Contact, Blog
- Hero section with clear value proposition
- Social proof (testimonials, logos, stats)
- Lead capture forms
- Clear pricing/contact CTAs`,
    
    saas: `
- Navigation: Home, Features, Pricing, Docs, Login/Signup
- Feature comparison tables
- Pricing tiers with clear CTAs
- Dashboard preview/demo
- Customer testimonials and case studies`,
    
    docs: `
- Navigation: Home, Docs, API, Guides, Community
- Searchable documentation
- Code examples and syntax highlighting
- Version selector
- Contribution guidelines`,
    
    blog: `
- Navigation: Home, Blog, Categories, About, Contact
- Article listing with pagination
- Category/tag filtering
- Author profiles
- Related posts and search`,
    
    store: `
- Navigation: Home, Products, Categories, Cart, Account
- Product catalog with filtering
- Shopping cart and checkout
- Product search and recommendations
- Customer reviews and ratings`,
    
    portfolio: `
- Navigation: Home, Work/Projects, About, Services, Contact
- Project showcase with case studies
- Skills and experience highlights
- Client testimonials
- Contact form and social links`
  };
  
  return guidelines[archetype] || guidelines.marketing;
}

function getDefaultSitePolicy(): SitePolicy {
  return {
    site_policy: {
      archetype: "marketing",
      locales: ["en"],
      accessibility: {
        wcag_2_2_aa: true,
        min_contrast: 4.5,
        focus_visible: true,
        skip_links: true,
        aria_labels: true,
        alt_text_required: true,
        reduced_motion_support: true,
        keyboard_navigation: true
      },
      performance_budgets: {
        lcp_ms: 2500,
        cls: 0.1,
        inp_ms: 200,
        ttfb_ms: 800,
        fcp_ms: 1800,
        lighthouse_min_scores: {
          performance: 90,
          accessibility: 95,
          best_practices: 95,
          seo: 95
        }
      },
      seo: {
        canonical: true,
        json_ld: ["Website", "Breadcrumb", "FAQ"],
        og_cards: true,
        twitter_cards: true,
        sitemap: true,
        robots: true,
        meta_descriptions: true,
        structured_data: true,
        clean_urls: true,
        hreflang: true
      },
      pwa: {
        enabled: true,
        manifest: true,
        service_worker: true,
        offline_shell_routes: ["/", "/about", "/contact"],
        install_prompt: "engagement_based",
        cache_strategy: "stale_while_revalidate"
      },
      security_headers: {
        csp: "default-src 'self'; script-src 'self' 'nonce-{auto}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
        hsts: true,
        x_content_type_options: "nosniff",
        x_frame_options: "DENY",
        referrer_policy: "strict-origin-when-cross-origin",
        permissions_policy: ["camera=()", "microphone=()", "geolocation=(self)", "payment=()"]
      },
      analytics: {
        provider: "privacy_first",
        consent_required: true,
        dnt_respect: true,
        data_minimization: true,
        cookie_consent: "geo_aware"
      },
      observability: {
        error_tracking: true,
        performance_monitoring: true,
        rum_vitals: true,
        uptime_monitoring: false,
        lighthouse_ci: true
      },
      legal_pages: ["privacy", "terms", "cookies", "accessibility", "contact"],
      defaults: {
        dark_mode: "system",
        reduced_motion: true,
        responsive_images: true,
        lazy_loading: true,
        form_validation: "real_time",
        form_spam_protection: ["honeypot", "rate_limit", "server_validation"],
        loading_states: "skeleton",
        empty_states: true,
        error_boundaries: true,
        toast_notifications: true
      },
      content: {
        no_lorem_ipsum: true,
        industry_specific: true,
        readability_grade: 8,
        professional_tone: true,
        call_to_actions: true,
        varied_content_length: true
      },
      design_system: {
        tokenized: true,
        color_psychology: true,
        glassmorphism: true,
        gradient_backgrounds: true,
        micro_interactions: true,
        premium_shadows: true,
        responsive_typography: true,
        component_library: true
      },
      navigation: {
        auto_generate: true,
        breadcrumbs: true,
        global_search: true,
        mobile_optimized: true,
        consistent_header_footer: true
      },
      features: {
        newsletter_signup: true,
        social_sharing: true,
        testimonials: true,
        pricing_tables: false,
        blog_integration: false,
        search_functionality: true,
        contact_forms: true,
        feedback_widget: true
      }
    }
  };
}

// Deep merge utility for combining policies
function mergeDeep(target: any, source: any): any {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}





