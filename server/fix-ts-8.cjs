const fs = require('fs');

function addImport(file, importStr) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(importStr) && !content.includes('AIModelTier')) {
    content = `${importStr}\n` + content;
    fs.writeFileSync(file, content);
  } else if (!content.includes(importStr) && content.includes('import {') && content.includes('./types/index.js')) {
    // try to add to existing
    content = content.replace(/import \{(.*?)\} from '(\.\.?\/types\/index\.js)';/, (match, p1, p2) => {
      if (p1.includes('AIModelTier')) return match;
      return `import {${p1}, AIModelTier } from '${p2}';`;
    });
    fs.writeFileSync(file, content);
  }
}

addImport('src/ai/ai.service.ts', "import { AIModelTier } from './types/index.js';");
addImport('src/ai/tests/execution.test.ts', "import { AIModelTier } from '../types/index.js';");
addImport('src/services/project-ai.service.ts', "import { AIModelTier } from '../ai/types/index.js';");
addImport('src/services/project-summary-ai.service.ts', "import { AIModelTier } from '../ai/types/index.js';");
addImport('src/services/task-ai.service.ts', "import { AIModelTier } from '../ai/types/index.js';");
