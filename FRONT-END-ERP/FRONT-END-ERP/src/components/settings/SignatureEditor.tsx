import { useEffect, useRef } from 'react';

interface SignatureEditorProps {
  value: string;
  onChange: (next: string) => void;
  useDefault: boolean;
  onToggleDefault: (next: boolean) => void;
  variables: { token: string; label: string }[];
  lightPreviewHtml: string;
  darkPreviewHtml: string;
  defaultLabel?: string;
}

const toolbarButtonClass =
  'rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export const SignatureEditor = ({
  value,
  onChange,
  useDefault,
  onToggleDefault,
  variables,
  lightPreviewHtml,
  darkPreviewHtml,
  defaultLabel = 'Définir comme signature par défaut pour les envois automatiques',
}: SignatureEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p></p>';
    }
  }, [value]);

  const applyCommand = (command: string, argument?: string) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.execCommand(command, false, argument ?? '');
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const insertVariable = (token: string) => {
    if (typeof document === 'undefined') {
      return;
    }
    document.execCommand('insertText', false, token);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const addLink = () => {
    if (typeof document === 'undefined') {
      return;
    }
    const url = window.prompt('Adresse du lien');
    if (!url) {
      return;
    }
    document.execCommand('createLink', false, url);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('bold')}>
          Gras
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('italic')}>
          Italique
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('underline')}>
          Souligner
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={addLink}>
          Lien
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand('insertUnorderedList')}>
          Liste
        </button>
        <span className="mx-2 text-xs text-slate-400">Variables</span>
        {variables.map((variable) => (
          <button
            key={variable.token}
            type="button"
            className={toolbarButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertVariable(variable.token)}
          >
            {variable.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        className="min-h-[180px] rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-testid="signature-editor"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={useDefault}
          onChange={(event) => onToggleDefault(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
        />
        {defaultLabel}
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Prévisualisation (clair)
          </h4>
          <div className="prose prose-sm max-w-none text-slate-700 dark:prose-invert" dangerouslySetInnerHTML={{ __html: lightPreviewHtml }} />
        </div>
        <div className="rounded border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100 shadow-sm dark:border-slate-700">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
            Prévisualisation (sombre)
          </h4>
          <div className="prose prose-sm max-w-none text-slate-100" dangerouslySetInnerHTML={{ __html: darkPreviewHtml }} />
        </div>
      </div>
    </div>
  );
};

export default SignatureEditor;
