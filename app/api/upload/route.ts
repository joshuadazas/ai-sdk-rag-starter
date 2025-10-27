import { createResource } from '@/lib/actions/resources';
import { parsePdfWithLlamaParse } from '@/lib/ai/pdf-parser';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    let textContent: string;

    // Handle different file types
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'pdf') {
      // Parse PDF using LlamaParse
      console.log(`Parsing PDF: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      textContent = await parsePdfWithLlamaParse(arrayBuffer, file.name);
      console.log(`Extracted ${textContent.length} characters from PDF`);
    } else if (fileExtension === 'txt' || fileExtension === 'md') {
      // Plain text files can be read directly
      textContent = await file.text();
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, TXT, or MD files.' },
        { status: 400 }
      );
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File appears to be empty or unreadable' },
        { status: 400 }
      );
    }

    // Extract policy number from filename if it follows the pattern
    // Supports: P-018, P-018-001, PM-001, etc.
    const policyMatch = file.name.match(/^(P-\d{3}|PM-\d{3})/);
    const policyNumber = policyMatch ? policyMatch[1] : null;

    // Create resource with embeddings
    const result = await createResource({
      content: textContent,
      sourceFile: file.name,
      policyNumber,
    });

    return NextResponse.json({
      success: true,
      message: result,
      fileName: file.name,
      policyNumber,
      contentLength: textContent.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
