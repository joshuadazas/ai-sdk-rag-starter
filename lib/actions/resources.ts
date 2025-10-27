'use server';

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from '@/lib/db/schema/resources';
import { db } from '../db';
import { generateEmbeddings } from '../ai/embedding';
import { embeddings as embeddingsTable } from '../db/schema/embedding';

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content, sourceFile, policyNumber } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({
        content,
        sourceFile: sourceFile || null,
        policyNumber: policyNumber || null,
      })
      .returning();

    const embeddings = await generateEmbeddings(content);

    if (embeddings.length === 0) {
      throw new Error('No embeddings generated - content may be too short');
    }

    await db.insert(embeddingsTable).values(
      embeddings.map(embedding => ({
        resourceId: resource.id,
        ...embedding,
      })),
    );

    return `Resource successfully created and embedded. (${embeddings.length} chunks created)`;
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : 'Error, please try again.';
  }
};