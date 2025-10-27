# Audit Assistant

This is the starter project for the Audit Assistant.

In this project, we tackle a common challenge in internal audit teams responsible for reviewing and auditing policies and procedures. They must analize controls according to policies and procedures and following a framework, such as ISO 27001, SOC 2, etc.

The project is an audit assistant that will only respond with information that it has within its knowledge base. The assistant will be able to both store and retrieve information. 

This project uses the Vercel AI SDK to build the assistant. The assistant receives documents such as `pdf`, `txt`, `md` files and uses LlamaParse to parse the documents and extract the text. The text is then intelligently chunked using semantic segmentation (by markdown headers and paragraphs to preserve context) and converted into embeddings using OpenAI's `text-embedding-ada-002` model. These embeddings are high-dimensional numerical vectors that capture the semantic meaning of the text. When users ask questions, the assistant converts the query into an embedding and uses cosine similarity search to find the most relevant document chunks from the vector database, enabling precise, context-aware answers about the policies and procedures. 

The assistant is able to:

- Ask questions about Ontop's policies and procedures
- Search the knowledge base for information
- Use predefined prompts to start a conversation