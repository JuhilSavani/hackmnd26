import { extractPdf } from './pdfExtractor.js';
import { extractDocx } from './docxExtractor.js';

/**
 * High-level coordinator that identifies the document type from its filename or context
 * and dispatches the extraction to the appropriate specialized extractor.
 *
 * @param {ArrayBuffer} buffer - The raw binary buffer fetched from storage (Cloudinary).
 * @param {string} fileName - The original file name (used to determine extension).
 * @returns {Promise<{text: string, metadata: object|null}>} Unified payload containing text and optional formatting metadata.
 */
export async function extractDocument(buffer, fileName) {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Provided document buffer is empty or undefined.');
  }

  const extension = fileName.split('.').pop().toLowerCase();

  switch (extension) {
    case 'pdf':
      console.log(`[Extract] Initializing PDF extraction strategy for ${fileName}`);
      return await extractPdf(buffer);
      
    case 'docx':
      console.log(`[Extract] Initializing DOCX extraction strategy for ${fileName}`);
      return await extractDocx(buffer);
      
    case 'txt':
    case 'md':
      // Fallback for simple plaintext uploads if needed
      console.log(`[Extract] Parsing raw text format for ${fileName}`);
      const textDecoder = new TextDecoder('utf-8');
      return {
        text: textDecoder.decode(buffer),
        metadata: null
      };

    default:
      throw new Error(`Unsupported document extension for extraction: .${extension}`);
  }
}
