import fs from 'fs';
import path from 'path';

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix imports starting with '.' or '..' by adding .js if not present
  // Regex: import ... from '(./|../)...' but not if it already ends in .js or .json
  content = content.replace(/(import\s+.*?from\s+['"]\.\.?\/[^'"]+?)(?<!\.js)(?<!\.json)(['"])/g, '$1.js$2');
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      fixImportsInFile(fullPath);
    }
  }
}

const targetDirs = [
  './src/ai',
  './src/services',
  './src/tests',
  './src/validators'
];

targetDirs.forEach(dir => processDirectory(dir));

console.log("Import extensions fixed.");
