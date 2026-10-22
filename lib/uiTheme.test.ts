import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDocumentTheme } from './uiTheme.ts';

test('applyDocumentTheme is a no-op without a DOM', () => {
  assert.doesNotThrow(() => applyDocumentTheme('dark'));
});

test('applyDocumentTheme sets dark on document (no admin override)', () => {
  const root = {
    dataset: {} as DOMStringMap,
    style: { colorScheme: '' } as CSSStyleDeclaration,
  };
  const original = globalThis.document;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { documentElement: root },
  });
  try {
    applyDocumentTheme('dark');
    assert.equal(root.dataset.theme, 'dark');
    assert.equal(root.style.colorScheme, 'dark');
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: original,
    });
  }
});
