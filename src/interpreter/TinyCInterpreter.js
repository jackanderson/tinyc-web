// TinyCInterpreter.js - Simplified tiny-c interpreter for web
// This runs tiny-c code by executing the standard library functions
// Version: 2.7.11 - Debug random() return values for starbase generation - BUILD 20251210-1640
console.log('=== TinyCInterpreter Version 2.7.11 LOADED - BUILD 20251210-1640 ===');

export class TinyCInterpreter {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.output = [];
    this.inputQueue = [];
    this.waitingForInput = false;
    this.inputPrompt = '';
    this.variables = {};
    this.functions = {};
    this.arrays = {};
    this.seed = 99;
    this.last = 0;
    this.code = '';
    this.lines = [];
    this.lineIndex = 0;
    this.inFunction = false;
    this.currentFunction = null;
    this.callStack = [];  // Stack to track nested function calls
    this.skipToLine = -1;
    this.returnValue = null;
    this.shouldReturn = false;
    this.shouldBreak = false;
    this.shouldContinue = false;
    this.inLoop = false;
    this.loopState = null;  // Save loop state when waiting for input
    this.totalExecutedLines = 0;  // Track total lines executed to detect infinite loops
    this.executionStartTime = Date.now();  // Track execution time
    this.halted = false;  // MC HALT flag
    this.stack = [];  // Stack for MC operations
    this.audioContext = null;  // Web Audio context for beep sounds
    this.errorCode = 0;  // Error code like original TinyC
    this.errorFunction = null;  // Function name that caused error
    this.errorLine = -1;  // Line number where error occurred
  }
  
  // Output functions
  print(text) {
    this.output.push(String(text));
  }
  
  println(text = '') {
    this.output.push(String(text) + '\n');
  }
  
  getOutput() {
    return this.output.join('');
  }
  
  clearOutput() {
    this.output = [];
  }
  
  // Input functions
  addInput(input) {
    this.inputQueue.push(input);
    this.waitingForInput = false;
  }
  
  requestInput(prompt = '') {
    this.waitingForInput = true;
    this.inputPrompt = prompt;
    this.print(prompt);
  }
  
  getInput() {
    if (this.inputQueue.length > 0) {
      return this.inputQueue.shift();
    }
    return null;
  }
  
  isWaitingForInput() {
    return this.waitingForInput;
  }
  
  // Stack operations for MC functions
  push(value) {
    this.stack.push(value);
  }
  
  pop() {
    if (this.stack.length === 0) {
      console.warn('Stack underflow - returning 0');
      return 0;
    }
    return this.stack.pop();
  }
  
  // Execute Machine Call (MC) - low-level system functions
  executeMC(argCount) {
    // MC constants from original tiny-c mc.c:
    // 1=PUTC, 2=GETC, 3=OPEN, 4=READ, 5=WRITE, 6=CLOSE, 7=MOVEBL, 
    // 8=COUNTCH, 9=SCANN, 10=HALT, 11=APPL, 12=CHRDY, 13=PUTBL, 
    // 14=PUTN, 15=GETLN, 16=SETMEM, 17=BEEP
    
    // First pop the MC operation number from stack (like original mc.c)
    const mcNumber = this.pop();
    
    // User-defined machine calls (>= 1000)
    if (mcNumber >= 1000) {
      console.log(`MC user-defined call ${mcNumber - 1000} with ${argCount} args`);
      return;
    }
    
    switch(mcNumber) {
      case 1: { // PUTC - put character (output single char)
        // Pop character code from stack and output it
        const charCode = this.pop();
        const char = charCode ? String.fromCharCode(charCode) : '"';
        this.print(char);
        this.push(charCode); // Return the char code
        break;
      }
        
      case 2: { // GETC - get character (read single char)
        // Request character input from user
        if (this.inputQueue.length === 0) {
          this.requestInput('');
          this.waitingForInput = true;
        } else {
          const input = this.getInput();
          const charCode = input && input.length > 0 ? input.charCodeAt(0) : 0;
          this.push(charCode);
        }
        break;
      }
        
      case 3: { // OPEN - open file
        // Pop: unit, size, name, mode
        const unit = this.pop();
        const size = this.pop();
        const name = this.pop();
        const mode = this.pop();
        console.log(`MC OPEN - file operations not supported (unit=${unit}, mode=${mode})`);
        this.push(-1); // Return error code
        break;
      }
        
      case 4: { // READ - read from file
        const unit = this.pop();
        const buffer = this.pop();
        console.log(`MC READ - file operations not supported`);
        this.push(-1); // Return error code
        break;
      }
        
      case 5: { // WRITE - write to file
        const unit = this.pop();
        const to = this.pop();
        const from = this.pop();
        console.log(`MC WRITE - file operations not supported`);
        this.push(0); // Return 0
        break;
      }
        
      case 6: { // CLOSE - close file
        const unit = this.pop();
        console.log(`MC CLOSE - file operations not supported`);
        this.push(0); // Return 0
        break;
      }
        
      case 10: { // HALT - stop execution
        console.log('MC 10 (HALT) called - stopping execution');
        console.log('Final output:', this.output);
        this.halted = true;
        break;
      }
        
      case 12: { // CHRDY - check if character ready (keyboard ready)
        // Check if input queue has data
        const ready = this.inputQueue.length > 0 ? 1 : 0;
        this.push(ready);
        break;
      }
        
      case 13: { // PUTBL - print block of text (string output)
        // Pop two pointers (from, to) and print chars between them
        // In web version without memory addresses, just print a newline
        const to = this.pop();
        const from = this.pop();
        console.log('MC 13 (PUTBL) executing - outputting newline');
        this.println();
        console.log('Current output:', this.output);
        this.push(0); // Return 0
        break;
      }
        
      case 14: { // PUTN - print number
        // Pop an integer from stack and print it
        const num = this.pop();
        this.print(num.toString());
        this.push(1); // Return number of chars printed (approximate)
        break;
      }
        
      case 15: { // GETLN - get line of input
        // Get a full line of text input
        if (this.inputQueue.length === 0) {
          this.requestInput('');
          this.waitingForInput = true;
        } else {
          const line = this.getInput();
          // In original, this would store to buffer address from stack
          const buffer = this.pop();
          this.push(line ? line.length : 0); // Return length
        }
        break;
      }
        
      case 16: { // SETMEM - set memory
        const ch = this.pop();
        const n = this.pop();
        const start = this.pop();
        console.log(`MC SETMEM - memory operations not fully supported`);
        this.push(0);
        break;
      }
        
      case 17: { // BEEP - make a beep sound
        const duration = this.pop();
        const frequency = this.pop();
        
        try {
          // Create Web Audio context if it doesn't exist
          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          
          // Create oscillator for the tone
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          // Connect oscillator -> gain -> output
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          // Set frequency and waveform
          oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
          oscillator.type = 'sine'; // Pure sine wave tone
          
          // Set volume envelope (fade in/out to avoid clicks)
          const now = this.audioContext.currentTime;
          const durationSec = duration / 1000;
          
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01); // Fade in
          gainNode.gain.setValueAtTime(0.1, now + durationSec - 0.01); // Hold
          gainNode.gain.linearRampToValueAtTime(0, now + durationSec); // Fade out
          
          // Start and stop the tone
          oscillator.start(now);
          oscillator.stop(now + durationSec);
          
          console.log(`MC BEEP - generated tone (freq=${frequency}Hz, dur=${duration}ms)`);
          
        } catch (error) {
          console.warn('Web Audio not supported or error generating beep:', error);
        }
        
        this.push(0);
        break;
      }
        
      default: {
        // Pop any arguments that were supposed to be on the stack
        // Note: argCount includes the MC number itself, so we already popped 1
        for (let i = 1; i < argCount; i++) {
          this.pop();
        }
        console.log(`MC ${mcNumber} with ${argCount} args - not implemented (args discarded)`);
        // Push a default return value
        this.push(0);
      }
    }
  }
  
  // Strip single-line /* comments from a line
  stripComment(line) {
    const commentIndex = line.indexOf('/*');
    if (commentIndex !== -1) {
      return line.substring(0, commentIndex);
    }
    return line;
  }

  // Execute a tiny-c program
  execute(code) {
    this.reset();
    this.code = code;
    // Strip comments from each line before splitting
    this.lines = code.split('\n').map(line => this.stripComment(line));
    this.lineIndex = 0;
    
    try {
      // First pass: collect function definitions and global variables
      this.collectDefinitions();
      
      console.log('Functions found:', Object.keys(this.functions));
      console.log('Variables:', Object.keys(this.variables));
      console.log('Arrays:', Object.keys(this.arrays));
      
      // If main() exists, execute it
      if (this.functions['main']) {
        console.log('Executing main function...');
        this.executeUserFunction('main');
      } else {
        console.log('No main function, executing top-level code...');
        // Otherwise execute top-level code
        this.lineIndex = 0;
        return this.continueExecution();
      }
      
      return this.getOutput();
    } catch (error) {
      this.println('\nExecution error: ' + error.message);
      console.error('Execute error:', error);
      throw error;
    }
  }
  
  // Collect function definitions and global variable declarations
  collectDefinitions() {
    let inFunction = false;
    let bracketDepth = 0;
    
    try {
      for (let i = 0; i < this.lines.length; i++) {
        const trimmed = this.lines[i].trim();
        
        // Skip comments
        if (trimmed.startsWith('/*') || trimmed === '') continue;
        
        // Global variable declarations
        if (!inFunction && (trimmed.startsWith('int ') || trimmed.startsWith('char '))) {
          this.parseGlobalVarDeclaration(trimmed);
          continue;
        }
        
        // Function definition: name [...] or name type params [...]
        const funcMatch = trimmed.match(/^(\w+)(?:\s+[\w\s,()]+)?\s*\[/);
        if (funcMatch && !inFunction) {
          const funcName = funcMatch[1];
          // Don't treat standalone control structures as functions
          if (['if', 'else', 'while', 'for', 'do'].includes(funcName)) {
            continue;
          }
          inFunction = true;
          bracketDepth = 1;
          this.functions[funcName] = { startLine: i, endLine: -1 };
          continue;
        }
        
        // Track bracket depth in functions
        if (inFunction) {
          for (const char of trimmed) {
            if (char === '[') bracketDepth++;
            if (char === ']') bracketDepth--;
          }
          
          if (bracketDepth === 0) {
            // End of function
            const funcName = Object.keys(this.functions).find(
              name => this.functions[name].endLine === -1
            );
            if (funcName) {
              this.functions[funcName].endLine = i;
            }
            inFunction = false;
          }
        }
      }
    } catch (error) {
      throw new Error(`Parse error during definition collection: ${error.message}`);
    }
  }
  
  parseGlobalVarDeclaration(line) {
    // Parse: int a, b, c or int z(175)
    const match = line.match(/^(int|char)\s+(.+)/);
    if (!match) return;
    
    const varList = match[2].split(',');
    for (const varDecl of varList) {
      const trimmed = varDecl.trim();
      // Check for array: name(size)
      const arrayMatch = trimmed.match(/(\w+)\s*\((\d+)\)/);
      if (arrayMatch) {
        const name = arrayMatch[1];
        const size = parseInt(arrayMatch[2]);
        this.arrays[name] = new Array(size).fill(0);
      } else {
        // Simple variable
        const varName = trimmed.replace(/[;\]]$/, '').trim();
        if (varName) {
          this.variables[varName] = 0;
        }
      }
    }
  }
  
  // Continue execution from where we left off
  continueExecution() {
    // Check if execution was halted by MC HALT
    if (this.halted) {
      console.log('Execution halted by MC HALT');
      return this.getOutput();
    }
    
    // Reset execution timer when continuing after input
    this.executionStartTime = Date.now();
    
    try {
      // IMPORTANT: If we're in a function, continue executing it FIRST
      // This handles the case where a loop inside a function is waiting for input
      if (this.currentFunction) {
        const shouldWait = this.executeUserFunction(this.currentFunction);
        if (shouldWait) {
          return this.getOutput();
        }
        // Function completed, clear loop state if any
        this.loopState = null;
      }
      // If we have a saved loop state (and we're NOT in a function), resume the loop
      else if (this.loopState) {
        const shouldWait = this.resumeLoop();
        if (shouldWait) {
          return this.getOutput();
        }
        this.loopState = null;
      }
      
      // Continue from where we left off
      while (this.lineIndex < this.lines.length) {
        const i = this.lineIndex;
        
        const trimmed = this.lines[i].trim();
        
        // Debug Trek main loop detection
        if (trimmed.includes('while ((e >= 0) * (d >= 0))')) {
          console.log(`[TREK-MAIN-LOOP] Found main loop at line ${i}: e=${this.variables.e}, d=${this.variables.d}, condition=${(this.variables.e >= 0) * (this.variables.d >= 0)}`);
        }
        
        // Skip comments, empty lines
        if (trimmed.startsWith('/*') || trimmed.startsWith('//') || trimmed === '' || trimmed === ']') {
          this.lineIndex++;
          continue;
        }
        
        // Skip if we're inside a function definition (not executing)
        if (this.skipToLine >= 0) {
          if (i < this.skipToLine) {
            this.lineIndex++;
            continue;
          }
          this.skipToLine = -1;
        }
        
        // Check if this line is inside a function definition
        const inFuncDef = Object.values(this.functions).some(
          func => i > func.startLine && i <= func.endLine
        );
        if (inFuncDef && !this.inFunction) {
          this.lineIndex++;
          continue;
        }
        
        // Execute the line
        const shouldWait = this.executeLine(trimmed);
        if (shouldWait) {
          // Don't increment lineIndex - we need to re-execute this line after input
          return this.getOutput();
        }
        
        // Only increment if we didn't need to wait
        this.lineIndex++;
      }
      
      // Finished execution
      this.waitingForInput = false;
      
    } catch (error) {
      const errorMsg = `Interpreter error at line ${this.lineIndex}: ${error.message}`;
      this.println('\\n' + errorMsg);
      this.waitingForInput = false;
      throw new Error(errorMsg);
    }
    
    return this.getOutput();
  }
  
  // Execute a single line
  executeLine(line) {
    this.totalExecutedLines++;
    
    // Check execution time every 1000 lines to avoid overhead
    if (this.totalExecutedLines % 1000 === 0) {
      const elapsed = Date.now() - this.executionStartTime;
      if (elapsed > 30000) {  // 30 second timeout - more generous for complex programs
        console.error('TIMEOUT: Execution exceeded 30 seconds');
        console.error('Executed', this.totalExecutedLines, 'lines in', elapsed, 'ms');
        console.error('Last line:', line, 'at index', this.lineIndex);
        console.error('Actual line content:', this.lines[this.lineIndex]);
        console.error('Variables:', {k: this.variables.k, b: this.variables.b, i: this.variables.i, j: this.variables.j, d: this.variables.d, m: this.variables.m, n: this.variables.n});
        console.error('In loop?', this.inLoop, 'In function?', this.inFunction, 'Current function:', this.currentFunction);
        throw new Error('Execution timeout - possible infinite loop');
      }
    }
    
    // Also check line count as backup
    if (this.totalExecutedLines > 10000000) {
      console.error('EMERGENCY STOP: Executed over 10 million lines');
      console.error('Last line:', line);
      throw new Error('Execution limit exceeded');
    }
    
    // Progress logging - reduced frequency
    if (this.totalExecutedLines % 10000 === 0) {
      const elapsed = Date.now() - this.executionStartTime;
      console.log('Executed', this.totalExecutedLines, 'lines in', elapsed, 'ms', '- Line', this.lineIndex, ':', this.lines[this.lineIndex]?.substring(0, 50));
    }
    
    // Handle multiple statements on one line separated by semicolons
    // BUT: Don't split for/while/if statements which have semicolons in their syntax
    if (line.includes(';') && !line.includes('"') && !line.match(/^(for|while|if)\s*\(/)) {
      const statements = line.split(';').map(s => s.trim()).filter(s => s);
      for (const stmt of statements) {
        const shouldWait = this.executeLine(stmt);
        if (shouldWait || this.shouldReturn || this.shouldBreak || this.shouldContinue) {
          return shouldWait;
        }
      }
      return false;
    }
    
    // Check for return statement
    if (line.startsWith('return ')) {
      const expr = line.substring(7);
      this.returnValue = this.evaluateExpression(expr);
      this.shouldReturn = true;
      return false;
    }
    
    if (line === 'return') {
      this.shouldReturn = true;
      return false;
    }
    
    // Check for break
    if (line === 'break') {
      this.shouldBreak = true;
      return false;
    }
    
    // Check for continue
    if (line === 'continue') {
      this.shouldContinue = true;
      return false;
    }
    
    // Check for standalone increment/decrement (e.g., ++i, i++, --i, i--)
    if (line.match(/^(\+\+|--)\w+$/) || line.match(/^\w+(\+\+|--)$/)) {
      // Just evaluate it - evaluateExpression handles the increment
      this.evaluateExpression(line);
      return false;
    }
    
    // Check for if statement
    if (line.match(/^if\s*\(/)) {
      return this.executeIf(line);
    }
    
    // Check for while loop
    if (line.match(/^while\s*\(/)) {
      return this.executeWhile(line);
    }
    
    // Check for do-while loop  
    if (line.startsWith('do ') || line === 'do [') {
      console.log('[executeLine] Detected do-while at line', this.lineIndex, ':', line);
      return this.executeDo(line);
    }
    
    // Check for for loop
    if (line.match(/^for\s*\(/)) {
      return this.executeFor(line);
    }
    
    // Function call - but not assignment (avoid matching "array(index) = value")
    if (line.match(/^(\w+)\s*\(/) && !line.includes('=')) {
      console.log(`[FUNC-CALL] Executing function: ${line}`);
      return this.executeFunction(line);
    }
    
    // Standard library calls without parens
    if (line.startsWith('pl ')) {
      const match = line.match(/pl\s+"([^"]*)"/);
      if (match) {
        this.println(match[1]);
      } else if (line === 'pl ""') {
        this.println();
      }
      return false;
    }
    
    // Handle MC (Machine Call) - Machine calls from original tiny-c
    if (line.trim().startsWith('MC ')) {
      const match = line.match(/MC\s+(\d+),(\d+)/);
      if (match) {
        const value = parseInt(match[1]);
        const argCount = parseInt(match[2]);
        // In tiny-c: MC pushes a value, then the argCount determines what MC operation to perform
        // argCount is actually the MC operation code!
        // The value is pushed as data
        this.push(value);
        this.executeMC(argCount);
      }
      return false; // MC operations are synchronous, don't wait
    }
    
    if (line.startsWith('ps ')) {
      const match = line.match(/ps\s+"([^"]*)"/);
      if (match) {
        this.print(match[1]);
      }
      return false;
    }
    
    if (line.startsWith('pn ')) {
      const match = line.match(/pn\s+(.+)/);
      if (match) {
        const value = this.evaluateExpression(match[1]);
        this.print(' ' + value);
      }
      return false;
    }
    
    if (line.startsWith('pr ')) {
      const match = line.match(/pr\s+"([^"]*)"/);
      if (match) {
        this.println(match[1]);
      } else if (line === 'pr ""') {
        this.println();
      } else {
        console.warn('pr statement did not match pattern:', line);
      }
      return false;
    }
    
    // Variable or array assignment (allow leading whitespace)
    const assignMatch = line.match(/^\s*(\w+)(?:\s*\((\d+)\))?\s*=\s*(.+)/);
    
    // DEBUG: ULTRA-VERBOSE - Log EVERY line that starts with 'j'
    const trimmedLine = line.trim();
    if (trimmedLine.charAt(0) === 'j') {
      console.log(`[J-ANY] line="${trimmedLine}", char1="${trimmedLine.charAt(1)}", assignMatch=${assignMatch ? 'YES' : 'NO'}`);
    }
    
    if (assignMatch) {
      const varName = assignMatch[1];
      const arrayIndex = assignMatch[2];
      const expr = assignMatch[3];
      
      // Debug: log when we match j assignment
      if (varName === 'j') {
        console.log(`[ASSIGN-MATCH] Found j assignment: line="${line}", expr="${expr}"`);
      }
      
      // Check for getnum
      const getnumMatch = expr.match(/getnum\("([^"]*)"\)/);
      if (getnumMatch) {
        if (this.inputQueue.length > 0) {
          const input = this.getInput();
          this.print(input + '\n');
          const value = parseInt(input);
          if (arrayIndex !== undefined) {
            this.arrays[varName][parseInt(arrayIndex)] = value;
          } else {
            this.variables[varName] = value;
          }
          return false;
        } else {
          this.requestInput(getnumMatch[1] + ' ');
          return true; // Wait for input
        }
      }
      
      // Check for getcmd function call with prompt
      const getcmdMatch = expr.match(/^getcmd\("([^"]*)"\)$/);
      if (getcmdMatch) {
        const prompt = getcmdMatch[1];
        console.log(`[GETCMD] Processing getcmd with prompt: "${prompt}"`);
        if (this.inputQueue.length > 0) {
          const input = this.getInput();
          this.print(input + '\n');
          const value = input.charAt(0).charCodeAt(0);
          if (arrayIndex !== undefined) {
            this.arrays[varName][parseInt(arrayIndex)] = value;
          } else {
            this.variables[varName] = value;
          }
          console.log(`[GETCMD] Returned: '${input.charAt(0)}' (${value}) to variable ${varName}`);
          
          // Special debugging for Trek main loop variables after getcmd
          if (varName === 'cc') {
            console.log(`[GETCMD-TREK] After setting cc=${value}: e=${this.variables.e}, d=${this.variables.d}, k=${this.variables.k}`);
          }
          
          return false;
        } else {
          console.log(`[GETCMD] Waiting for input with prompt: "${prompt}"`);
          this.requestInput(prompt + ' ');
          return true; // Wait for input
        }
      }
      
      // Check for user function call (e.g., cc = getcmd("prompt"))
      const funcCallMatch = expr.match(/^(\w+)\s*\(([^)]*)\)$/);
      if (funcCallMatch && this.functions[funcCallMatch[1]]) {
        const funcName = funcCallMatch[1];
        const argsStr = funcCallMatch[2];
        const args = argsStr ? argsStr.split(',').map(a => this.evaluateExpression(a.trim())) : [];
        
        this.executeUserFunction(funcName, args);
        const value = this.returnValue || 0;
        
        if (arrayIndex !== undefined) {
          this.arrays[varName][parseInt(arrayIndex)] = value;
        } else {
          this.variables[varName] = value;
        }
        return false;
      }
      
      // Check for chained assignment (e.g., k = b = 0)
      // expr is "b = 0" when we have "k = b = 0"
      const chainedMatch = expr.match(/^(\w+)\s*=\s*(.+)$/);
      if (chainedMatch) {
        // This is chained assignment: k = b = 0
        const innerVar = chainedMatch[1];  // b
        const finalExpr = chainedMatch[2];  // 0
        let value = this.evaluateExpression(finalExpr);
        // Ensure 32-bit integer
        value = (value | 0);
        
        // Assign to both variables
        this.variables[innerVar] = value;
        if (arrayIndex !== undefined) {
          this.arrays[varName][parseInt(arrayIndex)] = value;
        } else {
          this.variables[varName] = value;
        }
        return false;
      }
      
      // Regular assignment
      // Debug logging for j assignment BEFORE evaluation
      if (varName === 'j') {
        console.log(`[ASSIGNMENT-BEFORE] Assigning to j, expr="${expr}", contains random: ${expr.includes('random')}`);
      }
      
      let value = this.evaluateExpression(expr);
      // Ensure 32-bit integer
      value = (value | 0);
      
      // Debug logging for j assignment (galaxy creation) AFTER evaluation
      if (varName === 'j') {
        console.log(`[ASSIGNMENT-AFTER] j = ${expr} => evaluated to ${value}, seed=${this.variables.seed}`);
      }
      
      if (arrayIndex !== undefined) {
        this.arrays[varName][parseInt(arrayIndex)] = value;
      } else {
        this.variables[varName] = value;
      }
      return false;
    }
    
    return false;
  }
  
  // Execute a function call
  executeFunction(line) {
    const match = line.match(/^(\w+)\s*\(([^)]*)\)/);
    if (!match) return false;
    
    const funcName = match[1];
    const argsStr = match[2];
    
    // Built-in functions (only if not user-defined)
    if (funcName === 'version') {
      return false; // Returns 7
    }
    
    if (funcName === 'random' && !this.functions['random']) {
      // Called but not assigned - just execute built-in only if no user-defined version
      const args = argsStr.split(',').map(a => this.evaluateExpression(a.trim()));
      this.randomFunc(args[0] || 100);
      return false;
    }
    
    // ps() with expression parameter (e.g., ps(buf + p))
    if (funcName === 'ps') {
      const stringMatch = argsStr.match(/"([^"]*)"/);
      if (stringMatch) {
        this.print(stringMatch[1]);
      } else {
        // Handle expression like ps(buf + p)
        // For now, just print placeholder
        this.print('[string]');
      }
      return false;
    }
    
    // pr() with parameter
    if (funcName === 'pr') {
      const stringMatch = argsStr.match(/"([^"]*)"/);
      if (stringMatch) {
        this.println(stringMatch[1]);
      } else {
        // Handle expression
        this.println('[string]');
      }
      return false;
    }
    
    // pl() - print line with parameter
    if (funcName === 'pl') {
      const stringMatch = argsStr.match(/"([^"]*)"/);
      if (stringMatch) {
        this.println(stringMatch[1]);
      } else if (argsStr.trim() === '""') {
        this.println();
      } else {
        // Handle expression
        const value = this.evaluateExpression(argsStr);
        this.println(value);
      }
      return false;
    }
    
    // pn() - print number with parameter
    if (funcName === 'pn') {
      const value = this.evaluateExpression(argsStr);
      this.print(' ' + value);
      return false;
    }
    
    // gs() - get string input into array parameter
    if (funcName === 'gs') {
      // Extract array parameter name
      const arrayParam = argsStr.trim();
      
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        this.print(input + '\n');
        
        // Store each character of the input string into the array
        if (this.arrays[arrayParam]) {
          for (let i = 0; i < input.length; i++) {
            this.arrays[arrayParam][i] = input.charCodeAt(i);
          }
          // Null-terminate the string
          this.arrays[arrayParam][input.length] = 0;
        }
        
        // Return length of string
        this.returnValue = input.length;
        console.log('gs: stored', input, 'into', arrayParam, 'length:', input.length);
        return false;
      } else {
        this.requestInput('');
        return true;
      }
    }

    // putchar() - output single character
    if (funcName === 'putchar') {
      const value = this.evaluateExpression(argsStr);
      if (value === 0) {
        this.print('"');
      } else {
        this.print(String.fromCharCode(value));
      }
      return false;
    }

    // getchar() - input single character
    if (funcName === 'getchar') {
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        this.returnValue = input.length > 0 ? input.charCodeAt(0) : 0;
        return false;
      } else {
        this.requestInput('');
        return true;
      }
    }

    // chrdy() - check if character ready
    if (funcName === 'chrdy') {
      this.returnValue = this.inputQueue.length > 0 ? 1 : 0;
      return false;
    }

    // gc() - get character (same as getchar but different name)
    if (funcName === 'gc') {
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        this.returnValue = input.length > 0 ? input.charCodeAt(0) : 0;
        return false;
      } else {
        this.requestInput('');
        return true;
      }
    }

    // gn() - get number input
    if (funcName === 'gn') {
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        const value = parseInt(input) || 0;
        this.returnValue = value;
        return false;
      } else {
        this.requestInput('number required ');
        return true;
      }
    }

    // alphanum() - check if character is alphanumeric
    if (funcName === 'alphanum') {
      const charCode = this.evaluateExpression(argsStr);
      const char = String.fromCharCode(charCode);
      const isAlphaNum = /[a-zA-Z0-9_]/.test(char);
      this.returnValue = isAlphaNum ? 1 : 0;
      return false;
    }

    // strlen() - string length
    if (funcName === 'strlen') {
      const arrayParam = argsStr.trim();
      if (this.arrays[arrayParam]) {
        let len = 0;
        while (len < this.arrays[arrayParam].length && this.arrays[arrayParam][len] !== 0) {
          len++;
        }
        this.returnValue = len;
      } else {
        this.returnValue = 0;
      }
      return false;
    }

    // strcat() - string concatenate
    if (funcName === 'strcat') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const dest = args[0];
        const src = args[1];
        if (this.arrays[dest] && this.arrays[src]) {
          // Find end of dest string
          let destLen = 0;
          while (destLen < this.arrays[dest].length && this.arrays[dest][destLen] !== 0) {
            destLen++;
          }
          // Append src to dest
          let srcIdx = 0;
          while (srcIdx < this.arrays[src].length && this.arrays[src][srcIdx] !== 0) {
            this.arrays[dest][destLen + srcIdx] = this.arrays[src][srcIdx];
            srcIdx++;
          }
          this.arrays[dest][destLen + srcIdx] = 0; // null terminate
        }
      }
      return false;
    }

    // strcpy() - string copy
    if (funcName === 'strcpy') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const dest = args[0];
        const src = args[1];
        if (this.arrays[dest] && this.arrays[src]) {
          let idx = 0;
          while (idx < this.arrays[src].length && this.arrays[src][idx] !== 0) {
            this.arrays[dest][idx] = this.arrays[src][idx];
            idx++;
          }
          this.arrays[dest][idx] = 0; // null terminate
        }
      }
      return false;
    }

    // tolower() - convert string to lowercase
    if (funcName === 'tolower') {
      const arrayParam = argsStr.trim();
      if (this.arrays[arrayParam]) {
        for (let i = 0; i < this.arrays[arrayParam].length && this.arrays[arrayParam][i] !== 0; i++) {
          const char = this.arrays[arrayParam][i];
          if (char >= 65 && char <= 90) { // A-Z
            this.arrays[arrayParam][i] = char + 32; // Convert to lowercase
          }
        }
      }
      return false;
    }

    // toupper() - convert string to uppercase
    if (funcName === 'toupper') {
      const arrayParam = argsStr.trim();
      if (this.arrays[arrayParam]) {
        for (let i = 0; i < this.arrays[arrayParam].length && this.arrays[arrayParam][i] !== 0; i++) {
          const char = this.arrays[arrayParam][i];
          if (char >= 97 && char <= 122) { // a-z
            this.arrays[arrayParam][i] = char - 32; // Convert to uppercase
          }
        }
      }
      return false;
    }

    // sak() - strike any key (prompt and wait for input)
    if (funcName === 'sak') {
      if (this.inputQueue.length > 0) {
        this.getInput(); // consume the input
        this.returnValue = 0;
        return false;
      } else {
        this.requestInput('Press Enter ... ');
        return true;
      }
    }

    // exit() - exit program
    if (funcName === 'exit') {
      this.halted = true;
      return false;
    }

    // Terminal control functions (simple implementations for web)
    if (funcName === 'cls') {
      this.output = []; // Clear screen by clearing output
      return false;
    }

    if (funcName === 'beep') {
      const args = argsStr.split(',').map(a => this.evaluateExpression(a.trim()));
      const frequency = args[0] || 800; // Default frequency
      const duration = args[1] || 200;  // Default duration in milliseconds
      
      try {
        // Create Web Audio context if it doesn't exist
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create oscillator for the tone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Connect oscillator -> gain -> output
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set frequency and waveform
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine'; // Pure sine wave tone
        
        // Set volume envelope (fade in/out to avoid clicks)
        const now = this.audioContext.currentTime;
        const durationSec = duration / 1000;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01); // Fade in
        gainNode.gain.setValueAtTime(0.1, now + durationSec - 0.01); // Hold
        gainNode.gain.linearRampToValueAtTime(0, now + durationSec); // Fade out
        
        // Start and stop the tone
        oscillator.start(now);
        oscillator.stop(now + durationSec);
        
      } catch (error) {
        console.warn('Web Audio not supported or error generating beep:', error);
        // Fallback to bell character if Web Audio fails
        this.print('\a');
      }
      
      return false;
    }

    // Cursor control functions (no-op for web)
    if (['cnormal', 'chide', 'csolid', 'on', 'off', 'solid'].includes(funcName)) {
      return false; // No-op
    }

    // Color and positioning (simplified for web)
    if (funcName === 'color' || funcName === 'hilo' || funcName === 'oo') {
      return false; // No-op
    }

    if (funcName === 'posc') {
      return false; // No-op for web
    }

    // File operations (simplified - not implemented in web version)
    if (['readfile', 'writefile', 'fopen', 'fread', 'fwrite', 'fclose'].includes(funcName)) {
      this.returnValue = -1; // File operations not supported
      return false;
    }

    // num() - convert string buffer to number
    if (funcName === 'num') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const bufferName = args[0];
        const valueName = args[1];
        if (this.arrays[bufferName]) {
          let numStr = '';
          let k = 0;
          // Read up to 5 digits
          while (k < 5 && k < this.arrays[bufferName].length) {
            const charCode = this.arrays[bufferName][k];
            const char = String.fromCharCode(charCode);
            if (char >= '0' && char <= '9') {
              numStr += char;
            } else {
              break;
            }
            k++;
          }
          // Set the value variable
          if (this.variables[valueName] !== undefined) {
            this.variables[valueName] = parseInt(numStr) || 0;
          }
          this.returnValue = k; // Return number of characters processed
        } else {
          this.returnValue = 0;
        }
      }
      return false;
    }

    // atoi() - ASCII to integer conversion
    if (funcName === 'atoi') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const bufferName = args[0];
        const valueName = args[1];
        if (this.arrays[bufferName]) {
          let numStr = '';
          let k = 0;
          let sign = 1;
          
          // Skip whitespace and handle sign
          while (k < this.arrays[bufferName].length) {
            const char = String.fromCharCode(this.arrays[bufferName][k]);
            if (char === ' ') {
              k++;
            } else if (char === '-') {
              sign = -1;
              k++;
              break;
            } else if (char === '+') {
              k++;
              break;
            } else {
              break;
            }
          }
          
          // Read digits
          const startK = k;
          while (k < this.arrays[bufferName].length) {
            const char = String.fromCharCode(this.arrays[bufferName][k]);
            if (char >= '0' && char <= '9') {
              numStr += char;
              k++;
            } else {
              break;
            }
          }
          
          // Set the value variable
          if (this.variables[valueName] !== undefined) {
            this.variables[valueName] = sign * (parseInt(numStr) || 0);
          }
          this.returnValue = k; // Return total characters processed
        } else {
          this.returnValue = 0;
        }
      }
      return false;
    }

    // ceqn() - compare equal n characters
    if (funcName === 'ceqn') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 3) {
        const a = args[0];
        const b = args[1];
        const n = this.evaluateExpression(args[2]);
        
        if (this.arrays[a] && this.arrays[b]) {
          for (let k = 0; k < n; k++) {
            if ((this.arrays[a][k] || 0) !== (this.arrays[b][k] || 0)) {
              this.returnValue = 0;
              return false;
            }
          }
          this.returnValue = 1;
        } else {
          this.returnValue = 0;
        }
      }
      return false;
    }

    // index() - find substring in string
    if (funcName === 'index') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 4) {
        const haystack = args[0]; // string to search in
        const l = this.evaluateExpression(args[1]); // length of haystack
        const needle = args[2]; // string to find
        const n = this.evaluateExpression(args[3]); // length of needle
        
        if (n <= 0) {
          this.returnValue = 1;
          return false;
        }
        if (l <= 0) {
          this.returnValue = 0;
          return false;
        }
        
        if (this.arrays[haystack] && this.arrays[needle]) {
          // Search for needle in haystack
          for (let a = 0; a + n <= l; a++) {
            let match = true;
            for (let i = 0; i < n; i++) {
              if ((this.arrays[haystack][a + i] || 0) !== (this.arrays[needle][i] || 0)) {
                match = false;
                break;
              }
            }
            if (match) {
              this.returnValue = a; // Return position where found
              return false;
            }
          }
        }
        this.returnValue = 0; // Not found
      }
      return false;
    }

    // move() - move/copy string data
    if (funcName === 'move') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const source = args[0];
        const dest = args[1];
        
        if (this.arrays[source] && this.arrays[dest]) {
          let k = 0;
          // Copy until null terminator or array end
          while (k < this.arrays[source].length && this.arrays[source][k] !== 0) {
            if (k < this.arrays[dest].length) {
              this.arrays[dest][k] = this.arrays[source][k];
            }
            k++;
          }
          // Null terminate destination
          if (k < this.arrays[dest].length) {
            this.arrays[dest][k] = 0;
          }
          this.returnValue = k; // Return length copied
        } else {
          this.returnValue = 0;
        }
      }
      return false;
    }

    // movebl() - move block of memory
    if (funcName === 'movebl') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 3) {
        // For web implementation, this is simplified
        this.returnValue = 1; // Success
      }
      return false;
    }

    // countch() - count characters
    if (funcName === 'countch') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 3) {
        const array = args[0];
        const endArray = args[1];
        const searchChar = this.evaluateExpression(args[2]);
        
        // Simple implementation - count occurrences of character
        if (this.arrays[array]) {
          let count = 0;
          for (let i = 0; i < this.arrays[array].length && this.arrays[array][i] !== 0; i++) {
            if (this.arrays[array][i] === searchChar) {
              count++;
            }
          }
          this.returnValue = count;
        } else {
          this.returnValue = 0;
        }
      }
      return false;
    }

    // scann() - scan for character
    if (funcName === 'scann') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 4) {
        const array = args[0];
        const endArray = args[1]; 
        const searchChar = this.evaluateExpression(args[2]);
        const countVar = args[3];
        
        // Simple implementation - find first occurrence
        if (this.arrays[array]) {
          for (let i = 0; i < this.arrays[array].length; i++) {
            if (this.arrays[array][i] === searchChar || this.arrays[array][i] === 0) {
              this.returnValue = i;
              return false;
            }
          }
        }
        this.returnValue = 0;
      }
      return false;
    }

    // memset() - set memory to value
    if (funcName === 'memset') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 3) {
        const array = args[0];
        const size = this.evaluateExpression(args[1]);
        const value = this.evaluateExpression(args[2]);
        
        if (this.arrays[array]) {
          for (let i = 0; i < size && i < this.arrays[array].length; i++) {
            this.arrays[array][i] = value;
          }
        }
      }
      return false;
    }

    // pft() - print formatted text (simplified)
    if (funcName === 'pft') {
      const args = argsStr.split(',').map(a => a.trim());
      if (args.length >= 2) {
        const format = args[0];
        const text = args[1];
        // Simple implementation - just print the text
        if (this.arrays[format] && this.arrays[text]) {
          let str = '';
          for (let i = 0; i < this.arrays[text].length && this.arrays[text][i] !== 0; i++) {
            str += String.fromCharCode(this.arrays[text][i]);
          }
          this.print(str);
        }
      }
      return false;
    }
    
    // User-defined function
    if (this.functions[funcName]) {
      // Note: arguments should have been parsed already in handleStatement
      this.executeUserFunction(funcName, []);
    } else {
      // Function not found - handle like original TinyC
      this.handleUndefinedFunction(funcName);
    }
    
    return false;
  }
  
  executeUserFunction(funcName, args = []) {
    const func = this.functions[funcName];
    if (!func) {
      this.handleUndefinedFunction(funcName);
      return false;
    }
    
    console.log('[executeUserFunction] Executing', funcName, 'from lineIndex', this.lineIndex, 'loopState:', this.loopState ? 'exists' : 'none');
    
    // Special debugging for main function
    if (funcName === 'main') {
      console.log('[MAIN-FUNC] Variables: e=', this.variables.e, 'd=', this.variables.d, 'cc=', this.variables.cc);
    }
    
    // If we have a saved loop state, we need to resume the loop
    if (this.loopState) {
      console.log('[executeUserFunction] Resuming loop:', this.loopState.type, 'at lineIndex', this.lineIndex);
      if (this.loopState.type === 'while') {
        // Resume the while loop directly
        const savedState = this.loopState;
        this.loopState = null; // Clear it before calling to avoid infinite recursion
        
        const savedInLoop = this.inLoop;
        this.inLoop = true;
        
        let iterations = savedState.iterations;
        const condition = savedState.condition;
        const loopStart = savedState.loopStart;
        const loopEnd = savedState.loopEnd;
        
        // Continue executing from current lineIndex (where we waited) until end of iteration
        while (this.lineIndex <= loopEnd) {
          const lineText = this.lines[this.lineIndex];
          this.lineIndex++;
          
          const trimmed = lineText.trim();
          if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
          
          const shouldWait = this.executeLine(trimmed);
          
          if (shouldWait) {
            // Still waiting - save state again
            this.loopState = {
              type: 'while',
              condition: condition,
              loopStart: loopStart,
              loopEnd: loopEnd,
              iterations: iterations,
              savedInLoop: savedState.savedInLoop
            };
            this.inLoop = savedState.savedInLoop;
            return true;
          }
          if (this.shouldReturn) {
            this.lineIndex = loopEnd;
            this.inLoop = savedState.savedInLoop;
            return false;
          }
          if (this.shouldBreak) break;
          if (this.shouldContinue) break;
        }
        
        if (this.shouldBreak) {
          this.lineIndex = loopEnd;
          this.shouldBreak = false;
          this.inLoop = savedState.savedInLoop;
          return false;
        }
        
        // Completed one iteration after resuming - check condition and continue loop
        console.log('While iteration', iterations, 'completed after resume');
        let conditionResult = this.evaluateCondition(condition);
        
        // Continue the while loop
        while (conditionResult) {
          iterations++;
          console.log('While iteration', iterations, 'condition:', condition, '=', conditionResult);
          if (iterations > 100000) {
            console.error('While loop exceeded 100000 iterations - breaking');
            this.println('ERROR: Infinite loop detected - breaking');
            break;
          }
          
          this.shouldBreak = false;
          this.shouldContinue = false;
          
          // Execute loop body
          this.lineIndex = loopStart;
          while (this.lineIndex <= loopEnd) {
            const lineText = this.lines[this.lineIndex];
            this.lineIndex++;
            
            const trimmed = lineText.trim();
            if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
            
            const shouldWait = this.executeLine(trimmed);
            
            if (shouldWait) {
              // Save loop state for resumption
              this.loopState = {
                type: 'while',
                condition: condition,
                loopStart: loopStart,
                loopEnd: loopEnd,
                iterations: iterations,
                savedInLoop: savedState.savedInLoop
              };
              this.inLoop = savedState.savedInLoop;
              return true;
            }
            if (this.shouldReturn) {
              this.lineIndex = loopEnd;
              this.inLoop = savedState.savedInLoop;
              return false;
            }
            if (this.shouldBreak) break;
            if (this.shouldContinue) break;
          }
          
          if (this.shouldBreak) break;
          
          // Re-evaluate condition for next iteration
          conditionResult = this.evaluateCondition(condition);
        }
        
        console.log('While loop ended after', iterations, 'iterations');
        this.lineIndex = loopEnd;
        this.shouldBreak = false;
        this.inLoop = savedState.savedInLoop;
        return false;
      }
      // For other loop types, add handling here if needed
    }
    
    // If we're not already in this function, set it up
    if (this.currentFunction !== funcName) {
      // Save current execution context if we're in a function
      if (this.currentFunction) {
        this.callStack.push({
          functionName: this.currentFunction,
          lineIndex: this.lineIndex
        });
      }
      
      this.currentFunction = funcName;
      this.lineIndex = func.startLine;
      this.inFunction = true;
      this.shouldReturn = false;
      this.returnValue = null;
      
      // Parse function signature to get parameter names
      const funcDefLine = this.lines[func.startLine].trim();
      // Match patterns like: funcname type param1, type param2 [
      // or: funcname type param [
      const paramMatch = funcDefLine.match(/^\w+\s+(.+?)\s*\[/);
      if (paramMatch) {
        const paramsStr = paramMatch[1];
        // Extract parameter names - they come after type keywords
        // Pattern: "int range" or "char buf(0); int width, num"
        const paramNames = [];
        const parts = paramsStr.split(/[;,]/);
        for (const part of parts) {
          const tokens = part.trim().split(/\s+/);
          // Last token(s) in each part are the variable names
          for (let i = 1; i < tokens.length; i++) {
            const token = tokens[i].replace(/[()0-9]/g, ''); // Remove array notation
            if (token && !['int', 'char'].includes(token)) {
              paramNames.push(token);
            }
          }
        }
        
        // Set parameter values as variables (just overwrite - no local scope in tiny-c)
        for (let i = 0; i < paramNames.length && i < args.length; i++) {
          this.variables[paramNames[i]] = args[i];
        }
      }
      
      this.lineIndex = func.startLine + 1;
    }
    
    // Execute until end of function or waiting for input
    while (this.lineIndex <= func.endLine) {
      // Check if execution was halted
      if (this.halted) {
        console.log('Function execution stopped - halted flag set');
        break;
      }
      
      const line = this.lines[this.lineIndex];
      
      const trimmed = line.trim();
      
      // Skip comments, empty lines, and closing brackets
      if (trimmed === '' || trimmed.startsWith('/*') || trimmed.startsWith('//')) {
        this.lineIndex++;
        continue;
      }
      if (trimmed === ']') {
        this.lineIndex++;
        break;
      }
      
      const shouldWait = this.executeLine(trimmed);
      if (shouldWait) {
        // Waiting for input - will resume here WITHOUT incrementing lineIndex
        console.log('[executeUserFunction] Waiting for input at lineIndex', this.lineIndex, 'line:', trimmed);
        return true;
      }
      
      // Check for return/break/continue BEFORE incrementing
      if (this.shouldReturn) {
        break;
      }
      
      // Only increment after successful execution
      this.lineIndex++;
    }
    
    // Finished function - restore previous context if any
    if (this.callStack.length > 0) {
      const prevContext = this.callStack.pop();
      this.currentFunction = prevContext.functionName;
      this.lineIndex = prevContext.lineIndex;
      this.inFunction = true;
      console.log(`[executeUserFunction] Restored context: ${prevContext.functionName} at line ${prevContext.lineIndex}`);
      // DO NOT increment lineIndex here - the caller's loop will handle it
    } else {
      this.currentFunction = null;
      this.inFunction = false;
      console.log(`[executeUserFunction] Function ${funcName} completed, no previous context`);
    }
    this.shouldReturn = false;
    return false;
  }

  // Handle undefined function calls like original TinyC
  handleUndefinedFunction(funcName) {
    // Set error code 3 (SYMBOLERR) like original TinyC
    this.errorCode = 3;
    this.errorFunction = funcName;
    this.errorLine = this.lineIndex;
    
    // Print error message like original TinyC
    const errorMsg = `Error 3\nUndefined function: ${funcName} at line ${this.lineIndex + 1}`;
    console.error(errorMsg);
    this.println(`\nError 3: Undefined function '${funcName}'`);
    
    // Don't halt immediately - let execution continue like original TinyC
    // The error flag will be checked later
  }
  
  randomFunc(range) {
    if (!this.last) this.last = this.seed = 99;
    this.last = (this.last * this.seed) & 0xFFFFFFFF;
    if (this.last < 0) this.last = -this.last;
    return Math.floor((this.last / 7) % range) + 1;
  }
  
  evaluateExpression(expr, depth = 0) {
    // Prevent infinite recursion
    if (depth > 50) {
      console.error('evaluateExpression: max recursion depth exceeded');
      return 0;
    }
    
    let processed = expr.trim().replace(/[;\]]$/, '');
    
    // Handle gn (get number) - returns the input queue value or 0
    if (processed === 'gn') {
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        const value = parseInt(input) || 0;
        console.log('gn =', value);
        return value;
      }
      return 0;
    }
    
    // Handle pre/post increment/decrement
    const preInc = processed.match(/\+\+(\w+)/g);
    if (preInc) {
      preInc.forEach(match => {
        const varName = match.substring(2);
        if (this.variables[varName] !== undefined) {
          this.variables[varName]++;
          processed = processed.replace(match, this.variables[varName].toString());
        }
      });
    }
    
    const preDec = processed.match(/--(\w+)/g);
    if (preDec) {
      preDec.forEach(match => {
        const varName = match.substring(2);
        if (this.variables[varName] !== undefined) {
          this.variables[varName]--;
          processed = processed.replace(match, this.variables[varName].toString());
        }
      });
    }
    
    const postInc = processed.match(/(\w+)\+\+/g);
    if (postInc) {
      postInc.forEach(match => {
        const varName = match.substring(0, match.length - 2);
        if (this.variables[varName] !== undefined) {
          const oldVal = this.variables[varName];
          this.variables[varName]++;
          processed = processed.replace(match, oldVal.toString());
        }
      });
    }
    
    const postDec = processed.match(/(\w+)--/g);
    if (postDec) {
      postDec.forEach(match => {
        const varName = match.substring(0, match.length - 2);
        if (this.variables[varName] !== undefined) {
          const oldVal = this.variables[varName];
          this.variables[varName]--;
          processed = processed.replace(match, oldVal.toString());
        }
      });
    }
    
    // Replace variables with their values
    for (const varName in this.variables) {
      const regex = new RegExp('\\b' + varName + '\\b', 'g');
      let value = this.variables[varName];
      // Convert booleans to numbers (C-style: false=0, true=1)
      if (typeof value === 'boolean') {
        value = value ? 1 : 0;
      }
      processed = processed.replace(regex, value.toString());
    }
    
    // Handle character constants EARLY
    processed = processed.replace(/'([^'])'/g, (match, char) => char.charCodeAt(0).toString());
    
    // Replace array access with expressions
    for (const arrName in this.arrays) {
      // Match array access with any content inside parens
      const regex = new RegExp(arrName + '\\s*\\(([^)]+)\\)', 'g');
      let match;
      while ((match = regex.exec(processed)) !== null) {
        const indexExpr = match[1];
        try {
          const index = this.evaluateExpression(indexExpr, depth + 1);
          const value = (this.arrays[arrName][parseInt(index)] || 0).toString();
          processed = processed.substring(0, match.index) + value + processed.substring(match.index + match[0].length);
          regex.lastIndex = 0; // Reset regex after modification
        } catch (e) {
          console.error('Error evaluating array index:', indexExpr, e);
        }
      }
    }
    
    // Handle user-defined function calls in expressions
    // Match any function call pattern
    const funcCallPattern = /(\w+)\s*\(([^)]*)\)/g;
    let funcMatch;
    const functionsToReplace = [];
    
    while ((funcMatch = funcCallPattern.exec(processed)) !== null) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      
      // Skip if it's a known non-function pattern or already handled
      if (funcName === 'version' || funcName === 'gn') {
        continue;
      }
      
      // Skip if it's an array (should have been handled earlier)
      if (this.arrays[funcName]) {
        continue;
      }
      
      // If it's a user-defined function, we need to call it
      if (this.functions[funcName]) {
        functionsToReplace.push({
          match: funcMatch[0],
          index: funcMatch.index,
          funcName: funcName,
          argsStr: argsStr
        });
      } else {
        // Check if it's a builtin function, if not, it's undefined
        const builtins = ['random', 'version', 'abs', 'strlen', 'alphanum', 'chrdy', 
                         'putchar', 'getchar', 'ps', 'pl', 'pn', 'gs', 'gn', 'beep',
                         'cls', 'sak', 'exit', 'tolower', 'toupper', 'strcat', 'strcpy'];
        if (!builtins.includes(funcName)) {
          this.handleUndefinedFunction(funcName);
          // Replace with 0 to continue expression evaluation
          processed = processed.substring(0, funcMatch.index) + '0' + processed.substring(funcMatch.index + funcMatch[0].length);
          // Reset regex after modification
          funcCallPattern.lastIndex = 0;
        }
      }
    }
    
    // Replace user function calls with their return values
    // Process in reverse order to maintain correct indices
    for (let i = functionsToReplace.length - 1; i >= 0; i--) {
      const {match, index, funcName, argsStr} = functionsToReplace[i];
      
      // Save current context
      const savedLineIndex = this.lineIndex;
      const savedCurrentFunction = this.currentFunction;
      const savedCallStack = [...this.callStack];
      const savedInFunction = this.inFunction;
      const savedReturnValue = this.returnValue;
      
      // Evaluate arguments
      const args = argsStr ? argsStr.split(',').map(a => this.evaluateExpression(a.trim(), depth + 1)) : [];
      
      // Call the user function with arguments
      this.returnValue = null;
      this.executeUserFunction(funcName, args);
      const result = this.returnValue || 0;
      
      // Debug logging for random function
      if (funcName === 'random' && depth < 2) {
        console.log(`random(${args[0]}) returned ${result}, seed now: ${this.variables.seed}`);
      }
      
      // Restore context
      this.lineIndex = savedLineIndex;
      this.currentFunction = savedCurrentFunction;
      this.callStack = savedCallStack;
      this.inFunction = savedInFunction;
      this.returnValue = savedReturnValue;
      
      // Replace in processed string
      processed = processed.substring(0, index) + result.toString() + processed.substring(index + match.length);
    }
    
    // Handle built-in function calls AFTER checking for user-defined versions
    // Only use built-in functions if they are NOT user-defined
    if (processed.includes('random(') && !this.functions['random']) {
      const match = processed.match(/random\(([^)]+)\)/);
      if (match) {
        const rangeExpr = match[1];
        const range = parseInt(rangeExpr) || 100;
        const result = this.randomFunc(range);
        processed = processed.replace(match[0], result.toString());
      }
    }
    
    if (processed.includes('version()')) {
      processed = processed.replace(/version\(\)/g, '7');
    }
    
    if (processed.includes('abs(') && !this.functions['abs']) {
      const match = processed.match(/abs\(([^)]+)\)/);
      if (match) {
        const val = this.evaluateExpression(match[1], depth + 1);
        processed = processed.replace(match[0], Math.abs(val).toString());
      }
    }

    // Add support for other builtin functions in expressions
    if (processed.includes('strlen(') && !this.functions['strlen']) {
      const match = processed.match(/strlen\(([^)]+)\)/);
      if (match) {
        const arrayParam = match[1];
        let len = 0;
        if (this.arrays[arrayParam]) {
          while (len < this.arrays[arrayParam].length && this.arrays[arrayParam][len] !== 0) {
            len++;
          }
        }
        processed = processed.replace(match[0], len.toString());
      }
    }

    if (processed.includes('alphanum(') && !this.functions['alphanum']) {
      const match = processed.match(/alphanum\(([^)]+)\)/);
      if (match) {
        const charCode = this.evaluateExpression(match[1], depth + 1);
        const char = String.fromCharCode(charCode);
        const isAlphaNum = /[a-zA-Z0-9_]/.test(char);
        processed = processed.replace(match[0], (isAlphaNum ? 1 : 0).toString());
      }
    }

    if (processed.includes('chrdy()') && !this.functions['chrdy']) {
      const result = this.inputQueue.length > 0 ? 1 : 0;
      processed = processed.replace(/chrdy\(\)/g, result.toString());
    }
    
    // Evaluate basic math expressions
    try {
      if (/^[\d+\-*/()\s%<>=!&|]+$/.test(processed)) {
        let result = eval(processed);
        // Convert boolean results to numbers (C-style: false=0, true=1)
        if (typeof result === 'boolean') {
          result = result ? 1 : 0;
        }
        // Simulate 32-bit signed integer arithmetic (to prevent overflow issues)
        if (typeof result === 'number' && !Number.isNaN(result) && Number.isFinite(result)) {
          result = (result | 0); // Convert to 32-bit signed integer
        }
        // Debug: log comparison results involving < 5 or < 99
        if (depth === 0 && (processed.includes('< 5') || processed.includes('< 99'))) {
          console.log(`[EVAL] "${processed}" => ${result}`);
        }
        return result;
      }
      const num = parseInt(processed);
      if (!isNaN(num)) {
        return num;
      }
    } catch (e) {
      console.error('Expression evaluation error:', e);
    }
    
    return 0;
  }
  
  // Find matching closing bracket
  findClosingBracket(startLine) {
    let depth = 0;
    console.log('[findClosingBracket] Starting at line', startLine, ':', this.lines[startLine]);
    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      for (const char of line) {
        if (char === '[') {
          depth++;
          console.log('[findClosingBracket] Line', i, 'found [, depth now', depth);
        }
        if (char === ']') {
          depth--;
          console.log('[findClosingBracket] Line', i, 'found ], depth now', depth);
          if (depth === 0) {
            console.log('[findClosingBracket] Returning line', i);
            return i;
          }
        }
      }
    }
    return this.lines.length;
  }
  
  // Evaluate a condition expression
  evaluateCondition(condExpr) {
    const result = this.evaluateExpression(condExpr);
    return Boolean(result);
  }
  
  // Execute if statement
  executeIf(line) {
    // Extract condition by finding matching parentheses
    if (!line.startsWith('if ')) return false;
    
    let parenDepth = 0;
    let conditionStart = -1;
    let conditionEnd = -1;
    
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '(') {
        if (parenDepth === 0) conditionStart = i + 1;
        parenDepth++;
      } else if (line[i] === ')') {
        parenDepth--;
        if (parenDepth === 0) {
          conditionEnd = i;
          break;
        }
      }
    }
    
    if (conditionStart === -1 || conditionEnd === -1) return false;
    
    const condition = line.substring(conditionStart, conditionEnd);
    const rest = line.substring(conditionEnd + 1).trim();
    
    // Check if condition contains getcmd() - need to handle input
    const getcmdMatch = condition.match(/getcmd\("([^"]*)"\)/);
    if (getcmdMatch) {
      if (this.inputQueue.length === 0) {
        // Need to wait for input - save state
        this.requestInput(getcmdMatch[1] + ' ');
        this.lineIndex--; // Go back so we re-execute this if statement
        return true;
      } else {
        // We have input - evaluate the condition
        const input = this.getInput();
        this.print(input + '\n');
        const charCode = input.charAt(0).charCodeAt(0);
        // Replace getcmd(...) with the character code in the condition
        let newCondition = condition.replace(getcmdMatch[0], charCode.toString());
        // Also replace any character constants in the condition
        newCondition = newCondition.replace(/'([^'])'/g, (match, char) => char.charCodeAt(0).toString());
        const conditionTrue = this.evaluateCondition(newCondition);
        
        // Execute the rest based on condition
        if (rest.startsWith('[')) {
          // Block if statement
          const blockStart = this.lineIndex;
          const blockEnd = this.findClosingBracket(this.lineIndex - 1);
          
          if (conditionTrue) {
            // Execute the if block
            while (this.lineIndex <= blockEnd) {
              const line = this.lines[this.lineIndex];
              this.lineIndex++;
              
              const trimmed = line.trim();
              if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
              
              const shouldWait = this.executeLine(trimmed);
              if (shouldWait) return true;
              if (this.shouldReturn || this.shouldBreak || this.shouldContinue) break;
            }
          } else {
            // Skip the if block
            this.lineIndex = blockEnd + 1;
          }
        } else {
          // Single line if
          if (conditionTrue && rest) {
            const shouldWait = this.executeLine(rest);
            if (shouldWait) return true;
          }
        }
        return false;
      }
    }
    
    const conditionTrue = this.evaluateCondition(condition);
    
    if (rest.startsWith('[')) {
      // Block if statement
      const blockStart = this.lineIndex;
      const blockEnd = this.findClosingBracket(this.lineIndex - 1);
      
      if (conditionTrue) {
        // Execute the if block
        while (this.lineIndex <= blockEnd) {
          const line = this.lines[this.lineIndex];
          this.lineIndex++;
          
          const trimmed = line.trim();
          if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
          
          const shouldWait = this.executeLine(trimmed);
          if (shouldWait) return true;
          if (this.shouldReturn || this.shouldBreak || this.shouldContinue) break;
        }
      } else {
        // Skip the if block
        this.lineIndex = blockEnd + 1;
      }
      
      // Check for else
      if (this.lineIndex < this.lines.length) {
        const nextLine = this.lines[this.lineIndex].trim();
        if (nextLine.startsWith('else') || nextLine === 'else [') {
          this.lineIndex++;
          if (!conditionTrue) {
            const elseEnd = this.findClosingBracket(this.lineIndex - 1);
            while (this.lineIndex <= elseEnd) {
              const line = this.lines[this.lineIndex];
              this.lineIndex++;
              
              const trimmed = line.trim();
              if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
              
              const shouldWait = this.executeLine(trimmed);
              if (shouldWait) return true;
              if (this.shouldReturn || this.shouldBreak || this.shouldContinue) break;
            }
          } else {
            // Skip else block
            this.lineIndex = this.findClosingBracket(this.lineIndex - 1) + 1;
          }
        }
      }
    } else {
      // Single line if
      if (conditionTrue && rest) {
        const shouldWait = this.executeLine(rest);
        if (shouldWait) return true;
      }
    }
    
    return false;
  }
  
  // Resume a loop after waiting for input
  resumeLoop() {
    if (!this.loopState) return false;
    
    if (this.loopState.type === 'while') {
      const { condition, loopStart, loopEnd, iterations, savedInLoop } = this.loopState;
      
      this.inLoop = true;
      let iterCount = iterations;
      
      // Continue executing from current position in the loop
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        
        if (shouldWait) {
          // Still waiting - save state again
          this.loopState = {
            type: 'while',
            condition: condition,
            loopStart: loopStart,
            loopEnd: loopEnd,
            iterations: iterCount,
            savedInLoop: savedInLoop
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.lineIndex = loopEnd;
          this.inLoop = savedInLoop;
          this.loopState = null;
          return false;
        }
        if (this.shouldBreak) {
          this.lineIndex = loopEnd;
          this.shouldBreak = false;
          this.inLoop = savedInLoop;
          this.loopState = null;
          return false;
        }
        if (this.shouldContinue) {
          this.shouldContinue = false;
          break;
        }
      }
      
      // Continue with the while loop
      let conditionResult = this.evaluateCondition(condition);
      console.log('[WHILE-LOOP] Starting while loop with condition:', condition, '=', conditionResult);
      
      // Special debugging for Trek main loop
      if (condition.includes('e >= 0') && condition.includes('d >= 0')) {
        console.log('[TREK-LOOP] Initial: e =', this.variables.e, 'd =', this.variables.d, 'cc =', this.variables.cc);
      }
      
      while (conditionResult) {
        iterCount++;
        console.log('[WHILE-LOOP] While iteration', iterCount, 'condition:', condition, '=', conditionResult);
        
        // Special debugging for Trek main loop
        if (condition.includes('e >= 0') && condition.includes('d >= 0')) {
          console.log('[TREK-LOOP] Iteration', iterCount, ': e =', this.variables.e, 'd =', this.variables.d, 'cc =', this.variables.cc);
        }
        if (iterCount > 100000) {
          console.error('While loop exceeded 100000 iterations - breaking');
          this.println('ERROR: Infinite loop detected - breaking');
          break;
        }
        
        this.shouldBreak = false;
        this.shouldContinue = false;
        
        // Execute loop body
        this.lineIndex = loopStart;
        while (this.lineIndex <= loopEnd) {
          const lineText = this.lines[this.lineIndex];
          this.lineIndex++;
          
          const trimmed = lineText.trim();
          if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
          
          const shouldWait = this.executeLine(trimmed);
          
          if (shouldWait) {
            // Save loop state for resumption
            this.loopState = {
              type: 'while',
              condition: condition,
              loopStart: loopStart,
              loopEnd: loopEnd,
              iterations: iterCount,
              savedInLoop: savedInLoop
            };
            this.inLoop = savedInLoop;
            return true;
          }
          if (this.shouldReturn) {
            this.lineIndex = loopEnd;
            this.inLoop = savedInLoop;
            this.loopState = null;
            return false;
          }
          if (this.shouldBreak) break;
          if (this.shouldContinue) break;
        }
        
        if (this.shouldBreak) break;
        
        // Re-evaluate condition for next iteration
        conditionResult = this.evaluateCondition(condition);
        
        // Special debugging for Trek main loop
        if (condition.includes('e >= 0') && condition.includes('d >= 0')) {
          console.log('[TREK-LOOP] Re-evaluated: e =', this.variables.e, 'd =', this.variables.d, 'condition =', conditionResult);
        }
      }
      
      console.log('While loop ended after', iterCount, 'iterations');
      // Set lineIndex to last line of loop; main loop will increment
      this.lineIndex = loopEnd;
      this.shouldBreak = false;
      this.inLoop = savedInLoop;
      this.loopState = null;
      return false;
    }
    
    if (this.loopState.type === 'do-while') {
      const { loopStart, loopEnd, iterations, savedInLoop } = this.loopState;
      
      console.log('resumeLoop: Resuming do-while from lineIndex', this.lineIndex, 'iteration', iterations);
      
      this.inLoop = true;
      let iterCount = iterations;
      let continueLoop = true;
      
      // Continue executing from current position in the loop
      while (this.lineIndex <= loopEnd) {
        const currentLine = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = currentLine.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[') continue;
        
        // Check for ] while (condition) pattern
        if (trimmed.startsWith(']') && trimmed.includes('while')) {
          // Extract condition with proper parenthesis matching
          console.log('[resumeLoop1] Do-while end:', trimmed);
          const whileIndex = trimmed.indexOf('while');
          const openParen = trimmed.indexOf('(', whileIndex);
          
          if (openParen !== -1) {
            let parenDepth = 1; // Start at 1 since we found the opening paren
            let condEnd = -1;
            
            for (let i = openParen + 1; i < trimmed.length; i++) {
              if (trimmed[i] === '(') {
                parenDepth++;
              } else if (trimmed[i] === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                  condEnd = i;
                  break;
                }
              }
            }
            
            if (condEnd !== -1) {
              const condition = trimmed.substring(openParen + 1, condEnd);
              console.log('[resumeLoop1] Extracted:', condition);
              continueLoop = this.evaluateCondition(condition);
              console.log('Do-while condition:', condition, '=', continueLoop);
            }
          }
          break;
        }
        
        if (trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        if (shouldWait) {
          // Still waiting - save state again
          this.loopState = {
            type: 'do-while',
            loopStart: loopStart,
            loopEnd: loopEnd,
            iterations: iterCount,
            savedInLoop: savedInLoop
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.inLoop = savedInLoop;
          this.loopState = null;
          return false;
        }
        if (this.shouldBreak) {
          continueLoop = false;
          break;
        }
        if (this.shouldContinue) break;
      }
      
      // Continue with the do-while loop if condition is true
      while (continueLoop && !this.shouldBreak) {
        iterCount++;
        if (iterCount > 10000) {
          console.error('Do-while loop exceeded 10000 iterations - breaking');
          break;
        }
        
        this.lineIndex = loopStart;
        this.shouldBreak = false;
        this.shouldContinue = false;
        
        // Execute loop body
        while (this.lineIndex <= loopEnd) {
          const currentLine = this.lines[this.lineIndex];
          this.lineIndex++;
          
          const trimmed = currentLine.trim();
          if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[') continue;
          
          // Check for ] while (condition) pattern
          if (trimmed.startsWith(']') && trimmed.includes('while')) {
            // Extract condition with proper parenthesis matching
            console.log('[resumeLoop2] Do-while end:', trimmed);
            const whileIndex = trimmed.indexOf('while');
            const openParen = trimmed.indexOf('(', whileIndex);
            
            if (openParen !== -1) {
              let parenDepth = 1; // Start at 1 since we found the opening paren
              let condEnd = -1;
              
              for (let i = openParen + 1; i < trimmed.length; i++) {
                if (trimmed[i] === '(') {
                  parenDepth++;
                } else if (trimmed[i] === ')') {
                  parenDepth--;
                  if (parenDepth === 0) {
                    condEnd = i;
                    break;
                  }
                }
              }
              
              if (condEnd !== -1) {
                const condition = trimmed.substring(openParen + 1, condEnd);
                console.log('[resumeLoop2] Extracted:', condition);
                continueLoop = this.evaluateCondition(condition);
                console.log('Do-while condition:', condition, '=', continueLoop);
              }
            }
            break;
          }
          
          if (trimmed === ']') continue;
          
          const shouldWait = this.executeLine(trimmed);
          if (shouldWait) {
            // Save do-while loop state for resumption
            this.loopState = {
              type: 'do-while',
              loopStart: loopStart,
              loopEnd: loopEnd,
              iterations: iterCount,
              savedInLoop: savedInLoop
            };
            this.inLoop = savedInLoop;
            return true;
          }
          if (this.shouldReturn) {
            this.inLoop = savedInLoop;
            this.loopState = null;
            return false;
          }
          if (this.shouldBreak) {
            continueLoop = false;
            break;
          }
          if (this.shouldContinue) break;
        }
      }
      
      this.lineIndex = loopEnd;
      this.shouldBreak = false;
      this.inLoop = savedInLoop;
      this.loopState = null;
      return false;
    }
    
    return false;
  }
  
  // Execute while loop
  executeWhile(line) {
    const match = line.match(/^\s*while\s*\(([^)]+)\)\s*(\[)?$/);
    if (!match) return false;
    
    let condition = match[1];
    const hasBracket = match[2] === '[';
    let loopStart = this.lineIndex;
    let loopEnd = hasBracket ? this.findClosingBracket(this.lineIndex - 1) : this.lineIndex;
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
    
    // Check if we're resuming an existing while loop
    if (this.loopState && this.loopState.type === 'while') {
      console.log('Resuming while loop from saved state, iteration', this.loopState.iterations, 'lineIndex', this.lineIndex);
      // We're resuming - continue executing from current lineIndex within the loop
      iterations = this.loopState.iterations;
      loopStart = this.loopState.loopStart;
      loopEnd = this.loopState.loopEnd;
      condition = this.loopState.condition;
      this.loopState = null; // Clear the state since we're handling it now
      
      // Continue executing from current lineIndex (which is where we waited)
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        
        if (shouldWait) {
          // Still waiting - save state again
          this.loopState = {
            type: 'while',
            condition: condition,
            loopStart: loopStart,
            loopEnd: loopEnd,
            iterations: iterations,
            savedInLoop: savedInLoop
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.lineIndex = loopEnd;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) break;
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) {
        this.lineIndex = loopEnd;
        this.shouldBreak = false;
        this.inLoop = savedInLoop;
        return false;
      }
      
      // Completed one iteration after resuming - check condition for next iteration
      console.log('While iteration', iterations, 'completed after resume');
      conditionResult = this.evaluateCondition(condition);
      if (!conditionResult) {
        // Loop condition is false after resume, exit loop
        this.lineIndex = loopEnd;
        this.shouldBreak = false;
        this.inLoop = savedInLoop;
        return false;
      }
      // Condition is still true, start next iteration
      iterations++;
    }
    
    // Start the while loop (or continue if resuming)
    let conditionResult = this.evaluateCondition(condition);
    while (conditionResult) {
      iterations++;
      console.log('While iteration', iterations, 'condition:', condition, '=', conditionResult);
      if (iterations > 100000) {
        console.error('While loop exceeded 100000 iterations - breaking');
        this.println('ERROR: Infinite loop detected - breaking');
        break;
      }
      
      this.shouldBreak = false;
      this.shouldContinue = false;
      
      // Execute loop body
      this.lineIndex = loopStart;
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        
        if (shouldWait) {
          // Save loop state for resumption
          this.loopState = {
            type: 'while',
            condition: condition,
            loopStart: loopStart,
            loopEnd: loopEnd,
            iterations: iterations,
            savedInLoop: savedInLoop
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.lineIndex = loopEnd;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) break;
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) break;
      
      // Re-evaluate condition for next iteration
      conditionResult = this.evaluateCondition(condition);
    }
    
    console.log('While loop ended after', iterations, 'iterations');
    // Set lineIndex to the last line of loop body; main loop will increment
    this.lineIndex = loopEnd;
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    return false;
  }
  
  // Execute do-while loop
  executeDo(line) {
    // The body starts AFTER the do [ line
    const bodyStart = this.lineIndex + 1;
    const bodyEnd = this.findClosingBracket(this.lineIndex);
    
    // CRITICAL: Find the "while (condition)" - it's often on the same line as ]
    let condition = null;
    let whileLineIndex = bodyEnd;
    
    // First check if the closing bracket line has "while" on it
    const closingLine = this.lines[bodyEnd].trim();
    console.log('[DO-WHILE] Closing bracket line', bodyEnd, ':', closingLine);
    
    if (closingLine.includes('while')) {
      const whileIndex = closingLine.indexOf('while');
      const rest = closingLine.substring(whileIndex);
      const whileMatch = rest.match(/^while\s*\((.+)\)/);
      if (whileMatch) {
        condition = whileMatch[1];
        console.log('[DO-WHILE] Found condition on bracket line:', condition);
      }
    }
    
    // If not found, check the next line
    if (!condition) {
      whileLineIndex = bodyEnd + 1;
      while (whileLineIndex < this.lines.length) {
        const whileLine = this.lines[whileLineIndex].trim();
        if (whileLine === '' || whileLine.startsWith('/*')) {
          whileLineIndex++;
          continue;
        }
        
        const whileMatch = whileLine.match(/^while\s*\((.+)\)/);
        if (whileMatch) {
          condition = whileMatch[1];
          console.log('[DO-WHILE] Found condition at line', whileLineIndex, ':', condition);
          break;
        }
        
        break; // Stop if we hit non-whitespace that's not "while"
      }
    }
    
    if (!condition) {
      console.error('[DO-WHILE] Could not find while condition after do block!');
      console.error('Body end line', bodyEnd, ':', this.lines[bodyEnd]);
      console.error('Next line', bodyEnd + 1, ':', this.lines[bodyEnd + 1]);
      // Advance past the closing bracket to avoid infinite loop
      this.lineIndex = bodyEnd + (whileLineIndex > bodyEnd ? whileLineIndex : bodyEnd + 1);
      return false;
    }
    
    console.log('Do-while: body lines', bodyStart, '-', bodyEnd, 'condition:', condition);
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
    let continueLoop = true;
    
    // This matches the C code: FOREVER { st(); check condition; if true goto repeat }
    while (continueLoop) {
      iterations++;
      if (iterations <= 5 || iterations % 10 === 0) {
        console.log('Do-while iteration', iterations, '- Variables: k=', this.variables.k, 'b=', this.variables.b, 'j=', this.variables.j, 'i=', this.variables.i, 'm=', this.variables.m, 'seed=', this.variables.seed);
      }
      if (iterations > 1000) {
        console.error('Do-while loop exceeded 1000 iterations - BREAKING');
        console.error('Final values: k=', this.variables.k, 'b=', this.variables.b);
        break;
      }
      
      // Execute loop body from bodyStart to just before bodyEnd (which contains "])
      this.lineIndex = bodyStart;
      this.shouldBreak = false;
      this.shouldContinue = false;
      
      if (iterations === 1) {
        console.log('[DO-WHILE-BODY] First iteration - executing lines', bodyStart, 'to', bodyEnd - 1);
        console.log('[DO-WHILE-BODY] Variables before: k=', this.variables.k, 'b=', this.variables.b, 'i=', this.variables.i, 'seed=', this.variables.seed);
      }
      
      while (this.lineIndex < bodyEnd) {
        const currentLine = this.lines[this.lineIndex];
        const currentLineNum = this.lineIndex;
        
        const trimmed = currentLine.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') {
          this.lineIndex++;
          continue;
        }
        
        if (iterations === 1) {
          console.log('[DO-WHILE-BODY] Line', currentLineNum, ':', trimmed);
        }
        
        // Execute the line - if it's a control structure (for, while, if), 
        // it will update lineIndex to point to the end of its block
        const shouldWait = this.executeLine(trimmed);
        
        // After executeLine, lineIndex might have been updated by nested control structures
        // Don't increment if it was already moved forward
        const lineWasUpdated = this.lineIndex !== currentLineNum;
        if (!lineWasUpdated) {
          this.lineIndex++;
        }
        
        if (shouldWait) {
          this.loopState = {
            type: 'do-while',
            bodyStart: bodyStart,
            bodyEnd: bodyEnd,
            condition: condition,
            iterations: iterations,
            savedInLoop: savedInLoop
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) {
          continueLoop = false;
          break;
        }
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) break;
      
      if (iterations === 1) {
        console.log('[DO-WHILE-BODY] After first iteration - k=', this.variables.k, 'b=', this.variables.b, 'i=', this.variables.i);
      }
      
      // Now evaluate the condition (like the C code does after st())
      continueLoop = this.evaluateCondition(condition);
      console.log('Do-while condition:', condition, '=', continueLoop);
    }
    
    // Jump past the while condition line - if condition was on same line as ], 
    // then jump to next line after bodyEnd, otherwise jump past the while line
    // IMPORTANT: We need to set lineIndex to the line BEFORE the one we want to execute next,
    // because continueExecution will do lineIndex++ after this returns
    if (closingLine.includes('while')) {
      this.lineIndex = bodyEnd; // Will be incremented to bodyEnd + 1
    } else {
      this.lineIndex = whileLineIndex; // Will be incremented to whileLineIndex + 1
    }
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    console.log('[DO-WHILE] Loop completed, lineIndex set to', this.lineIndex);
    return false;
  }
  
  // Execute for loop
  executeFor(line) {
    const match = line.match(/^for\s*\(([^;]*);([^;]*);([^)]*)\)\s*(\[)?$/);
    if (!match) return false;
    
    const init = match[1].trim();
    const condition = match[2].trim();
    const increment = match[3].trim();
    const hasBracket = match[4] === '[';
    
    // Debug: detect galaxy for loop
    const isGalaxyLoop = condition.includes('63');
    if (isGalaxyLoop) {
      console.log(`[FOR-GALAXY] Starting galaxy for loop`);
    }
    
    // Execute initialization
    if (init) {
      this.executeLine(init);
    }
    
    // For single-line body, execute only the next line
    // For bracketed body, execute from line after [ to line before ]
    const loopStart = this.lineIndex + 1;
    const loopEnd = hasBracket ? this.findClosingBracket(this.lineIndex) : this.lineIndex + 1;
    
    // For loop range: loopStart to loopEnd
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
    let conditionResult = !condition || this.evaluateCondition(condition);
    while (conditionResult) {
      iterations++;
      if (iterations > 10000) {
        console.error('For loop exceeded 10000 iterations - breaking');
        console.error('Loop:', init, ';', condition, ';', increment);
        console.error('Line:', this.lineIndex, '-', this.lines[this.lineIndex]);
        break;
      }
      // Log only at significant milestones
      if (iterations === 1000 || iterations === 5000 || iterations === 10000) {
        console.log('For iteration', iterations);
      }
      
      this.shouldBreak = false;
      this.shouldContinue = false;
      
      // Execute loop body
      this.lineIndex = loopStart;
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        
        if (shouldWait) {
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.lineIndex = loopEnd;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) break;
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) break;
      
      // Execute increment
      if (increment) {
        this.executeLine(increment);
      }
      
      // Re-evaluate condition for next iteration
      conditionResult = !condition || this.evaluateCondition(condition);
    }
    
    // Set lineIndex to the last line of the loop body
    // Main loop will increment it to move past the loop
    this.lineIndex = loopEnd;
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    return false;
  }
  
}
