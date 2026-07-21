const fs = require('fs');

const testFiles = ['src/tests/project-summary-ai.test.ts', 'src/tests/task-ai.test.ts'];
for (const fp of testFiles) {
  if (!fs.existsSync(fp)) continue;
  let content = fs.readFileSync(fp, 'utf-8');
  content = content.replace(/name:\s*"AI Summary Test User"/g, 'username: "ai_summary_test_user", name: "AI Summary Test User"');
  content = content.replace(/name:\s*"AI Label Test User"/g, 'username: "ai_label_test_user", name: "AI Label Test User"');
  fs.writeFileSync(fp, content, 'utf-8');
}
