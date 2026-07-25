import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SymbolicEntityMapItem } from "../domain/copilot-context-builder.js";
import {
  resolveCopilotReferences,
  RawReferenceItem,
} from "../domain/copilot-reference-resolver.js";

describe("CopilotReferenceResolver Unit Tests (WP-02)", () => {
  const sampleSymbolicMap: Record<string, SymbolicEntityMapItem> = {
    project: {
      type: "project",
      id: "64f000000000000000000001",
      label: "Alpha SaaS Platform",
    },
    ms_1: {
      type: "milestone",
      id: "64f000000000000000000010",
      label: "v1.0 Launch Milestone",
    },
    ms_2: {
      type: "milestone",
      id: "64f000000000000000000011",
      label: "v2.0 Beta Milestone",
    },
    task_1: {
      type: "task",
      id: "64f000000000000000000100",
      label: "Build Authentication API",
    },
    task_2: {
      type: "task",
      id: "64f000000000000000000101",
      label: "Configure MongoDB Indexing",
    },
  };

  it("1. Resolves valid task reference correctly", () => {
    const raw: RawReferenceItem[] = [{ type: "task", ref: "task_1" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 1);
    assert.deepStrictEqual(result.references[0], {
      type: "task",
      id: "64f000000000000000000100",
      label: "Build Authentication API",
    });
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("2. Resolves valid milestone reference correctly", () => {
    const raw: RawReferenceItem[] = [{ type: "milestone", ref: "ms_1" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 1);
    assert.deepStrictEqual(result.references[0], {
      type: "milestone",
      id: "64f000000000000000000010",
      label: "v1.0 Launch Milestone",
    });
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("3. Resolves valid project reference correctly", () => {
    const raw: RawReferenceItem[] = [{ type: "project", ref: "project" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 1);
    assert.deepStrictEqual(result.references[0], {
      type: "project",
      id: "64f000000000000000000001",
      label: "Alpha SaaS Platform",
    });
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("4. Unknown symbolic ref (e.g. task_999) is stripped and increments unmappedReferenceCount", () => {
    const raw: RawReferenceItem[] = [{ type: "task", ref: "task_999" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 0);
    assert.equal(result.unmappedReferenceCount, 1);
  });

  it("5. Type mismatch (ref: task_1 claimed as milestone) is stripped and increments unmappedReferenceCount", () => {
    const raw: RawReferenceItem[] = [{ type: "milestone", ref: "task_1" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 0);
    assert.equal(result.unmappedReferenceCount, 1);
  });

  it("6. Mixed valid and invalid references preserve valid refs and count invalid ones", () => {
    const raw: RawReferenceItem[] = [
      { type: "task", ref: "task_1" },
      { type: "task", ref: "task_999" }, // invalid ref
      { type: "milestone", ref: "task_2" }, // invalid type mismatch
      { type: "milestone", ref: "ms_2" },
    ];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 2);
    assert.equal(result.references[0]!.id, "64f000000000000000000100");
    assert.equal(result.references[1]!.id, "64f000000000000000000011");
    assert.equal(result.unmappedReferenceCount, 2);
  });

  it("7. Preserves first-occurrence order of valid references", () => {
    const raw: RawReferenceItem[] = [
      { type: "task", ref: "task_2" },
      { type: "milestone", ref: "ms_1" },
      { type: "task", ref: "task_1" },
    ];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 3);
    assert.equal(result.references[0]!.label, "Configure MongoDB Indexing");
    assert.equal(result.references[1]!.label, "v1.0 Launch Milestone");
    assert.equal(result.references[2]!.label, "Build Authentication API");
  });

  it("8. Deduplicates duplicate valid references without incrementing unmappedReferenceCount", () => {
    const raw: RawReferenceItem[] = [
      { type: "task", ref: "task_1" },
      { type: "task", ref: "task_1" },
      { type: "task", ref: "task_1" },
    ];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 1);
    assert.equal(result.references[0]!.id, "64f000000000000000000100");
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("9. Handles null, undefined, or empty raw input array gracefully", () => {
    assert.deepStrictEqual(resolveCopilotReferences(null, sampleSymbolicMap), {
      references: [],
      unmappedReferenceCount: 0,
    });

    assert.deepStrictEqual(resolveCopilotReferences(undefined, sampleSymbolicMap), {
      references: [],
      unmappedReferenceCount: 0,
    });

    assert.deepStrictEqual(resolveCopilotReferences([], sampleSymbolicMap), {
      references: [],
      unmappedReferenceCount: 0,
    });
  });

  it("10. AI cannot inject a raw ObjectId as a symbolic ref string", () => {
    const raw: RawReferenceItem[] = [{ type: "task", ref: "64f000000000000000000100" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 0);
    assert.equal(result.unmappedReferenceCount, 1);
  });

  it("11. AI cannot override server-authoritative label or ID", () => {
    // Malicious attempt to pass extra properties in input object
    const raw = [
      { type: "task", ref: "task_1", id: "EVIL_ID", label: "HACKED_LABEL" } as unknown as RawReferenceItem,
    ];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    assert.equal(result.references.length, 1);
    assert.equal(result.references[0]!.id, "64f000000000000000000100");
    assert.equal(result.references[0]!.label, "Build Authentication API");
  });

  it("12. Handles malformed or non-string input objects in array", () => {
    const raw: unknown[] = [
      null,
      undefined,
      { type: "task" }, // missing ref
      { ref: "task_1" }, // missing type
      123,
      "task_1",
    ];
    const result = resolveCopilotReferences(raw as RawReferenceItem[], sampleSymbolicMap);

    assert.equal(result.references.length, 0);
    assert.equal(result.unmappedReferenceCount, 6);
  });

  it("13. Does not mutate input array or input symbolicMap", () => {
    const rawInput: RawReferenceItem[] = [
      { type: "task", ref: "task_1" },
      { type: "task", ref: "task_999" },
    ];
    const rawSnapshot = JSON.stringify(rawInput);
    const mapSnapshot = JSON.stringify(sampleSymbolicMap);

    resolveCopilotReferences(rawInput, sampleSymbolicMap);

    assert.equal(JSON.stringify(rawInput), rawSnapshot, "Input array must not be mutated");
    assert.equal(JSON.stringify(sampleSymbolicMap), mapSnapshot, "Symbolic map must not be mutated");
  });

  it("14. Resolved output items contain no internal symbolic ref field", () => {
    const raw: RawReferenceItem[] = [{ type: "task", ref: "task_1" }];
    const result = resolveCopilotReferences(raw, sampleSymbolicMap);

    const keys = Object.keys(result.references[0]!);
    assert.deepStrictEqual(keys.sort(), ["id", "label", "type"].sort());
  });
});
