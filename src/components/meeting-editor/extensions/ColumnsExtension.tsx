import { Node, mergeAttributes } from '@tiptap/core';

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
      class: 'column-block',
    }), 0];
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
    }), 0];
  },
});
