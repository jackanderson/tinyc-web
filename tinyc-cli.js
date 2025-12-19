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

class TinyCCLI {
  constructor() {
    this.interpreter = new TinyCInterpreter();
    this.rl = null;
    this.isExecuting = false;
  }

  // Override the interpreter's output methods to write directly to stdout
  setupOutputHandlers() {
    // Store original methods
    const originalPrint = this.interpreter.print.bind(this.interpreter);
    const originalPrintln = this.interpreter.println.bind(this.interpreter);
    const originalRequestInput = this.interpreter.requestInput.bind(this.interpreter);

    // Override print to write directly to stdout
    this.interpreter.print = (text) => {
      stdout.write(String(text));
      originalPrint(text);
    };

    // Override println to write directly to stdout
    this.interpreter.println = (text = '') => {
      stdout.write(String(text) + '\n');
      originalPrintln(text);
    };

    // Override requestInput to use readline
    this.interpreter.requestInput = (prompt = '') => {
      stdout.write(prompt);
      originalRequestInput(prompt);
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
}

// Main execution
if (!filename) {
  // Temporarily restore console.error for usage message
  const originalError = console.error;
  console.error = (...args) => process.stderr.write(args.join(' ') + '\n');
  console.error('Usage: node tinyc-cli.js [--debug] <program.tc>');
  exit(1);
}

const cli = new TinyCCLI();
cli.runFile(filename);
