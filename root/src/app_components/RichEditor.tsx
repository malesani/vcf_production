// src/app_components/RichEditor.tsx
import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditorBuild from '@ckeditor/ckeditor5-build-classic';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export const RichEditor: React.FC<RichEditorProps> = ({ value, onChange }) => {
  return (
    <CKEditor
      editor={ (ClassicEditorBuild as any) }
      data={ value }
      onChange={ (_, editor ) => {
        const data = editor.getData();
        onChange(data);
      }}
      config={{
        toolbar: [
          'heading', '|',
          'bold', 'italic', 'underline', 'strikethrough', '|',
          'bulletedList', 'numberedList', '|',
          'link', 'insertTable', 'blockQuote', 'undo', 'redo'
        ],
        table: {
          contentToolbar: [
            'tableColumn', 'tableRow', 'mergeTableCells'
          ]
        }
      }}
    />
  );
};
