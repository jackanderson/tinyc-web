import React, { useState, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { TinyCInterpreter } from './interpreter/TinyCInterpreter';
import examples from './examples';
import './App.css';
// Force reload - v2.7.1 BUILD 20251210-1532 - RETURN FIX VERIFIED

function App() {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [showDocs, setShowDocs] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [interpreter] = useState(() => new TinyCInterpreter());
  const inputRef = useRef(null);
  const spinnerTimer = useRef(null);

  const handleRun = () => {
    try {
      setIsRunning(true);
      setOutput('');
      setError('');
      setShowSpinner(false);
      
      // Start spinner timer for long-running operations
      spinnerTimer.current = setTimeout(() => {
        setShowSpinner(true);
      }, 10);
      
      const result = interpreter.execute(code);
      setOutput(result);
      
      // Clear spinner timer
      if (spinnerTimer.current) {
        clearTimeout(spinnerTimer.current);
        spinnerTimer.current = null;
      }
      setShowSpinner(false);
      
      if (interpreter.isWaitingForInput()) {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      // Clear spinner on error
      if (spinnerTimer.current) {
        clearTimeout(spinnerTimer.current);
        spinnerTimer.current = null;
      }
      setShowSpinner(false);
      setError(`Runtime error: ${error.message}\nStack: ${error.stack}`);
      setIsRunning(false);
    }
  };
  
  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === '') return;
    
    try {
      setError('');
      
      // Add input to interpreter
      interpreter.addInput(input);
      
      // Clear input field
      setInput('');
      
      // Start spinner timer for continued execution
      spinnerTimer.current = setTimeout(() => {
        setShowSpinner(true);
      }, 10);
      
      // Continue execution
      const result = interpreter.continueExecution();
      setOutput(result);
      
      // Clear spinner timer
      if (spinnerTimer.current) {
        clearTimeout(spinnerTimer.current);
        spinnerTimer.current = null;
      }
      setShowSpinner(false);
      
      // Check if still waiting for more input
      if (!interpreter.isWaitingForInput()) {
        setIsRunning(false);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      // Clear spinner on error
      if (spinnerTimer.current) {
        clearTimeout(spinnerTimer.current);
        spinnerTimer.current = null;
      }
      setShowSpinner(false);
      setError(`Runtime error: ${error.message}\nStack: ${error.stack}`);
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
    setError('');
  };

  const [currentExample, setCurrentExample] = useState('');
  
  const handleExampleChange = (e) => {
    const exampleKey = e.target.value;
    setCode(examples[exampleKey].code);
    setCurrentExample(exampleKey);
    setOutput('');
    setError('');
  };

  const handleLoadFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCode(event.target.result);
        setOutput('');
        setError('');
        setCurrentExample('');
      };
      reader.readAsText(file);
    }
    // Reset input so same file can be loaded again
    e.target.value = '';
  };

  const handleSaveFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.tc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>tinyc-web</h1>
        </div>
        <div className="header-right">
          tiny-c interpreter
        </div>
      </header>
      
      <div className="toolbar">
        <button className="btn btn-primary" onClick={handleRun}>
          Run
        </button>
        {showSpinner && (
          <div className="spinner-container">
            <div className="spinner"></div>
            <span className="spinner-text">Running...</span>
          </div>
        )}
        <button className="btn btn-secondary" onClick={handleClear}>
          Clear
        </button>
        <select 
          className="example-select" 
          value={currentExample} 
          onChange={handleExampleChange}
        >
          <option value="" disabled>Load example</option>
          <option value="trek">Star Trek Game</option>
          <option value="hello">Hello World</option>
          <option value="simple">Simple Print</option>
          <option value="variables">Variables</option>
          <option value="math">Math Operations</option>
          <option value="interactive">Interactive Input</option>
          <option value="countdown">Number Countdown</option>
        </select>
        <label className="btn btn-secondary file-button">
          Load .tc
          <input
            type="file"
            accept=".tc"
            onChange={handleLoadFile}
            style={{ display: 'none' }}
          />
        </label>
        <button className="btn btn-secondary" onClick={handleSaveFile}>
          Save .tc
        </button>
        <button className="btn btn-secondary" onClick={() => setShowDocs(true)}>
          Docs
        </button>
      </div>
      
      {showDocs && (
        <div className="modal-overlay" onClick={() => setShowDocs(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📖 Tiny-C Documentation</h2>
              <button className="modal-close" onClick={() => setShowDocs(false)}>✕</button>
            </div>
            <div className="modal-body">
              <section>
                <h3>Language Basics</h3>
                <p>Tiny-C is a simplified C-like language with basic control structures and I/O functions.</p>
              </section>
              
              <section>
                <h3>Variables</h3>
                <p>Variables must be declared before use. Tiny-C supports integers and character arrays.</p>
                <pre>int x, y, result{'\n'}char name(20), buffer(50){'\n'}{'\n'}x = 10{'\n'}y = x + 5{'\n'}result = x * y</pre>
              </section>
              
              <section>
                <h3>Arrays</h3>
                <p>Declare arrays with size in parentheses. Use parentheses for array access:</p>
                <pre>int numbers(10){'\n'}char message(50){'\n'}{'\n'}numbers(0) = 42    /* Set first element */{'\n'}x = numbers(0)     /* Read first element */{'\n'}{'\n'}strcpy(message, "Hello"){'\n'}pl message</pre>
              </section>
              
              <section>
                <h3>Control Structures</h3>
                <h4>If/Else</h4>
                <pre>if (x {'>'} 10) [{'\n'}  pl "x is greater than 10"{'\n'}] else [{'\n'}  pl "x is 10 or less"{'\n'}]</pre>
                
                <h4>While Loop</h4>
                <pre>i = 0{'\n'}while (i {'<'} 5) [{'\n'}  pn i{'\n'}  i = i + 1{'\n'}]</pre>
                
                <h4>For Loop</h4>
                <pre>for (i = 1; i {'<'}= 10; i = i + 1) [{'\n'}  pn i{'\n'}]</pre>
              </section>
              
              <section>
                <h3>Functions</h3>
                <p>Define functions with square brackets and optional parameters:</p>
                <pre>/* Simple function */{'\n'}hello[{'\n'}  pl "Hello, World!"{'\n'}]{'\n'}{'\n'}/* Function with parameters */{'\n'}add int a, b[{'\n'}  return a + b{'\n'}]{'\n'}{'\n'}/* Function calls */{'\n'}hello(){'\n'}result = add(5, 3)</pre>
              </section>
              
              <section>
                <h3>Built-in Functions</h3>
                <p>Tiny-C includes a comprehensive standard library with 48+ built-in functions:</p>
                
                <h4>Input/Output Functions</h4>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>pl "text"</code></td>
                      <td>Print line (with newline)</td>
                      <td><code>pl "Hello World"</code></td>
                    </tr>
                    <tr>
                      <td><code>ps "text"</code></td>
                      <td>Print string (no newline)</td>
                      <td><code>ps "Count: "</code></td>
                    </tr>
                    <tr>
                      <td><code>pn expr</code></td>
                      <td>Print number with space</td>
                      <td><code>pn x</code></td>
                    </tr>
                    <tr>
                      <td><code>putchar(c)</code></td>
                      <td>Output single character</td>
                      <td><code>putchar(65)</code></td>
                    </tr>
                    <tr>
                      <td><code>getchar()</code></td>
                      <td>Input single character</td>
                      <td><code>c = getchar()</code></td>
                    </tr>
                    <tr>
                      <td><code>gs(buffer)</code></td>
                      <td>Get string input</td>
                      <td><code>gs(name)</code></td>
                    </tr>
                    <tr>
                      <td><code>gn()</code></td>
                      <td>Get number input</td>
                      <td><code>age = gn()</code></td>
                    </tr>
                    <tr>
                      <td><code>chrdy()</code></td>
                      <td>Check if input ready</td>
                      <td><code>if(chrdy()) ...</code></td>
                    </tr>
                  </tbody>
                </table>
                
                <h4>String Functions</h4>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>strlen(str)</code></td>
                      <td>Get string length</td>
                      <td><code>len = strlen(name)</code></td>
                    </tr>
                    <tr>
                      <td><code>strcpy(dest, src)</code></td>
                      <td>Copy string</td>
                      <td><code>strcpy(copy, original)</code></td>
                    </tr>
                    <tr>
                      <td><code>strcat(dest, src)</code></td>
                      <td>Concatenate strings</td>
                      <td><code>strcat(greeting, name)</code></td>
                    </tr>
                    <tr>
                      <td><code>tolower(str)</code></td>
                      <td>Convert to lowercase</td>
                      <td><code>tolower(text)</code></td>
                    </tr>
                    <tr>
                      <td><code>toupper(str)</code></td>
                      <td>Convert to uppercase</td>
                      <td><code>toupper(text)</code></td>
                    </tr>
                    <tr>
                      <td><code>alphanum(c)</code></td>
                      <td>Check if alphanumeric</td>
                      <td><code>if(alphanum(ch)) ...</code></td>
                    </tr>
                  </tbody>
                </table>
                
                <h4>Parsing & Search Functions</h4>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>num(buf, val)</code></td>
                      <td>Parse digits to number</td>
                      <td><code>num(input, result)</code></td>
                    </tr>
                    <tr>
                      <td><code>atoi(buf, val)</code></td>
                      <td>ASCII to integer</td>
                      <td><code>atoi(text, number)</code></td>
                    </tr>
                    <tr>
                      <td><code>index(str, len, find, n)</code></td>
                      <td>Find substring position</td>
                      <td><code>pos = index(text, 20, "hello", 5)</code></td>
                    </tr>
                    <tr>
                      <td><code>ceqn(s1, s2, n)</code></td>
                      <td>Compare n characters</td>
                      <td><code>if(ceqn(a, b, 3)) ...</code></td>
                    </tr>
                  </tbody>
                </table>
                
                <h4>System Functions</h4>
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>random(max)</code></td>
                      <td>Random number 1 to max</td>
                      <td><code>x = random(100)</code></td>
                    </tr>
                    <tr>
                      <td><code>version()</code></td>
                      <td>Get interpreter version</td>
                      <td><code>v = version()</code></td>
                    </tr>
                    <tr>
                      <td><code>cls()</code></td>
                      <td>Clear screen</td>
                      <td><code>cls()</code></td>
                    </tr>
                    <tr>
                      <td><code>beep(freq, dur)</code></td>
                      <td>Generate tone (frequency Hz, duration ms)</td>
                      <td><code>beep(800, 500)</code></td>
                    </tr>
                    <tr>
                      <td><code>sak()</code></td>
                      <td>"Strike any key" prompt</td>
                      <td><code>sak()</code></td>
                    </tr>
                    <tr>
                      <td><code>exit()</code></td>
                      <td>Exit program</td>
                      <td><code>exit()</code></td>
                    </tr>
                  </tbody>
                </table>
              </section>
              
              <section>
                <h3>Operators</h3>
                <ul>
                  <li><strong>Arithmetic:</strong> <code>+ - * / %</code></li>
                  <li><strong>Comparison:</strong> <code>== != {'<'} {'>'} {'<'}= {'>'}=</code></li>
                  <li><strong>Logical:</strong> <code>&amp;&amp; ||</code></li>
                </ul>
              </section>
              
              <section>
                <h3>Comments</h3>
                <p>Use C-style comments:</p>
                <pre>/* This is a comment */</pre>
              </section>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-panel">
          <h3>⚠️ Error</h3>
          <pre className="error-text">{error}</pre>
        </div>
      )}

      <div className="editor-container">
        <div className="panel editor-panel">
          <h2>Code Editor</h2>
          <CodeEditor value={code} onChange={setCode} disabled={false} />
        </div>
        
        <div className="panel output-panel">
          <h2>Output</h2>
          <OutputPanel output={output} />
          {isRunning && interpreter.isWaitingForInput() && (
            <form onSubmit={handleInputSubmit} className="input-form">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="input-field"
                placeholder="Enter input..."
                autoFocus
              />
              <button type="submit" className="input-submit">Send</button>
            </form>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Original tiny-c Copyright © 1984 by Scott B. Guthery | 
          Web port © 2025 | 
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"> View on GitHub</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
