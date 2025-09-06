/**
 * 🌐 CDN OPTIMIZER - Reduce dependency installation by using CDN imports
 * 
 * This module helps optimize web apps by suggesting CDN alternatives
 * for common packages, reducing build time and disk usage.
 */

import log from "electron-log";

const logger = log.scope("cdn-optimizer");

/**
 * 🚀 CDN mappings for popular packages
 */
export const CDN_MAPPINGS = {
  // React ecosystem
  'react': 'https://unpkg.com/react@18/umd/react.production.min.js',
  'react-dom': 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  
  // Utility libraries
  'lodash': 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js',
  'axios': 'https://cdn.jsdelivr.net/npm/axios@1/dist/axios.min.js',
  'moment': 'https://cdn.jsdelivr.net/npm/moment@2/min/moment.min.js',
  
  // UI libraries
  'bootstrap': 'https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css',
  'tailwindcss': 'https://cdn.tailwindcss.com',
  
  // Visualization
  'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js',
  'd3': 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
  'three': 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  
  // Animation
  'gsap': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'framer-motion': 'https://cdn.jsdelivr.net/npm/framer-motion@10/dist/framer-motion.js',
  
  // Icons
  '@heroicons/react': 'https://cdn.jsdelivr.net/npm/heroicons@2/24/outline/index.js',
  'lucide-react': 'https://cdn.jsdelivr.net/npm/lucide-react@0.300.0/dist/umd/lucide-react.js'
};

/**
 * 🎯 Packages that work well with CDN (no build step needed)
 */
export const CDN_FRIENDLY_PACKAGES = new Set([
  'react',
  'react-dom',
  'lodash',
  'axios',
  'moment',
  'chart.js',
  'd3',
  'three',
  'gsap'
]);

/**
 * 📦 Packages that should always be installed locally (require build step)
 */
export const LOCAL_ONLY_PACKAGES = new Set([
  'typescript',
  '@types/react',
  '@types/react-dom',
  'vite',
  'webpack',
  'babel',
  'eslint',
  'prettier',
  'tailwindcss', // Needs PostCSS processing
  'autoprefixer',
  'postcss'
]);

/**
 * 🚀 Generate optimized HTML with CDN imports
 */
export function generateCDNImports(packages: string[]): {
  cdnImports: string[];
  localPackages: string[];
  savings: { packages: number; estimatedMB: number };
} {
  const cdnImports: string[] = [];
  const localPackages: string[] = [];
  let savedPackages = 0;
  
  for (const pkg of packages) {
    const cleanPkg = pkg.split('@')[0]; // Remove version specifier
    
    if (LOCAL_ONLY_PACKAGES.has(cleanPkg)) {
      localPackages.push(pkg);
    } else if (CDN_MAPPINGS[cleanPkg]) {
      cdnImports.push(CDN_MAPPINGS[cleanPkg]);
      savedPackages++;
      logger.info(`📦 Using CDN for ${cleanPkg}: ${CDN_MAPPINGS[cleanPkg]}`);
    } else {
      localPackages.push(pkg);
    }
  }
  
  // Estimate savings (rough calculation)
  const estimatedMB = savedPackages * 2.5; // Average 2.5MB per package
  
  return {
    cdnImports,
    localPackages,
    savings: {
      packages: savedPackages,
      estimatedMB: Math.round(estimatedMB * 10) / 10
    }
  };
}

/**
 * 🌐 Generate HTML template with CDN imports
 */
export function generateOptimizedHTML(
  title: string = "Applaa App",
  cdnImports: string[] = [],
  customCSS: string = ""
): string {
  const cssImports = cdnImports
    .filter(url => url.endsWith('.css'))
    .map(url => `    <link rel="stylesheet" href="${url}">`)
    .join('\n');
    
  const jsImports = cdnImports
    .filter(url => url.endsWith('.js'))
    .map(url => `    <script src="${url}"></script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- 🚀 CDN Optimized Imports -->
${cssImports}
    
    <!-- Custom Styles -->
    <style>
        ${customCSS}
        
        /* 🎨 Applaa Default Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .applaa-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .applaa-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 18px;
            color: #666;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="applaa-loading">
            🚀 Loading your amazing app...
        </div>
    </div>
    
    <!-- 🚀 CDN Optimized Scripts -->
${jsImports}
    
    <!-- App Entry Point -->
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

/**
 * 🎯 Analyze package.json and suggest CDN optimizations
 */
export function analyzeDependencies(packageJsonPath: string): {
  canUseCDN: string[];
  mustInstallLocally: string[];
  recommendations: string[];
} {
  try {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const canUseCDN: string[] = [];
    const mustInstallLocally: string[] = [];
    const recommendations: string[] = [];
    
    for (const [pkg, version] of Object.entries(allDeps)) {
      const cleanPkg = pkg.split('@')[0];
      
      if (CDN_FRIENDLY_PACKAGES.has(cleanPkg)) {
        canUseCDN.push(pkg);
        recommendations.push(`📦 Consider using CDN for ${pkg} to reduce build time`);
      } else if (LOCAL_ONLY_PACKAGES.has(cleanPkg)) {
        mustInstallLocally.push(pkg);
      } else {
        mustInstallLocally.push(pkg);
      }
    }
    
    if (canUseCDN.length > 0) {
      const estimatedSavings = canUseCDN.length * 2.5;
      recommendations.push(`🚀 Potential savings: ${canUseCDN.length} packages (~${estimatedSavings}MB)`);
    }
    
    return {
      canUseCDN,
      mustInstallLocally,
      recommendations
    };
    
  } catch (error) {
    logger.error("Failed to analyze dependencies:", error);
    return {
      canUseCDN: [],
      mustInstallLocally: [],
      recommendations: ["❌ Could not analyze package.json"]
    };
  }
}

/**
 * 🌟 Generate performance report
 */
export function generatePerformanceReport(
  projectPath: string,
  optimizations: {
    cdnPackages: number;
    localPackages: number;
    estimatedSavings: number;
  }
): string {
  const totalPackages = optimizations.cdnPackages + optimizations.localPackages;
  const cdnPercentage = Math.round((optimizations.cdnPackages / totalPackages) * 100);
  
  return `
🚀 APPLAA PERFORMANCE REPORT
============================

📊 Dependency Optimization:
   • Total packages: ${totalPackages}
   • CDN optimized: ${optimizations.cdnPackages} (${cdnPercentage}%)
   • Local installs: ${optimizations.localPackages}
   • Estimated savings: ${optimizations.estimatedSavings}MB

🎯 Performance Benefits:
   • Faster initial builds
   • Reduced node_modules size
   • Better caching (CDN)
   • Improved user experience

💡 Next Steps:
   • Consider using more CDN packages
   • Implement lazy loading for large libraries
   • Use dynamic imports for better code splitting
`;
}
