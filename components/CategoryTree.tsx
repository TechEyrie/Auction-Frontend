'use client';

import { useEffect, useState } from 'react';
import './category-tree.css';

export type CategoryTreeNode = {
  key: string;
  name: string;
};

type CategoryTreeProps = {
  roots: CategoryTreeNode[];
  childrenOf: (rootKey: string) => CategoryTreeNode[];
  selectedKey: string;
  onSelect: (key: string) => void;
  allLabel?: string;
  showAll?: boolean;
  className?: string;
};

export function parentRootKeyFor(
  roots: CategoryTreeNode[],
  childrenOf: (rootKey: string) => CategoryTreeNode[],
  key: string,
): string | null {
  if (!key) return null;
  for (const root of roots) {
    if (childrenOf(root.key).some((child) => child.key === key)) {
      return root.key;
    }
  }
  return null;
}

type CategoryTreeExpandControlProps = {
  expanded: boolean;
  onToggle: () => void;
  label: string;
};

export function CategoryTreeExpandControl({ expanded, onToggle, label }: CategoryTreeExpandControlProps) {
  return (
    <button
      type="button"
      className="category-tree__expand"
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg className="category-tree__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function CategoryTree({
  roots,
  childrenOf,
  selectedKey,
  onSelect,
  allLabel = 'All categories',
  showAll = true,
  className = '',
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const parentKey = parentRootKeyFor(roots, childrenOf, selectedKey);
    if (!parentKey) return;
    setExpanded((prev) => {
      if (prev.has(parentKey)) return prev;
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
  }, [selectedKey, roots, childrenOf]);

  function toggleExpanded(rootKey: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rootKey)) next.delete(rootKey);
      else next.add(rootKey);
      return next;
    });
  }

  const treeClass = ['category-tree', className].filter(Boolean).join(' ');

  return (
    <nav className={treeClass} aria-label="Categories">
      {showAll && (
        <button
          type="button"
          className={`category-tree__row category-tree__row--all${selectedKey === '' ? ' category-tree__row--selected' : ''}`}
          aria-pressed={selectedKey === ''}
          onClick={() => onSelect('')}
        >
          {allLabel}
        </button>
      )}
      {roots.map((root) => {
        const kids = childrenOf(root.key);
        const rootSelected = selectedKey === root.key;
        const isOpen = expanded.has(root.key);
        return (
          <div key={root.key} className="category-tree__group">
            <div className="category-tree__root-line">
              <button
                type="button"
                className={`category-tree__row category-tree__row--root${rootSelected ? ' category-tree__row--selected' : ''}`}
                aria-pressed={rootSelected}
                onClick={() => onSelect(root.key)}
              >
                {root.name}
              </button>
              {kids.length > 0 && (
                <CategoryTreeExpandControl
                  expanded={isOpen}
                  onToggle={() => toggleExpanded(root.key)}
                  label={root.name}
                />
              )}
            </div>
            {kids.length > 0 && isOpen && (
              <ul className="category-tree__children">
                {kids.map((child) => {
                  const childSelected = selectedKey === child.key;
                  return (
                    <li key={child.key} className="category-tree__child-wrap">
                      <button
                        type="button"
                        className={`category-tree__row category-tree__row--child${childSelected ? ' category-tree__row--selected' : ''}`}
                        aria-pressed={childSelected}
                        onClick={() => onSelect(child.key)}
                      >
                        {child.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
