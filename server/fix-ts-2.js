import fs from 'fs';
function regexReplaceInFile(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}

regexReplaceInFile('src/ai/ai.service.ts', /from '\.\/types';/g, "from './types.js';");
regexReplaceInFile('src/ai/providers/anthropic.provider.ts', /from '\.\.\/types';/g, "from '../types.js';");
regexReplaceInFile('src/ai/providers/base.provider.ts', /from '\.\.\/types';/g, "from '../types.js';");
regexReplaceInFile('src/tests/task-concurrency.test.ts', /task\.__v/g, "(task as any).__v");
