import { readFile } from 'node:fs/promises';
import { evaluateOutput } from './index.js';

// JSON on stdin or a local run-record path. No credentials or network needed.
try {
  const input = await readFile(process.argv[2] ?? '/dev/stdin', 'utf8');
  const report = evaluateOutput(JSON.parse(input));
  console.log(JSON.stringify(report, null, 2));
  // Distinguish an actual failure from an incomplete human/model review.
  process.exitCode = report.readiness === 'fail' ? 1 : report.readiness === 'needs_review' ? 2 : 0;
} catch (error) {
  console.error(`Evaluation input error: ${error.message}`);
  process.exitCode = 3;
}
