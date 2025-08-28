import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import log from 'electron-log';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export interface SyncOptions {
  includePatterns: string[];
  excludePatterns: string[];
  dryRun?: boolean;
  onProgress?: (progress: { current: number; total: number; file: string }) => void;
}

// Singleton R2 client
let r2Client: S3Client | null = null;
let currentConfig: R2Config | null = null;

export function initializeR2(config: R2Config): S3Client {
  if (r2Client && currentConfig && 
      currentConfig.accountId === config.accountId &&
      currentConfig.accessKeyId === config.accessKeyId) {
    return r2Client;
  }

  try {
    r2Client = new S3Client({
      region: config.region || 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    currentConfig = config;
    log.info('R2 client initialized successfully');
    return r2Client;
  } catch (error) {
    log.error('Failed to initialize R2 client:', error);
    throw error;
  }
}

export function getR2Client(): S3Client {
  if (!r2Client) {
    throw new Error('R2 client not initialized. Call initializeR2() first.');
  }
  return r2Client;
}

export function getCurrentConfig(): R2Config {
  if (!currentConfig) {
    throw new Error('R2 not configured');
  }
  return currentConfig;
}

// R2 Storage helper class
export class R2Storage {
  private client: S3Client;
  private bucketName: string;

  constructor(client: S3Client, bucketName: string) {
    this.client = client;
    this.bucketName = bucketName;
  }

  // Upload a file from local path
  async uploadFile(
    localPath: string, 
    r2Key: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    try {
      const fileStream = createReadStream(localPath);
      const stats = fs.statSync(localPath);
      
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: r2Key,
          Body: fileStream,
          ContentType: this.getContentType(localPath),
        },
      });

      if (onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total) {
            onProgress({
              loaded: progress.loaded,
              total: progress.total,
              percentage: Math.round((progress.loaded / progress.total) * 100),
            });
          }
        });
      }

      await upload.done();
      log.info(`File uploaded successfully: ${localPath} -> ${r2Key}`);
    } catch (error) {
      log.error(`Failed to upload file ${localPath}:`, error);
      throw error;
    }
  }

  // Upload buffer/string content
  async uploadContent(
    content: Buffer | string,
    r2Key: string,
    contentType?: string
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
        Body: content,
        ContentType: contentType || 'application/octet-stream',
      });

      await this.client.send(command);
      log.info(`Content uploaded successfully: ${r2Key}`);
    } catch (error) {
      log.error(`Failed to upload content to ${r2Key}:`, error);
      throw error;
    }
  }

  // Download a file to local path
  async downloadFile(r2Key: string, localPath: string): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No content received');
      }

      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = createWriteStream(localPath);
      await pipeline(response.Body as NodeJS.ReadableStream, writeStream);
      
      log.info(`File downloaded successfully: ${r2Key} -> ${localPath}`);
    } catch (error) {
      log.error(`Failed to download file ${r2Key}:`, error);
      throw error;
    }
  }

  // Get file content as buffer
  async getContent(r2Key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No content received');
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as NodeJS.ReadableStream;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      log.error(`Failed to get content for ${r2Key}:`, error);
      throw error;
    }
  }

  // Delete a file
  async deleteFile(r2Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
      });

      await this.client.send(command);
      log.info(`File deleted successfully: ${r2Key}`);
    } catch (error) {
      log.error(`Failed to delete file ${r2Key}:`, error);
      throw error;
    }
  }

  // List files with prefix
  async listFiles(prefix?: string, maxKeys?: number): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);
      
      return (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag || '',
      }));
    } catch (error) {
      log.error(`Failed to list files with prefix ${prefix}:`, error);
      throw error;
    }
  }

  // Check if file exists
  async fileExists(r2Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(r2Key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: r2Key,
      });

      const response = await this.client.send(command);
      
      return {
        key: r2Key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        contentType: response.ContentType,
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  // Sync directory to R2
  async syncDirectory(
    localDir: string,
    r2Prefix: string,
    options: SyncOptions
  ): Promise<{ uploaded: number; skipped: number; errors: string[] }> {
    const results = { uploaded: 0, skipped: 0, errors: [] };
    
    try {
      const files = this.getFilesToSync(localDir, options);
      
      if (options.onProgress) {
        options.onProgress({ current: 0, total: files.length, file: '' });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = path.relative(localDir, file);
        const r2Key = path.join(r2Prefix, relativePath).replace(/\\/g, '/');
        
        if (options.onProgress) {
          options.onProgress({ 
            current: i + 1, 
            total: files.length, 
            file: relativePath 
          });
        }

        try {
          if (options.dryRun) {
            log.info(`[DRY RUN] Would upload: ${file} -> ${r2Key}`);
            results.skipped++;
            continue;
          }

          // Check if file needs to be uploaded (compare timestamps/etags)
          const shouldUpload = await this.shouldUploadFile(file, r2Key);
          
          if (shouldUpload) {
            await this.uploadFile(file, r2Key);
            results.uploaded++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          const errorMsg = `Failed to upload ${file}: ${error.message}`;
          log.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      log.info(`Sync completed: ${results.uploaded} uploaded, ${results.skipped} skipped, ${results.errors.length} errors`);
      return results;
    } catch (error) {
      log.error('Sync directory failed:', error);
      throw error;
    }
  }

  // Get files to sync based on patterns
  private getFilesToSync(dir: string, options: SyncOptions): string[] {
    const files: string[] = [];
    
    const walkDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);
        
        if (entry.isDirectory()) {
          // Check if directory should be excluded
          if (!this.shouldExclude(relativePath + '/', options.excludePatterns)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          // Check if file should be included
          if (this.shouldInclude(relativePath, options.includePatterns) &&
              !this.shouldExclude(relativePath, options.excludePatterns)) {
            files.push(fullPath);
          }
        }
      }
    };

    walkDir(dir);
    return files;
  }

  // Check if file should be included based on patterns
  private shouldInclude(filePath: string, patterns: string[]): boolean {
    if (patterns.length === 0) return true;
    
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }

  // Check if file should be excluded based on patterns
  private shouldExclude(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }

  // Check if file should be uploaded (compare with remote)
  private async shouldUploadFile(localPath: string, r2Key: string): Promise<boolean> {
    try {
      const localStats = fs.statSync(localPath);
      const remoteMetadata = await this.getFileMetadata(r2Key);
      
      if (!remoteMetadata) {
        return true; // File doesn't exist remotely
      }

      // Compare file sizes
      if (localStats.size !== remoteMetadata.size) {
        return true;
      }

      // Compare modification times (with some tolerance for timestamp precision)
      const localTime = localStats.mtime.getTime();
      const remoteTime = remoteMetadata.lastModified.getTime();
      const timeDiff = Math.abs(localTime - remoteTime);
      
      // If times differ by more than 1 second, upload
      return timeDiff > 1000;
    } catch (error) {
      log.warn(`Error comparing file ${localPath}:`, error);
      return true; // Upload on error to be safe
    }
  }

  // Get content type based on file extension
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.scss': 'text/scss',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton storage instance
export function getR2Storage(): R2Storage {
  const client = getR2Client();
  const config = getCurrentConfig();
  return new R2Storage(client, config.bucketName);
}

