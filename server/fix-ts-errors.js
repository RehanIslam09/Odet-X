import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, search, replacement) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.split(search).join(replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function regexReplaceInFile(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// 1. Anthropic provider
const anthropicPath = 'src/ai/providers/anthropic.provider.ts';
if (fs.existsSync(anthropicPath)) {
  let content = fs.readFileSync(anthropicPath, 'utf-8');
  content = content.replace(
    /const contentBlock = response\.content\[0\];\s+if \(contentBlock\.type !== 'text'\) {/,
    "const contentBlock = response.content[0];\n      if (!contentBlock) throw new AIProviderError('No content received from Anthropic');\n      if (contentBlock.type !== 'text') {"
  );
  content = content.replace(/let rawText = contentBlock\.text\.trim\(\);/, 'let rawText = (contentBlock as any).text.trim();');
  fs.writeFileSync(anthropicPath, content, 'utf-8');
}

// 2. Services
regexReplaceInFile('src/services/project-ai.service.ts', /\.filter\(s =>/g, '.filter((s: any) =>');
regexReplaceInFile('src/services/project-ai.service.ts', /const validTasksToCreate = \[\];/g, 'const validTasksToCreate: any[] = [];');

regexReplaceInFile('src/services/task-ai.service.ts', /\.filter\(s =>/g, '.filter((s: any) =>');

regexReplaceInFile('src/services/project-summary-ai.service.ts', /\{ aiSummary \}\)/g, '{ aiSummary } as any)');

// 3. Tests DB imports
const testFiles = ['project-ai.test.ts', 'project-summary-ai.test.ts', 'task-ai.test.ts'];
for (const f of testFiles) {
  const fp = `src/tests/${f}`;
  replaceInFile(fp, 'setupTestDB', 'setupTestDatabase');
  replaceInFile(fp, 'teardownTestDB', 'teardownTestDatabase');
  regexReplaceInFile(fp, /name: "(.*?)",\s+description: "(.*?)"\s+\}/g, 'name: "$1", description: "$2", emoji: "🚀", color: "blue" }');
  regexReplaceInFile(fp, /\{ projectId, title:/g, '{ projectId: projectId as any, title:');
  regexReplaceInFile(fp, /\{ name: "(.*?)" \}/g, '{ name: "$1", description: "Desc", emoji: "🚀", color: "blue" }');
}

// 4. Test updatedProject!.
replaceInFile('src/tests/project-ai.test.ts', 'assert.ok(updatedProject.tasks);', 'assert.ok(updatedProject!.tasks);');
replaceInFile('src/tests/project-ai.test.ts', 'assert.strictEqual(updatedProject.tasks.length', 'assert.strictEqual(updatedProject!.tasks!.length');
replaceInFile('src/tests/project-ai.test.ts', 'updatedProject.tasks[0]', 'updatedProject!.tasks![0]');

// 5. concurrency
regexReplaceInFile('src/tests/task-concurrency.test.ts', /task\.__v/g, '(task as any).__v');

console.log("TS fixes applied.");
