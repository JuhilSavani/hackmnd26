/**
 * Streams the document processing events using Server-Sent Events (SSE).
 * Returns an object containing the stream generator and an abort function.
 */
export function streamDocumentExtraction({ threadId, publicId, fileName, guidelinesUrl }) {
  const controller = new AbortController();

  async function* generateStream() {
    try {
      // 1. Initiate Fetch Request securely, pointing to the proxy/backend
      // Use the environment variable VITE_BASE_API_ENDPOINT to match .env
      const apiUrl = import.meta.env.VITE_BASE_API_ENDPOINT || 'http://localhost:4000/api';
      
      const response = await fetch(`${apiUrl}/document/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Important: Include credentials to send the sessionCookie for authenticateJWT
        credentials: "include", 
        body: JSON.stringify({ threadId, publicId, fileName, guidelinesUrl }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Process request failed: ${response.status}`);
      if (!response.body) throw new Error("No response body received for processing stream.");

      // 2. Build the Custom SSE Parser Transformer
      const sseParser = () => new TransformStream({
        transform(chunk, controller) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Process lines starting with "data: " and ignore the [DONE] marker
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                // Strip the exact 6 characters of "data: "
                const json = JSON.parse(line.slice(6)); 
                controller.enqueue(json);
              } catch (e) {
                // Ignore partial/malformed chunk intersections gracefully
              }
            }
          }
        },
      });

      // 3. Pipe the processing pipeline
      const stream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(sseParser());

      // 4. Yield parsed JSON chunks directly
      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        yield { type: 'error', val: error.message || "Network error during extraction stream." };
      }
    }
  }

  // 5. Expose simplified UI interface
  return {
    stream: generateStream(),
    abort: () => controller.abort()
  };
}

/**
 * Streams the LangGraph Agent execution events using Server-Sent Events (SSE).
 * Returns an object containing the stream generator and an abort function.
 */
export function streamAgentExecution({ threadId }) {
  const controller = new AbortController();

  async function* generateStream() {
    try {
      const apiUrl = import.meta.env.VITE_BASE_API_ENDPOINT || 'http://localhost:4000/api';
      
      const response = await fetch(`${apiUrl}/agent/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", 
        body: JSON.stringify({ threadId }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Agent execution request failed: ${response.status}`);
      if (!response.body) throw new Error("No response body received for agent stream.");

      // Custom SSE Parser Transformer
      const sseParser = () => new TransformStream({
        transform(chunk, controller) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Process lines starting with "data: " and ignore the [DONE] marker
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6)); 
                controller.enqueue(json);
              } catch (e) {
                // Ignore partial/malformed chunks
              }
            }
          }
        },
      });

      // Pipe the stream
      const stream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(sseParser());

      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        yield { type: 'error', val: error.message || "Network error during agent stream." };
      }
    }
  }

  return {
    stream: generateStream(),
    abort: () => controller.abort()
  };
}
