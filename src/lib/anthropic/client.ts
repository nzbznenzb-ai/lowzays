import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropicClient() {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquant dans les variables d'environnement.");
  }

  client = new Anthropic({ apiKey });
  return client;
}

export const SENTINELLE_MODEL = "claude-sonnet-4-6";
