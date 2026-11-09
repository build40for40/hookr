import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROMPT } from './prompt.js';

test('the Worker sends the approved prompt v1 word for word', () => {
  const doc = readFileSync(new URL('../prompts/generate-post-v1.md', import.meta.url), 'utf8');
  const approved = doc.match(/## System instruction\n\n```text\n([\s\S]*?)\n```/)[1];
  assert.equal(PROMPT, approved);
});
