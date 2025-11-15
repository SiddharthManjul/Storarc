/**
 * Supported file formats for document upload
 * Must match the formats supported by the document-loader service
 */

export const SUPPORTED_FORMATS = {
  // Text documents
  TEXT: ['.txt', '.md'],

  // Office documents
  OFFICE: ['.pdf', '.docx', '.doc'],

  // Data formats
  DATA: ['.json', '.csv'],

  // Web formats
  WEB: ['.html', '.htm', '.xml'],
};

// Flatten all formats into a single array
export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_FORMATS.TEXT,
  ...SUPPORTED_FORMATS.OFFICE,
  ...SUPPORTED_FORMATS.DATA,
  ...SUPPORTED_FORMATS.WEB,
];

// MIME types mapping for additional validation
export const MIME_TYPES: Record<string, string[]> = {
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.json': ['application/json'],
  '.csv': ['text/csv'],
  '.html': ['text/html'],
  '.htm': ['text/html'],
  '.xml': ['application/xml', 'text/xml'],
};

/**
 * Check if a file is supported based on its extension
 */
export function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALL_SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

/**
 * Get human-readable format name
 */
export function getFormatName(extension: string): string {
  const formatNames: Record<string, string> = {
    '.txt': 'Text',
    '.md': 'Markdown',
    '.pdf': 'PDF',
    '.docx': 'Word Document',
    '.doc': 'Word Document',
    '.json': 'JSON',
    '.csv': 'CSV',
    '.html': 'HTML',
    '.htm': 'HTML',
    '.xml': 'XML',
  };

  return formatNames[extension] || extension.toUpperCase();
}

/**
 * Get category for a file extension
 */
export function getFormatCategory(extension: string): string {
  if (SUPPORTED_FORMATS.TEXT.includes(extension)) return 'Text Documents';
  if (SUPPORTED_FORMATS.OFFICE.includes(extension)) return 'Office Documents';
  if (SUPPORTED_FORMATS.DATA.includes(extension)) return 'Data Formats';
  if (SUPPORTED_FORMATS.WEB.includes(extension)) return 'Web Formats';
  return 'Unknown';
}

/**
 * Validate file based on extension and optionally MIME type
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = getFileExtension(file.name);

  // Check if extension is supported
  if (!ALL_SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type "${ext}" is not supported. Supported formats: ${ALL_SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  // Optional: Validate MIME type if available
  const expectedMimeTypes = MIME_TYPES[ext];
  if (expectedMimeTypes && file.type && !expectedMimeTypes.includes(file.type)) {
    console.warn(`MIME type mismatch for ${file.name}: expected ${expectedMimeTypes.join(' or ')}, got ${file.type}`);
    // Don't fail on MIME type mismatch, just warn
  }

  return { valid: true };
}
