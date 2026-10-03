import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineTool, redactEmails, type AgentProvider } from "./core";
import { runGeminiLoop } from "./providers/gemini";
import { runProviderChain } from "./providers";

const input = { system: "s", tools: [], history: [{ role: "user" as const, content: "hi" }] };
const provider = (id: AgentProvider["id"], run: AgentProvider["run"]): AgentProvider => ({ id, model: "m", run });
const done = { text: "ok", steps: 1, usage: { inputTokens: 1, outputTokens: 1 }, stopped: "done" as const };

describe("runProviderChain", () => {
  it("uses the first provider that works", async () => {
    const second = vi.fn(async () => done);
    const result = await runProviderChain([provider("gemini", async () => done), provider("anthropic", second)], input);
    expect(result.provider).toBe("gemini");
    expect(second).not.toHaveBeenCalled();
  });

  it("falls through to the next layer when one fails, and throws only when all do", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = provider("gemini", async () => { throw new Error("429 quota"); });
    expect((await runProviderChain([failing, provider("anthropic", async () => done)], input)).provider).toBe("anthropic");
    await expect(runProviderChain([failing], input)).rejects.toThrow("429");
    await expect(runProviderChain([], input)).rejects.toThrow();
  });
});

describe("redactEmails", () => {
  it("hides all but the first letter before the @", () => {
    expect(redactEmails('{"owner":"jane.doe@clinic.ph"}')).toBe('{"owner":"j***@clinic.ph"}');
  });
});

describe("runGeminiLoop", () => {
  it("calls a function, returns its redacted result to the model, then answers", async () => {
    const tool = defineTool({ name: "who", description: "d", input: z.object({}), run: async () => ({ email: "owner@x.ph" }) });
    const sent: unknown[] = [];
    const replies = [
      { functionCalls: [{ name: "who", args: {}, id: "1" }], candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "who", args: {} } }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 } },
      { functionCalls: undefined, text: "Done.", candidates: [{ finishReason: "STOP" }], usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 3 } },
    ];
    let call = 0;
    const ai = { models: { generateContent: async (params: { contents: unknown }) => { sent.push(structuredClone(params.contents)); return replies[call++]; } } } as unknown as Parameters<typeof runGeminiLoop>[0];
    const result = await runGeminiLoop(ai, "m", { ...input, tools: [tool] });
    expect(result).toMatchObject({ text: "Done.", stopped: "done", steps: 2, usage: { inputTokens: 11, outputTokens: 5 } });
    expect(JSON.stringify(sent[1])).toContain("o***@x.ph");
    expect(JSON.stringify(sent[1])).not.toContain("owner@x.ph");
  });
});
