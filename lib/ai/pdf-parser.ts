/**
 * Parse PDF using LlamaParse API
 * Shared utility for both upload and batch ingestion
 */

/**
 * Parse PDF buffer using LlamaParse API
 */
export async function parsePdfWithLlamaParse(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string
): Promise<string> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('LLAMA_CLOUD_API_KEY not found in environment variables');
  }

  // Create FormData for multipart/form-data upload
  const formData = new FormData();

  // Add file as Blob - convert Buffer to ArrayBuffer if needed
  const arrayBuffer = fileBuffer instanceof Buffer 
    ? fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    : fileBuffer;
  
  const fileBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
  formData.append('file', fileBlob, fileName);

  // Specify result type as markdown
  formData.append('result_type', 'markdown');

  // Call LlamaParse API
  const response = await fetch(
    'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LlamaParse API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Poll for results if job ID is returned
  if (result.id) {
    return await pollForResults(result.id, apiKey);
  }

  // If markdown is returned directly
  if (result.markdown) {
    return result.markdown;
  }

  throw new Error('Unexpected response format from LlamaParse API');
}

/**
 * Poll LlamaParse API for parsing results
 */
async function pollForResults(jobId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds

  console.log(`Polling for job ${jobId}...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      // Job might still be processing
      if (response.status === 400 || response.status === 404) {
        continue; // Keep polling
      }
      throw new Error(`Failed to poll job status: ${response.status}`);
    }

    const result = await response.json();

    // Result should contain markdown text
    if (result.markdown) {
      return result.markdown;
    }

    // If we got text directly
    if (typeof result === 'string') {
      return result;
    }

    // Continue polling
  }

  throw new Error('Polling timeout - parsing took too long');
}
