import React from 'react';
import AceEditor from 'react-ace';

// Import ace editor modes and themes
import 'ace-builds/src-noconflict/ext-language_tools';

// Import custom TinyC mode and cool colors theme
import './mode-tinyc';
import './theme-coolcolors';

import './CodeEditor.css';

function CodeEditor({ value, onChange, disabled }) {
  const handleChange = (newValue) => {
    if (!disabled) {
      onChange(newValue);
    }
  };

  return (
    <div className={`code-editor-wrapper ${disabled ? 'disabled' : ''}`}>
      <AceEditor
        mode="tinyc"
        theme="coolcolors"
        value={value}
        onChange={handleChange}
        name="tinyc-editor"
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 4,
          fontSize: 14,
          showPrintMargin: false,
          highlightActiveLine: true,
          enableMultiselect: false,
          readOnly: disabled
        }}
        width="100%"
        height="100%"
        placeholder="Enter your Tiny-C code here..."
      />
    </div>
  );
}

export default CodeEditor;
