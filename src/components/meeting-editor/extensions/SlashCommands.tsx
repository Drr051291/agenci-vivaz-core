import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { 
  Type, 
  Image as ImageIcon, 
  Youtube, 
  BarChart3,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: any;
  command: ({ editor, range }: any) => void;
}

const CommandsList = ({ items, command }: any) => {
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[300px]">
      {items.map((item: CommandItem, index: number) => (
        <button
          key={index}
          onClick={() => command(item)}
          className="w-full flex items-start gap-3 px-3 py-2 text-left rounded hover:bg-accent transition-colors"
        >
          <item.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium text-sm">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

const getSuggestionItems = (triggerImageUpload: () => void, triggerYoutubeDialog: () => void): CommandItem[] => [
  {
    title: 'Texto',
    description: 'Parágrafo de texto normal',
    icon: Type,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Título 1',
    description: 'Título grande',
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Título 2',
    description: 'Título médio',
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Título 3',
    description: 'Título pequeno',
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Lista',
    description: 'Lista com marcadores',
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Lista Numerada',
    description: 'Lista com números',
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Citação',
    description: 'Bloco de citação',
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Imagem',
    description: 'Fazer upload de uma imagem',
    icon: ImageIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      triggerImageUpload();
    },
  },
  {
    title: 'YouTube',
    description: 'Incorporar vídeo do YouTube',
    icon: Youtube,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      triggerYoutubeDialog();
    },
  },
  {
    title: 'Gráfico',
    description: 'Inserir gráfico de barras ou pizza',
    icon: BarChart3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'chart',
        attrs: {
          type: 'bar',
          data: [],
          title: 'Novo Gráfico',
        },
      }).run();
    },
  },
];

export const createSlashCommandExtension = (triggerImageUpload: () => void, triggerYoutubeDialog: () => void) => {
  return Extension.create({
    name: 'slashCommands',

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '/',
          allowSpaces: true,
          startOfLine: false,
          items: ({ query }) => {
            return getSuggestionItems(triggerImageUpload, triggerYoutubeDialog)
              .filter(item => 
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.description.toLowerCase().includes(query.toLowerCase())
              );
          },
          render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
              onStart: (props) => {
                component = new ReactRenderer(CommandsList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },

              onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return false;
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        } as SuggestionOptions),
      ];
    },
  });
};
