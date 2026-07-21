import fs from 'fs';

function fixTests() {
  const testFiles = ['src/tests/project-ai.test.ts', 'src/tests/project-summary-ai.test.ts', 'src/tests/task-ai.test.ts'];
  for (const fp of testFiles) {
    if (!fs.existsSync(fp)) continue;
    let content = fs.readFileSync(fp, 'utf-8');
    
    // First, let's fix the extra `} as any }` or `, } as any`
    content = content.replace(/metadata: \{([^}]+)\} \} as any/g, 'metadata: {$1} as any');
    // Just replace the whole object assignment
    // From: aiService.generateStructuredData = async () => ({
    // To: aiService.generateStructuredData = async () => ({
    // If it has a syntax error, we just replace `promptVersion: '1.0' } } as any` with `promptVersion: '1.0' } as any`
    content = content.replace(/promptVersion:\s*'1\.0'\s*\}\s*\}\s*as any/g, "promptVersion: '1.0' } as any");
    
    fs.writeFileSync(fp, content, 'utf-8');
  }
}

fixTests();
