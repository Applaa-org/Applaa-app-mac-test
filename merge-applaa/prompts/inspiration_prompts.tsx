export interface InspirationPrompt {
  icon: React.ReactNode;
  label: string;
  webPrompt: string;
  mobilePrompt: string;
}

export const INSPIRATION_PROMPTS: InspirationPrompt[] = [
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    label: "TODO list app",
    webPrompt: `Create a simple, beautiful TODO list app perfect for quick demos.

✨ **Basic Features:**
- Add new tasks with a text input
- Check off completed tasks with smooth animations
- Delete tasks with a simple button
- Show task count (e.g., "3 tasks remaining")
- Simple color scheme with nice styling
- Sample tasks pre-loaded for demo

🎨 **Simple Design:**
- Clean, modern layout with good spacing
- Nice hover effects on buttons
- Simple check/uncheck animations
- Mobile-friendly responsive design
- Easy-to-read typography

⚡ **Demo Perfect:**
- Works immediately without any setup
- Pre-loaded with 5 sample tasks
- Smooth interactions that feel satisfying
- All functionality visible on one screen`,
    mobilePrompt: `Create a simple mobile TODO app with touch-friendly design.

📱 **Basic Mobile Features:**
- Large, easy-to-tap buttons for adding tasks
- Simple tap to check/uncheck tasks
- Swipe left to delete tasks
- Big, readable text that's easy on mobile
- Pre-loaded with demo tasks

🎨 **Mobile Design:**
- Clean layout optimized for phone screens
- Large touch targets (easy to tap)
- Simple animations that feel smooth
- Good contrast and readable fonts
- Works in both portrait and landscape

⚡ **Demo Ready:**
- Loads instantly with sample tasks
- All features work immediately
- Simple navigation that anyone can understand
- No complex setup or configuration needed`
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3"
        />
      </svg>
    ),
    label: "Landing Page",
    webPrompt: `Create a high-converting, modern landing page with professional design and optimized user experience.

🎯 **Core Sections:**
- Hero section with compelling headline, subheadline, and clear value proposition
- Features showcase with icons, benefits, and social proof
- Testimonials/reviews section with customer photos and quotes
- Pricing section with comparison table and recommended plans
- FAQ section addressing common objections
- Strong call-to-action throughout the page
- Footer with links, contact info, and legal pages

🎨 **Design & UX:**
- Mobile-first responsive design that looks great on all devices
- Modern, clean aesthetic with consistent branding and typography
- Strategic use of white space and visual hierarchy
- High-quality images, icons, and graphics
- Smooth scroll animations and micro-interactions
- Fast loading times with optimized assets
- A/B testing ready with variant support

⚡ **Technical Features:**
- SEO optimized with proper meta tags, structured data, and semantic HTML
- Contact forms with validation and email integration
- Newsletter signup with email marketing platform integration
- Google Analytics and conversion tracking setup
- Accessibility compliance (WCAG 2.1 AA)
- Progressive Web App capabilities

🚀 **Conversion Optimization:**
- Multiple CTA buttons strategically placed
- Lead magnets and free resources to capture emails
- Exit-intent popups and scroll-triggered offers
- Social media integration and sharing buttons
- Live chat widget for immediate support
- Trust signals (security badges, certifications, logos)`,
    mobilePrompt: `Build a mobile-optimized landing page app with native-like experience and conversion focus.

📱 **Mobile-First Design:**
- Touch-friendly interface with large, accessible buttons
- Swipeable sections and smooth scrolling navigation
- Mobile-optimized hero with compelling value proposition
- Thumb-friendly CTA placement for one-handed use
- Progressive disclosure to avoid overwhelming users
- Quick loading with optimized images and lazy loading

🎨 **Native Mobile UX:**
- Pull-to-refresh functionality for dynamic content
- Native-style navigation with bottom tabs or drawer
- Haptic feedback for button interactions
- Smooth page transitions and animations
- Mobile-specific gestures and interactions
- Offline capability for viewing previously loaded content

⚡ **Mobile Conversion Features:**
- One-tap phone calling and email buttons
- Quick contact forms with minimal input fields
- Social login integration (Google, Apple, Facebook)
- Mobile payment integration (Apple Pay, Google Pay)
- Push notifications for follow-up and engagement
- Deep linking for seamless app-to-app navigation

🔧 **Technical Implementation:**
- React Native with Expo for cross-platform compatibility
- Native contact picker integration
- Camera access for profile photos or document uploads
- GPS integration for location-based features
- Biometric authentication for secure access
- App store optimization (ASO) ready
- Analytics tracking for mobile-specific events`
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
    label: "Sign Up Form",
    webPrompt: `Create a professional, conversion-optimized user registration system with modern design and security features.

📝 **Form Features:**
- Multi-step registration process with progress indicators
- Real-time field validation with helpful error messages
- Password strength meter with security requirements
- Email verification with confirmation flow
- Social login options (Google, Facebook, Apple, GitHub)
- Terms of service and privacy policy checkboxes
- CAPTCHA integration for spam protection

🎨 **Design & UX:**
- Clean, modern form design with intuitive layout
- Mobile-responsive with touch-friendly input fields
- Loading states and success animations
- Clear visual hierarchy and consistent styling
- Accessibility features (ARIA labels, keyboard navigation)
- Dark/light theme support

⚡ **Technical Implementation:**
- Form validation with client and server-side checks
- Secure password hashing and storage
- Email service integration for confirmations
- Rate limiting to prevent abuse
- GDPR compliance features
- Database integration for user management
- Session management and authentication tokens

🔒 **Security Features:**
- Input sanitization and XSS protection
- SQL injection prevention
- Secure cookie handling
- Password complexity requirements
- Account lockout after failed attempts
- Two-factor authentication support`,
    mobilePrompt: `Build a user-friendly mobile registration app with native authentication and smooth onboarding experience.

📱 **Mobile Registration Flow:**
- Native-style form inputs with proper keyboard types
- Smooth multi-step onboarding with swipe navigation
- Biometric registration support (Face ID, Touch ID)
- Social login with native SDK integration
- Phone number verification with SMS codes
- In-app browser for terms and privacy policy
- Welcome tutorial after successful registration

🎨 **Mobile UX:**
- Native input components with platform-specific styling
- Haptic feedback for form interactions
- Smooth animations and transitions
- Auto-focus and smart field progression
- Error states with clear visual feedback
- Loading indicators and success celebrations

⚡ **Native Features:**
- Keychain/Keystore integration for secure credential storage
- Push notifications for account verification
- Deep linking for email verification
- Camera integration for profile photo upload
- Contact list access for friend invitations
- Location services for regional settings

🔧 **Technical Stack:**
- React Native with Expo authentication
- Secure storage for sensitive data
- Native navigation for smooth flow
- Form libraries optimized for mobile
- Expo Notifications for verification
- AsyncStorage for user preferences`
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.5 3.5C13.5 4.33 12.83 5 12 5S10.5 4.33 10.5 3.5 11.17 2 12 2s1.5.67 1.5 1.5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.74 5.826a3.756 3.756 0 00-1.616-3.573 3.733 3.733 0 00-3.91-.27L12 3l-2.214-1.017a3.733 3.733 0 00-3.91.27 3.756 3.756 0 00-1.616 3.573l.284 5.294C4.858 13.8 6.83 16.269 9.5 17.5l.5.5.5.5 1.5-1 1.5 1 .5-.5.5-.5c2.67-1.231 4.642-3.7 4.956-6.38l.284-5.294z"
        />
      </svg>
    ),
    label: "Mood Journal & Tracker",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    label: "Interactive Story Game",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
        />
      </svg>
    ),
    label: "Recipe Finder & Meal Planner",
    webPrompt: `Create a simple, beautiful recipe app perfect for cooking demos.

🍳 **Basic Features:**
- Recipe cards showing title, photo, and cooking time
- Simple search by recipe name
- Favorite button to save recipes
- Ingredient list with clear formatting
- Step-by-step cooking instructions
- Recipe categories (Breakfast, Lunch, Dinner, Dessert)

🎨 **Simple Design:**
- Clean recipe cards with nice spacing
- Pleasant colors and easy-to-read text
- Responsive layout for different screen sizes
- Simple navigation between recipes
- Good contrast for readability

⚡ **Demo Ready:**
- 10+ sample recipes pre-loaded
- All features work immediately
- Easy to navigate and understand
- Perfect for showing off in demos`,
    mobilePrompt: `Build a simple mobile recipe app that's easy to use while cooking.

📱 **Mobile Features:**
- Large, easy-to-tap recipe cards
- Simple navigation between recipes
- Big text that's easy to read while cooking
- Ingredient list with clear formatting
- Step-by-step instructions
- Basic search functionality

🎨 **Mobile Design:**
- Clean, uncluttered layout
- Large touch buttons
- Good contrast for kitchen lighting
- Simple scrolling through recipes
- Easy-to-read fonts

⚡ **Demo Ready:**
- 10+ sample recipes included
- All features work immediately
- No complex setup required
- Perfect for mobile cooking demos`
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    label: "Personal Finance Dashboard",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    label: "Travel Memory Map",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    ),
    label: "AI Writing Assistant",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    label: "Emoji Translator",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    label: "Habit Streak Tracker",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 012.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    label: "Newsletter Creator",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    ),
    label: "Music Discovery App",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    label: "3D Portfolio Viewer",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    label: "AI Image Generator",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    label: "Pomodoro Focus Timer",
  },
  {
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    label: "Virtual Avatar Builder",
  },
];

