import React, { useRef, useEffect, useState, useCallback } from 'react';
import './CodeEditor.css';

// TinyC language tokens and syntax highlighting rules
const tinycTokens = {
  keywords: [
    'int', 'char', 'if', 'else', 'while', 'for', 'return', 'break', 'continue',
    'pl', 'ps', 'pn', 'getnum', 'getline', 'random', 'seed', 'mc'
  ],
  operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'],
  punctuation: ['(', ')', '{', '}', '[', ']', ';', ',', '.']
};

// Tokenize TinyC code for syntax highlighting
const tokenizeTinyC = (code) => {
  const tokens = [];
  let i = 0;
  
  while (i < code.length) {
    const char = code[i];
    
    // Handle newlines and whitespace
    if (char === '\n') {
      tokens.push({ type: 'whitespace', value: char, start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // Skip other whitespace
    if (/\s/.test(char)) {
      tokens.push({ type: 'whitespace', value: char, start: i, end: i + 1 });
      i++;
      continue;
    }
    
    // TinyC comments - /* comment ends at newline, not */
    if (char === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      tokens.push({ type: 'comment', value: code.slice(start, i), start, end: i });
      continue;
    }
    
    // Line comments (// style)
    if (char === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      tokens.push({ type: 'comment', value: code.slice(start, i), start, end: i });
      continue;
    }
    
    // Strings
    if (char === '"') {
      const start = i;
      i++; // Skip opening quote
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\' && i + 1 < code.length) {
          i += 2; // Skip escape sequence
        } else {
          i++;
        }
      }
      i++; // Skip closing quote
      tokens.push({ type: 'string', value: code.slice(start, i), start, end: i });
      continue;
    }
    
    // Numbers
    if (/\d/.test(char)) {
      const start = i;
      while (i < code.length && /[\d.]/.test(code[i])) {
        i++;
      }
      tokens.push({ type: 'number', value: code.slice(start, i), start, end: i });
      continue;
    }
    
    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      const start = i;
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        i++;
      }
      const value = code.slice(start, i);
      const type = tinycTokens.keywords.includes(value) ? 'keyword' : 'identifier';
      tokens.push({ type, value, start, end: i });
      continue;
    }
    
    // Operators and punctuation
    let operatorFound = false;
    for (const op of [...tinycTokens.operators, ...tinycTokens.punctuation].sort((a, b) => b.length - a.length)) {
      if (code.slice(i, i + op.length) === op) {
        tokens.push({ type: 'operator', value: op, start: i, end: i + op.length });
        i += op.length;
        operatorFound = true;
        break;
      }
    }
    
    if (!operatorFound) {
      tokens.push({ type: 'other', value: char, start: i, end: i + 1 });
      i++;
    }
  }
  
  return tokens;
};

function CodeEditor({ value, onChange, disabled }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const lines = value.split('\n');
  const lineCount = lines.length;
  
  // Synchronize scroll between textarea, highlight layer, and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      
      // Sync line numbers vertical scroll only
      const lineNumbersEl = textareaRef.current.parentElement?.previousElementSibling;
      if (lineNumbersEl) {
        lineNumbersEl.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, []);
  
  // Handle text changes
  const handleChange = (e) => {
    if (!disabled) {
      setCursorPosition(e.target.selectionStart);
      onChange(e.target.value);
    }
  };
  
  // Handle cursor position changes
  const handleSelect = (e) => {
    setCursorPosition(e.target.selectionStart);
  };
  
  // Handle keyboard shortcuts
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
        setCursorPosition(start + 4);
      }, 0);
    }
  };
  
  // Generate syntax highlighted HTML
  const renderHighlightedCode = () => {
    if (!value) return null;
    
    const tokens = tokenizeTinyC(value);
    console.log('Tokens:', tokens.slice(0, 10)); // Debug first 10 tokens
    
    return tokens.map((token, index) => (
      <span key={index} className={`token-${token.type}`}>
        {token.value}
      </span>
    ));
  };
  
  // Generate line numbers
  const renderLineNumbers = () => {
    return Array.from({ length: lineCount }, (_, i) => (
      <div key={i + 1} className="line-number">
        {i + 1}
      </div>
    ));
  };
  
  useEffect(() => {
    handleScroll();
  }, [value, handleScroll]);
  
  return (
    <div className={`code-editor-container ${disabled ? 'disabled' : ''}`}>
      <div className="line-numbers">
        {renderLineNumbers()}
      </div>
      
      <div className="editor-wrapper">
        <div
          ref={highlightRef}
          className="syntax-highlight"
        >
          {renderHighlightedCode()}
        </div>
        
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onSelect={handleSelect}
          spellCheck={false}
          placeholder="Enter your Tiny-C code here..."
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
