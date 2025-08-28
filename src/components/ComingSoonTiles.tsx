import React from "react";

type ComingItem = {
  label: string;
  emoji: string;
  gradient: string;
  description: string;
  bgColor: string;
};

const ITEMS: ComingItem[] = [
  { 
    label: "WordPress", 
    emoji: "📝", 
    gradient: "from-orange-400 to-rose-500", 
    description: "Build WordPress sites with AI",
    bgColor: "bg-gradient-to-br from-orange-50 to-rose-50"
  },
  { 
    label: "Fast APIs & Backends", 
    emoji: "🚀", 
    gradient: "from-emerald-400 to-teal-500", 
    description: "Create powerful backend APIs",
    bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50"
  },
  { 
    label: "Code Modernization", 
    emoji: "🔄", 
    gradient: "from-purple-400 to-indigo-500", 
    description: "COBOL to Python, Pascal to C#",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50"
  },
  { 
    label: "HTML5 Games", 
    emoji: "🕹️", 
    gradient: "from-red-400 to-pink-500", 
    description: "Browser-based gaming experiences",
    bgColor: "bg-gradient-to-br from-red-50 to-pink-50"
  },
  { 
    label: "Roblox Games", 
    emoji: "🎮", 
    gradient: "from-indigo-400 to-purple-500", 
    description: "Design immersive game experiences",
    bgColor: "bg-gradient-to-br from-indigo-50 to-purple-50"
  },
  { 
    label: "n8n Workflows", 
    emoji: "🔗", 
    gradient: "from-fuchsia-400 to-pink-500", 
    description: "Automate your business processes",
    bgColor: "bg-gradient-to-br from-fuchsia-50 to-pink-50"
  },
  { 
    label: "Shopify Stores", 
    emoji: "🛍️", 
    gradient: "from-green-400 to-emerald-500", 
    description: "Launch your online store",
    bgColor: "bg-gradient-to-br from-green-50 to-emerald-50"
  },
  { 
    label: "WooCommerce", 
    emoji: "🛒", 
    gradient: "from-violet-400 to-purple-500", 
    description: "WordPress e-commerce solutions",
    bgColor: "bg-gradient-to-br from-violet-50 to-purple-50"
  },
  { 
    label: "Unity Games", 
    emoji: "🎯", 
    gradient: "from-cyan-400 to-blue-500", 
    description: "Cross-platform game development",
    bgColor: "bg-gradient-to-br from-cyan-50 to-blue-50"
  },
  { 
    label: "Unreal Engine", 
    emoji: "🧪", 
    gradient: "from-slate-400 to-gray-600", 
    description: "Create stunning 3D experiences",
    bgColor: "bg-gradient-to-br from-slate-50 to-gray-50"
  },
  { 
    label: "Desktop Apps", 
    emoji: "🖥️", 
    gradient: "from-blue-400 to-cyan-500", 
    description: "Build cross-platform desktop apps",
    bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50"
  },
  { 
    label: "Chrome Extensions", 
    emoji: "🧩", 
    gradient: "from-amber-400 to-yellow-500", 
    description: "Extend browser functionality",
    bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50"
  },
  { 
    label: "Office Extensions", 
    emoji: "📎", 
    gradient: "from-sky-400 to-blue-500", 
    description: "Enhance Microsoft Office suite",
    bgColor: "bg-gradient-to-br from-sky-50 to-blue-50"
  },
  { 
    label: "Blockchain DApps", 
    emoji: "⛓️", 
    gradient: "from-yellow-400 to-orange-500", 
    description: "Decentralized applications",
    bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50"
  },
  { 
    label: "AI & ML", 
    emoji: "🤖", 
    gradient: "from-rose-400 to-orange-500", 
    description: "Machine learning applications",
    bgColor: "bg-gradient-to-br from-rose-50 to-orange-50"
  },
  { 
    label: "IoT Applications", 
    emoji: "📡", 
    gradient: "from-teal-400 to-green-500", 
    description: "Internet of Things solutions",
    bgColor: "bg-gradient-to-br from-teal-50 to-green-50"
  },
  { 
    label: "Progressive PWAs", 
    emoji: "📱", 
    gradient: "from-pink-400 to-rose-500", 
    description: "App-like web experiences",
    bgColor: "bg-gradient-to-br from-pink-50 to-rose-50"
  },
  { 
    label: "Microservices", 
    emoji: "🔧", 
    gradient: "from-gray-400 to-slate-500", 
    description: "Scalable service architecture",
    bgColor: "bg-gradient-to-br from-gray-50 to-slate-50"
  },
  { 
    label: "Copilot Agents", 
    emoji: "🤝", 
    gradient: "from-blue-400 to-indigo-500", 
    description: "AI-powered coding assistants",
    bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50"
  },
  { 
    label: "AWS Solutions", 
    emoji: "☁️", 
    gradient: "from-orange-400 to-amber-500", 
    description: "Amazon Web Services apps",
    bgColor: "bg-gradient-to-br from-orange-50 to-amber-50"
  },
  { 
    label: "Azure Apps", 
    emoji: "🌐", 
    gradient: "from-blue-400 to-sky-500", 
    description: "Microsoft Azure cloud solutions",
    bgColor: "bg-gradient-to-br from-blue-50 to-sky-50"
  },
  { 
    label: "Google Cloud", 
    emoji: "🌤️", 
    gradient: "from-green-400 to-blue-500", 
    description: "GCP-powered applications",
    bgColor: "bg-gradient-to-br from-green-50 to-blue-50"
  },
  { 
    label: "Serverless Functions", 
    emoji: "⚡", 
    gradient: "from-purple-400 to-pink-500", 
    description: "Lambda, Functions, Cloud Run",
    bgColor: "bg-gradient-to-br from-purple-50 to-pink-50"
  },
  { 
    label: "AI Chatbots", 
    emoji: "💬", 
    gradient: "from-teal-400 to-cyan-500", 
    description: "Intelligent conversational AI",
    bgColor: "bg-gradient-to-br from-teal-50 to-cyan-50"
  },
];

export function ComingSoonTiles() {
  return (
    <div className="mt-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          What's coming?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Sneak peek of app types arriving soon in Applaa
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ITEMS.map((item) => (
          <div
            key={item.label}
            className={`group relative overflow-hidden rounded-2xl ${item.bgColor} border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
          >
            {/* Coming Soon Badge */}
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                Coming soon
              </span>
            </div>

            {/* Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className="mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow-sm">
                  <span className="text-3xl">{item.emoji}</span>
                </div>
              </div>

              {/* Text */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                  {item.label}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Decorative Element */}
              <div className={`absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br ${item.gradient} opacity-10 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-110 transition-transform duration-300`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-10">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          🚀 More exciting app types coming to Applaa soon!
        </p>
      </div>
    </div>
  );
}
