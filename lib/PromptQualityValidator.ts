// lib/PromptQualityValidator.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { BankTestCase } from "./HardPromptAgent.ts"; // type-only

export type ValidatedCase = BankTestCase & {
  qualityScore: number;    // from 1 (very easy/clear) to 10 (very hard/edge‐case)
  justification: string;    // brief LLM explanation for this score
};

export class PromptQualityValidator {
  maxTokens: number;
  constructor(maxTokens = 100) {
    this.maxTokens = maxTokens;
  }

  /**
   * Given a batch of BankTestCase, ask the LLM to score each one.
   * Returns an array of ValidatedCase with qualityScore and justification.
   */
  async validateBatch(
    candidates: BankTestCase[]
  ): Promise<ValidatedCase[]> {
    if (candidates.length === 0) return [];

    const inputArrayString = JSON.stringify(
      candidates.map((c) => ({ input: c.input, expected_output: c.expected_output })),
      null,
      2
    );

    const prompt = `
You are a bank‐chatbot test‐case quality assessor. Below is a JSON array of candidate test cases. For each case, give:
  • A "qualityScore" from 1 (very easy/obvious question) to 10 (extremely niche/edge‐case/difficult).
  • A one‐sentence "justification" explaining why you gave that score.

Input array:
${inputArrayString}

Return a pure JSON array of objects with this schema, in the same order:
[
  {
    "input": "<same as candidate input>",
    "expected_output": "<same as candidate expected_output>",
    "difficulty": <same difficulty number>,
    "qualityScore": <integer 1–10>,
    "justification": "<brief explanation>"
  },
  …
]
`;

    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt,
      max_tokens: this.maxTokens,
      temperature: 0.0,
    });

    console.log("\n⟳ [Validator] Raw validation output:\n", completion.text);

    let parsed: unknown[] = [];
    try {
      parsed = JSON.parse(completion.text) as unknown[];
    } catch (err) {
      console.error("❌ [Validator] Failed to parse JSON:", err);
      return [];
    }

    const validated: ValidatedCase[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i] as any;
      const base = candidates[i];
      if (
        item &&
        typeof item.qualityScore === "number" &&
        typeof item.justification === "string"
      ) {
        validated.push({
          input: base.input,
          expected_output: base.expected_output,
          difficulty: base.difficulty,
          qualityScore: item.qualityScore,
          justification: item.justification,
        });
      }
    }
    return validated;
  }
}
