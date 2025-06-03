// lib/TestAgent.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type TestCase = {
  input: string;
  expected_output: string;
};

export class TestAgent {
  gold: TestCase;
  generated: TestCase[] = [];
  attempts = 0;
  maxAttempts = 3;
  targetCount = 5;

  constructor(goldExample: TestCase) {
    this.gold = goldExample;
  }

  /**
   * 1) Call the LLM to produce a batch of candidate TestCases.
   * 2) Parse and return a JSON array (or [] if parsing fails).
   */
  async callGeneratorModel(): Promise<unknown[]> {
    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `
You are a test-case generator. Given this input:
${this.gold.input}

• Return exactly ${this.targetCount} objects in a JSON array.
• Each object must have "input" (string) and "expected_output" (string).
• Do not output any extra text—only valid JSON.
`,
      maxTokens: 700,      // ← changed from max_tokens
      temperature: 0.8,    // keep as-is
    });

    console.log("⟳ Generator raw text:", completion.text);
    try {
      return JSON.parse(completion.text) as unknown[];
    } catch (error) {
      console.error("❌ JSON.parse failed:", error);
      return [];
    }
  }

  /**
   * Ask the LLM to validate a single candidate. Returns true if LLM answers "YES".
   */
  async callValidatorModel(tc: TestCase): Promise<boolean> {
    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `
You are a validation assistant.
Gold example:
  Input: "${this.gold.input}"
  Expected: "${this.gold.expected_output}"

New candidate:
  Input: "${tc.input}"
  Expected: "${tc.expected_output}"

Question: Does this candidate test the same functionality as the gold but in a unique way? 
Answer "YES" or "NO" and nothing else.
`,
      maxTokens: 20,       // ← changed from max_tokens
      temperature: 0.0,    // deterministic
    });
    const answer = completion.text.trim().toUpperCase();
    console.log("⚡ Validator raw answer:", `"${answer}"`);
    return answer.startsWith("YES");
  }

  /**
   * Return false if candidate.input exactly matches gold.input
   * or duplicates an already‐accepted test.
   */
  isUnique(candidate: TestCase): boolean {
    if (candidate.input.trim() === this.gold.input.trim()) return false;
    for (const existing of this.generated) {
      if (existing.input.trim() === candidate.input.trim()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Main “agent” loop:
   * 1) Call generator → parse → get array of unknown
   * 2) For each parsed TestCase:
   *    a) syntactic sanity (has input, expected_output as strings)
   *    b) check uniqueness
   *    c) ask validator LLM (callValidatorModel)
   *    d) if passes, add to this.generated
   * 3) Repeat until we collect `targetCount` or hit maxAttempts
   */
  async run(): Promise<TestCase[]> {
    while (
      this.generated.length < this.targetCount &&
      this.attempts < this.maxAttempts
    ) {
      this.attempts++;

      const rawArr = await this.callGeneratorModel();
      const parsed: TestCase[] = [];

      // 2a) Keep only objects with correct shape
      for (const item of rawArr) {
        if (
          typeof item === "object" &&
          item !== null &&
          "input" in item &&
          "expected_output" in item &&
          typeof (item as any).input === "string" &&
          typeof (item as any).expected_output === "string"
        ) {
          parsed.push(item as TestCase);
        }
      }

      // 2b‐2d) Uniqueness + LLM validation
      for (const candidate of parsed) {
        if (this.generated.length >= this.targetCount) break;
        if (!this.isUnique(candidate)) continue;

        const isValid = await this.callValidatorModel(candidate);
        if (!isValid) continue;

        this.generated.push(candidate);
      }
    }

    if (this.generated.length < this.targetCount) {
      throw new Error(
        `Only collected ${this.generated.length}/${this.targetCount} valid tests after ${this.attempts} attempts.`
      );
    }
    return this.generated.slice(0, this.targetCount);
  }
}
