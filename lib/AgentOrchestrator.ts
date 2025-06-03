// lib/AgentOrchestrator.ts
import { HardPromptAgent } from "./HardPromptAgent.ts";         // value-only import
import type { BankTestCase } from "./HardPromptAgent.ts";       // type-only import
import { PromptQualityValidator } from "./PromptQualityValidator.ts"; // value-only import
import type { ValidatedCase } from "./PromptQualityValidator.ts";     // type-only import

export class AgentOrchestrator {
  hardAgent: HardPromptAgent;
  validatorAgent: PromptQualityValidator;

  constructor(
    initialDifficulty = 1,
    batchSize = 5,
    maxAttempts = 3
  ) {
    this.hardAgent = new HardPromptAgent(initialDifficulty, batchSize, maxAttempts);
    this.validatorAgent = new PromptQualityValidator(200);
  }

  /**
   * Run one full cycle:
   * 1) Generate batch of hard prompts
   * 2) Validate & score them
   * 3) Return the top N by qualityScore
   */
  async runCycle(
    topK = 3
  ): Promise<ValidatedCase[]> {
    // 1) Generate
    const candidates: BankTestCase[] = await this.hardAgent.generateBatch();
    if (candidates.length === 0) {
      throw new Error("[Orchestrator] HardPromptAgent returned no candidates.");
    }

    // 2) Validate & score
    const validated: ValidatedCase[] = await this.validatorAgent.validateBatch(candidates);

    if (validated.length === 0) {
      throw new Error("[Orchestrator] Validator returned no validated cases.");
    }

    // 3) Sort by qualityScore (descending)
    validated.sort((a, b) => b.qualityScore - a.qualityScore);

    // 4) Return top K
    return validated.slice(0, topK);
  }
}
