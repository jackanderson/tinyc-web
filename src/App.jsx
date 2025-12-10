import React, { useState, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { TinyCInterpreter } from './interpreter/TinyCInterpreter';
import examples from './examples';
import './App.css';
// Force reload - v2.0.2

function App() {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [showDocs, setShowDocs] = useState(false);
  const [interpreter] = useState(() => new TinyCInterpreter());
  const inputRef = useRef(null);

  const handleRun = () => {
    try {
      setIsRunning(true);
      setOutput('');
      setError('');
      
      const result = interpreter.execute(code);
      setOutput(result);
      
      if (interpreter.isWaitingForInput()) {
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
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
      
      // Continue execution
      const result = interpreter.continueExecution();
      setOutput(result);
      
      // Check if still waiting for more input
      if (!interpreter.isWaitingForInput()) {
        setIsRunning(false);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Tiny-C Web Interpreter</h1>
        <p className="subtitle">
          A JavaScript port of the classic tiny-c interpreter by Scott B. Guthery
        </p>
      </header>
      
      <div className="toolbar">
        <button className="btn btn-primary" onClick={handleRun}>
          ▶️ Run
        </button>
        <button className="btn btn-secondary" onClick={handleClear}>
          🗑️ Clear
        </button>
        <select 
          className="example-select" 
          value={currentExample} 
          onChange={handleExampleChange}
        >
          <option value="" disabled>Load an Example</option>
          <option value="trek">🚀 Star Trek Game</option>
          <option value="hello">Hello World</option>
          <option value="simple">Simple Print</option>
          <option value="variables">Variables</option>
          <option value="math">Math Operations</option>
          <option value="interactive">Interactive Input</option>
          <option value="countdown">Number Countdown</option>
        </select>
        <button className="btn btn-secondary" onClick={() => setShowDocs(true)}>
          📖 Documentation
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
                <p>Variables are declared implicitly by assignment. All variables are integers.</p>
                <pre>x = 10{'\n'}y = x + 5{'\n'}result = x * y</pre>
              </section>
              
              <section>
                <h3>Arrays</h3>
                <p>Declare arrays with size in parentheses:</p>
                <pre>int arr(10)     /* Declare array of 10 elements */{'\n'}arr(0) = 5      /* Set first element */{'\n'}x = arr(0)      /* Read first element */</pre>
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
                <p>Define functions with parameter lists:</p>
                <pre>add(a, b) [{'\n'}  result = a + b{'\n'}  return result{'\n'}]{'\n'}{'\n'}x = add(5, 3)  /* Call function */</pre>
              </section>
              
              <section>
                <h3>Built-in Functions</h3>
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
                      <td>Print number</td>
                      <td><code>pn x</code></td>
                    </tr>
                    <tr>
                      <td><code>pr "text"</code></td>
                      <td>Print raw (no formatting)</td>
                      <td><code>pr "Title"</code></td>
                    </tr>
                    <tr>
                      <td><code>getnum("prompt")</code></td>
                      <td>Get number input from user</td>
                      <td><code>age = getnum("Age:")</code></td>
                    </tr>
                    <tr>
                      <td><code>random(max)</code></td>
                      <td>Random number 1 to max</td>
                      <td><code>x = random(100)</code></td>
                    </tr>
                    <tr>
                      <td><code>abs(x)</code></td>
                      <td>Absolute value</td>
                      <td><code>y = abs(-5)</code></td>
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
          <CodeEditor value={code} onChange={setCode} disabled={isRunning} />
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
