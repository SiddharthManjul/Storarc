/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LoadedDocument {
  content: string;
  metadata: {
    filename: string;
    fileType: string;
    originalExtension: string;
    pageCount?: number;
  };
}

export class DocumentLoader {
  private supportedExtensions = [
    '.txt', '.md', '.pdf', '.doc', '.docx',
    '.json', '.csv', '.html', '.htm', '.xml'
  ];

  /**
   * Check if a file type is supported
   */
  isSupported(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  /**
   * Get all supported extensions
   */
  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }

  /**
   * Load a document from filepath
   */
  async loadDocument(filepath: string): Promise<LoadedDocument> {
    const filename = path.basename(filepath);
    const ext = path.extname(filename).toLowerCase();

    console.log(`   📄 Loading ${filename} (${ext})...`);

    if (!this.isSupported(filename)) {
      throw new Error(`Unsupported file type: ${ext}. Supported: ${this.supportedExtensions.join(', ')}`);
    }

    let content: string;
    let fileType: string;
    let pageCount: number | undefined;

    switch (ext) {
      case '.pdf':
        ({ content, pageCount, fileType } = await this.loadPDF(filepath));
        break;

      case '.docx':
      case '.doc':
        ({ content, fileType } = await this.loadDOCX(filepath));
        break;

      case '.txt':
      case '.md':
        ({ content, fileType } = await this.loadText(filepath, ext));
        break;

      case '.json':
        ({ content, fileType } = await this.loadJSON(filepath));
        break;

      case '.csv':
        ({ content, fileType } = await this.loadCSV(filepath));
        break;

      case '.html':
      case '.htm':
        ({ content, fileType } = await this.loadHTML(filepath));
        break;

      case '.xml':
        ({ content, fileType } = await this.loadXML(filepath));
        break;

      default:
        // Fallback to text
        ({ content, fileType } = await this.loadText(filepath, ext));
    }

    console.log(`   ✓ Loaded ${content.length} characters${pageCount ? ` (${pageCount} pages)` : ''}`);

    return {
      content,
      metadata: {
        filename,
        fileType,
        originalExtension: ext,
        pageCount,
      },
    };
  }

  /**
   * Load PDF file
   */
  private async loadPDF(filepath: string): Promise<{ content: string; pageCount: number; fileType: string }> {
    const dataBuffer = await fs.readFile(filepath);

    // Dynamic import for CommonJS module
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(dataBuffer);

    return {
      content: data.text,
      pageCount: data.numpages,
      fileType: 'application/pdf',
    };
  }

  /**
   * Load DOCX file
   */
  private async loadDOCX(filepath: string): Promise<{ content: string; fileType: string }> {
    const buffer = await fs.readFile(filepath);

    // Dynamic import for CommonJS module
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      console.warn('   ⚠️  DOCX conversion warnings:', result.messages);
    }

    return {
      content: result.value,
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  /**
   * Load plain text or markdown file
   */
  private async loadText(filepath: string, ext: string): Promise<{ content: string; fileType: string }> {
    const content = await fs.readFile(filepath, 'utf-8');

    return {
      content,
      fileType: ext === '.md' ? 'text/markdown' : 'text/plain',
    };
  }

  /**
   * Load JSON file
   */
  private async loadJSON(filepath: string): Promise<{ content: string; fileType: string }> {
    const content = await fs.readFile(filepath, 'utf-8');

    // Validate JSON
    try {
      const parsed = JSON.parse(content);
      // Convert to readable text format
      return {
        content: JSON.stringify(parsed, null, 2),
        fileType: 'application/json',
      };
    } catch (error) {
      throw new Error(`Invalid JSON file: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Load CSV file
   */
  private async loadCSV(filepath: string): Promise<{ content: string; fileType: string }> {
    const content = await fs.readFile(filepath, 'utf-8');

    // Basic CSV parsing - convert to readable text
    const lines = content.split('\n');
    const formattedContent = lines
      .map((line, index) => {
        if (index === 0) {
          return `Headers: ${line}`;
        }
        return `Row ${index}: ${line}`;
      })
      .join('\n');

    return {
      content: formattedContent,
      fileType: 'text/csv',
    };
  }

  /**
   * Load HTML file
   */
  private async loadHTML(filepath: string): Promise<{ content: string; fileType: string }> {
    const content = await fs.readFile(filepath, 'utf-8');

    // Strip HTML tags for plain text (basic implementation)
    const textContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      content: textContent,
      fileType: 'text/html',
    };
  }

  /**
   * Load XML file
   */
  private async loadXML(filepath: string): Promise<{ content: string; fileType: string }> {
    const content = await fs.readFile(filepath, 'utf-8');

    // Basic XML to text conversion
    const textContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      content: textContent,
      fileType: 'application/xml',
    };
  }
}

// Singleton instance
export const documentLoader = new DocumentLoader();
