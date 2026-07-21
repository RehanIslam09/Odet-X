const fs = require('fs');
console.log(fs.readFileSync('src/tests/project-ai.test.ts', 'utf8').split('\n').slice(54, 58).join('\n'));
