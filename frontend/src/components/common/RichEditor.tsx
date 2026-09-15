import { useEffect } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { EditorToolbar } from '../editor/EditorToolbar';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function RichEditor({
  value,
  onChange,
  placeholder = '输入合同正文...',
  minHeight = 360,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rich-editor__content',
        style: `min-height: ${minHeight}px`
      }
    },
    onUpdate({ editor: activeEditor }) {
      onChange(activeEditor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div className="rich-editor">
      <EditorToolbar editor={editor} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />
      <EditorContent editor={editor} />
    </div>
  );
}