// Helper function to create enhanced prompts for ideas that don't have custom ones yet
function createDefaultEnhancedPrompts(label: string): { webPrompt: string; mobilePrompt: string } {
  return {
    webPrompt: `Create a simple, beautiful ${label.toLowerCase()} perfect for demos.

✨ **Basic Features:**
- Clean, easy-to-use interface
- Essential ${label.toLowerCase()} functionality
- Simple navigation and layout
- Nice colors and styling
- Pre-loaded demo data

🎨 **Simple Design:**
- Modern, clean appearance
- Easy-to-read text and buttons
- Responsive layout for different screens
- Pleasant color scheme
- Smooth, simple interactions

⚡ **Demo Ready:**
- Works immediately without setup
- Sample content included
- All features visible and functional
- Perfect for quick demonstrations`,

    mobilePrompt: `Build a simple mobile ${label.toLowerCase()} app that's easy to use.

📱 **Mobile Features:**
- Large, easy-to-tap buttons
- Simple navigation
- Clean, readable layout
- Touch-friendly design
- Basic functionality that works

🎨 **Mobile Design:**
- Clean, uncluttered interface
- Large text and buttons
- Good contrast and readability
- Simple scrolling and navigation
- Mobile-optimized layout

⚡ **Demo Perfect:**
- Includes sample content
- All features work immediately
- Easy to understand and use
- Great for mobile demos`
  };
}

// Apply default enhanced prompts to remaining ideas
const enhancedPrompts = INSPIRATION_PROMPTS.map(prompt => {
  if (!prompt.webPrompt || !prompt.mobilePrompt) {
    const enhanced = createDefaultEnhancedPrompts(prompt.label);
    return {
      ...prompt,
      webPrompt: enhanced.webPrompt,
      mobilePrompt: enhanced.mobilePrompt
    };
  }
  return prompt;
});

export { enhancedPrompts as INSPIRATION_PROMPTS_ENHANCED };
