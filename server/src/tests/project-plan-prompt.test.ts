import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { promptRegistry } from "../ai/prompts/registry/prompt.registry.js";
import { initializeAI } from "../ai/init.js";

describe("Project Plan Prompt Definition Unit Tests", () => {
  before(() => {
    promptRegistry.clear();
    initializeAI();
  });

  it("1. Prompt is registered in promptRegistry under name 'project-plan'", () => {
    const template = promptRegistry.get("project-plan");
    assert.ok(template);
    assert.equal(template.metadata.name, "project-plan");
    assert.equal(template.metadata.version, "1.0.0");
  });

  it("2. Prompt contains system, intent, and schema sections", () => {
    const template = promptRegistry.get("project-plan");
    const sectionIdentifiers = template.sections.map((s) => s.identifier);
    assert.ok(sectionIdentifiers.includes("system"));
    assert.ok(sectionIdentifiers.includes("intent"));
    assert.ok(sectionIdentifiers.includes("schema"));
  });

  it("3. Prompt system section contains key safety and planning guidelines", () => {
    const template = promptRegistry.get("project-plan");
    const systemSection = template.sections.find((s) => s.identifier === "system");
    assert.ok(systemSection);
    const content = systemSection.content;

    assert.ok(content.includes("Directed Acyclic Graph"));
    assert.ok(content.includes("NO CYCLES"));
    assert.ok(content.includes("NO SELF-DEPENDENCIES"));
    assert.ok(content.includes("25 tasks"));
    assert.ok(content.includes("5 milestones"));
  });

  it("4. Prompt schema section describes tasks and milestones JSON output", () => {
    const template = promptRegistry.get("project-plan");
    const schemaSection = template.sections.find((s) => s.identifier === "schema");
    assert.ok(schemaSection);
    const content = schemaSection.content;

    assert.ok(content.includes("milestones"));
    assert.ok(content.includes("tasks"));
    assert.ok(content.includes("dependencies"));
    assert.ok(content.includes("milestoneRef"));
  });
});
