import { extractText, getDocumentProxy } from "unpdf";

/**
 * Parses a PDF buffer and extracts its text payload using unpdf.
 *
 * @param {ArrayBuffer} buffer - The raw binary buffer of the PDF file.
 * @returns {Promise<string>} The extracted unified text content of the PDF.
 */
export async function extractPdf(buffer) {
  try {
    // 1. Create a proxy document out of the array buffer
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    
    // 2. Extract text and merge pages
    const { text } = await extractText(pdf, { mergePages: true });
    
    return {
      text,
      metadata: null // PDFs do not retain recoverable formatting metadata in this pipeline
    };
  } catch (error) {
    console.error("❌ Failed to parse PDF buffer:", error.message);
    throw new Error(`PDF Parsing Error: ${error.message}`);
  }
}
