import axios from 'axios';
import { config } from '@/config';
import { WalrusBlob } from '../types/index.js';

export class WalrusClient {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor() {
    this.publisherUrl = config.walrus.publisherUrl;
    this.aggregatorUrl = config.walrus.aggregatorUrl;
  }

  /**
   * Upload a blob to Walrus storage
   */
  async uploadBlob(content: string | Buffer, epochs?: number): Promise<WalrusBlob> {
    try {
      const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
      const storageEpochs = epochs || config.walrus.epochs;

      console.log(`Uploading ${data.length} bytes to Walrus for ${storageEpochs} epochs...`);

      const response = await axios.put(
        `${this.publisherUrl}/v1/blobs?epochs=${storageEpochs}`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          // Force IPv4 to avoid DNS resolution issues
          family: 4,
        }
      );

      // Walrus returns different response structures depending on if it's new or certified
      let blobId: string;
      let size: number;
      let endEpoch: number;

      if (response.data.newlyCreated) {
        // New blob was created
        const newBlob = response.data.newlyCreated;
        if (!newBlob.blobObject || !newBlob.blobObject.blobId) {
          throw new Error('Invalid response from Walrus publisher: missing blobObject');
        }
        blobId = newBlob.blobObject.blobId;
        size = parseInt(newBlob.blobObject.size);
        endEpoch = newBlob.blobObject.storage.endEpoch;
      } else if (response.data.alreadyCertified) {
        // Blob already exists
        const existing = response.data.alreadyCertified;
        if (!existing.blobId && !existing.blob_id) {
          throw new Error('Invalid response from Walrus publisher: missing blobId');
        }
        blobId = existing.blobId || existing.blob_id;
        endEpoch = existing.endEpoch || existing.end_epoch;
        // Size isn't available in alreadyCertified response, we'll use the original data size
        size = data.length;
      } else {
        throw new Error('Invalid response from Walrus publisher: unknown response type');
      }

      console.log(`✓ Blob uploaded successfully: ${blobId}`);

      return {
        blobId,
        size,
        uploadedAt: new Date(),
        metadata: {
          epochs: storageEpochs,
          endEpoch,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Walrus upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Retrieve a blob from Walrus storage
   */
  async getBlob(blobId: string): Promise<Buffer> {
    try {
      console.log(`Retrieving blob ${blobId} from Walrus...`);

      const response = await axios.get(
        `${this.aggregatorUrl}/v1/blobs/${blobId}`,
        {
          responseType: 'arraybuffer',
          // Force IPv4 to avoid DNS resolution issues
          family: 4,
        }
      );

      console.log(`✓ Blob retrieved successfully (${response.data.length} bytes)`);
      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Blob ${blobId} not found on Walrus`);
        }
        throw new Error(`Walrus retrieval failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Retrieve a blob as a UTF-8 string
   */
  async getBlobAsString(blobId: string): Promise<string> {
    const buffer = await this.getBlob(blobId);
    return buffer.toString('utf-8');
  }

  /**
   * Check if a blob exists on Walrus
   */
  async blobExists(blobId: string): Promise<boolean> {
    try {
      await axios.head(`${this.aggregatorUrl}/v1/blobs/${blobId}`, { family: 4 });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // 404 means not found, 400 means invalid blob ID format
        if (error.response?.status === 404 || error.response?.status === 400) {
          return false;
        }
      }
      throw error;
    }
  }

  /**
   * Get blob metadata without downloading full content
   */
  async getBlobMetadata(blobId: string): Promise<{ size: number; contentType?: string }> {
    try {
      const response = await axios.head(`${this.aggregatorUrl}/v1/blobs/${blobId}`, { family: 4 });
      return {
        size: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type'],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get blob metadata: ${error.message}`);
      }
      throw error;
    }
  }
}

// Singleton instance
export const walrusClient = new WalrusClient();
