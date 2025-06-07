# LLM Testing Pipeline

## Overview

This project demonstrates a two‐agent system designed to automatically generate and validate increasingly challenging test cases for any locally hosted LLM (for example, a banking customer‐service chatbot). Instead of manually brainstorming edge‐case scenarios, the pipeline leverages LLMs to:

1. **Generate niche, real‐world prompts** that a user might ask in a specific domain (HardPromptAgent).  
2. **Score each prompt for difficulty and realism** (PromptQualityValidator).  
3. **Select the top “hardest” test cases** most likely to expose limitations or failures in the target model (AgentOrchestrator).  

A Next.js frontend exposes a single page (`/orchestrate`) where you can click “Run Agents” and watch each stage output its results. Behind the scenes, an API route (`/api/orchestrate`) calls the orchestrator to drive the pipeline end‐to‐end.

---

## Why This Matters for Businesses Running Local LLMs

Organizations operating their own local or on‐premise LLMs often struggle to find sufficient, high‐quality edge‐case prompts to thoroughly evaluate system robustness. In any domain—such as banking, healthcare, legal, or e-commerce—models must correctly handle:

- **Regulatory or compliance edge cases** (e.g., specific tax rules, data privacy constraints).  
- **Niche product or service details** (e.g., specialized procedures, uncommon workflows).  
- **Complex “what‐if” scenarios** (e.g., uncommon user licenses, multi‐step processes).

Manually authoring these prompts is time‐consuming, error‐prone, and rarely covers every corner case. By adopting a two‐agent LLM pipeline:

- **Scale & Coverage**: The HardPromptAgent can produce dozens of diverse, high‐difficulty scenarios in seconds.  
- **Efficiency**: PromptQualityValidator immediately filters out low‐value or ambiguous prompts, saving manual QA time.  
- **Continuous Improvement**: Each run can increment a “difficulty level,” so the system drives itself toward ever more advanced cases.  
- **Reduced Manual Effort**: Teams can focus on reviewing and prioritizing outputs rather than brainstorming edge cases.  

Ultimately, businesses can more confidently deploy or update local LLMs—knowing they’ve been stress‐tested against a broad spectrum of realistic, high‐impact scenarios.

---

## Agent Details & Workflow

### HardPromptAgent

- **Role**: Generate a batch of domain‐specific test cases at the current `difficultyLevel`.  
- **Inputs**:  
  - `initialDifficulty` (integer; starts at 1)  
  - `targetCount` (number of candidates per batch; e.g., 5)  
- **Behavior**:
  1. Builds a prompt instructing the LLM to output exactly `targetCount` JSON objects.  
  2. Each object must include:  
     - `"input"` (a realistic, niche question in the chosen domain)  
     - `"expected_output"` (the concise, correct response that a perfect model would give)  
  3. Tags each object with `difficulty: currentDifficultyLevel`.  
  4. After generating, increments `difficultyLevel++` so the next run produces even harder scenarios.
- **Key Benefit**: Automated creativity—no manual brainstorming. Each iteration drives deeper into edge cases.

### PromptQualityValidator

- **Role**: Score each prompt’s “failure potential” (how hard & realistic).  
- **Inputs**: `TestCase[]` from HardPromptAgent  
- **Behavior**:
  1. For each `TestCase` individually:  
     - Prompt LLM: “Here’s one question + expected answer + difficulty. Give me exactly one JSON object with fields:  
       - `qualityScore`: integer 1–10  
       - `justification`: one‐sentence explanation.”  
     - Uses a small `maxTokensPerCandidate` (e.g. 150) to avoid truncation.  
     - Extracts the first `{ … }` from the response, parses it, and attaches `qualityScore` & `justification` to the candidate.  
  2. Returns an array of `ValidatedCase[]` preserving the original `difficulty`.
- **Key Benefit**: Reliable parsing. By dealing with one JSON object at a time, bracket‐matching errors are eliminated. Validates clarity and realism per prompt.

### AgentOrchestrator

- **Role**: Coordinate generation & validation, then pick the “hardest” prompts.  
- **Inputs**:  
  - `initialDifficulty` (e.g. 1)  
  - `batchSize` (e.g. 5)  
- **Behavior**:
  1. Calls `HardPromptAgent.generateBatch()` → `TestCase[]` (all share the same difficulty).  
  2. Calls `PromptQualityValidator.validateBatch(...)` → `ValidatedCase[]`.  
  3. Sorts by `qualityScore` descending.  
  4. Returns the top K (e.g. 3) “hardest” cases.  
