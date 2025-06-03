// test-agent.ts
import { TestAgent } from "./lib/TestAgent.ts";

(async () => {
  // We don’t actually need a gold‐example for bank‐chatbot generation,
  // but we pass an empty placeholder.
  const gold = {
    input: "",
    expected_output: "",
  };

  const agent = new TestAgent(gold);

  try {
    const results = await agent.run();
    console.log("✅ Generated Bank‐Chatbot Test Cases:");
    console.log(JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error("❌ Error running TestAgent:", err.message || err);
    process.exit(1);
  }
})();
