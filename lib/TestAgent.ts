// lib/TestAgent.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export type TestCase = {
  input: string;           // customer’s question to the bank chatbot
  expected_output: string; // the concise, correct answer the chatbot should return
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
   * 1) Call OpenAI to produce a batch of random bank‐chatbot test cases.
   * 2) Parse and return a JSON array of TestCase objects.
   */
  async callGeneratorModel(): Promise<unknown[]> {
    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `
You are a bank‐customer‐service test‐case generator. Produce exactly ${this.targetCount} random customer questions that someone might ask a banking chatbot, along with the concise, correct response the chatbot should give. Make sure:
  • Each question covers a distinct topic (e.g., account balance inquiry, transaction dispute, card replacement, loan interest rates, fraud reporting).
  • Questions vary in phrasing and complexity (formal, informal, multi‐part).
  • Expected answers are realistic and to‐the‐point (e.g., numerical values, process steps, policy explanations).

Return your answer as a pure JSON array (no extra text). The array should look like:
[
  {
    "input": "Customer question here…",
    "expected_output": "Correct chatbot response here…"
  },
  { … }, 
  … total of ${this.targetCount} objects …
]
`,
      max_tokens: 700,
      temperature: 0.8,
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
   * Ask the LLM if this candidate question is distinct from already‐accepted ones.
   * Returns true only if the LLM answers “YES” exactly.
   */
  async callValidatorModel(tc: TestCase): Promise<boolean> {
    const completion = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt: `
You are a validation assistant for bank‐chatbot test cases.

New candidate test‐case:
  Question: "${tc.input}"
  Expected Answer: "${tc.expected_output}"

Existing accepted questions so far:
${this.generated.map((t, i) => `  ${i + 1}. "${t.input}"`).join("\n")}

Question: Is the “New candidate” question completely distinct in topic, wording, and complexity from all previously accepted questions, and would it require a different reasoning path? 
Answer in exactly one word: YES or NO. Do NOT output anything else.
`,
      max_tokens: 10,
      temperature: 0.0,
    });

    const answer = completion.text.trim().toUpperCase();
    console.log("⚡ Validator raw answer for:", tc.input, "→", `"${answer}"`);
    return answer.startsWith("YES");
  }

  /**
   * Basic uniqueness filter: drop if candidate.input exactly
   * matches any already‐accepted question.
   */
  isUnique(candidate: TestCase): boolean {
    for (const existing of this.generated) {
      if (existing.input.trim() === candidate.input.trim()) {
        console.log("⦻ Dropped (duplicate prompt):", candidate.input);
        return false;
      }
    }
    return true;
  }

  /**
   * Main “agent” loop:
   * 1) Call generator → parse → get array of unknown
   * 2) For each parsed TestCase:
   *    a) sanity‐check (has input & expected_output as strings)
   *    b) uniqueness check (no exact‐string match against generated[])
   *    c) LLM validator (ensures distinctness)
   *    d) if passes, add to this.generated
   * 3) Repeat until we have targetCount or hit maxAttempts
   */
  async run(): Promise<TestCase[]> {
    this.generated = [];
    this.attempts = 0;

    while (
      this.generated.length < this.targetCount &&
      this.attempts < this.maxAttempts
    ) {
      this.attempts++;

      // 1) Get raw candidates
      const rawArr = await this.callGeneratorModel();
      const parsed: TestCase[] = [];

      // 2a) Keep only well‐formed objects
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

      // 2b‐2d) Uniqueness + LLM‐validator
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
