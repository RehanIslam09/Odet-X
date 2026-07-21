const fs = require('fs');

function fixTests() {
  const testFiles = ['src/tests/project-ai.test.ts', 'src/tests/project-summary-ai.test.ts', 'src/tests/task-ai.test.ts'];
  for (const fp of testFiles) {
    if (!fs.existsSync(fp)) continue;
    let content = fs.readFileSync(fp, 'utf-8');
    
    content = content.replace(/promptVersion:\s*'1\.0'\s*\}\s*as any\);/g, "promptVersion: '1.0' } } as any);");
    
    fs.writeFileSync(fp, content, 'utf-8');
  }
}

fixTests();
