import React from "react";
import { Link } from "@tanstack/react-router";

type Section = {
  id: string;
  title: string;
  description?: string;
};

const sections: Section[] = [
  { id: "install", title: "Install & Launch" },
  { id: "getting-started", title: "Getting Started Overview" },
  { id: "create-web", title: "Create a Web App" },
  { id: "create-mobile", title: "Create a Mobile App (Expo)" },
  { id: "modes", title: "Modes (Spark, Pro Features)" },
  { id: "models", title: "Models & Providers" },
  { id: "settings", title: "Settings & API Keys" },
  { id: "security", title: "Security & Data Locations" },
  { id: "troubleshooting", title: "Troubleshooting" },
  { id: "faq", title: "FAQ" },
];

function DocsImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="rounded-lg border border-border shadow-sm w-full max-w-3xl"
    />
  );
}

export default function DocsPage() {
  return (
    <div className="flex w-full min-h-[calc(100vh-6rem)]">
      {/* Side navigation */}
      <nav className="hidden md:block w-64 border-r border-border p-4 pr-0">
        <div className="sticky top-16">
          <h2 className="text-sm font-semibold text-muted-foreground px-4 mb-2">Documentation</h2>
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block px-4 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Applaa Documentation</h1>
            <Link to="/" className="text-sm text-primary hover:underline">Back to Home</Link>
          </div>

          {/* YouTube Videos */}
          <div className="mb-8 space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Getting Started Video</h2>
              <div className="relative w-full max-w-4xl mx-auto">
                <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src="https://www.youtube.com/embed/eYxyghTI3l4"
                    title="Applaa Getting Started Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-4">Quick Video Tutorial</h2>
              <div className="relative w-full max-w-4xl mx-auto">
                <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src="https://www.youtube.com/embed/XzfIDM3OIBU"
                    title="Applaa Additional Tutorial"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Install & Launch */}
          <section id="install" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Install & Launch</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Download the ZIP, extract it, and run Applaa.exe. If Windows SmartScreen appears, choose “More info” → “Run anyway”.
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Extract <code>Applaa-win32-x64-1.0.0.zip</code> to a folder you control (e.g., <code>C:\Apps\Applaa</code>).</li>
              <li>Open the folder and double‑click <code>Applaa.exe</code>.</li>
              <li>Applaa stores your local settings in the Electron <code>userData</code> directory. Packaged builds use a separate settings file for security.</li>
            </ol>
            <div className="mt-4">
              <DocsImage src="../../assets/docs/install-1.png" alt="Install - Extract and run" />
            </div>
          </section>

          <hr className="my-8" />

          {/* Getting Started */}
          <section id="getting-started" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Getting Started Overview</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The home screen lets you choose Web or Mobile app type, enter your idea, and generate a production‑quality starter instantly. Use the sidebar to access Chat, Settings, and Hub.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Use “Inspiration Ideas” to explore concepts.</li>
              <li>Prompt optimizer automatically enhances your prompt for modern UI patterns.</li>
              <li>Pro features unlock Spark Edits, Spark Context, and SQLite Vector AI.</li>
            </ul>
            <div className="mt-4">
              <DocsImage src="../../assets/docs/getting-started-1.png" alt="Home screen" />
            </div>
          </section>

          <hr className="my-8" />

          {/* Create Web App */}
          <section id="create-web" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Create a Web App</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Select Web as the app type on the home screen.</li>
              <li>Enter your concept. We auto‑apply Dribbble‑inspired UI enhancements and rich mock data.</li>
              <li>Click “Create App”. The app scaffolds with responsive layouts, search, and professional polish.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-2">
              Images in mock data use license‑free sources (Unsplash/Pixabay/Pexels/Picsum) and detail pages are generated for each list item.
            </p>
            <div className="mt-4">
              <DocsImage src="../../assets/docs/web-create-1.png" alt="Create web app flow" />
            </div>
          </section>

          <hr className="my-8" />

          {/* Create Mobile App */}
          <section id="create-mobile" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Create a Mobile App (Expo)</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Select Mobile as the app type.</li>
              <li>Enter your concept. Guardrails ensure React Native/Expo‑only output with correct list patterns.</li>
              <li>Click “Create App”. Essential Expo dependencies are auto‑installed for smooth previews.</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-2">
              Every list item includes a detail screen; images come from approved free sources and avoid broken URLs.
            </p>
            <div className="mt-4">
              <DocsImage src="../../assets/docs/mobile-create-1.png" alt="Create mobile app flow" />
            </div>
          </section>

          <hr className="my-8" />

          {/* Modes */}
          <section id="modes" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Modes (Spark, Pro Features)</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>Spark Edits</strong>: Fast, targeted edits to existing apps (Pro).
              </li>
              <li>
                <strong>Spark Context</strong>: Context‑aware editing with semantic understanding (Pro).
              </li>
              <li>
                <strong>SQLite Vector AI</strong>: Local vector search for smart context (Pro).
              </li>
            </ul>
          </section>

          <hr className="my-8" />

          {/* Models */}
          <section id="models" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Models & Providers</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Applaa supports multiple providers. OpenRouter includes <code>grok-code-fast-1</code> for rapid code generation. Configure API keys in Settings → Providers.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>OpenRouter (includes Grok Code Fast 1)</li>
              <li>Anthropic</li>
              <li>OpenAI</li>
              <li>Google</li>
              <li>And more via Providers list</li>
            </ul>
          </section>

          <hr className="my-8" />

          {/* Settings */}
          <section id="settings" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Settings & API Keys</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Open the sidebar → Settings.</li>
              <li>Choose a provider and add your API key.</li>
              <li>Packaged builds do not read dev environment variables for security.</li>
            </ol>
            <div className="mt-4">
              <DocsImage src="../../assets/docs/settings-1.png" alt="Settings and API keys" />
            </div>
          </section>

          <hr className="my-8" />

          {/* Security */}
          <section id="security" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Security & Data Locations</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Packaged apps use <code>user-settings-packaged.json</code> to isolate from dev settings.</li>
              <li>Environment variables are only loaded in development mode.</li>
              <li>Electron <code>userData</code> directory is used for user data storage.</li>
            </ul>
          </section>

          <hr className="my-8" />

          {/* Troubleshooting */}
          <section id="troubleshooting" className="scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>If build changes don’t reflect, perform a clean rebuild from Settings → Developer → Clean & Rebuild.</li>
              <li>For Expo preview errors (e.g., <code>react-native-svg</code>), Applaa auto‑installs essentials in new templates.</li>
              <li>Terminate running Electron processes if native deps fail to rebuild; then retry.</li>
            </ul>
          </section>

          <hr className="my-8" />

          {/* FAQ */}
          <section id="faq" className="scroll-mt-24 mb-24">
            <h2 className="text-xl font-semibold mb-2">FAQ</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Can I create unlimited apps?</strong> Yes with Applaa Pro. Dev builds allow creation for testing.</li>
              <li><strong>Where are my settings stored?</strong> In Electron’s <code>userData</code> directory (packaged builds isolated).</li>
              <li><strong>Do generated apps include real data?</strong> Rich mock data with free, license‑safe images and detail pages.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}


