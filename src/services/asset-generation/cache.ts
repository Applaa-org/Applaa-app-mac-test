import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Simple file-based cache for generated assets
 * Prevents duplicate API calls for the same descriptions
 */
export class AssetCache {
    private cacheDir: string;

    constructor(cacheDir: string) {
        this.cacheDir = cacheDir;
    }

    async init() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (e) {
            console.error('Failed to create cache directory:', e);
        }
    }

    private getCacheKey(description: string, type: string): string {
        const hash = crypto.createHash('md5').update(`${type}:${description}`).digest('hex');
        return hash;
    }

    async get(description: string, type: string): Promise<string | null> {
        const key = this.getCacheKey(description, type);
        const cachePath = path.join(this.cacheDir, `${key}.json`);

        try {
            const data = await fs.readFile(cachePath, 'utf-8');
            const cached = JSON.parse(data);

            // Check if cache is less than 7 days old
            const age = Date.now() - cached.timestamp;
            if (age < 7 * 24 * 60 * 60 * 1000) {
                return cached.assetPath;
            }
        } catch (e) {
            // Cache miss
        }

        return null;
    }

    async set(description: string, type: string, assetPath: string): Promise<void> {
        const key = this.getCacheKey(description, type);
        const cachePath = path.join(this.cacheDir, `${key}.json`);

        try {
            await fs.writeFile(cachePath, JSON.stringify({
                description,
                type,
                assetPath,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Failed to write cache:', e);
        }
    }

    async has(description: string, type: string): Promise<boolean> {
        const cached = await this.get(description, type);
        return cached !== null;
    }
}
