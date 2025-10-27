import fs from 'fs';
import path from 'path';
import { createResource } from '@/lib/actions/resources';
import dotenv from 'dotenv';

dotenv.config();

interface PolicyStats {
  totalFolders: number;
  totalPDFs: number;
  successfulIngestions: number;
  failedIngestions: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Parse PDF using LlamaParse API directly
 */
async function parsePdfWithLlamaParse(filePath: string): Promise<string> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;

  if (!apiKey) {
    throw new Error('LLAMA_CLOUD_API_KEY not found in environment variables');
  }

  // Read file as buffer
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Create FormData for multipart/form-data upload (Node.js 18+ native)
  const formData = new FormData();

  // Add file as Blob (Node.js 18+ native)
  const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', fileBlob, fileName);

  // Optional: specify result type
  formData.append('result_type', 'markdown');

  // Call LlamaParse API with correct endpoint
  const response = await fetch('https://api.cloud.llamaindex.ai/api/v1/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

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

  console.log(`   ⏱️  Polling for job ${jobId}...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const response = await fetch(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

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

async function ingestPolicies() {
  console.log('🚀 Starting policy ingestion with LlamaParse...\n');

  const stats: PolicyStats = {
    totalFolders: 0,
    totalPDFs: 0,
    successfulIngestions: 0,
    failedIngestions: 0,
    errors: [],
  };

  // Use pdfbase directory for test PDFs
  const policiesDir = path.join(process.cwd(), 'pdfbase');

  if (!fs.existsSync(policiesDir)) {
    console.error(`❌ Directory not found: ${policiesDir}`);
    process.exit(1);
  }

  // Get all PDF files directly from pdfbase directory (flat structure)
  const files = fs.readdirSync(policiesDir, { withFileTypes: true });
  const pdfFiles = files
    .filter(f => f.isFile() && f.name.endsWith('.pdf'))
    .map(f => f.name);

  stats.totalPDFs = pdfFiles.length;
  console.log(`📄 Found ${pdfFiles.length} PDF(s) in pdfbase/\n`);

  if (pdfFiles.length === 0) {
    console.log(`⚠️  No PDFs found in pdfbase directory`);
    process.exit(0);
  }

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(policiesDir, pdfFile);

    try {
      console.log(`⏳ Parsing: ${pdfFile}...`);

      // Parse PDF with LlamaParse API
      const markdownContent = await parsePdfWithLlamaParse(filePath);

      if (!markdownContent || markdownContent.trim().length === 0) {
        throw new Error('Empty content extracted from PDF');
      }

      // Extract policy number from filename (e.g., "P-018 INFORMATION SECURITY..." → "P-018")
      const policyNumberMatch = pdfFile.match(/^P-\d+|^PM-\d+/);
      const policyNumber = policyNumberMatch ? policyNumberMatch[0] : null;

      console.log(`📊 Extracted ${markdownContent.length} characters of markdown content`);

      // Create resource with embeddings
      const result = await createResource({
        content: markdownContent,
        sourceFile: pdfFile,
        policyNumber: policyNumber,
      });

      if (result.includes('successfully')) {
        stats.successfulIngestions++;
        console.log(`✅ Ingested: ${pdfFile} (Policy: ${policyNumber || 'N/A'})`);
        console.log(`   ${result}\n`);
      } else {
        throw new Error(result);
      }

    } catch (error) {
      stats.failedIngestions++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      stats.errors.push({ file: pdfFile, error: errorMessage });
      console.log(`❌ Failed: ${pdfFile} - ${errorMessage}\n`);
    }
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total PDFs processed: ${stats.totalPDFs}`);
  console.log(`Successful ingestions: ${stats.successfulIngestions}`);
  console.log(`Failed ingestions: ${stats.failedIngestions}`);
  console.log(`Success rate: ${stats.totalPDFs > 0 ? Math.round((stats.successfulIngestions / stats.totalPDFs) * 100) : 0}%`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }

  console.log('='.repeat(60));
  console.log(`\n✨ Ingestion complete! ${stats.successfulIngestions} policies ready for querying.\n`);
}

// Run ingestion
ingestPolicies().catch((error) => {
  console.error('💥 Fatal error during ingestion:', error);
  process.exit(1);
});
