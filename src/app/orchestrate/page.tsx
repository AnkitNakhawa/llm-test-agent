// app/orchestrate/page.tsx
"use client";

import { useState } from "react";

type BankTestCase = {
  input: string;
  expected_output: string;
  difficulty: number;
};

type ValidatedCase = BankTestCase & {
  qualityScore: number;
  justification: string;
};

export default function OrchestratePage() {
  const [data, setData] = useState<{
    rawCandidates: BankTestCase[];
    validated: ValidatedCase[];
    topCases: ValidatedCase[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOrchestration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orchestrate");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center text-white">Bank Chatbot Agent Pipeline</h1>
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={runOrchestration}
        disabled={loading}
      >
        {loading ? "Running Agents…" : "Run Agents"}
      </button>
      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <div className="space-y-8">
          {/* =========== HardPromptAgent Output =========== */}
          <section>
            <h2 className="text-2xl font-semibold mb-2 text-white">HardPromptAgent Output</h2>
            <div className="space-y-4">
              {data.rawCandidates.map((c, idx) => (
                <div key={idx} className="p-4 border rounded shadow-sm bg-white">
                  <p className="font-medium text-gray-800">Question:</p>
                  <p className="text-gray-800">{c.input}</p>

                  <p className="font-medium mt-2 text-gray-800">Expected Answer:</p>
                  <p className="text-gray-800">{c.expected_output}</p>

                  <p className="mt-2 text-sm text-gray-500">Difficulty Level: {c.difficulty}</p>
                </div>
              ))}
            </div>
          </section>

          {/* =========== PromptQualityValidator Output =========== */}
          <section>
            <h2 className="text-2xl font-semibold mb-2 text-white">PromptQualityValidator Output</h2>
            <div className="space-y-4">
              {data.validated.map((v, idx) => (
                <div key={idx} className="p-4 border rounded shadow-sm bg-white">
                  <p className="font-medium text-gray-800">Question:</p>
                  <p className="text-gray-800">{v.input}</p>

                  <p className="font-medium mt-2 text-gray-800">Expected Answer:</p>
                  <p className="text-gray-800">{v.expected_output}</p>

                  <p className="mt-2 text-sm text-gray-500">Difficulty: {v.difficulty}</p>
                  <p className="mt-1 text-sm text-gray-700">Score: {v.qualityScore}</p>
                  <p className="mt-1 text-sm text-gray-600">Justification: {v.justification}</p>
                </div>
              ))}
            </div>
          </section>

          {/* =========== Top 3 Hardest Cases =========== */}
          <section>
            <h2 className="text-2xl font-semibold mb-2 text-white">Top 3 Hardest Test Cases</h2>
            <div className="space-y-4">
              {data.topCases.map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 border-l-4 border-red-500 bg-red-50 rounded shadow-sm"
                >
                  <p className="font-medium text-lg text-gray-800">
                    #{idx + 1}: {t.input}
                  </p>
                  <p className="mt-1 text-gray-800">Expected: {t.expected_output}</p>
                  <p className="mt-1 text-sm text-gray-700">Quality Score: {t.qualityScore}</p>
                  <p className="mt-1 text-sm text-gray-500">Difficulty: {t.difficulty}</p>
                  <p className="mt-1 text-sm text-gray-800">Justification: {t.justification}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
