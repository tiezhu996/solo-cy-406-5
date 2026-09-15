import { Button, Divider, Space, Tooltip } from '@arco-design/web-react';
import { IconRedo, IconUndo } from '@arco-design/web-react/icon';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorToolbar({ editor, onUndo, onRedo, canUndo, canRedo }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="editor-toolbar">
      <Space wrap size={4}>
        <Tooltip content="撤销">
          <Button icon={<IconUndo />} disabled={!canUndo} onClick={onUndo} />
        </Tooltip>
        <Tooltip content="重做">
          <Button icon={<IconRedo />} disabled={!canRedo} onClick={onRedo} />
        </Tooltip>
        <Divider type="vertical" />
        <Button type={editor.isActive('bold') ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </Button>
        <Button type={editor.isActive('italic') ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleItalic().run()}>
          I
        </Button>
        <Button
          type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'secondary'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          type={editor.isActive('bulletList') ? 'primary' : 'secondary'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          列表
        </Button>
        <Button
          type={editor.isActive('orderedList') ? 'primary' : 'secondary'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          编号
        </Button>
      </Space>
    </div>
  );
}