- **Key Benefit**: Automates selection of the most challenging test cases, ready for manual review or direct failure testing against a local LLM.

---

## Impact & Business Value

1. **Comprehensive Edge‐Case Coverage**  
   - Instead of relying on sporadic user feedback or ad-hoc QA, teams gain an automated way to surface rare but high-impact scenarios in any domain (e.g., banking regulations, healthcare protocols, legal compliance).  
   - Businesses running local LLMs can iterate rapidly on model improvements, using these edge cases to measure actual failure rates.

2. **Reduced Manual Overhead**  
   - QA engineers and product teams no longer need to handcraft dozens of test prompts.  
   - The pipeline generates hundreds of scenarios in minutes—an immediate boost in efficiency.

3. **Continuous Improvement & Regression Testing**  
   - By incrementing `difficultyLevel` on each run, the system continually pushes farther into niche territory.  
   - At every new model version, re-run the pipeline. If the model fails on previously “passed” prompts, regressions are immediately evident.

4. **Localized LLM Evaluation**  
   - Companies that host LLMs on-premise (for privacy, cost, or compliance reasons) can adapt this framework to any domain by changing the HardPromptAgent’s instructions.  
   - The same pattern—generate realistic edge cases, validate them, pick the hardest—applies universally.

5. **Actionable Insights**  
   - Each validated case includes a one‐sentence justification from the LLM, providing quick rationale for why a prompt is “hard.”  
   - Teams can prioritize manual review or fine-tuning based on justification content, rather than sifting through hundreds of raw prompts blindly.

---

## Getting Started

1. **Clone the Repo**  
   ```bash
   git clone https://github.com/<your-org>/llm-test-agent.git
   cd llm-test-agent

Install Dependencies

bash
Copy
Edit
npm install
# or
yarn
Configure Environment Variables
– For OpenAI (GPT-3.5/4):

bash
Copy
Edit
export OPENAI_API_KEY="sk-…your_key…"
– For Vercel’s v0 (optional):

bash
Copy
Edit
export VERCEL_AI_API_KEY="vercel-…your_key…"
Ensure you configure these in Vercel’s dashboard under Settings → Environment Variables for production deployments.

Run Locally

bash
Copy
Edit
npm run dev
Visit http://localhost:3000/orchestrate. Click “Run Agents”, and watch each section populate:

HardPromptAgent Output: Raw prompts with difficulty levels.

PromptQualityValidator Output: Same prompts with qualityScore & justification.

Top 3 Hardest Test Cases: Highlighted for quick review.

Deploy to Vercel

Push to your Git provider (GitHub, GitLab, etc.).

Import the repo into Vercel (auto-detects Next.js).

Set OPENAI_API_KEY (or VERCEL_AI_API_KEY) under Project Settings → Environment Variables.

Trigger a deploy. Access /orchestrate on your Vercel domain.

Extending and Customizing
Domain Flexibility

Swap out HardPromptAgent’s prompt to target any domain (e.g., healthcare QA, legal advice bots, e-commerce support).

Validator logic remains the same: per-object scoring avoids truncation issues.

Batch Size & Difficulty Schedule

Change batchSize in AgentOrchestrator to generate more candidates per cycle.

Tweak how difficultyLevel increments: e.g., double it each run, or derive from external metrics (failure rates).

Validation Criteria

Modify PromptQualityValidator to add more fields: e.g., “clarityScore,” “bizImpactScore,” or categorize by topic.

You could also use a secondary LLM or human-in-the-loop to validate top K for compliance accuracy.

Automated Failure Testing

Insert a new agent that actually calls your target LLM on each input.

Compare the model’s response vs expected_output; mark “fail” if mismatch or partial.

Use pass/fail statistics to identify systematic weaknesses in the model’s knowledge.

Conclusion
By chaining two specialized LLM agents—one that actively generates niche domain-specific prompts and another that validates & scores them—this pipeline automates a significant portion of QA for locally hosted LLMs. The approach:

Scales: Create hundreds of nuanced edge-case scenarios in minutes.

Adapts: Easily retarget to any domain.

Focuses: Only surfaces the highest-difficulty, most realistic cases for manual review or regression testing.

For businesses hosting their own LLMs, this means faster iteration, stronger regression guarantees, and fewer surprises in production.
