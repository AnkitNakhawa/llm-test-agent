// lib/HardPromptAgent.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type BankTestCase = {
  input: string;           // a difficult, niche question to ask the bank chatbot
  expected_output: string; // the concise, correct answer the chatbot should give
  difficulty: number;      // a numeric measure of difficulty
};

export class HardPromptAgent {
  difficultyLevel: number;
  targetCount: number;
  maxAttempts: number;

  constructor(
    initialDifficulty = 1,
    targetCount = 5,
    maxAttempts = 3
  ) {
    this.difficultyLevel = initialDifficulty;
    this.targetCount = targetCount;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Generate a batch of “hard” prompts for a banking chatbot.
   * Each run bumps up difficultyLevel by 1.
   */
  async generateBatch(): Promise<BankTestCase[]> {
    const prompt = this.buildPrompt(this.difficultyLevel, this.targetCount);
    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt,
      max_tokens: 800,
      temperature: 0.9, // higher temperature for more variation
    });

    console.log("\n⟳ [HardPromptAgent] Raw generator output:\n", completion.text);

    let parsed: unknown[] = [];
    try {
      parsed = JSON.parse(completion.text) as unknown[];
    } catch (err) {
      console.error("❌ [HardPromptAgent] Failed to parse JSON:", err);
      return [];
    }

    // Convert to BankTestCase[] if structurally valid
    const cases: BankTestCase[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "input" in item &&
        "expected_output" in item
      ) {
        const cast = item as Partial<BankTestCase>;
        if (
          typeof cast.input === "string" &&
          typeof cast.expected_output === "string"
        ) {
          cases.push({
            input: cast.input,
            expected_output: cast.expected_output,
            difficulty: this.difficultyLevel,
          });
        }
      }
    }

    // Increase difficulty for next call
    this.difficultyLevel += 1;
    return cases.slice(0, this.targetCount);
  }

  /**
   * Build the prompt for the LLM, given a difficulty level.
   * The higher difficulty => more obscure/niche scenarios.
   */
  private buildPrompt(
    difficultyLevel: number,
    count: number
  ): string {
    return `
You are a bank‐customer‐service test‐case generator. Your goal is to produce exactly ${count} very challenging, niche, and obscure customer questions for a banking chatbot. These questions should be increasingly difficult to answer correctly, given a “difficulty level” of ${difficultyLevel} (where higher means more specialized/edge‐case/borderline compliance issues).

Each question should:
  • Cover a niche topic (e.g., international wire compliance for small currencies, fractional‐reserve triggers in atypical accounts, non‐resident alien tax withholding specifics, obscure loan‐amortization formulas, etc.).
  • Require the chatbot to provide a precise, correct answer (policy reference, numeric detail, multi‐step procedure).
  • Include any relevant context (e.g., “I am a resident of Country X with a USD account and need a wire to Country Y in currency Z.”).
  • Vary in length and complexity (some can be multi‐part questions).

Return your answer as a pure JSON array of objects—no extra commentary. Use this schema exactly:
[
  {
    "input": "<the challenging question here>",
    "expected_output": "<the concise, correct answer here>"
  },
  … total of ${count} objects …
]
`;
  }
}
