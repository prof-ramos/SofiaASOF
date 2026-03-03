import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { glob } from "glob";
import { readFileSync } from "fs";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const embeddingModel = openai.embedding("text-embedding-3-small");

interface DocumentChunk {
  content: string;
  source: string;
  embedding: number[];
}

async function chunkText(text: string, maxChunkSize = 1000): Promise<string[]> {
  // Simple chunking by paragraphs
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += "\n\n" + paragraph;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
}

async function ingestDocument(filePath: string): Promise<void> {
  console.log(`Processing: ${filePath}`);

  const content = readFileSync(filePath, "utf-8");
  const chunks = await chunkText(content);

  const source = filePath.split("/").pop() || filePath;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (!chunk.trim()) continue;

    console.log(`  Chunk ${i + 1}/${chunks.length}`);

    const { embedding } = await embed({
      model: embeddingModel,
      value: chunk,
    });

    const { error } = await supabase.from("documents").insert({
      content: chunk,
      source: `${source} (parte ${i + 1})`,
      embedding,
    });

    if (error) {
      console.error(`  Error inserting chunk: ${error.message}`);
    }
  }

  console.log(`  Done: ${chunks.length} chunks inserted`);
}

async function main() {
  const pattern = process.argv[2] || "documents/**/*.txt";
  const files = await glob(pattern);

  if (files.length === 0) {
    console.log("No files found matching pattern:", pattern);
    return;
  }

  console.log(`Found ${files.length} files to ingest\n`);

  for (const file of files) {
    await ingestDocument(file);
  }

  console.log("\nIngestion complete!");
}

main().catch(console.error);
