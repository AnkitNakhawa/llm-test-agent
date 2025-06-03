// test-two-agent-system.ts
import { AgentOrchestrator } from "./lib/AgentOrchestrator.ts";

(async () => {
  // 1) Create an orchestrator with initial difficulty=1, batchSize=5, maxAttempts=3
  const orchestrator = new AgentOrchestrator(1, 5, 3);

  try {
    // 2) Run a single cycle, keeping the top 3 hardest prompts
    const topCases = await orchestrator.runCycle(3);

    console.log("\n✅ Top 3 hardest validated test cases:\n");
    for (const [i, c] of topCases.entries()) {
      console.log(`--- Case #${i + 1} (Score: ${c.qualityScore}) ---`);
      console.log("Question:", c.input);
      console.log("Answer:", c.expected_output);
      console.log("Difficulty Level:", c.difficulty);
      console.log("Justification:", c.justification);
      console.log();
    }
  } catch (err: any) {
    console.error("❌ Error in two‐agent system:", err.message || err);
    process.exit(1);
  }
})();
