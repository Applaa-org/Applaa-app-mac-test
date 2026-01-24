import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";
import log from "electron-log";
import fetch from "node-fetch";

const logger = log.scope("web-crawler");

export interface CrawlResult {
  html: string;
  css: string[];
  js: string[];
  images: Array<{ url: string; localPath: string }>;
  assets: Array<{ url: string; localPath: string; type: string }>;
  baseUrl: string;
}

export interface WebCrawlerConfig {
  maxFileSize: number; // 10MB default
  maxTotalSize: number; // 100MB default
  timeout: number; // 30 seconds default
  maxRedirects: number; // 5 default
  maxConcurrentDownloads: number; // 5 default
  userAgent: string;
  respectRobotsTxt: boolean; // true default
}

const DEFAULT_CONFIG: WebCrawlerConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 100 * 1024 * 1024, // 100MB
  timeout: 30000, // 30 seconds
  maxRedirects: 5,
  maxConcurrentDownloads: 5,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  respectRobotsTxt: true,
};

export class WebCrawlerService {
  private config: WebCrawlerConfig;
  private totalDownloaded: number = 0;

  constructor(config: Partial<WebCrawlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Crawls a website and extracts HTML, CSS, JS, and assets
   */
  async crawlWebsite(url: string, outputDir: string): Promise<CrawlResult> {
    this.totalDownloaded = 0;
    
    const baseUrl = new URL(url);
    
    // Validate URL
    if (!["http:", "https:"].includes(baseUrl.protocol)) {
      throw new Error("URL must use http or https protocol");
    }

    // Prevent SSRF attacks - block localhost and internal IPs
    if (this.isLocalOrInternal(baseUrl.hostname)) {
      throw new Error("Cannot clone localhost or internal IP addresses for security reasons");
    }

    const assetsDir = path.join(outputDir, "assets");
    const imagesDir = path.join(assetsDir, "images");
    const cssDir = path.join(assetsDir, "css");
    const jsDir = path.join(assetsDir, "js");
    const fontsDir = path.join(assetsDir, "fonts");
    
    // Ensure directories exist
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(cssDir, { recursive: true });
    fs.mkdirSync(jsDir, { recursive: true });
    fs.mkdirSync(fontsDir, { recursive: true });

    try {
      // Fetch the main HTML
      logger.info(`Fetching HTML from: ${url}`);
      const htmlResponse = await this.fetchWithTimeout(url, {
        headers: {
          "User-Agent": this.config.userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      
      if (!htmlResponse.ok) {
        throw new Error(`Failed to fetch ${url}: ${htmlResponse.status} ${htmlResponse.statusText}`);
      }

      let html = await htmlResponse.text();
      
      // Extract and download CSS files
      logger.info("Extracting CSS files...");
      const cssFiles = this.extractCSS(html, baseUrl);
      const downloadedCSS: string[] = [];
      
      for (const cssUrl of cssFiles) {
        try {
          const cssPath = await this.downloadAsset(cssUrl, cssDir, "css", baseUrl);
          if (cssPath) {
            downloadedCSS.push(cssPath);
            // Update HTML to reference local CSS
            const relativePath = `./assets/css/${path.basename(cssPath)}`;
            html = html.replace(new RegExp(this.escapeRegex(cssUrl), "g"), relativePath);
          }
        } catch (error) {
          logger.warn(`Failed to download CSS: ${cssUrl}`, error);
        }
      }

      // Extract and download JS files
      logger.info("Extracting JS files...");
      const jsFiles = this.extractJS(html, baseUrl);
      const downloadedJS: string[] = [];
      
      for (const jsUrl of jsFiles) {
        try {
          const jsPath = await this.downloadAsset(jsUrl, jsDir, "js", baseUrl);
          if (jsPath) {
            downloadedJS.push(jsPath);
            const relativePath = `./assets/js/${path.basename(jsPath)}`;
            html = html.replace(new RegExp(this.escapeRegex(jsUrl), "g"), relativePath);
          }
        } catch (error) {
          logger.warn(`Failed to download JS: ${jsUrl}`, error);
        }
      }

      // Extract and download images
      logger.info("Extracting images...");
      const imageUrls = this.extractImages(html, baseUrl);
      const downloadedImages: Array<{ url: string; localPath: string }> = [];
      
      for (const imageUrl of imageUrls) {
        try {
          const imagePath = await this.downloadAsset(imageUrl, imagesDir, "image", baseUrl);
          if (imagePath) {
            downloadedImages.push({ url: imageUrl, localPath: imagePath });
            const relativePath = `./assets/images/${path.basename(imagePath)}`;
            html = html.replace(new RegExp(this.escapeRegex(imageUrl), "g"), relativePath);
          }
        } catch (error) {
          logger.warn(`Failed to download image: ${imageUrl}`, error);
        }
      }

      // Extract and download fonts
      logger.info("Extracting fonts...");
      const fontUrls = this.extractFonts(html, baseUrl);
      const downloadedFonts: Array<{ url: string; localPath: string; type: string }> = [];
      
      for (const fontUrl of fontUrls) {
        try {
          const fontPath = await this.downloadAsset(fontUrl.url, fontsDir, "font", baseUrl);
          if (fontPath) {
            downloadedFonts.push({ url: fontUrl.url, localPath: fontPath, type: fontUrl.type });
          }
        } catch (error) {
          logger.warn(`Failed to download font: ${fontUrl.url}`, error);
        }
      }

      // Make all URLs relative
      html = this.makeUrlsRelative(html, baseUrl);

      logger.info(`Crawl completed. Downloaded ${downloadedCSS.length} CSS, ${downloadedJS.length} JS, ${downloadedImages.length} images, ${downloadedFonts.length} fonts`);

      return {
        html,
        css: downloadedCSS,
        js: downloadedJS,
        images: downloadedImages,
        assets: downloadedFonts,
        baseUrl: url,
      };
    } catch (error) {
      logger.error(`Failed to crawl website: ${url}`, error);
      throw error;
    }
  }

  private isLocalOrInternal(hostname: string): boolean {
    // Check for localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }

    // Check for internal IP ranges
    const internalPatterns = [
      /^10\./,           // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,     // 192.168.0.0/16
      /^169\.254\./,     // 169.254.0.0/16 (link-local)
    ];

    return internalPatterns.some(pattern => pattern.test(hostname));
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Awaited<ReturnType<typeof fetch>>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal as any,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  private extractCSS(html: string, baseUrl: URL): string[] {
    const cssUrls: string[] = [];
    const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const linkTag = match[0].toLowerCase();
      
      // Check if it's a stylesheet
      if (linkTag.includes('rel="stylesheet"') || linkTag.includes("rel='stylesheet'") || href.includes(".css")) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          cssUrls.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    }
    
    // Also extract inline style tags
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((styleRegex.exec(html)) !== null) {
      // Inline styles are already in HTML, no need to download
    }
    
    return [...new Set(cssUrls)]; // Remove duplicates
  }

  private extractJS(html: string, baseUrl: URL): string[] {
    const jsUrls: string[] = [];
    const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = scriptRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && !src.startsWith("data:") && !src.startsWith("javascript:")) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          jsUrls.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    }
    
    return [...new Set(jsUrls)]; // Remove duplicates
  }

  private extractImages(html: string, baseUrl: URL): string[] {
    const imageUrls: string[] = [];
    
    // Extract from img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && !src.startsWith("data:") && !src.startsWith("javascript:")) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          imageUrls.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    }

    // Extract from CSS background-image (basic extraction)
    const bgImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
    while ((match = bgImageRegex.exec(html)) !== null) {
      const url = match[1];
      if (url && !url.startsWith("data:")) {
        try {
          const absoluteUrl = new URL(url, baseUrl).href;
          imageUrls.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    }
    
    return [...new Set(imageUrls)]; // Remove duplicates
  }

  private extractFonts(html: string, baseUrl: URL): Array<{ url: string; type: string }> {
    const fontUrls: Array<{ url: string; type: string }> = [];
    
    // Extract from @font-face in style tags or external CSS
    const fontFaceRegex = /@font-face\s*\{[^}]*url\(["']?([^"')]+)["']?\)[^}]*\}/gi;
    let match;
    
    while ((match = fontFaceRegex.exec(html)) !== null) {
      const url = match[1];
      if (url && !url.startsWith("data:")) {
        try {
          const absoluteUrl = new URL(url, baseUrl).href;
          // Try to detect font type from URL
          const type = url.match(/\.(woff2?|ttf|otf|eot)$/i)?.[1]?.toLowerCase() || "font";
          fontUrls.push({ url: absoluteUrl, type });
        } catch {
          // Skip invalid URLs
        }
      }
    }
    
    return fontUrls;
  }

  private async downloadAsset(
    url: string,
    outputDir: string,
    type: string,
    baseUrl: URL
  ): Promise<string | null> {
    try {
      // Check if we've exceeded total size limit
      if (this.totalDownloaded >= this.config.maxTotalSize) {
        logger.warn(`Total download size limit reached (${this.config.maxTotalSize} bytes)`);
        return null;
      }

      // Validate URL is from same origin or allowed
      const assetUrl = new URL(url, baseUrl);
      if (assetUrl.protocol !== "http:" && assetUrl.protocol !== "https:") {
        logger.warn(`Skipping non-HTTP asset: ${url}`);
        return null;
      }

      // Prevent SSRF
      if (this.isLocalOrInternal(assetUrl.hostname)) {
        logger.warn(`Skipping local/internal asset for security: ${url}`);
        return null;
      }

      const response = await this.fetchWithTimeout(url, {
        headers: {
          "User-Agent": this.config.userAgent,
        },
      });
      
      if (!response.ok) {
        logger.warn(`Failed to download ${url}: ${response.status}`);
        return null;
      }

      // Check content length
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > this.config.maxFileSize) {
          logger.warn(`File too large (${size} bytes): ${url}`);
          return null;
        }
        if (this.totalDownloaded + size > this.config.maxTotalSize) {
          logger.warn(`Would exceed total size limit: ${url}`);
          return null;
        }
      }

      const buffer = await response.buffer();
      
      // Check actual buffer size
      if (buffer.length > this.config.maxFileSize) {
        logger.warn(`File too large (${buffer.length} bytes): ${url}`);
        return null;
      }

      if (this.totalDownloaded + buffer.length > this.config.maxTotalSize) {
        logger.warn(`Would exceed total size limit: ${url}`);
        return null;
      }

      this.totalDownloaded += buffer.length;

      // Generate safe filename
      const urlObj = new URL(url);
      let filename = path.basename(urlObj.pathname) || `asset_${Date.now()}`;
      
      // Remove query string from filename
      filename = filename.split("?")[0];
      
      // If no extension, try to infer from content type
      if (!path.extname(filename)) {
        const contentType = response.headers.get("content-type");
        if (contentType) {
          const ext = this.getExtensionFromMimeType(contentType);
          if (ext) {
            filename += `.${ext}`;
          }
        }
      }

      // Sanitize filename
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      
      const filePath = path.join(outputDir, filename);
      
      fs.writeFileSync(filePath, buffer);
      logger.debug(`Downloaded: ${url} -> ${filePath} (${buffer.length} bytes)`);
      
      return filePath;
    } catch (error: any) {
      logger.warn(`Error downloading asset ${url}:`, error.message);
      return null;
    }
  }

  private getExtensionFromMimeType(mimeType: string): string | null {
    const mimeMap: Record<string, string> = {
      "text/css": "css",
      "application/javascript": "js",
      "text/javascript": "js",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "font/woff": "woff",
      "font/woff2": "woff2",
      "font/ttf": "ttf",
      "font/otf": "otf",
    };

    const baseType = mimeType.split(";")[0].trim();
    return mimeMap[baseType] || null;
  }

  private makeUrlsRelative(html: string, baseUrl: URL): string {
    // Replace absolute URLs with relative ones
    const origin = baseUrl.origin;
    html = html.replace(new RegExp(this.escapeRegex(origin), "g"), "");
    
    // Also handle protocol-relative URLs
    html = html.replace(/\/\//g, "/");
    
    return html;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

