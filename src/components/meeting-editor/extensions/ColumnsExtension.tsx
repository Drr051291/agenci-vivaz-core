import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const ColumnGroupComponent = ({ node }: any) => {
  const columnCount = node.content?.childCount || 2;

  return (
    <NodeViewWrapper className="column-group my-4">
      <div 
        className="flex gap-4 border border-border rounded-lg p-4 bg-muted/20"
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: '1rem'
        }}
      >
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

const ColumnComponent = () => {
  return (
    <NodeViewWrapper className="column min-w-0">
      <div className="column-content h-full border-r border-border/50 last:border-r-0 pr-4 last:pr-0">
        <NodeViewContent className="content prose prose-sm max-w-none" />
      </div>
    </NodeViewWrapper>
  );
};

export const ColumnGroup = Node.create({
  name: 'columnGroup',
  group: 'block',
  content: 'column+',
  defining: true,
  isolating: true,
  
  addAttributes() {
    return {
      columnCount: {
        default: 2,
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
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-type': 'column-group',
      class: 'column-group',
      style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;'
    }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnGroupComponent);
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,
  isolating: true,
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-type': 'column',
      class: 'column',
      style: 'min-width: 0;'
    }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnComponent);
  },
});
