export interface SeedPrompt {
  title: string;
  description: string;
  content: string;
  category: string;
}

export const seedPrompts: SeedPrompt[] = [
// UI/UX Design Prompts
  {
    title: "Modern Landing Page Design",
    description: "Create a stunning, conversion-focused landing page with modern design principles",
    content: "Design a modern, responsive landing page with the following elements:\n\n1. Hero section with compelling headline and call-to-action\n2. Clean, minimalist layout with proper white space\n3. Modern typography using system fonts or Google Fonts\n4. Gradient backgrounds or subtle animations\n5. Social proof section with testimonials\n6. Feature highlights with icons\n7. Mobile-first responsive design\n8. Fast loading and optimized images\n9. Clear navigation and user flow\n10. Accessibility considerations (WCAG 2.1 AA)",
    category: "UI/UX Design"
  },
  {
    title: "Dashboard UI Components",
    description: "Build a comprehensive dashboard with modern UI components",
    content: "Create a professional dashboard interface with:\n\n1. Sidebar navigation with collapsible menu\n2. Top navigation bar with user profile dropdown\n3. Data visualization cards and charts\n4. Table components with sorting and filtering\n5. Modal dialogs and form components\n6. Loading states and skeleton screens\n7. Dark/light theme toggle\n8. Responsive grid layout\n9. Interactive elements with hover states\n10. Consistent color scheme and spacing",
    category: "UI/UX Design"
  },
  {
    title: "User Onboarding Flow",
    description: "Design an intuitive user onboarding experience",
    content: "Create a smooth user onboarding flow that includes:\n\n1. Welcome screen with value proposition\n2. Progressive disclosure of features\n3. Interactive tutorials and tooltips\n4. Step-by-step wizard with progress indicator\n5. Personalization options\n6. Skip options for experienced users\n7. Success celebrations and achievements\n8. Clear next steps and guidance\n9. Mobile-optimized experience\n10. Analytics tracking for optimization",
    category: "UI/UX Design"
  },
  {
    title: "Form Design Best Practices",
    description: "Create user-friendly forms with excellent UX",
    content: "Design forms following UX best practices:\n\n1. Single column layout for better completion rates\n2. Clear field labels and helpful placeholder text\n3. Real-time validation with helpful error messages\n4. Progress indicators for multi-step forms\n5. Smart defaults and auto-completion\n6. Logical grouping and visual hierarchy\n7. Mobile-friendly input types\n8. Clear call-to-action buttons\n9. Optional vs required field indicators\n10. Accessibility features for screen readers",
    category: "UI/UX Design"
  },

  // Web App Development Prompts
  {
    title: "React Component Architecture",
    description: "Build scalable React components with modern patterns",
    content: "Create a robust React component architecture:\n\n1. Functional components with hooks\n2. Custom hooks for reusable logic\n3. Context API for state management\n4. Component composition patterns\n5. Error boundaries for error handling\n6. Lazy loading and code splitting\n7. TypeScript for type safety\n8. Storybook for component documentation\n9. Unit tests with Jest and React Testing Library\n10. Performance optimization with React.memo",
    category: "Web Development"
  },
  {
    title: "Progressive Web App (PWA)",
    description: "Transform your web app into a PWA with offline capabilities",
    content: "Implement PWA features for enhanced user experience:\n\n1. Service worker for offline functionality\n2. Web app manifest for installability\n3. Cache strategies for different content types\n4. Background sync for data updates\n5. Push notifications\n6. App shell architecture\n7. Responsive design for all devices\n8. Fast loading with performance budgets\n9. Lighthouse optimization\n10. App store submission preparation",
    category: "Web Development"
  },
  {
    title: "API Integration Patterns",
    description: "Implement robust API integration with error handling",
    content: "Build reliable API integration:\n\n1. RESTful API client with axios or fetch\n2. Error handling and retry logic\n3. Loading states and user feedback\n4. Data caching and invalidation\n5. Authentication token management\n6. Request/response interceptors\n7. Type-safe API calls with TypeScript\n8. Pagination and infinite scrolling\n9. Real-time updates with WebSockets\n10. API mocking for development",
    category: "Web Development"
  },
  {
    title: "State Management Solution",
    description: "Implement efficient state management for complex applications",
    content: "Set up comprehensive state management:\n\n1. Choose appropriate solution (Redux, Zustand, Context)\n2. Organize state structure and actions\n3. Implement middleware for side effects\n4. Handle async operations and loading states\n5. Persist state to localStorage/sessionStorage\n6. DevTools integration for debugging\n7. Type-safe state with TypeScript\n8. Performance optimization techniques\n9. State normalization for complex data\n10. Testing state management logic",
    category: "Web Development"
  },

  // Expo/Mobile App Prompts
  {
    title: "Expo App Navigation",
    description: "Implement smooth navigation for React Native Expo apps",
    content: "Create intuitive navigation for your Expo app:\n\n1. Stack navigation for hierarchical screens\n2. Tab navigation for main app sections\n3. Drawer navigation for secondary features\n4. Deep linking and URL handling\n5. Navigation guards and authentication\n6. Smooth transitions and animations\n7. Back button handling on Android\n8. Navigation state persistence\n9. Type-safe navigation with TypeScript\n10. Accessibility navigation support",
    category: "Mobile Development"
  },
  {
    title: "Native Device Features",
    description: "Integrate native device capabilities in your Expo app",
    content: "Leverage device features for enhanced functionality:\n\n1. Camera integration with image capture\n2. Location services and maps\n3. Push notifications setup\n4. File system access and storage\n5. Contacts and calendar integration\n6. Biometric authentication\n7. Device sensors (accelerometer, gyroscope)\n8. Audio recording and playback\n9. Sharing functionality\n10. App permissions handling",
    category: "Mobile Development"
  },
  {
    title: "Expo App Performance",
    description: "Optimize your Expo app for smooth performance",
    content: "Implement performance optimizations:\n\n1. Image optimization and lazy loading\n2. FlatList for large data sets\n3. Memory management and leak prevention\n4. Bundle size optimization\n5. Startup time improvements\n6. Smooth animations with Reanimated\n7. Background task handling\n8. Network request optimization\n9. Code splitting and lazy imports\n10. Performance monitoring and analytics",
    category: "Mobile Development"
  },
  {
    title: "Cross-Platform Compatibility",
    description: "Ensure your Expo app works seamlessly across iOS and Android",
    content: "Build truly cross-platform applications:\n\n1. Platform-specific code when needed\n2. Consistent UI across platforms\n3. Handle platform differences gracefully\n4. Test on both iOS and Android\n5. Platform-specific navigation patterns\n6. Handle different screen sizes and densities\n7. Platform-specific permissions\n8. App store guidelines compliance\n9. Platform-specific styling adjustments\n10. Performance considerations for each platform",
    category: "Mobile Development"
  },

  // Mobile Responsive Prompts
  {
    title: "Mobile-First Design",
    description: "Create responsive designs that work perfectly on all devices",
    content: "Implement mobile-first responsive design:\n\n1. Start with mobile layout and scale up\n2. Use CSS Grid and Flexbox for layouts\n3. Implement breakpoints for different screen sizes\n4. Optimize touch targets for mobile interaction\n5. Use relative units (rem, em, %) over pixels\n6. Implement responsive images with srcset\n7. Test on real devices and emulators\n8. Consider thumb-friendly navigation\n9. Optimize font sizes for readability\n10. Handle orientation changes gracefully",
    category: "Mobile Responsive"
  },
  {
    title: "Touch-Friendly Interface",
    description: "Design interfaces optimized for touch interaction",
    content: "Create touch-optimized user interfaces:\n\n1. Minimum 44px touch targets\n2. Adequate spacing between interactive elements\n3. Swipe gestures for navigation\n4. Pull-to-refresh functionality\n5. Long press actions and context menus\n6. Smooth scrolling and momentum\n7. Visual feedback for touch interactions\n8. Avoid hover-dependent interactions\n9. Implement touch-friendly forms\n10. Consider one-handed usage patterns",
    category: "Mobile Responsive"
  },
  {
    title: "Responsive Typography",
    description: "Implement typography that scales beautifully across devices",
    content: "Create responsive typography system:\n\n1. Use fluid typography with clamp() function\n2. Establish typographic scale and hierarchy\n3. Optimize line length for readability\n4. Adjust line height for different screen sizes\n5. Use system fonts for better performance\n6. Implement dark mode typography\n7. Consider accessibility and contrast ratios\n8. Test readability on various devices\n9. Use relative units for scalability\n10. Optimize for different pixel densities",
    category: "Mobile Responsive"
  },

  // Viral Web App Features
  {
    title: "Social Sharing Integration",
    description: "Add viral social sharing features to boost user engagement",
    content: "Implement social sharing for viral growth:\n\n1. One-click sharing to major platforms\n2. Custom share messages and images\n3. Social media meta tags optimization\n4. Share tracking and analytics\n5. Referral program integration\n6. Social login options\n7. User-generated content sharing\n8. Viral loops and incentives\n9. Social proof displays\n10. Community features and discussions",
    category: "Viral Features"
  },
  {
    title: "Gamification Elements",
    description: "Add engaging gamification to increase user retention",
    content: "Implement gamification for user engagement:\n\n1. Point systems and rewards\n2. Achievement badges and milestones\n3. Leaderboards and competitions\n4. Progress bars and completion tracking\n5. Daily challenges and streaks\n6. Level progression systems\n7. Social challenges and team features\n8. Surprise rewards and bonuses\n9. Personalized goals and recommendations\n10. Celebration animations and feedback",
    category: "Viral Features"
  },
  {
    title: "Real-time Collaboration",
    description: "Build real-time collaborative features that users love to share",
    content: "Create collaborative experiences:\n\n1. Real-time document editing\n2. Live cursors and user presence\n3. Comment and annotation systems\n4. Version history and conflict resolution\n5. Team workspaces and permissions\n6. Real-time notifications\n7. Video/audio integration\n8. Screen sharing capabilities\n9. Collaborative whiteboards\n10. Activity feeds and updates",
    category: "Viral Features"
  },
  {
    title: "User-Generated Content",
    description: "Enable users to create and share content that drives viral growth",
    content: "Build UGC features for viral growth:\n\n1. Easy content creation tools\n2. Templates and customization options\n3. Content moderation and approval\n4. Featured content and curation\n5. User profiles and portfolios\n6. Content discovery and search\n7. Remix and collaboration features\n8. Content analytics and insights\n9. Monetization options for creators\n10. Community guidelines and reporting",
    category: "Viral Features"
  },

  // Modern Web Standards
  {
    title: "Web Performance Optimization",
    description: "Implement modern performance optimization techniques",
    content: "Optimize for maximum web performance:\n\n1. Core Web Vitals optimization (LCP, FID, CLS)\n2. Image optimization with WebP and AVIF\n3. Code splitting and lazy loading\n4. Critical CSS and resource prioritization\n5. Service worker caching strategies\n6. Bundle analysis and tree shaking\n7. Preloading and prefetching resources\n8. Database query optimization\n9. CDN implementation\n10. Performance monitoring and alerts",
    category: "Modern Web Standards"
  },
  {
    title: "Web Accessibility (a11y)",
    description: "Build inclusive web applications following WCAG guidelines",
    content: "Implement comprehensive accessibility:\n\n1. Semantic HTML structure\n2. ARIA labels and roles\n3. Keyboard navigation support\n4. Screen reader compatibility\n5. Color contrast compliance\n6. Focus management and indicators\n7. Alternative text for images\n8. Accessible forms and error handling\n9. Skip links and landmarks\n10. Testing with accessibility tools",
    category: "Modern Web Standards"
  },
  {
    title: "Modern CSS Features",
    description: "Leverage cutting-edge CSS features for better user experiences",
    content: "Use modern CSS capabilities:\n\n1. CSS Grid and Flexbox layouts\n2. CSS Custom Properties (variables)\n3. Container queries for responsive design\n4. CSS animations and transitions\n5. Backdrop filters and blend modes\n6. CSS logical properties\n7. Scroll-driven animations\n8. CSS nesting and layers\n9. Modern color functions (oklch, color-mix)\n10. CSS containment for performance",
    category: "Modern Web Standards"
  },
  {
    title: "Security Best Practices",
    description: "Implement modern web security measures",
    content: "Secure your web application:\n\n1. Content Security Policy (CSP) headers\n2. HTTPS enforcement and HSTS\n3. Input validation and sanitization\n4. Authentication and authorization\n5. CSRF protection\n6. XSS prevention techniques\n7. Secure cookie configuration\n8. API rate limiting\n9. Dependency vulnerability scanning\n10. Security headers and OWASP compliance",
    category: "Modern Web Standards"
  },

  // Performance Optimization
  {
    title: "Frontend Performance Audit",
    description: "Comprehensive performance analysis and optimization",
    content: "Conduct thorough performance optimization:\n\n1. Lighthouse audit and score improvement\n2. Bundle size analysis and optimization\n3. Image optimization and lazy loading\n4. Critical rendering path optimization\n5. JavaScript execution optimization\n6. CSS delivery optimization\n7. Third-party script optimization\n8. Memory leak detection and fixes\n9. Network request optimization\n10. Performance monitoring setup",
    category: "Performance"
  },
  {
    title: "Database Optimization",
    description: "Optimize database queries and data access patterns",
    content: "Improve database performance:\n\n1. Query optimization and indexing\n2. Database connection pooling\n3. Caching strategies (Redis, Memcached)\n4. Data pagination and lazy loading\n5. Database schema optimization\n6. N+1 query problem solutions\n7. Database monitoring and profiling\n8. Read replicas and load balancing\n9. Data archiving strategies\n10. Performance testing and benchmarking",
    category: "Performance"
  },

  // Accessibility
  {
    title: "Inclusive Design Patterns",
    description: "Create designs that work for users with diverse abilities",
    content: "Design for inclusivity and accessibility:\n\n1. Universal design principles\n2. Color-blind friendly color schemes\n3. High contrast mode support\n4. Reduced motion preferences\n5. Font size and zoom compatibility\n6. Voice control compatibility\n7. Multi-modal interaction support\n8. Cognitive accessibility considerations\n9. Internationalization and RTL support\n10. User testing with diverse abilities",
    category: "Accessibility"
  },
  {
    title: "Screen Reader Optimization",
    description: "Optimize your application for screen reader users",
    content: "Enhance screen reader experience:\n\n1. Proper heading hierarchy (h1-h6)\n2. Descriptive link text and buttons\n3. Form labels and instructions\n4. Live regions for dynamic content\n5. Skip navigation links\n6. Table headers and captions\n7. Image alt text best practices\n8. Focus management in SPAs\n9. ARIA landmarks and roles\n10. Screen reader testing procedures",
    category: "Accessibility"
  },

  // App Ideas - Transformed from inspiration prompts
  {
    title: "TODO List App",
    description: "Create a simple, beautiful TODO list app perfect for quick demos",
    content: "Create a simple, beautiful TODO list app perfect for quick demos.\n\n✨ **Basic Features:**\n- Add new tasks with a text input\n- Check off completed tasks with smooth animations\n- Delete tasks with a simple button\n- Show task count (e.g., \"3 tasks remaining\")\n- Simple color scheme with nice styling\n- Sample tasks pre-loaded for demo\n\n🎨 **Simple Design:**\n- Clean, modern layout with good spacing\n- Nice hover effects on buttons\n- Simple check/uncheck animations\n- Mobile-friendly responsive design\n- Easy-to-read typography\n\n⚡ **Demo Perfect:**\n- Works immediately without any setup\n- Pre-loaded with 5 sample tasks\n- Smooth interactions that feel satisfying\n- All functionality visible on one screen",
    category: "App Ideas"
  },
  {
    title: "Landing Page",
    description: "Create a high-converting, modern landing page with professional design",
    content: "Create a high-converting, modern landing page with professional design and optimized user experience.\n\n🎯 **Core Sections:**\n- Hero section with compelling headline, subheadline, and clear value proposition\n- Features showcase with icons, benefits, and social proof\n- Testimonials/reviews section with customer photos and quotes\n- Pricing section with comparison table and recommended plans\n- FAQ section addressing common objections\n- Strong call-to-action throughout the page\n- Footer with links, contact info, and legal pages\n\n🎨 **Design & UX:**\n- Mobile-first responsive design that looks great on all devices\n- Modern, clean aesthetic with consistent branding and typography\n- Strategic use of white space and visual hierarchy\n- High-quality images, icons, and graphics\n- Smooth scroll animations and micro-interactions\n- Fast loading times with optimized assets\n- A/B testing ready with variant support\n\n⚡ **Technical Features:**\n- SEO optimized with proper meta tags, structured data, and semantic HTML\n- Contact forms with validation and email integration\n- Newsletter signup with email marketing platform integration\n- Google Analytics and conversion tracking setup\n- Accessibility compliance (WCAG 2.1 AA)\n- Progressive Web App capabilities\n\n🚀 **Conversion Optimization:**\n- Multiple CTA buttons strategically placed\n- Lead magnets and free resources to capture emails\n- Exit-intent popups and scroll-triggered offers\n- Social media integration and sharing buttons\n- Live chat widget for immediate support\n- Trust signals (security badges, certifications, logos)",
    category: "App Ideas"
  },
  {
    title: "Sign Up Form",
    description: "Create a professional, conversion-optimized user registration system",
    content: "Create a professional, conversion-optimized user registration system with modern design and security features.\n\n📝 **Form Features:**\n- Multi-step registration process with progress indicators\n- Real-time field validation with helpful error messages\n- Password strength meter with security requirements\n- Email verification with confirmation flow\n- Social login options (Google, Facebook, Apple, GitHub)\n- Terms of service and privacy policy checkboxes\n- CAPTCHA integration for spam protection\n\n🎨 **Design & UX:**\n- Clean, modern form design with intuitive layout\n- Mobile-responsive with touch-friendly input fields\n- Loading states and success animations\n- Clear visual hierarchy and consistent styling\n- Accessibility features (ARIA labels, keyboard navigation)\n- Dark/light theme support\n\n⚡ **Technical Implementation:**\n- Form validation with client and server-side checks\n- Secure password hashing and storage\n- Email service integration for confirmations\n- Rate limiting to prevent abuse\n- GDPR compliance features\n- Database integration for user management\n- Session management and authentication tokens\n\n🔒 **Security Features:**\n- Input sanitization and XSS protection\n- SQL injection prevention\n- Secure cookie handling\n- Password complexity requirements\n- Account lockout after failed attempts\n- Two-factor authentication support",
    category: "App Ideas"
  },
  {
    title: "Recipe Finder & Meal Planner",
    description: "Create a simple, beautiful recipe app perfect for cooking demos",
    content: "Create a simple, beautiful recipe app perfect for cooking demos.\n\n🍳 **Basic Features:**\n- Recipe cards showing title, photo, and cooking time\n- Simple search by recipe name\n- Favorite button to save recipes\n- Ingredient list with clear formatting\n- Step-by-step cooking instructions\n- Recipe categories (Breakfast, Lunch, Dinner, Dessert)\n\n🎨 **Simple Design:**\n- Clean recipe cards with nice spacing\n- Pleasant colors and easy-to-read text\n- Responsive layout for different screen sizes\n- Simple navigation between recipes\n- Good contrast for readability\n\n⚡ **Demo Ready:**\n- 10+ sample recipes pre-loaded\n- All features work immediately\n- Easy to navigate and understand\n- Perfect for showing off in demos",
    category: "App Ideas"
  },
  {
    title: "Mood Journal & Tracker",
    description: "Create a simple, beautiful mood journal & tracker perfect for demos",
    content: "Create a simple, beautiful mood journal & tracker perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential mood journal & tracker functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Interactive Story Game",
    description: "Create a simple, beautiful interactive story game perfect for demos",
    content: "Create a simple, beautiful interactive story game perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential interactive story game functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Personal Finance Dashboard",
    description: "Create a simple, beautiful personal finance dashboard perfect for demos",
    content: "Create a simple, beautiful personal finance dashboard perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential personal finance dashboard functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Travel Memory Map",
    description: "Create a simple, beautiful travel memory map perfect for demos",
    content: "Create a simple, beautiful travel memory map perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential travel memory map functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "AI Writing Assistant",
    description: "Create a simple, beautiful AI writing assistant perfect for demos",
    content: "Create a simple, beautiful AI writing assistant perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential AI writing assistant functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Emoji Translator",
    description: "Create a simple, beautiful emoji translator perfect for demos",
    content: "Create a simple, beautiful emoji translator perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential emoji translator functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Habit Streak Tracker",
    description: "Create a simple, beautiful habit streak tracker perfect for demos",
    content: "Create a simple, beautiful habit streak tracker perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential habit streak tracker functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Newsletter Creator",
    description: "Create a simple, beautiful newsletter creator perfect for demos",
    content: "Create a simple, beautiful newsletter creator perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential newsletter creator functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Music Discovery App",
    description: "Create a simple, beautiful music discovery app perfect for demos",
    content: "Create a simple, beautiful music discovery app perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential music discovery app functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "3D Portfolio Viewer",
    description: "Create a simple, beautiful 3D portfolio viewer perfect for demos",
    content: "Create a simple, beautiful 3D portfolio viewer perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential 3D portfolio viewer functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "AI Image Generator",
    description: "Create a simple, beautiful AI image generator perfect for demos",
    content: "Create a simple, beautiful AI image generator perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential AI image generator functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Pomodoro Focus Timer",
    description: "Create a simple, beautiful Pomodoro focus timer perfect for demos",
    content: "Create a simple, beautiful Pomodoro focus timer perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential Pomodoro focus timer functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: "Virtual Avatar Builder",
    description: "Create a simple, beautiful virtual avatar builder perfect for demos",
    content: "Create a simple, beautiful virtual avatar builder perfect for demos.\n\n✨ **Basic Features:**\n- Clean, easy-to-use interface\n- Essential virtual avatar builder functionality\n- Simple navigation and layout\n- Nice colors and styling\n- Pre-loaded demo data\n\n🎨 **Simple Design:**\n- Modern, clean appearance\n- Easy-to-read text and buttons\n- Responsive layout for different screens\n- Pleasant color scheme\n- Smooth, simple interactions\n\n⚡ **Demo Ready:**\n- Works immediately without setup\n- Sample content included\n- All features visible and functional\n- Perfect for quick demonstrations",
    category: "App Ideas"
  },
  {
    title: 'Youth Pop Culture Quiz',
    description: 'Quiz/Trivia - Youth Pop Culture Quiz',
    content: 'Create a colorful, modern prototype for “Youth Pop Culture Quiz” with polished UI and rich mock data. Focus on core flows: topic-wise questions; timed rounds & streaks; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Gold & Ornament Price Tracker India',
    description: 'Finance/Business - Gold & Ornament Price Tracker India',
    content: 'Create a colorful, modern prototype for “Gold & Ornament Price Tracker India” with polished UI and rich mock data. Focus on core flows: metal rates via MetalPriceAPI; making/wastage charges calculator; unit conversion (gram, tola, ounce) and 22K/24K purity; price alerts and city-wise rates. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'FirstDemo',
    description: 'General App - FirstDemo',
    content: 'Create a colorful, modern prototype for “FirstDemo” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Teen Pop Culture Quiz',
    description: 'Quiz/Trivia - Teen Pop Culture Quiz',
    content: 'Create a colorful, modern prototype for “Teen Pop Culture Quiz” with polished UI and rich mock data. Focus on core flows: topic-wise questions; timed rounds & streaks; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Flag Master Challenge',
    description: 'General App - Flag Master Challenge',
    content: 'Create a colorful, modern prototype for “Flag Master Challenge” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CaptionCraze – AI Caption & Hashtag Generator',
    description: 'General App - CaptionCraze – AI Caption & Hashtag Generator',
    content: 'Create a colorful, modern prototype for “CaptionCraze – AI Caption & Hashtag Generator” with polished UI and rich mock data. Focus on core flows: image picker + describe → suggest captions/hashtags (stub); workspace of drafts, one-tap copy. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Brain Detox',
    description: 'General App - Brain Detox',
    content: 'Create a colorful, modern prototype for “Brain Detox” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Couples Fitness Challenge App',
    description: 'Health & Wellness - Couples Fitness Challenge App',
    content: 'Create a colorful, modern prototype for “Couples Fitness Challenge App” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Power Pages Native Features Integration',
    description: 'Dev/Integration - Power Pages Native Features Integration',
    content: 'Create a colorful, modern prototype for “Power Pages Native Features Integration” with polished UI and rich mock data. Focus on core flows: demo pages showing camera, GPS, file picker, speech, barcode. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Lost Property Reporting App',
    description: 'Game - Lost Property Reporting App',
    content: 'Create a colorful, modern prototype for “Lost Property Reporting App” with polished UI and rich mock data. Focus on core flows: guided voice entry for item details (SpeechRecognition); photo upload + object detection placeholder; auto-fill structured fields (category, brand, colour). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Campus Predictions',
    description: 'General App - Campus Predictions',
    content: 'Create a colorful, modern prototype for “Campus Predictions” with polished UI and rich mock data. Focus on core flows: enter exam scores & preferences; ranking suggestion placeholder. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'QuickFit Timer',
    description: 'General App - QuickFit Timer',
    content: 'Create a colorful, modern prototype for “QuickFit Timer” with polished UI and rich mock data. Focus on core flows: HIIT/EMOM/Tabata presets, haptics, background timer; save custom workouts. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Color Switch Dash',
    description: 'Game - Color Switch Dash',
    content: 'Create a colorful, modern prototype for “Color Switch Dash” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'TrendPulse News',
    description: 'News/Media - TrendPulse News',
    content: 'Create a colorful, modern prototype for “TrendPulse News” with polished UI and rich mock data. Focus on core flows: RSS/JSON feed ingestion with topic filters; read-later and offline mode. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'InvoiceFlow: Easy Invoicing & Business Management',
    description: 'Finance/Business - InvoiceFlow: Easy Invoicing & Business Management',
    content: 'Create a colorful, modern prototype for “InvoiceFlow: Easy Invoicing & Business Management” with polished UI and rich mock data. Focus on core flows: invoice/estimate/receipt generator; GST/VAT fields; PDF export & share; client list and payment status tracking. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Ethical Plate AI',
    description: 'General App - Ethical Plate AI',
    content: 'Create a colorful, modern prototype for “Ethical Plate AI” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'FreelanceFlow AI',
    description: 'General App - FreelanceFlow AI',
    content: 'Create a colorful, modern prototype for “FreelanceFlow AI” with polished UI and rich mock data. Focus on core flows: proposal templates, invoice + time tracking combo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Language Learner Flashcards',
    description: 'General App - Language Learner Flashcards',
    content: 'Create a colorful, modern prototype for “Language Learner Flashcards” with polished UI and rich mock data. Focus on core flows: spaced repetition, TTS for pronunciation. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Pet Care Concierge',
    description: 'Pet & Animal - Pet Care Concierge',
    content: 'Create a colorful, modern prototype for “Pet Care Concierge” with polished UI and rich mock data. Focus on core flows: pet profiles, vaccinations, vet visits; diet schedule and reminders. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Crypto Empire Idle',
    description: 'Crypto/Education - Crypto Empire Idle',
    content: 'Create a colorful, modern prototype for “Crypto Empire Idle” with polished UI and rich mock data. Focus on core flows: idle income loop; upgrades; prestige mechanics. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'City Scape Merge',
    description: 'Game - City Scape Merge',
    content: 'Create a colorful, modern prototype for “City Scape Merge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Plant Growth Merge',
    description: 'Game - Plant Growth Merge',
    content: 'Create a colorful, modern prototype for “Plant Growth Merge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Chain Blast - Domino Puzzle',
    description: 'Game - Chain Blast - Domino Puzzle',
    content: 'Create a colorful, modern prototype for “Chain Blast - Domino Puzzle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Tool Sort 3D: Garage Organizer',
    description: 'Game - Tool Sort 3D: Garage Organizer',
    content: 'Create a colorful, modern prototype for “Tool Sort 3D: Garage Organizer” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Block Fit 3D: Jigsaw Puzzle',
    description: 'Game - Block Fit 3D: Jigsaw Puzzle',
    content: 'Create a colorful, modern prototype for “Block Fit 3D: Jigsaw Puzzle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Pazaak Duel: Multiplayer Card Challenge',
    description: 'General App - Pazaak Duel: Multiplayer Card Challenge',
    content: 'Create a colorful, modern prototype for “Pazaak Duel: Multiplayer Card Challenge” with polished UI and rich mock data. Focus on core flows: realtime multiplayer via supabase-realtime (placeholder). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Color Sort 3D',
    description: 'General App - Color Sort 3D',
    content: 'Create a colorful, modern prototype for “Color Sort 3D” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'ColorMatch Challenge',
    description: 'Game - ColorMatch Challenge',
    content: 'Create a colorful, modern prototype for “ColorMatch Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Maze Master: Daily Challenge & Social Adventure',
    description: 'Game - Maze Master: Daily Challenge & Social Adventure',
    content: 'Create a colorful, modern prototype for “Maze Master: Daily Challenge & Social Adventure” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Block Puzzle Challenge',
    description: 'Game - Block Puzzle Challenge',
    content: 'Create a colorful, modern prototype for “Block Puzzle Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Emoji Memory Match Adventure',
    description: 'Game - Emoji Memory Match Adventure',
    content: 'Create a colorful, modern prototype for “Emoji Memory Match Adventure” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Pixel Parrot',
    description: 'Game - Pixel Parrot',
    content: 'Create a colorful, modern prototype for “Pixel Parrot” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'ChessAI Master',
    description: 'Game - ChessAI Master',
    content: 'Create a colorful, modern prototype for “ChessAI Master” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Ultimate Sudoku Challenge',
    description: 'Game - Ultimate Sudoku Challenge',
    content: 'Create a colorful, modern prototype for “Ultimate Sudoku Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Tetris AI Battle Royale',
    description: 'Game - Tetris AI Battle Royale',
    content: 'Create a colorful, modern prototype for “Tetris AI Battle Royale” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Immersive Text Adventure Game',
    description: 'Game - Immersive Text Adventure Game',
    content: 'Create a colorful, modern prototype for “Immersive Text Adventure Game” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Immersive Adventure: An Interactive Storytelling Experience',
    description: 'General App - Immersive Adventure: An Interactive Storytelling Experience',
    content: 'Create a colorful, modern prototype for “Immersive Adventure: An Interactive Storytelling Experience” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Mystic Hand',
    description: 'General App - Mystic Hand',
    content: 'Create a colorful, modern prototype for “Mystic Hand” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SlidePilot: AI-Powered Cross-Platform Slide Deck Maker',
    description: 'Productivity/Creator Tools - SlidePilot: AI-Powered Cross-Platform Slide Deck Maker',
    content: 'Create a colorful, modern prototype for “SlidePilot: AI-Powered Cross-Platform Slide Deck Maker” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AstroKundali',
    description: 'Astrology/Spiritual - AstroKundali',
    content: 'Create a colorful, modern prototype for “AstroKundali” with polished UI and rich mock data. Focus on core flows: VedicAstroAPI hooks (config only); store full Kundali JSON and human-friendly summary. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Tutor Hub',
    description: 'General App - AI Tutor Hub',
    content: 'Create a colorful, modern prototype for “AI Tutor Hub” with polished UI and rich mock data. Focus on core flows: subject cards; chat-based Q&A stub; quizzes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Tools Directory',
    description: 'Directory/Utilities - AI Tools Directory',
    content: 'Create a colorful, modern prototype for “AI Tools Directory” with polished UI and rich mock data. Focus on core flows: curated categories, search, submit tool form; badges: free, open-source, paid. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'ScanMyMeal',
    description: 'Health & Wellness - ScanMyMeal',
    content: 'Create a colorful, modern prototype for “ScanMyMeal” with polished UI and rich mock data. Focus on core flows: meal photo upload; nutrition analysis placeholder; AI coach chat, glycemic load hints; food log with macros and weekly summary. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Expo Reusable Template Hub',
    description: 'Dev/Template - Expo Reusable Template Hub',
    content: 'Create a colorful, modern prototype for “Expo Reusable Template Hub” with polished UI and rich mock data. Focus on core flows: gallery of starter templates with preview and clone. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'WealthWhiz',
    description: 'Finance/Business - WealthWhiz',
    content: 'Create a colorful, modern prototype for “WealthWhiz” with polished UI and rich mock data. Focus on core flows: net worth tracker across accounts & assets; goal planning and projections. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Home Garden Buddy',
    description: 'Home & Lifestyle - Home Garden Buddy',
    content: 'Create a colorful, modern prototype for “Home Garden Buddy” with polished UI and rich mock data. Focus on core flows: plant database, watering schedule, pest tips; image notes per plant. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'HappyCat AI',
    description: 'Pet & Animal - HappyCat AI',
    content: 'Create a colorful, modern prototype for “HappyCat AI” with polished UI and rich mock data. Focus on core flows: cat care tips, feeding guide, playful activities. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'EasyTech Learn: Your AI-Powered Tech Tutorial App',
    description: 'General App - EasyTech Learn: Your AI-Powered Tech Tutorial App',
    content: 'Create a colorful, modern prototype for “EasyTech Learn: Your AI-Powered Tech Tutorial App” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Recipe Meal Planner',
    description: 'Health & Wellness - AI Recipe Meal Planner',
    content: 'Create a colorful, modern prototype for “AI Recipe Meal Planner” with polished UI and rich mock data. Focus on core flows: generate plan from calories/macros; printable list. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Symptom HelpAI',
    description: 'Health & Wellness - Symptom HelpAI',
    content: 'Create a colorful, modern prototype for “Symptom HelpAI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Virtual Pet Rock',
    description: 'Pet & Animal - Virtual Pet Rock',
    content: 'Create a colorful, modern prototype for “Virtual Pet Rock” with polished UI and rich mock data. Focus on core flows: mood, care actions, notifications; AR face (optional). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Daily Tips & Fun App',
    description: 'General App - Daily Tips & Fun App',
    content: 'Create a colorful, modern prototype for “Daily Tips & Fun App” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Tools Directory App',
    description: 'Directory/Utilities - AI Tools Directory App',
    content: 'Create a colorful, modern prototype for “AI Tools Directory App” with polished UI and rich mock data. Focus on core flows: curated categories, search, submit tool form; badges: free, open-source, paid. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Easy Meal Planner',
    description: 'Health & Wellness - Easy Meal Planner',
    content: 'Create a colorful, modern prototype for “Easy Meal Planner” with polished UI and rich mock data. Focus on core flows: weekly planner; grocery list; nutrition snapshot. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Financial Data Aggregator & Net Worth Tracker',
    description: 'Finance/Business - Financial Data Aggregator & Net Worth Tracker',
    content: 'Create a colorful, modern prototype for “Financial Data Aggregator & Net Worth Tracker” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Couples\' Financial Harmony',
    description: 'General App - Couples\' Financial Harmony',
    content: 'Create a colorful, modern prototype for “Couples\' Financial Harmony” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'LovePulse: AI Couple Coach',
    description: 'General App - LovePulse: AI Couple Coach',
    content: 'Create a colorful, modern prototype for “LovePulse: AI Couple Coach” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Crypto Mini-Courses Hub',
    description: 'Crypto/Education - Crypto Mini-Courses Hub',
    content: 'Create a colorful, modern prototype for “Crypto Mini-Courses Hub” with polished UI and rich mock data. Focus on core flows: bite-size lessons; watchlist/news mock; quizzes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CryptoDaily Insights',
    description: 'Crypto/Education - CryptoDaily Insights',
    content: 'Create a colorful, modern prototype for “CryptoDaily Insights” with polished UI and rich mock data. Focus on core flows: daily news digest; top movers; bookmarks. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CryptoStarter: Learn Cryptocurrency Basics',
    description: 'Crypto/Education - CryptoStarter: Learn Cryptocurrency Basics',
    content: 'Create a colorful, modern prototype for “CryptoStarter: Learn Cryptocurrency Basics” with polished UI and rich mock data. Focus on core flows: bite-sized lessons; glossary; quizzes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Block Drop Challenge',
    description: 'General App - Block Drop Challenge',
    content: 'Create a colorful, modern prototype for “Block Drop Challenge” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'VitalBuddy AI',
    description: 'Health & Wellness - VitalBuddy AI',
    content: 'Create a colorful, modern prototype for “VitalBuddy AI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Aura - Voice-Enabled Medication Coach',
    description: 'Health & Wellness - Aura - Voice-Enabled Medication Coach',
    content: 'Create a colorful, modern prototype for “Aura - Voice-Enabled Medication Coach” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'MoodGenie: AI Mood Tracker & Stress Reliever',
    description: 'Health & Wellness - MoodGenie: AI Mood Tracker & Stress Reliever',
    content: 'Create a colorful, modern prototype for “MoodGenie: AI Mood Tracker & Stress Reliever” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SymptomCheck AI',
    description: 'Health & Wellness - SymptomCheck AI',
    content: 'Create a colorful, modern prototype for “SymptomCheck AI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'DocuMind: AI Document Scanner & Manager',
    description: 'Productivity/Creator Tools - DocuMind: AI Document Scanner & Manager',
    content: 'Create a colorful, modern prototype for “DocuMind: AI Document Scanner & Manager” with polished UI and rich mock data. Focus on core flows: camera scan with edge detection (placeholder); OCR stub + organize into folders; export PDF. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Photo Cleaner Guru',
    description: 'Productivity/Creator Tools - Photo Cleaner Guru',
    content: 'Create a colorful, modern prototype for “Photo Cleaner Guru” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AR Style Studio',
    description: 'Productivity/Creator Tools - AR Style Studio',
    content: 'Create a colorful, modern prototype for “AR Style Studio” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Culinary AI',
    description: 'General App - Culinary AI',
    content: 'Create a colorful, modern prototype for “Culinary AI” with polished UI and rich mock data. Focus on core flows: recipe search, substitutions, scaling. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SideHustle AI Mentor',
    description: 'General App - SideHustle AI Mentor',
    content: 'Create a colorful, modern prototype for “SideHustle AI Mentor” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'EcoScan Buddy',
    description: 'General App - EcoScan Buddy',
    content: 'Create a colorful, modern prototype for “EcoScan Buddy” with polished UI and rich mock data. Focus on core flows: scan product barcode; eco score placeholder; tips to reduce footprint; favourites. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Language Buddy',
    description: 'General App - AI Language Buddy',
    content: 'Create a colorful, modern prototype for “AI Language Buddy” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SkillUp Sphere',
    description: 'General App - SkillUp Sphere',
    content: 'Create a colorful, modern prototype for “SkillUp Sphere” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Diabetes Care Companion',
    description: 'Health & Wellness - Diabetes Care Companion',
    content: 'Create a colorful, modern prototype for “Diabetes Care Companion” with polished UI and rich mock data. Focus on core flows: blood glucose logs, meds schedule; reports and alerts for out-of-range values. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SplitWise Quest: Financial Harmony Game',
    description: 'Game - SplitWise Quest: Financial Harmony Game',
    content: 'Create a colorful, modern prototype for “SplitWise Quest: Financial Harmony Game” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Planet Colonizer Idle',
    description: 'Game - Planet Colonizer Idle',
    content: 'Create a colorful, modern prototype for “Planet Colonizer Idle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Bakery Empire Idle',
    description: 'Game - Bakery Empire Idle',
    content: 'Create a colorful, modern prototype for “Bakery Empire Idle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Gym Fitness Idle: Tycoon Empire',
    description: 'Health & Wellness - Gym Fitness Idle: Tycoon Empire',
    content: 'Create a colorful, modern prototype for “Gym Fitness Idle: Tycoon Empire” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Kitchen Recipe Merge: Master Chef Mania',
    description: 'Game - Kitchen Recipe Merge: Master Chef Mania',
    content: 'Create a colorful, modern prototype for “Kitchen Recipe Merge: Master Chef Mania” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Weapon Forge Merge',
    description: 'Game - Weapon Forge Merge',
    content: 'Create a colorful, modern prototype for “Weapon Forge Merge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Ludo Supreme League',
    description: 'Game - Ludo Supreme League',
    content: 'Create a colorful, modern prototype for “Ludo Supreme League” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Marble Run Builder',
    description: 'Game - Marble Run Builder',
    content: 'Create a colorful, modern prototype for “Marble Run Builder” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Royal Match Puzzle',
    description: 'Game - Royal Match Puzzle',
    content: 'Create a colorful, modern prototype for “Royal Match Puzzle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Team Ludo: Multiplayer Strategy Board Game',
    description: 'Game - Team Ludo: Multiplayer Strategy Board Game',
    content: 'Create a colorful, modern prototype for “Team Ludo: Multiplayer Strategy Board Game” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Rope Rescue: Physics Puzzles',
    description: 'Game - Rope Rescue: Physics Puzzles',
    content: 'Create a colorful, modern prototype for “Rope Rescue: Physics Puzzles” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Style & Sort 3D: Closet Organizer',
    description: 'Home & Lifestyle - Style & Sort 3D: Closet Organizer',
    content: 'Create a colorful, modern prototype for “Style & Sort 3D: Closet Organizer” with polished UI and rich mock data. Focus on core flows: lists & checklists; photos/notes; smart reminders. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'QuickPlay Ludo',
    description: 'Game - QuickPlay Ludo',
    content: 'Create a colorful, modern prototype for “QuickPlay Ludo” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Ludo Vortex: The Diceless Challenge',
    description: 'Game - Ludo Vortex: The Diceless Challenge',
    content: 'Create a colorful, modern prototype for “Ludo Vortex: The Diceless Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Circle Tap Challenge',
    description: 'Game - Circle Tap Challenge',
    content: 'Create a colorful, modern prototype for “Circle Tap Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Countdown Challenge: Multiplayer Timer Game',
    description: 'Game - Countdown Challenge: Multiplayer Timer Game',
    content: 'Create a colorful, modern prototype for “Countdown Challenge: Multiplayer Timer Game” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'SpotMaster',
    description: 'Game - SpotMaster',
    content: 'Create a colorful, modern prototype for “SpotMaster” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Daily Puzzle Challenge',
    description: 'Game - Daily Puzzle Challenge',
    content: 'Create a colorful, modern prototype for “Daily Puzzle Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Wordlaa Challenge',
    description: 'Game - Wordlaa Challenge',
    content: 'Create a colorful, modern prototype for “Wordlaa Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Tetris AI Battle Royale (2)',
    description: 'Game - Tetris AI Battle Royale (2)',
    content: 'Create a colorful, modern prototype for “Tetris AI Battle Royale (2)” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Arcane Maze',
    description: 'Game - Arcane Maze',
    content: 'Create a colorful, modern prototype for “Arcane Maze” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Snake Duel: AI-Powered Multiplayer Snake Game',
    description: 'Game - Snake Duel: AI-Powered Multiplayer Snake Game',
    content: 'Create a colorful, modern prototype for “Snake Duel: AI-Powered Multiplayer Snake Game” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'ArithmaGrid',
    description: 'General App - ArithmaGrid',
    content: 'Create a colorful, modern prototype for “ArithmaGrid” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Word Search Adventure',
    description: 'Game - Word Search Adventure',
    content: 'Create a colorful, modern prototype for “Word Search Adventure” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: '2048 Game AI',
    description: 'Game - 2048 Game AI',
    content: 'Create a colorful, modern prototype for “2048 Game AI” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'MoneyBuddy: Personal Finance & Goals',
    description: 'Finance/Business - MoneyBuddy: Personal Finance & Goals',
    content: 'Create a colorful, modern prototype for “MoneyBuddy: Personal Finance & Goals” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'HabitQuest: AI Habit Tracker',
    description: 'General App - HabitQuest: AI Habit Tracker',
    content: 'Create a colorful, modern prototype for “HabitQuest: AI Habit Tracker” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Cooking Coach & Recipe Generator',
    description: 'General App - AI Cooking Coach & Recipe Generator',
    content: 'Create a colorful, modern prototype for “AI Cooking Coach & Recipe Generator” with polished UI and rich mock data. Focus on core flows: pantry-based recipe ideas; shopping list; dietary filters. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'IndoTranslate Voice Companion',
    description: 'Productivity/Creator Tools - IndoTranslate Voice Companion',
    content: 'Create a colorful, modern prototype for “IndoTranslate Voice Companion” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Legal Document Assistant',
    description: 'Productivity/Creator Tools - AI Legal Document Assistant',
    content: 'Create a colorful, modern prototype for “AI Legal Document Assistant” with polished UI and rich mock data. Focus on core flows: upload PDF/DOCX; clause extraction placeholder; risk flags, plain-language summary. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AutoAdvisor AI',
    description: 'Finance/Business - AutoAdvisor AI',
    content: 'Create a colorful, modern prototype for “AutoAdvisor AI” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'MindEase: Mood & Mental Health Tracker',
    description: 'Health & Wellness - MindEase: Mood & Mental Health Tracker',
    content: 'Create a colorful, modern prototype for “MindEase: Mood & Mental Health Tracker” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CoachAI Drive: AI-Powered Driving Coach and Safety App',
    description: 'General App - CoachAI Drive: AI-Powered Driving Coach and Safety App',
    content: 'Create a colorful, modern prototype for “CoachAI Drive: AI-Powered Driving Coach and Safety App” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SmartTravel Finder',
    description: 'Travel - SmartTravel Finder',
    content: 'Create a colorful, modern prototype for “SmartTravel Finder” with polished UI and rich mock data. Focus on core flows: search & map view; saved trips; offline mock data. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Resume & Career Builder',
    description: 'Productivity/Creator Tools - AI Resume & Career Builder',
    content: 'Create a colorful, modern prototype for “AI Resume & Career Builder” with polished UI and rich mock data. Focus on core flows: resume sections editor; export PDF; job match tips (placeholder). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Smart Meal Prep for Singles',
    description: 'Health & Wellness - Smart Meal Prep for Singles',
    content: 'Create a colorful, modern prototype for “Smart Meal Prep for Singles” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'MindMate',
    description: 'General App - MindMate',
    content: 'Create a colorful, modern prototype for “MindMate” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Remote Work Wellness Assistant',
    description: 'Health & Wellness - Remote Work Wellness Assistant',
    content: 'Create a colorful, modern prototype for “Remote Work Wellness Assistant” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Top Footballers List App',
    description: 'General App - Top Footballers List App',
    content: 'Create a colorful, modern prototype for “Top Footballers List App” with polished UI and rich mock data. Focus on core flows: rankings by goals/assists; filters by league/country. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'DailyVibe – AI Daily Content Plan',
    description: 'General App - DailyVibe – AI Daily Content Plan',
    content: 'Create a colorful, modern prototype for “DailyVibe – AI Daily Content Plan” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Maze Runner Infinite',
    description: 'Game - Maze Runner Infinite',
    content: 'Create a colorful, modern prototype for “Maze Runner Infinite” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'CryptoVault Guardian',
    description: 'Crypto/Education - CryptoVault Guardian',
    content: 'Create a colorful, modern prototype for “CryptoVault Guardian” with polished UI and rich mock data. Focus on core flows: security hygiene checklist; breach alerts placeholder. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CryptoQuest Academy',
    description: 'Crypto/Education - CryptoQuest Academy',
    content: 'Create a colorful, modern prototype for “CryptoQuest Academy” with polished UI and rich mock data. Focus on core flows: bite-size lessons; watchlist/news mock; quizzes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'FitTrack Exercise Logger',
    description: 'General App - FitTrack Exercise Logger',
    content: 'Create a colorful, modern prototype for “FitTrack Exercise Logger” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'NutriAI',
    description: 'Health & Wellness - NutriAI',
    content: 'Create a colorful, modern prototype for “NutriAI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'CycleSoothe: Your AI Wellness Companion for Females',
    description: 'Health & Wellness - CycleSoothe: Your AI Wellness Companion for Females',
    content: 'Create a colorful, modern prototype for “CycleSoothe: Your AI Wellness Companion for Females” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'The Offline Club',
    description: 'General App - The Offline Club',
    content: 'Create a colorful, modern prototype for “The Offline Club” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Hook Line Studio',
    description: 'General App - Hook Line Studio',
    content: 'Create a colorful, modern prototype for “Hook Line Studio” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'GlucoHub: The AI Diabetes Mastery App',
    description: 'Health & Wellness - GlucoHub: The AI Diabetes Mastery App',
    content: 'Create a colorful, modern prototype for “GlucoHub: The AI Diabetes Mastery App” with polished UI and rich mock data. Focus on core flows: fast glucose log entry; reminders before/after meals; charts and pattern detection; doctor report PDF export. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'FastingBuddy',
    description: 'Health & Wellness - FastingBuddy',
    content: 'Create a colorful, modern prototype for “FastingBuddy” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Dating Companion',
    description: 'General App - AI Dating Companion',
    content: 'Create a colorful, modern prototype for “AI Dating Companion” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'StatusStar – WhatsApp Status Generator',
    description: 'General App - StatusStar – WhatsApp Status Generator',
    content: 'Create a colorful, modern prototype for “StatusStar – WhatsApp Status Generator” with polished UI and rich mock data. Focus on core flows: short status ideas grouped by mood; one-tap copy/share. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Tax Pro Assistant',
    description: 'Finance/Business - AI Tax Pro Assistant',
    content: 'Create a colorful, modern prototype for “AI Tax Pro Assistant” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Authentic AI Art Prompter',
    description: 'Productivity/Creator Tools - Authentic AI Art Prompter',
    content: 'Create a colorful, modern prototype for “Authentic AI Art Prompter” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'GlucoIQ',
    description: 'Health & Wellness - GlucoIQ',
    content: 'Create a colorful, modern prototype for “GlucoIQ” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Sugar Connect',
    description: 'General App - Sugar Connect',
    content: 'Create a colorful, modern prototype for “Sugar Connect” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'ViralScript AI - Content Creator Assistant',
    description: 'General App - ViralScript AI - Content Creator Assistant',
    content: 'Create a colorful, modern prototype for “ViralScript AI - Content Creator Assistant” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Budget Game Changer',
    description: 'Finance/Business - Budget Game Changer',
    content: 'Create a colorful, modern prototype for “Budget Game Changer” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Mindful Scroll AI',
    description: 'General App - Mindful Scroll AI',
    content: 'Create a colorful, modern prototype for “Mindful Scroll AI” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Budget Buddy AI',
    description: 'Finance/Business - Budget Buddy AI',
    content: 'Create a colorful, modern prototype for “Budget Buddy AI” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Sky Runner',
    description: 'General App - Sky Runner',
    content: 'Create a colorful, modern prototype for “Sky Runner” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Habit Builder AI',
    description: 'Game - Habit Builder AI',
    content: 'Create a colorful, modern prototype for “Habit Builder AI” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Water Intake Companion AI',
    description: 'Health & Wellness - Water Intake Companion AI',
    content: 'Create a colorful, modern prototype for “Water Intake Companion AI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Leap Rush',
    description: 'General App - Leap Rush',
    content: 'Create a colorful, modern prototype for “Leap Rush” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Ocean Explorer Idle: Deep Sea Discovery',
    description: 'Game - Ocean Explorer Idle: Deep Sea Discovery',
    content: 'Create a colorful, modern prototype for “Ocean Explorer Idle: Deep Sea Discovery” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Number Merge Evolution',
    description: 'Game - Number Merge Evolution',
    content: 'Create a colorful, modern prototype for “Number Merge Evolution” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Bridge Constructor Lite: Build & Drive',
    description: 'General App - Bridge Constructor Lite: Build & Drive',
    content: 'Create a colorful, modern prototype for “Bridge Constructor Lite: Build & Drive” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Balloon Pop Physics: Airflow Puzzle',
    description: 'Game - Balloon Pop Physics: Airflow Puzzle',
    content: 'Create a colorful, modern prototype for “Balloon Pop Physics: Airflow Puzzle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Words Builder - AI',
    description: 'Game - Words Builder - AI',
    content: 'Create a colorful, modern prototype for “Words Builder - AI” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: '2048 AI - Always Simple',
    description: 'General App - 2048 AI - Always Simple',
    content: 'Create a colorful, modern prototype for “2048 AI - Always Simple” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Poker Tournaments AI',
    description: 'Game - Poker Tournaments AI',
    content: 'Create a colorful, modern prototype for “Poker Tournaments AI” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'HexaMerge Challenge',
    description: 'Game - HexaMerge Challenge',
    content: 'Create a colorful, modern prototype for “HexaMerge Challenge” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Colorful Nonogram Puzzle',
    description: 'Game - Colorful Nonogram Puzzle',
    content: 'Create a colorful, modern prototype for “Colorful Nonogram Puzzle” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Wordle! Word Game Hub',
    description: 'Game - Wordle! Word Game Hub',
    content: 'Create a colorful, modern prototype for “Wordle! Word Game Hub” with polished UI and rich mock data. Focus on core flows: endless levels; score & save state; leaderboard demo. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score/progress view.',
    category: 'App Ideas'
  },
  {
    title: 'GovExam AI Tutor',
    description: 'General App - GovExam AI Tutor',
    content: 'Create a colorful, modern prototype for “GovExam AI Tutor” with polished UI and rich mock data. Focus on core flows: syllabus-based modules; mock tests; progress reports. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'My Fitness Tracker',
    description: 'Health & Wellness - My Fitness Tracker',
    content: 'Create a colorful, modern prototype for “My Fitness Tracker” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Skincare Routine APP AI',
    description: 'Health & Wellness - Skincare Routine APP AI',
    content: 'Create a colorful, modern prototype for “Skincare Routine APP AI” with polished UI and rich mock data. Focus on core flows: daily logs & reminders; progress charts; coach-style tips. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Loan Advisor App Clone',
    description: 'Finance/Business - AI Loan Advisor App Clone',
    content: 'Create a colorful, modern prototype for “AI Loan Advisor App Clone” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Universal Expo App Template',
    description: 'Dev/Template - Universal Expo App Template',
    content: 'Create a colorful, modern prototype for “Universal Expo App Template” with polished UI and rich mock data. Focus on core flows: kitchen-sink template with common primitives; toggles via config. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Virtual Family Companion',
    description: 'General App - Virtual Family Companion',
    content: 'Create a colorful, modern prototype for “Virtual Family Companion” with polished UI and rich mock data. Focus on core flows: lists & detail; create/edit flows; settings & themes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Loan Advisor App',
    description: 'Finance/Business - AI Loan Advisor App',
    content: 'Create a colorful, modern prototype for “AI Loan Advisor App” with polished UI and rich mock data. Focus on core flows: budgets & transactions; beautiful charts; CSV/PDF export mockups. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Resume builder',
    description: 'Productivity/Creator Tools - Resume builder',
    content: 'Create a colorful, modern prototype for “Resume builder” with polished UI and rich mock data. Focus on core flows: templates & drafts; exports; history & revisions. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'PredictaCare AI',
    description: 'General App - PredictaCare AI',
    content: 'Create a colorful, modern prototype for “PredictaCare AI” with polished UI and rich mock data. Focus on core flows: health risk questionnaire; tips & follow-ups (placeholder). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Homework Helper',
    description: 'Home & Lifestyle - AI Homework Helper',
    content: 'Create a colorful, modern prototype for “AI Homework Helper” with polished UI and rich mock data. Focus on core flows: assignment planner and due-date reminders; camera-to-text placeholder for problem capture; explain-like-I\'m-five study notes (stub). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'HappyCat AI',
    description: 'Pet & Animal - HappyCat AI',
    content: 'Create a colorful, modern prototype for “HappyCat AI” with polished UI and rich mock data. Focus on core flows: cat care tips, feeding guide, playful activities. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'DreamNest AI: Your Personal Home Designer',
    description: 'Home & Lifestyle - DreamNest AI: Your Personal Home Designer',
    content: 'Create a colorful, modern prototype for “DreamNest AI: Your Personal Home Designer” with polished UI and rich mock data. Focus on core flows: room profiles and moodboards; measurements & furniture lists; export PDF. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'WeddingBuddy: Marriage Planning Assistant',
    description: 'Home & Lifestyle - WeddingBuddy: Marriage Planning Assistant',
    content: 'Create a colorful, modern prototype for “WeddingBuddy: Marriage Planning Assistant” with polished UI and rich mock data. Focus on core flows: checklists (venues, outfits, vendors), budget & guest list; timeline generator; export/share. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'EcoChoice Advisor',
    description: 'Finance/Business - EcoChoice Advisor',
    content: 'Create a colorful, modern prototype for “EcoChoice Advisor” with polished UI and rich mock data. Focus on core flows: eco-scores for products (manual dataset stub); tips and alternatives; bookmark favourites. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SolarHome App',
    description: 'Home & Lifestyle - SolarHome App',
    content: 'Create a colorful, modern prototype for “SolarHome App” with polished UI and rich mock data. Focus on core flows: sunlight estimate input; ROI calculator (stub); installation checklist and vendor notes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Smart EV Charging Guide',
    description: 'Home & Lifestyle - Smart EV Charging Guide',
    content: 'Create a colorful, modern prototype for “Smart EV Charging Guide” with polished UI and rich mock data. Focus on core flows: home/work charger tips, tariff planner; route planner stub with charging stops. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Plant Care Companion App',
    description: 'Home & Lifestyle - Plant Care Companion App',
    content: 'Create a colorful, modern prototype for “Plant Care Companion App” with polished UI and rich mock data. Focus on core flows: watering/feeding schedules; photo journal and reminders. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Sleep Well AI',
    description: 'Health & Wellness - Sleep Well AI',
    content: 'Create a colorful, modern prototype for “Sleep Well AI” with polished UI and rich mock data. Focus on core flows: sleep log, wind-down reminders, gentle alarm; sleep hygiene tips card deck. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AI Meme Generator',
    description: 'General App - AI Meme Generator',
    content: 'Create a colorful, modern prototype for “AI Meme Generator” with polished UI and rich mock data. Focus on core flows: image picker + caption templates; export PNG; meme template gallery with search. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Local Skills Exchange Platform',
    description: 'Marketplace/Social - Local Skills Exchange Platform',
    content: 'Create a colorful, modern prototype for “Local Skills Exchange Platform” with polished UI and rich mock data. Focus on core flows: skill listings, DM chat (placeholder), and bookings; wallet-free IOU tracking; reviews. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Atmospheric Text Adventure',
    description: 'Game - Atmospheric Text Adventure',
    content: 'Create a colorful, modern prototype for “Atmospheric Text Adventure” with polished UI and rich mock data. Focus on core flows: branching story engine with save slots. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score or progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Easy Learn - Special Kids',
    description: 'Education/Learning - Easy Learn - Special Kids',
    content: 'Create a colorful, modern prototype for “Easy Learn - Special Kids” with polished UI and rich mock data. Focus on core flows: large fonts, high-contrast UI, audio prompts; picture-based quizzes and rewards. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'SmartQR: Advanced QR Code Utility App',
    description: 'Utility/Scanner - SmartQR: Advanced QR Code Utility App',
    content: 'Create a colorful, modern prototype for “SmartQR: Advanced QR Code Utility App” with polished UI and rich mock data. Focus on core flows: scan, generate, and manage QR/Barcodes; batch scan mode with CSV export. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'StudyMate: Your Personal Study Planner & Tracker',
    description: 'Education/Learning - StudyMate: Your Personal Study Planner & Tracker',
    content: 'Create a colorful, modern prototype for “StudyMate: Your Personal Study Planner & Tracker” with polished UI and rich mock data. Focus on core flows: planner/calendar integration with reminders; Pomodoro timer and focus stats. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Men\'s Health Wellness App',
    description: 'Health & Wellness - Men\'s Health Wellness App',
    content: 'Create a colorful, modern prototype for “Men\'s Health Wellness App” with polished UI and rich mock data. Focus on core flows: daily habits (sleep, nutrition, workouts) with streaks; privacy-first notes and resources. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'IPL Facts & Quizzes',
    description: 'Quiz/Trivia - IPL Facts & Quizzes',
    content: 'Create a colorful, modern prototype for “IPL Facts & Quizzes” with polished UI and rich mock data. Focus on core flows: offline IPL facts pack; 25-fact quiz cadence; category filters (teams, players, seasons). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens. Provide a home screen, play/quiz screens, results, and a simple high‑score or progress view.',
    category: 'App Ideas'
  },
  {
    title: 'Lift My Brain',
    description: 'General App - Lift My Brain',
    content: 'Create a colorful, modern prototype for “Lift My Brain” with polished UI and rich mock data. Focus on core flows: brain-training mini games; spaced repetition tasks. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Crypto AI News Hub',
    description: 'Crypto/Education - Crypto AI News Hub',
    content: 'Create a colorful, modern prototype for “Crypto AI News Hub” with polished UI and rich mock data. Focus on core flows: crypto RSS/JSON feeds; movers & bookmarks. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Crypto Swipe Academy',
    description: 'Crypto/Education - Crypto Swipe Academy',
    content: 'Create a colorful, modern prototype for “Crypto Swipe Academy” with polished UI and rich mock data. Focus on core flows: swipeable lesson cards; quick quizzes. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Regional Language Translator',
    description: 'Utility/Scanner - Regional Language Translator',
    content: 'Create a colorful, modern prototype for “Regional Language Translator” with polished UI and rich mock data. Focus on core flows: phrasebook with TTS; offline packs (config). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Kids\' Pronunciation Master',
    description: 'Education/Learning - Kids\' Pronunciation Master',
    content: 'Create a colorful, modern prototype for “Kids\' Pronunciation Master” with polished UI and rich mock data. Focus on core flows: phonics practice with TTS and mic input (placeholder); progress stickers and simple reports. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'DiabetesWell AI Companion',
    description: 'Health & Wellness - DiabetesWell AI Companion',
    content: 'Create a colorful, modern prototype for “DiabetesWell AI Companion” with polished UI and rich mock data. Focus on core flows: glucose logs, meds schedule, meal notes; trend charts and reminders. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'VitalSync',
    description: 'Health & Wellness - VitalSync',
    content: 'Create a colorful, modern prototype for “VitalSync” with polished UI and rich mock data. Focus on core flows: health metrics hub; manual entry with wearable placeholders; weekly summary and export. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Meditation Timer',
    description: 'General App - Meditation Timer',
    content: 'Create a colorful, modern prototype for “Meditation Timer” with polished UI and rich mock data. Focus on core flows: interval bell sounds; presets; streaks. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'FLY-Step: Family, Life, and You',
    description: 'Education/Learning - FLY-Step: Family, Life, and You',
    content: 'Create a colorful, modern prototype for “FLY-Step: Family, Life, and You” with polished UI and rich mock data. Focus on core flows: life-balance goals; daily check-ins; insights dashboard. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Meditation Buddy App',
    description: 'General App - Meditation Buddy App',
    content: 'Create a colorful, modern prototype for “Meditation Buddy App” with polished UI and rich mock data. Focus on core flows: guided sessions list; breathing timer; reminders. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'AstroLite: Horoscope Guru',
    description: 'Astrology/Spiritual - AstroLite: Horoscope Guru',
    content: 'Create a colorful, modern prototype for “AstroLite: Horoscope Guru” with polished UI and rich mock data. Focus on core flows: daily/weekly horoscopes; remedies; favourites. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'Calorylaa',
    description: 'Health & Wellness - Calorylaa',
    content: 'Create a colorful, modern prototype for “Calorylaa” with polished UI and rich mock data. Focus on core flows: calorie & macros tracker; recipe nutrition (stub); progress charts and weekly plan. Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  },
  {
    title: 'MedAlert Family Care',
    description: 'General App - MedAlert Family Care',
    content: 'Create a colorful, modern prototype for “MedAlert Family Care” with polished UI and rich mock data. Focus on core flows: multi-user medication schedules; refill reminders; caregiver notifications (placeholder). Include friendly onboarding, smooth micro‑interactions, and sample content across all screens.',
    category: 'App Ideas'
  }
];