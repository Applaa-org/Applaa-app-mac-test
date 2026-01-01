/**
 * Preview Image Service
 * 
 * Generates preview images for deployed apps using screenshot services
 */

import log from 'electron-log';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getDyadAppPath } from '@/paths/paths';
import { getR2Storage, initializeR2 } from '@/lib/r2Storage';
import { readSettings } from '@/main/settings';

const logger = log.scope('preview_image_service');

interface PreviewImageOptions {
  appId: number;
  appName: string;
  deploymentUrl: string;
  width?: number;
  height?: number;
}

/**
 * Generate preview image URL using screenshotapi.net
 * API key is loaded from Supabase Vault secrets
 */
export async function generatePreviewImageUrl(
  options: PreviewImageOptions
): Promise<string | null> {
  try {
    const { deploymentUrl, width = 1200, height = 800 } = options;
    
    // Get API key from environment (loaded from Supabase Vault) or use fallback
    // Fallback key: T23MSF8-9CN4P6B-Q08QKGE-GH0J9K9
    const screenshotApiKey = process.env.SCREENSHOT_API_KEY || 'T23MSF8-9CN4P6B-Q08QKGE-GH0J9K9';
    
    // This should never be null now since we have a fallback, but keep the check for safety
    if (!screenshotApiKey) {
      logger.error('SCREENSHOT_API_KEY is null (this should not happen with fallback)');
      return null;
    }
    
    if (process.env.SCREENSHOT_API_KEY) {
      logger.info('SCREENSHOT_API_KEY found in environment, generating screenshot URL');
    } else {
      logger.info('Using fallback SCREENSHOT_API_KEY, generating screenshot URL');
    }
    
    // Use screenshotapi.net API
    // API format: https://screenshotapi.net/api/v1/screenshot?token=API_KEY&url=URL&width=WIDTH&height=HEIGHT
    // Use output=json to get better error messages and handle the response properly
    const screenshotUrl = `https://screenshotapi.net/api/v1/screenshot?token=${screenshotApiKey}&url=${encodeURIComponent(deploymentUrl)}&width=${width}&height=${height}&output=json&file_type=png&wait_for=networkidle0&delay=2000`;
    
    logger.info(`Generating screenshot URL for: ${deploymentUrl.substring(0, 50)}...`);
    logger.info(`Screenshot API URL (truncated): ${screenshotUrl.replace(screenshotApiKey, '***')}`);
    return screenshotUrl;
    
  } catch (error) {
    logger.error('Failed to generate preview image URL:', error);
    return null;
  }
}

/**
 * Capture screenshot and upload to R2 storage
 * Returns the public URL of the uploaded image
 */
export async function captureAndUploadPreviewImage(
  options: PreviewImageOptions
): Promise<string | null> {
  try {
    const { appId, appName, deploymentUrl } = options;
    
    // Step 1: Capture screenshot using Puppeteer or Playwright
    // For now, we'll use a screenshot service URL
    const screenshotUrl = await generatePreviewImageUrl(options);
    
    if (!screenshotUrl) {
      logger.warn('No screenshot URL generated, skipping upload');
      return null;
    }
    
    // Step 2: Download the screenshot
    logger.info(`Fetching screenshot from: ${screenshotUrl.substring(0, 100)}...`);
    const response = await fetch(screenshotUrl);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      logger.error(`Screenshot API returned error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Failed to fetch screenshot: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Check if response is JSON (when output=json) or image
    const contentType = response.headers.get('content-type') || '';
    let imageBuffer: Buffer;
    
    if (contentType.includes('application/json')) {
      // API returned JSON, parse it to get the image URL or base64
      const jsonData = await response.json();
      logger.info('Screenshot API returned JSON response:', JSON.stringify(jsonData).substring(0, 200));
      
      if (jsonData.screenshot) {
        // If screenshot is a URL, fetch it
        if (jsonData.screenshot.startsWith('http')) {
          logger.info(`Fetching image from URL: ${jsonData.screenshot}`);
          const imageResponse = await fetch(jsonData.screenshot);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from screenshot URL: ${imageResponse.status} ${imageResponse.statusText}`);
          }
          imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        } else if (jsonData.screenshot.startsWith('data:')) {
          // Base64 encoded image
          const base64Data = jsonData.screenshot.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          throw new Error('Unexpected screenshot format in API response');
        }
      } else if (jsonData.error) {
        throw new Error(`Screenshot API error: ${jsonData.error}`);
      } else {
        throw new Error('No screenshot data in API response');
      }
    } else {
      // Direct image response
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }
    
    logger.info(`Screenshot downloaded successfully, size: ${imageBuffer.length} bytes`);
    
    // Step 3: Save locally first
    const appPath = getDyadAppPath(`apps/web/${appName}`);
    const previewsDir = path.join(appPath, '.applaa', 'previews');
    await fs.ensureDir(previewsDir);
    
    const localPreviewPath = path.join(previewsDir, `preview-${appId}-${Date.now()}.png`);
    await fs.writeFile(localPreviewPath, imageBuffer);
    
    // Step 4: Upload to R2 if configured
    const settings = readSettings();
    if (settings.cloudflareR2?.accountId && settings.cloudflareR2?.bucketName) {
      try {
        const r2Client = initializeR2({
          accountId: settings.cloudflareR2.accountId,
          accessKeyId: settings.cloudflareR2.accessKeyId,
          secretAccessKey: settings.cloudflareR2.secretAccessKey,
          bucketName: settings.cloudflareR2.bucketName,
          region: settings.cloudflareR2.region || 'auto',
        });
        
        const r2Storage = getR2Storage();
        const r2Key = `previews/${appId}/${path.basename(localPreviewPath)}`;
        
        await r2Storage.uploadContent(imageBuffer, r2Key, 'image/png');
        
        // Get public URL (using default R2 pattern)
        // Note: For production, you should configure a public CDN URL in settings
        const publicUrl = `https://${settings.cloudflareR2.accountId}.r2.cloudflarestorage.com/${settings.cloudflareR2.bucketName}/${r2Key}`;
        
        logger.info(`Preview image uploaded to R2: ${publicUrl}`);
        return publicUrl;
      } catch (r2Error) {
        logger.error('Failed to upload to R2, using local path:', r2Error);
      }
    }
    
    // Fallback: Return local file path (not ideal for sharing, but works)
    logger.info(`Preview image saved locally: ${localPreviewPath}`);
    return localPreviewPath;
    
  } catch (error) {
    logger.error('Failed to capture and upload preview image:', error);
    return null;
  }
}

/**
 * Generate preview image for a deployed app
 * This is the main function to call when an app is deployed
 */
export async function generateAppPreviewImage(
  appId: number,
  appName: string,
  deploymentUrl: string | null
): Promise<string | null> {
  if (!deploymentUrl) {
    logger.warn(`No deployment URL for app ${appId}, skipping preview generation`);
    return null;
  }
  
  try {
    logger.info(`Generating preview image for app ${appId} (${appName})`);
    
    const previewUrl = await captureAndUploadPreviewImage({
      appId,
      appName,
      deploymentUrl,
      width: 1200,
      height: 800,
    });
    
    if (previewUrl) {
      logger.info(`✅ Preview image generated: ${previewUrl}`);
    } else {
      logger.warn(`⚠️ Preview image generation returned null for app ${appId}`);
    }
    
    return previewUrl;
  } catch (error) {
    logger.error(`Failed to generate preview image for app ${appId}:`, error);
    return null;
  }
}

