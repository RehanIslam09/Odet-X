import fs from 'fs';

function regexReplaceInFile(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}

const testFiles = ['src/tests/project-ai.test.ts', 'src/tests/project-summary-ai.test.ts', 'src/tests/task-ai.test.ts'];
for (const fp of testFiles) {
  regexReplaceInFile(fp, /\} \} as any\s+\}\);/g, "} as any);");
}
