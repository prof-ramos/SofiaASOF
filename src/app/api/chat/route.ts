import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { embed, streamText } from "ai";
import { NextRequest } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Embedding model
const embeddingModel = openai.embedding("text-embedding-3-small");

// Chat model
const chatModel = openai("gpt-4o");

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  // Get the last user message
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "user") {
    return new Response("No user message found", { status: 400 });
  }

  try {
    // Generate embedding for the query
    const { embedding } = await embed({
      model: embeddingModel,
      value: lastMessage.content,
    });

    // Search for relevant documents using vector similarity
    const { data: documents, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
    });

    if (error) {
      console.error("Error searching documents:", error);
    }

    // Build context from retrieved documents
    let context = "";
    if (documents && documents.length > 0) {
      context = documents
        .map((doc: { content: string; source: string }) => {
          return `[${doc.source}]\n${doc.content}`;
        })
        .join("\n\n---\n\n");
    }

    // Build the prompt with context
    const systemPrompt = context
      ? `${SYSTEM_PROMPT}

## Contexto relevante da base de conhecimento:

${context}

---

Use o contexto acima para responder à pergunta do usuário. Cite as fontes quando apropriado.`
      : SYSTEM_PROMPT;

    // Stream the response
    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: messages.slice(0, -1).concat([
        {
          role: "user",
          content: lastMessage.content,
        },
      ]),
      temperature: 0.7,
      maxTokens: 1024,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar sua solicitação" }),
      { status: 500 }
    );
  }
}
