// app/api/orchestrate/route.ts
import { NextResponse } from "next/server";
import { HardPromptAgent } from "@/lib/HardPromptAgent";
import { PromptQualityValidator } from "@/lib/PromptQualityValidator";

export const runtime = "edge";

export async function GET() {
  // 1) Generate a batch of hard, niche prompts
  const hardAgent = new HardPromptAgent(1, 5, 3);
  const rawCandidates = await hardAgent.generateBatch();

  // 2) Validate & score that batch
  const validator = new PromptQualityValidator(200);
  const validated = await validator.validateBatch(rawCandidates);

  // 3) Sort by qualityScore descending and pick top 3
  const sorted = [...validated].sort((a, b) => b.qualityScore - a.qualityScore);
  const topCases = sorted.slice(0, 3);

  // 4) Return all three stages in one JSON
  return NextResponse.json({ rawCandidates, validated, topCases });
}
