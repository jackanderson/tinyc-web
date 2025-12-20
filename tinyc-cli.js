#!/usr/bin/env node
// TinyC Command-Line Interpreter
// Usage: node tinyc-cli.js [--debug] <program.tc>

// Parse arguments first to determine debug mode
let debug = false;
let filename = null;

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--debug' || process.argv[i] === '-d') {
    debug = true;
  } else if (!filename) {
    filename = process.argv[i];
  }
}

// Suppress console output by default (unless --debug flag is set)
if (!debug) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Use dynamic import to ensure console is suppressed before module loads
const { TinyCInterpreter } = await import('./src/interpreter/TinyCInterpreter.js');
import * as readline from 'readline';
import { readFileSync } from 'fs';
import { stdin, stdout, exit } from 'process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory of current module for loading IPL
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TinyCCLI {
  constructor() {
    this.interpreter = new TinyCInterpreter();
    this.rl = null;
    this.isExecuting = false;
    this.loadIPL();
  }

  // Load the IPL standard library
  loadIPL() {
    try {
      const iplPath = join(__dirname, 'tinycx.ipl');
      const iplCode = readFileSync(iplPath, 'utf-8');
      this.interpreter.loadIPL(iplCode);
      if (debug) {
        console.log('IPL library loaded from tinycx.ipl');
      }
    } catch (error) {
      if (debug) {
        console.warn('Warning: Could not load IPL library:', error.message);
        console.warn('IPL functions may not be available');
      }
    }
  }

  // Override the interpreter's output methods to write directly to stdout
  setupOutputHandlers() {
    // Override print to write directly to stdout without calling original
    this.interpreter.print = (text) => {
      stdout.write(String(text));
      // Don't call original - it causes duplication
    };

    // Override println to write directly to stdout without calling original
    this.interpreter.println = (text = '') => {
      stdout.write(String(text) + '\n');
      // Don't call original - it causes duplication
    };

    // Override requestInput to set flags and prompt without calling original
    this.interpreter.requestInput = (prompt = '') => {
      stdout.write(prompt);
      // Set waiting state directly instead of calling original
      this.interpreter.waitingForInput = true;
      this.interpreter.inputPrompt = prompt;
      this.waitForInput();
    };
  }

  waitForInput() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: stdin,
        output: stdout,
        terminal: false
      });
    }

    // Read one line of input
    this.rl.once('line', (line) => {
      // Add the input to the interpreter
      this.interpreter.addInput(line);
      
      // Continue execution
      if (this.isExecuting) {
        this.continueExecution();
      }
    });
  }

  async runFile(filename) {
    try {
      // Read the TinyC source file
      const code = readFileSync(filename, 'utf-8');
      
      // Setup output handlers
      this.setupOutputHandlers();
      
      // Start execution
      this.isExecuting = true;
      this.interpreter.execute(code);
      
      // Continue execution if not waiting for input
      if (!this.interpreter.isWaitingForInput()) {
        this.continueExecution();
      }
    } catch (error) {
      exit(1);
    }
  }

  continueExecution() {
    try {
      // Continue execution
      const result = this.interpreter.continueExecution();
      
      // Check if we're waiting for more input
      if (this.interpreter.isWaitingForInput()) {
        // waitForInput is already set up
        return;
      }
      
      // Execution complete
      this.isExecuting = false;
      
      // Close readline if it was created
      if (this.rl) {
        this.rl.close();
      }
      
      // Exit with appropriate code
      exit(this.interpreter.errorCode || 0);
    } catch (error) {
      if (this.rl) {
        this.rl.close();
      }
      exit(1);
    }
  }

  // Interactive shell mode
  startShell() {
    // Print header like C version
    stdout.write('\ntiny-c/PC Interpreter  Version 2.7.11\n');
    stdout.write('JavaScript Edition - 2025\n\n');
    stdout.write('tiny-c shell - interactive mode\n\n');

    // Setup output handlers
    this.setupOutputHandlers();

    // Create readline interface for shell
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      prompt: 'tc>'
    });

    let codeBuffer = [];
    let bracketDepth = 0;
    let hasExecutedAnything = false;

    rl.prompt();

    rl.on('line', (line) => {
      const trimmed = line.trim();
      
      // Check for exit command
      if (trimmed === 'exit' || trimmed === 'quit') {
        rl.close();
        exit(0);
      }

      // Count brackets to detect multi-line inputs
      for (let char of trimmed) {
        if (char === '[') bracketDepth++;
        if (char === ']') bracketDepth--;
      }

      codeBuffer.push(line);

      // If brackets are balanced, execute the code
      if (bracketDepth === 0 && codeBuffer.length > 0) {
        const code = codeBuffer.join('\n');
        codeBuffer = [];
        const codeTrimmed = code.trim();

        try {
          // Check if it's a function definition
          const isFunctionDef = codeTrimmed.match(/^(\w+)\s+.*\[/);
          
          if (isFunctionDef) {
            // It's a function definition - add it to the interpreter's code
            this.interpreter.code += code + '\n';
            this.interpreter.lines = this.interpreter.code.split('\n').map(l => this.interpreter.stripComment(l));
            this.interpreter.collectDefinitions();
          } else if (codeTrimmed.startsWith('int ') || codeTrimmed.startsWith('char ')) {
            // Variable declaration - parse it
            this.interpreter.parseGlobalVarDeclaration(codeTrimmed);
          } else {
            // Regular statement or function call - execute it
            this.interpreter.executeLine(codeTrimmed);
          }
        } catch (error) {
          // Errors are suppressed unless debug mode
        }
      }

      rl.prompt();
    });

    rl.on('close', () => {
      exit(0);
    });
  }
}

// Main execution
if (!filename) {
  const cli = new TinyCCLI();
  cli.startShell();
} else {
  const cli = new TinyCCLI();
  cli.runFile(filename);
}
