import React from 'react';
import './OutputPanel.css';

function OutputPanel({ output }) {
  return (
    <div className="output-content">
      {output ? (
        <pre className="output-text">{output}</pre>
      ) : (
        <div className="output-placeholder">
          <p>Output will appear here when you run your code...</p>
          <p className="hint">💡 Click the "Run" button to execute your program</p>
        </div>
      )}
    </div>
  );
}

export default OutputPanel;
