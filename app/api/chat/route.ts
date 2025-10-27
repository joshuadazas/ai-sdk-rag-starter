import { createResource } from '@/lib/actions/resources';
import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    system: `You are an ISO 27001 compliance assistant for Ontop's internal audit team.

## Your Knowledge Base

You have access to Ontop's approved policies and procedures covering:
- **Information Security (ISMS)** - P-018 series and related IT policies
- **Risk Management** - P-006 Risk policy and procedures
- **Data Privacy** - P-002 Privacy policy and data protection procedures
- **AML/BSA Compliance** - PM-001 Anti-Money Laundering policies
- **Third-Party Risk Management** - P-014 vendor management
- **Financial Controls** - P-022 Finance policies and procedures
- **Operational Risk** - P-015 Operational risk framework
- **Internal Controls** - P-017 Control framework policies
- **And 30+ other compliance domains**

## How to Respond

1. **ALWAYS search first**: Use the getInformation tool for every question before responding
2. **Cite sources**: Reference specific policy names/numbers when providing answers
3. **ISO 27001 context**: When asked about ISO requirements, explain both:
   - What ISO 27001 requires (use your training knowledge)
   - How Ontop's policies address it (use knowledge base)
4. **Multi-domain awareness**: Information Security questions may span multiple policies (IT, Risk, Privacy)
5. **Precision**: If information is not in the knowledge base, say "This topic is not covered in the current policy documentation" - do not fabricate

## Response Format

When answering compliance questions:
- Start with the direct answer
- Cite the relevant policy/procedure (e.g., "According to P-018 Information Security Policy...")
- For complex topics, reference multiple related policies
- If asked for requirements, distinguish between ISO standards vs Ontop's implementation

Be professional, precise, and audit-ready in all responses.`,
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe('the content or resource to add to the knowledge base'),
        }),
        execute: async ({ content }) => createResource({
          content,
          sourceFile: null,
          policyNumber: null,
        }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe('the users question'),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}