// lib/PromptQualityValidator.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { BankTestCase } from "./HardPromptAgent.ts";

export type ValidatedCase = BankTestCase & {
  qualityScore: number;    // 1 (easy) → 10 (extremely hard)
  justification: string;
};

export class PromptQualityValidator {
  maxTokensPerCandidate: number;
  constructor(maxTokensPerCandidate = 150) {
    this.maxTokensPerCandidate = maxTokensPerCandidate;
  }

  /**
   * Validate each BankTestCase separately, returning an array of ValidatedCase.
   * By scoring one candidate at a time, we guarantee the model only needs to return a single JSON object,
   * eliminating any chance of a truncated or malformed JSON‐array response.
   */
  async validateBatch(candidates: BankTestCase[]): Promise<ValidatedCase[]> {
    const validated: ValidatedCase[] = [];

    for (const candidate of candidates) {
      // Build a prompt that asks for exactly one JSON object per candidate
      const prompt = `
You are a bank‐chatbot test‐case quality assessor. Evaluate this single test case:

  Input (question): "${candidate.input.replace(/"/g, '\\"')}"
  Expected Output (answer): "${candidate.expected_output.replace(/"/g, '\\"')}"
  Difficulty: ${candidate.difficulty}

Please respond with exactly one JSON object (no surrounding text) using this schema:

{
  "qualityScore": <integer from 1 to 10>,
  "justification": "<one-sentence explanation>"
}

Where "qualityScore" indicates how challenging this test case is (1 = trivial, 10 = extremely niche/edge case). The justification should be a brief sentence explaining why you chose that score.
`;

      const completion = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt,
        maxTokens: this.maxTokensPerCandidate,
        temperature: 0.0, // deterministic
      });

      console.log("\n⟳ [Validator] Raw output for one candidate:\n", completion.text);

      // Extract the first {...} substring from the raw text
      const raw = completion.text.trim();
      const objectStart = raw.indexOf("{");
      const objectEnd = raw.lastIndexOf("}");
      if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) {
        console.error("❌ [Validator] Could not find a valid JSON object in:\n", raw);
        continue; // skip this candidate if parsing fails
      }

      const jsonObjectString = raw.slice(objectStart, objectEnd + 1);

      let parsed: { qualityScore: number; justification: string };
      try {
        parsed = JSON.parse(jsonObjectString);
      } catch (err) {
        console.error("❌ [Validator] JSON.parse failed on single‐object:", err);
        continue;
      }

      // Only push if parsed fields are correct
      if (
        typeof parsed.qualityScore === "number" &&
        typeof parsed.justification === "string"
      ) {
        validated.push({
          input: candidate.input,
          expected_output: candidate.expected_output,
          difficulty: candidate.difficulty,
          qualityScore: parsed.qualityScore,
          justification: parsed.justification,
        });
      } else {
        console.error("❌ [Validator] Parsed object missing required fields:", parsed);
      }
    }

    return validated;
  }
}
