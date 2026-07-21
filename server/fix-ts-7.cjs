const fs = require('fs');

function replace(fp, regex, replacement) {
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(fp, content, 'utf8');
  }
}

replace('src/ai/ai.service.ts', /'fast-json'/g, 'AIModelTier.FAST_JSON');
replace('src/ai/ai.service.ts', /'deep-context'/g, 'AIModelTier.DEEP_CONTEXT');
replace('src/ai/ai.service.ts', /"fast-json"/g, 'AIModelTier.FAST_JSON');
replace('src/ai/ai.service.ts', /"deep-context"/g, 'AIModelTier.DEEP_CONTEXT');

replace('src/ai/tests/execution.test.ts', /tier: "fast-json"/g, 'tier: AIModelTier.FAST_JSON');
replace('src/ai/tests/execution.test.ts', /tier: 'fast-json'/g, 'tier: AIModelTier.FAST_JSON');
// Add import for AIModelTier in tests
let execContent = fs.readFileSync('src/ai/tests/execution.test.ts', 'utf8');
if (!execContent.includes('AIModelTier')) {
  execContent = execContent.replace(/import \{.*?\} from '\.\.\/types\/index\.js';/g, "import { AIModelTier } from '../types/index.js';");
}
fs.writeFileSync('src/ai/tests/execution.test.ts', execContent);

// Fix services
const services = ['src/services/project-ai.service.ts', 'src/services/project-summary-ai.service.ts', 'src/services/task-ai.service.ts'];
for (const s of services) {
  replace(s, /tier: 'deep-context'/g, 'tier: AIModelTier.DEEP_CONTEXT');
  replace(s, /tier: "deep-context"/g, 'tier: AIModelTier.DEEP_CONTEXT');
  
  // Add AIModelTier to ai imports
  let content = fs.readFileSync(s, 'utf8');
  if (!content.includes('AIModelTier')) {
    content = content.replace(/import \{ aiService \} from/g, "import { aiService } from");
    content = `import { AIModelTier } from '../ai/types/index.js';\n` + content;
  }
  fs.writeFileSync(s, content);
}
