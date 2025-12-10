import React from 'react';
import './CodeEditor.css';

function CodeEditor({ value, onChange, disabled }) {
  const handleChange = (e) => {
    if (!disabled) {
      onChange(e.target.value);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <textarea
      className={`code-editor ${disabled ? 'disabled' : ''}`}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      placeholder="Enter your Tiny-C code here..."
      disabled={disabled}
    />
  );
}

export default CodeEditor;
