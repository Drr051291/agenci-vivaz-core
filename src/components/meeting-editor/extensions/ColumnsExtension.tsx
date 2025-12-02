import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const ColumnGroupComponent = ({ node }: any) => {
  const columnCount = node.attrs.columnCount || 2;

  return (
    <NodeViewWrapper className="column-group-wrapper">
      <div 
        className="column-group-container"
        style={{ 
          display: 'flex',
          gap: '1.5rem',
          width: '100%',
        }}
      >
        <NodeViewContent className="column-group-content" />
      </div>
    </NodeViewWrapper>
  );
};

const ColumnComponent = () => {
  return (
    <NodeViewWrapper className="column-wrapper" style={{ flex: 1, minWidth: 0 }}>
      <NodeViewContent className="column-content" />
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
      style: 'display: flex; gap: 1.5rem; width: 100%;'
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
      style: 'flex: 1; min-width: 0;'
    }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColumnComponent);
  },
});
