/**
 * Minecraft Template Loader
 * 
 * Loads pre-built .mcfunction templates from the assets directory.
 * These templates bypass LLM generation for reliable demo results.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    icon: string;
    gradient: string;
    previewBounds: { width: number; height: number; depth: number };
    camera: { x: number; y: number; z: number };
}

export interface Template {
    id: string;
    metadata: TemplateMetadata;
    mcfunctionCode: string;
}

// Get the templates directory path
function getTemplatesDir(): string {
    // In production (packaged), assets are in resources
    // In development, they're in src/assets
    const isDev = process.env.NODE_ENV === 'development' || !process.resourcesPath;

    if (isDev) {
        return path.join(__dirname, '../../assets/minecraft/templates');
    } else {
        return path.join(process.resourcesPath, 'assets/minecraft/templates');
    }
}

/**
 * List all available templates
 */
export function listTemplates(): TemplateMetadata[] {
    try {
        const templatesDir = getTemplatesDir();
        const metadataPath = path.join(templatesDir, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
            console.warn('[TemplateLoader] metadata.json not found');
            return [];
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        return Object.values(metadata);
    } catch (error) {
        console.error('[TemplateLoader] Error listing templates:', error);
        return [];
    }
}

/**
 * Load a specific template by ID
 */
export function loadTemplate(templateId: string): Template | null {
    try {
        const templatesDir = getTemplatesDir();
        const metadataPath = path.join(templatesDir, 'metadata.json');
        const mcfunctionPath = path.join(templatesDir, `${templateId}.mcfunction`);

        // Load metadata
        if (!fs.existsSync(metadataPath)) {
            console.error('[TemplateLoader] metadata.json not found');
            return null;
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const allMetadata = JSON.parse(metadataContent);
        const metadata = allMetadata[templateId];

        if (!metadata) {
            console.error(`[TemplateLoader] Template "${templateId}" not found in metadata`);
            return null;
        }

        // Load mcfunction file
        if (!fs.existsSync(mcfunctionPath)) {
            console.error(`[TemplateLoader] Template file not found: ${mcfunctionPath}`);
            return null;
        }

        const mcfunctionCode = fs.readFileSync(mcfunctionPath, 'utf-8');

        return {
            id: templateId,
            metadata,
            mcfunctionCode
        };
    } catch (error) {
        console.error(`[TemplateLoader] Error loading template "${templateId}":`, error);
        return null;
    }
}

/**
 * Get metadata for a specific template
 */
export function getTemplateMetadata(templateId: string): TemplateMetadata | null {
    try {
        const templatesDir = getTemplatesDir();
        const metadataPath = path.join(templatesDir, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
            return null;
        }

        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const allMetadata = JSON.parse(metadataContent);

        return allMetadata[templateId] || null;
    } catch (error) {
        console.error(`[TemplateLoader] Error getting metadata for "${templateId}":`, error);
        return null;
    }
}

export default {
    listTemplates,
    loadTemplate,
    getTemplateMetadata
};
