import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql, eq } from 'drizzle-orm';
import { embeddings } from '../db/schema/embedding';
import { resources } from '../db/schema/resources';

const embeddingModel = openai.embedding('text-embedding-ada-002');

/**
 * Intelligently chunk markdown content by sections while preserving context
 *
 * Strategy:
 * 1. Split by markdown headers (# ## ###) to maintain semantic sections
 * 2. If section > 1000 chars, split paragraphs but keep header context
 * 3. Ensure minimum chunk size (100 chars) to filter noise
 * 4. Preserve hierarchical context (headers stay with their content)
 */
const generateChunks = (markdownContent: string): string[] => {
  const chunks: string[] = [];

  // Split on H1, H2, H3 headers while keeping the header with its content
  // Regex: \n(?=#{1,3} ) means "newline followed by 1-3 # and a space"
  const sections = markdownContent.split(/\n(?=#{1,3} )/);

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;

    // If section is small enough, use as-is
    if (trimmedSection.length <= 1000) {
      chunks.push(trimmedSection);
      continue;
    }

    // For large sections, split paragraphs while preserving header
    const lines = trimmedSection.split('\n');
    const header = lines[0]; // First line (the markdown header)
    const paragraphs = lines.slice(1).join('\n').split(/\n\n+/);

    let currentChunk = header;

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue;

      // If adding this paragraph exceeds limit, finalize current chunk
      if (currentChunk.length + trimmedPara.length + 2 > 1000) {
        if (currentChunk.length > 100) {
          chunks.push(currentChunk.trim());
        }
        // Start new chunk with header context
        currentChunk = header + '\n\n' + trimmedPara;
      } else {
        currentChunk += '\n\n' + trimmedPara;
      }
    }

    // Add final chunk if substantial
    if (currentChunk.length > 100) {
      chunks.push(currentChunk.trim());
    }
  }

  // Filter out noise (very short chunks)
  return chunks.filter(chunk => chunk.length >= 100);
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);

  if (chunks.length === 0) {
    console.warn('Warning: No valid chunks generated from content');
    return [];
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

/**
 * Find relevant content using vector similarity search
 * Enhanced to include source metadata for citations
 */
export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);

  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;

  const similarGuides = await db
    .select({
      name: embeddings.content,
      similarity,
      sourceFile: resources.sourceFile,
      policyNumber: resources.policyNumber,
    })
    .from(embeddings)
    .innerJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(gt(similarity, 0.3)) // Lower threshold for compliance docs
    .orderBy(t => desc(t.similarity))
    .limit(8); // More results for comprehensive answers

  return similarGuides;
};