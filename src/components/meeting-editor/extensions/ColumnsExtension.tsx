import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { GripVertical } from 'lucide-react';

const ColumnGroupComponent = ({ node, updateAttributes }: any) => {
  const columnCount = node.attrs.columnCount || 2;
  const columnWidths = node.attrs.columnWidths || Array(columnCount).fill(100 / columnCount);

  return (
    <NodeViewWrapper className="column-group my-4">
      <div 
        className="flex gap-4 border border-border rounded-lg p-4 bg-muted/30"
        style={{ display: 'flex' }}
      >
        {Array.from({ length: columnCount }).map((_, index) => (
          <div
            key={index}
            className="column-item flex-1 min-w-0"
            style={{ 
              flex: `0 0 ${columnWidths[index]}%`,
              paddingRight: index < columnCount - 1 ? '1rem' : '0',
              borderRight: index < columnCount - 1 ? '1px solid hsl(var(--border))' : 'none'
            }}
            data-column-index={index}
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
};

const ColumnComponent = ({ node }: any) => {
  return (
    <NodeViewWrapper className="column" data-drag-handle>
      <div className="column-content">
        <NodeViewContent className="content" />
      </div>
    </NodeViewWrapper>
  );
};

export const ColumnGroup = Node.create({
  name: 'columnGroup',
  group: 'block',
  content: 'column+',
  
  addAttributes() {
    return {
      columnCount: {
        default: 2,
      },
      columnWidths: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-group"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column-group' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnGroupComponent);
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnComponent);
  },
});
