const fs = require('fs');

const testFiles = ['src/tests/project-ai.test.ts', 'src/tests/project-summary-ai.test.ts', 'src/tests/task-ai.test.ts'];
for (const fp of testFiles) {
  if (!fs.existsSync(fp)) continue;
  let content = fs.readFileSync(fp, 'utf-8');
  content = content.replace(/name:\s*"AI Test User"/g, 'username: "ai_test_user", name: "AI Test User"');
  fs.writeFileSync(fp, content, 'utf-8');
}
