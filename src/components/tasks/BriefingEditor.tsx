import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ResizableImageExtension from 'tiptap-extension-resize-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface BriefingEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function BriefingEditor({ content, onChange, placeholder, minHeight = '150px' }: BriefingEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      ResizableImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-2',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Descreva o briefing da atividade...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-3`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync content when it changes externally (e.g. on dialog open)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tasks/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-minutes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('meeting-minutes')
        .getPublicUrl(fileName);

      editor.chain().focus().setImage({ src: data.publicUrl }).run();
      toast.success('Imagem adicionada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    }

    // Reset input
    e.target.value = '';
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !editor) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;

        try {
          const fileExt = blob.type.split('/')[1];
          const fileName = `tasks/${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('meeting-minutes')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('meeting-minutes')
            .getPublicUrl(fileName);

          editor.chain().focus().setImage({ src: data.publicUrl }).run();
          toast.success('Imagem colada!');
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          toast.error('Erro ao fazer upload da imagem');
        }
      }
    }
  };

  const handleAddLink = () => {
    if (!editor || !linkUrl) return;

    if (linkText) {
      editor.chain().focus()
        .insertContent(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }

    setLinkUrl('');
    setLinkText('');
    setLinkDialogOpen(false);
  };

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="border-b border-border p-1.5 flex flex-wrap gap-0.5">
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-7 bg-border mx-0.5" />
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-7 bg-border mx-0.5" />
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-7 bg-border mx-0.5" />
        <Button
          type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
          onClick={() => setLinkDialogOpen(true)}
          title="Inserir link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
          onClick={() => document.getElementById('briefing-image-upload')?.click()}
          title="Inserir imagem"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-7 bg-border mx-0.5" />
        <Button
          type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-3.5 w-3.5" />
        </Button>
      </div>

      <input
        id="briefing-image-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div onPaste={handlePasteImage}>
        <EditorContent editor={editor} />
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Inserir Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Texto (opcional)</Label>
              <Input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Texto do link"
              />
            </div>
            <Button onClick={handleAddLink} className="w-full" disabled={!linkUrl}>
              Adicionar Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
