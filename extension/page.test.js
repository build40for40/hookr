import test from 'node:test';
import assert from 'node:assert/strict';
import { tabNotice } from './page.js';

const article = { title: 'Before you turn on your AI agent', url: 'https://katebmarshall.substack.com/p/before', text: 'Every major AI company now offers a personal AI agent.' };

test('staying on the hooked page shows no notice', () => {
  assert.equal(tabNotice(article, { ...article }), null);
});

test('another readable page is offered, even before anything was hooked', () => {
  const other = { ...article, url: 'https://example.com/essay' };
  assert.equal(tabNotice(article, other), 'new');
  assert.equal(tabNotice(null, other), 'new');
});

test('an unreadable tab only gets a notice when a post is showing', () => {
  assert.equal(tabNotice(article, null), 'unreadable');
  assert.equal(tabNotice(article, { ...article, url: 'https://example.com/', text: '' }), 'unreadable');
  assert.equal(tabNotice(null, null), null);
});
