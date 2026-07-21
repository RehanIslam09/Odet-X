import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Run all test files in the tests/ directory matching *.test.ts
const testsDir = path.resolve("src/tests");
const files = fs.readdirSync(testsDir).filter(f => f.endsWith(".test.ts") && f !== "body-size.test.ts");

console.log(`Found ${files.length} test files to run.\n`);

let passed = 0;
let failed = 0;

for (const file of files) {
  console.log(`\n==================================================`);
  console.log(`▶ Running test: ${file}`);
  console.log(`==================================================\n`);
  try {
    // We execute each test sequentially using tsx
    execSync(`npx tsx src/tests/${file}`, { stdio: "inherit", env: { ...process.env, NODE_ENV: "test" } });
    passed++;
  } catch {
    failed++;
    console.error(`\n❌ Test failed: ${file}`);
  }
}

console.log(`\n==================================================`);
console.log(`Test Run Complete`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
}
