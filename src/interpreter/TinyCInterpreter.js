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
    this.ifChainExecuted = false;  // Track if an if/else-if chain branch was executed
    this.totalExecutedLines = 0;  // Track total lines executed to detect infinite loops
    this.executionStartTime = Date.now();  // Track execution time
    this.halted = false;  // MC HALT flag
    this.stack = [];  // Stack for MC operations
    this.audioContext = null;  // Web Audio context for beep sounds
    this.errorCode = 0;  // Error code like original TinyC
    this.errorFunction = null;  // Function name that caused error
    this.errorLine = -1;  // Line number where error occurred
    // Don't reset iplLibrary - preserve it across resets
    if (!this.iplLibrary) this.iplLibrary = '';  // Initialize only if undefined
    if (!this.iplLines) this.iplLines = [];  // Preserve IPL code lines
    if (!this.iplFunctions) this.iplFunctions = {};  // Preserve IPL function definitions
    this.iplLoaded = false;  // Track if IPL has been loaded
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
  executeMC(mcNumber) {
    // MC constants from original tiny-c mc.c:
    // 1=PUTC, 2=GETC, 3=OPEN, 4=READ, 5=WRITE, 6=CLOSE, 7=MOVEBL, 
    // 8=COUNTCH, 9=SCANN, 10=HALT, 11=APPL, 12=CHRDY, 13=PUTBL, 
    // 14=PUTN, 15=GETLN, 16=SETMEM, 17=BEEP
    
    // The mcNumber parameter IS the MC operation number (passed from executeLine)
    // Data should already be on the stack before calling this function
    // Returns true if waiting for input, false otherwise
    
    // User-defined machine calls (>= 1000)
    if (mcNumber >= 1000) {
      console.log(`MC user-defined call ${mcNumber - 1000}`);
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
          break;
        } else {
          const line = this.getInput() || '';
          console.log(`[MC 15 GETLN] Read input: "${line}"`);
          // Parse buffer address from the expression (should be like "b" or "buf")
          // The MC call is "MC b,15" where b is the buffer variable
          // We need to extract the buffer name from the original expression
          // For now, we'll store it in a temporary variable and return the string
          // Actually, the buffer address is passed as first argument to MC
          // We need to write the input string to the buffer array
          const bufferAddr = this.pop();
          console.log(`[MC 15 GETLN] Buffer address: "${bufferAddr}" (type: ${typeof bufferAddr})`);
          
          // Try to find the array variable that this address refers to
          // In TinyC, arrays are passed by reference (their starting address)
          // We need to write each character of the line to the array
          if (typeof bufferAddr === 'string') {
            // It's a variable name - write to that array
            const arrayName = bufferAddr;
            console.log(`[MC 15 GETLN] Looking for array: "${arrayName}", exists: ${!!this.arrays[arrayName]}`);
            if (this.arrays[arrayName]) {
              for (let i = 0; i < line.length; i++) {
                this.arrays[arrayName][i] = line.charCodeAt(i);
              }
              this.arrays[arrayName][line.length] = 0; // Null terminator
              console.log(`[MC 15 GETLN] Wrote "${line}" to array ${arrayName}`);
            } else {
              console.warn(`[MC 15 GETLN] Array "${arrayName}" not found in this.arrays`);
            }
          } else if (typeof bufferAddr === 'number') {
            // It's a numeric address - this shouldn't happen in our simplified implementation
            console.warn('[MC 15 GETLN] received numeric buffer address:', bufferAddr);
          }
          
          this.push(line.length); // Return length
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
        console.log(`MC ${mcNumber} - not implemented`);
        // Push a default return value
        this.push(0);
      }
    }
    return this.waitingForInput || false;
  }
  
  // Strip single-line /* comments from a line
  stripComment(line) {
    const commentIndex = line.indexOf('/*');
    if (commentIndex !== -1) {
      return line.substring(0, commentIndex);
    }
    return line;
  }

  // Load IPL library (standard library functions)
  loadIPL(iplCode) {
    if (this.iplLoaded) return; // Already loaded
    
    console.log('Loading IPL library...');
    this.iplLibrary = iplCode;
    
    // Find the 'endlibrary' marker and only use code before it
    const endLibraryIndex = iplCode.indexOf('endlibrary');
    let libraryCode = iplCode;
    if (endLibraryIndex !== -1) {
      // Extract only the library portion (before 'endlibrary')
      libraryCode = iplCode.substring(0, endLibraryIndex);
      console.log('IPL library ends at endlibrary marker');
    }
    
    // Parse the IPL library to extract function definitions
    // We don't execute it, just collect the function definitions
    const savedCode = this.code;
    const savedLines = this.lines;
    const savedLineIndex = this.lineIndex;
    const savedFunctions = { ...this.functions };
    const savedVariables = { ...this.variables };
    const savedArrays = { ...this.arrays };
    
    this.code = libraryCode;
    this.lines = libraryCode.split('\n').map(line => this.stripComment(line));
    this.lineIndex = 0;
    
    // Collect IPL function definitions
    this.collectDefinitions();
    
    console.log('IPL functions loaded:', Object.keys(this.functions).length);
    console.log('IPL function names:', Object.keys(this.functions).join(', '));
    
    // Store IPL lines and functions separately
    this.iplLines = this.lines;
    this.iplFunctions = this.functions;
    const iplVariables = this.variables;
    const iplArrays = this.arrays;
    
    this.code = savedCode;
    this.lines = savedLines;
    this.lineIndex = savedLineIndex;
    this.functions = { ...savedFunctions, ...this.iplFunctions };
    this.variables = { ...savedVariables, ...iplVariables };
    this.arrays = { ...savedArrays, ...iplArrays };
    
    this.iplLoaded = true;
  }
  
  // Execute a tiny-c program
  execute(code) {
    this.reset();
    
    // If IPL library was set but not loaded into this reset instance, load it
    if (this.iplLibrary && !this.iplLoaded) {
      this.loadIPL(this.iplLibrary);
    }
    
    this.code = code;
    // Strip comments from each line before splitting
    this.lines = code.split('\n').map(line => this.stripComment(line));
    this.lineIndex = 0;
    
    try {
      // First pass: collect function definitions and global variables
      console.log('[EXECUTE] Calling collectDefinitions(), code length:', this.lines.length);
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
          console.log(`[COLLECT-DEF] Line ${i}: "${trimmed}" (inFunction=${inFunction})`);
          this.parseGlobalVarDeclaration(trimmed);
          continue;
        }
        
        // Function definition: name [...] or name type params [...]
        // Need to include ; to match functions like: index char i(0);int l;char f(0);int n[
        // But be careful not to match control structures
        const funcMatch = trimmed.match(/^(\w+)(?:\s+[\w\s,();]+)?\s*\[/);
        if (funcMatch && !inFunction) {
          const funcName = funcMatch[1];
          console.log(`[FUNC-START] Line ${i}: Found function "${funcName}"`);
          // Don't treat standalone control structures as functions
          if (['if', 'else', 'while', 'for', 'do'].includes(funcName)) {
            console.log(`[FUNC-START] Skipping control structure "${funcName}"`);
            continue;
          }
          inFunction = true;
          bracketDepth = 0; // Start at 0, we'll count the brackets in the loop below
          this.functions[funcName] = { startLine: i, endLine: -1 };
          // Don't continue - we need to count brackets on this line too!
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
        console.log(`[GLOBAL-ARRAY] Created array ${name} with size ${size}`);
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
    console.log('[continueExecution] Starting - loopState:', this.loopState ? 'EXISTS' : 'null', 'currentFunction:', this.currentFunction);
    
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
        // Don't clear loop state here - executeUserFunction manages it internally
        // Only clear if function truly completed (no currentFunction)
        if (!this.currentFunction && !this.loopState) {
          // Function completed and no loop state - nothing to do
        }
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
    
    // Handle local variable declarations (int x, char buf(20))
    if (line.startsWith('int ') || line.startsWith('char ')) {
      // Check if there's more code after the declaration (separated by ;)
      const semiIndex = line.indexOf(';');
      if (semiIndex !== -1) {
        // Split: declaration before semicolon, rest after
        const declPart = line.substring(0, semiIndex).trim();
        const restPart = line.substring(semiIndex + 1).trim();
        
        console.log(`[LOCAL-DECL] Declaring: "${declPart}"`);
        this.parseGlobalVarDeclaration(declPart);
        console.log(`[LOCAL-DECL] After declaring, arrays:`, Object.keys(this.arrays));
        
        // Execute the rest of the line
        if (restPart) {
          return this.executeLine(restPart);
        }
        return false;
      } else {
        console.log(`[LOCAL-DECL] Declaring: "${line}"`);
        this.parseGlobalVarDeclaration(line);
        console.log(`[LOCAL-DECL] After declaring, arrays:`, Object.keys(this.arrays));
        return false;
      }
    }
    
    // Handle multiple statements on one line separated by semicolons
    // BUT: Don't split for/while loops which have semicolons in their header syntax
    // Also don't split if there are string literals (double quotes), but character literals (single quotes) are OK
    // Only skip splitting for 'for' loops that have semicolons in the header
    // Allow splitting lines that start with 'if' or 'while' even if they contain semicolons
    if (line.includes(';') && !/("[^"]*")/.test(line) && !line.match(/^for\s*\([^)]*;/)) {
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
      console.log(`[RETURN] Evaluating expression: "${expr}"`);
      this.returnValue = this.evaluateExpression(expr);
      console.log(`[RETURN] Result: ${this.returnValue}`);
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
      this.ifChainExecuted = false;  // Reset for new if chain
      return this.executeIf(line);
    }
    
    // Check for else if - part of if chain
    if (line.match(/^else\s+if\s*\(/)) {
      return this.executeElseIf(line);
    }
    
    // Check for else - part of if chain
    if (line.match(/^else\s+/)) {
      return this.executeElse(line);
    }
    
    // Any other line breaks the if chain
    if (!line.startsWith('else')) {
      if (this.ifChainExecuted) {
        console.log(`[IF-CHAIN-RESET] Non-else line "${line.substring(0, 30)}...", resetting ifChainExecuted from true to false`);
      }
      this.ifChainExecuted = false;
    }
    
    // Check for while loop
    if (line.match(/^while\s*\(/)) {
      console.log('[executeLine] Detected while loop:', line);
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
    
    // User-defined function calls without parentheses (e.g., "gs b" or "funcname arg1")
    // Check if line starts with a known function name followed by space and an argument
    const noParenMatch = line.match(/^(\w+)\s+(\w+)$/);
    if (noParenMatch && this.functions[noParenMatch[1]]) {
      const funcName = noParenMatch[1];
      const arg = noParenMatch[2];
      console.log(`[FUNC-CALL-NOPAREN] Calling ${funcName}(${arg})`);
      return this.executeFunction(`${funcName}(${arg})`);
    }
    
    // Standard library calls without parens
    if (line.startsWith('pl ')) {
      const match = line.match(/pl\s+"([^"]*)"/);
      if (match) {
        this.println(match[1]);
      } else if (line === 'pl ""') {
        this.println();
      } else {
        // Handle array parameter like: pl buf
        const arrayMatch = line.match(/pl\s+(\w+)/);
        if (arrayMatch) {
          const arrayName = arrayMatch[1];
          if (this.arrays[arrayName]) {
            let str = '';
            for (let i = 0; i < this.arrays[arrayName].length && this.arrays[arrayName][i] !== 0; i++) {
              str += String.fromCharCode(this.arrays[arrayName][i]);
            }
            this.println(str);
          }
        }
      }
      return false;
    }
    
    // Handle MC (Machine Call) - Machine calls from original tiny-c
    if (line.trim().startsWith('MC ')) {
      console.log('[MC-LINE] Matched MC line:', line);
      // Match MC value,operation where value can be a variable or number (with optional spaces)
      const match = line.match(/MC\s+([^,]+),\s*(\d+)/);
      if (match) {
        console.log('[MC-LINE] Matched MC pattern:', match[0], 'value:', match[1], 'op:', match[2]);
        const valueExpr = match[1].trim();
        const argCount = parseInt(match[2]);
        // Evaluate the first parameter (could be variable or expression)
        const value = this.evaluateExpression(valueExpr);
        console.log('[MC-LINE] Evaluated value:', value, 'calling executeMC with op:', argCount);
        // In tiny-c: MC pushes a value, then the argCount determines what MC operation to perform
        // argCount is actually the MC operation code!
        // The value is pushed as data
        this.push(value);
        const isWaiting = this.executeMC(argCount);
        return isWaiting; // Return true if MC operation is waiting for input
      }
      console.log('[MC-LINE] FAILED to match MC pattern for:', line);
      return false;
    }
    
    if (line.startsWith('ps ')) {
      const match = line.match(/ps\s+"([^"]*)"/);
      if (match) {
        this.print(match[1]);
      } else {
        // Handle array parameter like: ps buf
        const arrayMatch = line.match(/ps\s+(\w+)/);
        if (arrayMatch) {
          const arrayName = arrayMatch[1];
          if (this.arrays[arrayName]) {
            let str = '';
            for (let i = 0; i < this.arrays[arrayName].length && this.arrays[arrayName][i] !== 0; i++) {
              str += String.fromCharCode(this.arrays[arrayName][i]);
            }
            this.print(str);
          }
        }
      }
      return false;
    }
    
    if (line.startsWith('pn ')) {
      const match = line.match(/pn\s+(.+)/);
      if (match) {
        const expr = match[1];
        console.log(`[PN-EVAL] Evaluating: "${expr}"`);
        const value = this.evaluateExpression(expr);
        console.log(`[PN-EVAL] Result: ${value}`);
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
    // Match: varname = expr  OR  varname(index_expr) = expr
    // The index can be any expression, not just digits
    const assignMatch = line.match(/^\s*(\w+)(?:\s*\(([^)]+)\))?\s*=\s*(.+)/);
    
    // Debug array assignments
    if (line.includes('z(') && line.includes('=')) {
      console.log(`[DEBUG-ASSIGN] Line: "${line}", assignMatch: ${assignMatch ? 'YES' : 'NO'}`);
      if (assignMatch) {
        console.log(`[DEBUG-ASSIGN] Matched: varName="${assignMatch[1]}", indexExpr="${assignMatch[2]}", expr="${assignMatch[3]}"`);
      }
    }
    
    // DEBUG: ULTRA-VERBOSE - Log EVERY line that starts with 'j'
    const trimmedLine = line.trim();
    if (trimmedLine.charAt(0) === 'j') {
      console.log(`[J-ANY] line="${trimmedLine}", char1="${trimmedLine.charAt(1)}", assignMatch=${assignMatch ? 'YES' : 'NO'}`);
    }
    
    if (assignMatch) {
      const varName = assignMatch[1];
      const arrayIndexExpr = assignMatch[2]; // This is now an expression, not just digits
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
          if (arrayIndexExpr !== undefined) {
            const index = this.evaluateExpression(arrayIndexExpr);
            this.arrays[varName][parseInt(index)] = value;
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
          if (arrayIndexExpr !== undefined) {
            const index = this.evaluateExpression(arrayIndexExpr);
            this.arrays[varName][parseInt(index)] = value;
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
        
        const shouldWait = this.executeUserFunction(funcName, args);
        if (shouldWait) {
          // Function is waiting for input - we need to wait too
          console.log(`[ASSIGN] Function ${funcName} is waiting for input`);
          return true;
        }
        
        const value = this.returnValue || 0;

        if (arrayIndexExpr !== undefined) {
          const index = this.evaluateExpression(arrayIndexExpr);
          this.arrays[varName][parseInt(index)] = value;
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
        if (arrayIndexExpr !== undefined) {
          const index = this.evaluateExpression(arrayIndexExpr);
          this.arrays[varName][parseInt(index)] = value;
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

      if (arrayIndexExpr !== undefined) {
        const index = this.evaluateExpression(arrayIndexExpr);
        console.log(`[ARRAY-ASSIGN] Assigning to array ${varName}[${index}] = ${value}, array exists: ${!!this.arrays[varName]}`);
        this.arrays[varName][parseInt(index)] = value;
      } else {
        this.variables[varName] = value;
      }
      return false;
    }
    
    return false;
  }
  
  // Execute a function call
  executeFunction(line) {
    // Parse function call with support for nested parentheses
    const funcMatch = line.match(/^(\w+)\s*\(/);
    if (!funcMatch) return false;
    
    const funcName = funcMatch[1];
    const startIdx = funcMatch[0].length; // Position after "funcName("
    
    // Find matching closing paren by counting depth
    let depth = 1;
    let endIdx = startIdx;
    while (endIdx < line.length && depth > 0) {
      if (line[endIdx] === '(') depth++;
      else if (line[endIdx] === ')') depth--;
      if (depth > 0) endIdx++;
    }
    
    const argsStr = line.substring(startIdx, endIdx);

    // Check for user-defined functions FIRST (including IPL functions)
    if (this.functions[funcName]) {
      // Parse and evaluate arguments
      const args = argsStr ? argsStr.split(',').map(a => this.evaluateExpression(a.trim())) : [];
      return this.executeUserFunction(funcName, args);
    }
    
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
      console.log(`[PN-FUNC] Evaluating argsStr: "${argsStr}"`);
      const value = this.evaluateExpression(argsStr);
      console.log(`[PN-FUNC] Result: ${value}`);
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

    // Function not found - handle like original TinyC
    this.handleUndefinedFunction(funcName);
    return false;
  }
  
  executeUserFunction(funcName, args = []) {
    const func = this.functions[funcName];
    if (!func) {
      this.handleUndefinedFunction(funcName);
      return false;
    }
    
    // Check if this is an IPL function - if so, we'll need to switch to IPL lines
    const isIPLFunction = this.iplFunctions && this.iplFunctions[funcName];
    let savedLines = null;
    
    console.log('[executeUserFunction] Executing', funcName, 'from lineIndex', this.lineIndex, 'loopState:', this.loopState ? JSON.stringify(this.loopState) : 'none');
    
    // Special debugging for main function
    if (funcName === 'main') {
      console.log('[MAIN-FUNC] Variables: e=', this.variables.e, 'd=', this.variables.d, 'cc=', this.variables.cc);
    }
    
    // If we have a saved loop state, resume the loop directly
    // (When a loop waits, lineIndex points to the next line to execute inside the loop)
    if (this.loopState && this.loopState.type === 'while') {
      console.log('[executeUserFunction] Resuming while loop at lineIndex', this.lineIndex);
      const savedState = this.loopState;
      this.loopState = null; // Clear it before resuming
      
      const savedInLoop = this.inLoop;
      this.inLoop = true;
      
      let iterations = savedState.iterations;
      const condition = savedState.condition;
      const loopStart = savedState.loopStart;
      const loopEnd = savedState.loopEnd;
      
      // IMPORTANT: If lineIndex is outside the loop range, we need to start a new iteration.
      // This can happen when:
      // 1. A function is called from within the loop
      // 2. That function waits for input, saving loop state
      // 3. The function completes and returns, restoring a lineIndex that might be outside the loop
      // 4. When we resume, lineIndex could be pointing anywhere (inside the function, or at the function def)
      // In this case, we start a new iteration to ensure we're executing loop body code
      if (this.lineIndex < loopStart || this.lineIndex > loopEnd) {
        console.log('[WHILE-RESUME] lineIndex', this.lineIndex, 'outside loop range [', loopStart, '-', loopEnd, '], starting new iteration');
        iterations++;
        this.lineIndex = loopStart;
      }
      
      // Continue executing from current lineIndex (where we left off) until end of iteration
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        const currentLine = this.lineIndex;
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        console.log(`[WHILE-RESUME] Iteration ${iterations} executing line ${currentLine}:`, trimmed.substring(0, 50));
        const shouldWait = this.executeLine(trimmed);
        
        if (shouldWait) {
          // Still waiting - save state and wait again
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
          this.lineIndex = loopEnd + 1;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) break;
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) {
        this.lineIndex = loopEnd + 1;
        this.shouldBreak = false;
        this.inLoop = savedInLoop;
        // Continue function execution after the loop
      } else {
        // Completed one iteration - check condition for next iteration
        console.log('[executeUserFunction] While iteration', iterations, 'completed, checking condition');
        let conditionResult = this.evaluateCondition(condition);
        
        // Continue the while loop
        while (conditionResult) {
          iterations++;
          console.log('[executeUserFunction] While iteration', iterations, 'condition:', condition, '=', conditionResult);
          if (iterations > 100000) {
            console.error('While loop exceeded 100000 iterations - breaking');
            this.println('ERROR: Infinite loop detected - breaking');
            break;
          }
          
          this.shouldBreak = false;
          this.shouldContinue = false;
          
          // Execute loop body from start
          this.lineIndex = loopStart;
          while (this.lineIndex <= loopEnd) {
            const lineText = this.lines[this.lineIndex];
            const currentLine = this.lineIndex;
            this.lineIndex++;
            
            const trimmed = lineText.trim();
            if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
            
            console.log(`[WHILE-BODY] Iteration ${iterations} executing line ${currentLine}:`, trimmed.substring(0, 50));
            const shouldWait = this.executeLine(trimmed);
            
            if (shouldWait) {
              // Save loop state for next resumption
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
              this.lineIndex = loopEnd + 1;
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
        
        console.log('[executeUserFunction] While loop ended after', iterations, 'iterations');
        this.lineIndex = loopEnd + 1;
        this.shouldBreak = false;
        this.inLoop = savedInLoop;
      }
      
      // Continue executing the function after the loop
    }
    
    // If we're not already in this function, set it up
    if (this.currentFunction !== funcName) {
      // Save current execution context if we're in a function
      if (this.currentFunction) {
        this.callStack.push({
          functionName: this.currentFunction,
          lineIndex: this.lineIndex,
          // Save local variables and arrays for proper scoping
          localVariables: { ...this.variables },
          localArrays: { ...this.arrays }
        });
      }
      
      // Create new local scope for this function
      // IMPORTANT: Clear local variables/arrays so parameters bind in new scope
      // Global variables persist, but function-local ones don't
      const savedGlobalVars = {};
      const savedGlobalArrays = {};
      // Preserve only global declarations (from before main execution)
      // For now, preserve z array and seed variable from trek.tc
      for (const key in this.variables) {
        if (['seed', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'cc'].includes(key)) {
          savedGlobalVars[key] = this.variables[key];
        }
      }
      for (const key in this.arrays) {
        if (['z'].includes(key)) {
          savedGlobalArrays[key] = this.arrays[key];
        }
      }
      this.variables = { ...savedGlobalVars };
      this.arrays = { ...savedGlobalArrays };
      
      // Check if this is an IPL function - if so, switch to IPL lines
      if (isIPLFunction) {
        savedLines = this.lines;
        this.lines = this.iplLines;
      }
      
      this.currentFunction = funcName;
      this.lineIndex = func.startLine;
      this.inFunction = true;
      this.shouldReturn = false;
      this.returnValue = null;
      
      // Parse function signature to get parameter names and types
      const funcDefLine = isIPLFunction ? this.iplLines[func.startLine] : this.lines[func.startLine];
      if (!funcDefLine) {
        console.error(`Error: Function ${funcName} has startLine ${func.startLine} but no line exists there. Total lines: ${this.lines.length}, isIPL: ${isIPLFunction}`);
        this.handleUndefinedFunction(funcName);
        return false;
      }
      const funcDefLineStr = funcDefLine.trim();
      // Match patterns like: funcname type param1, type param2 [
      // or: funcname type param [
      const paramMatch = funcDefLineStr.match(/^\w+\s+(.+?)\s*\[/);
      if (paramMatch) {
        const paramsStr = paramMatch[1];
        // Parse parameters: can be "int range", "char buf(0)", "char a(0);int n", "char a(0), b(0);int n"
        const params = [];
        const parts = paramsStr.split(';');
        
        for (const part of parts) {
          const trimmedPart = part.trim();
          if (!trimmedPart) continue;
          
          // Determine type: int or char
          let currentType = '';
          if (trimmedPart.startsWith('int ')) currentType = 'int';
          else if (trimmedPart.startsWith('char ')) currentType = 'char';
          else continue; // Skip if no type keyword
          
          // Remove type keyword and parse variable declarations
          const declsStr = trimmedPart.substring(currentType.length).trim();
          const decls = declsStr.split(',');
          
          for (const decl of decls) {
            const d = decl.trim();
            // Check if it's an array: name(size)
            const arrayMatch = d.match(/(\w+)\s*\((\d+)\)/);
            if (arrayMatch) {
              params.push({ name: arrayMatch[1], type: currentType, isArray: true, size: parseInt(arrayMatch[2]) });
            } else if (d) {
              // Simple variable
              params.push({ name: d, type: currentType, isArray: false });
            }
          }
        }
        
        console.log(`[PARAM-PARSE] Function ${funcName} parameters:`, params);
        
        // Bind parameters to arguments
        for (let i = 0; i < params.length && i < args.length; i++) {
          const param = params[i];
          const arg = args[i];
          
          if (param.isArray) {
            // Array parameter: arg should be a reference (array object, string name, or string literal)
            if (Array.isArray(arg)) {
              // Arg is an actual array object - use it directly
              this.arrays[param.name] = arg;
              console.log(`[PARAM] Array ${param.name} -> references passed array object`);
            } else if (typeof arg === 'string') {
              // Arg might be an array name or string literal
              if (this.callStack.length > 0 && this.callStack[this.callStack.length - 1].localArrays && 
                  this.callStack[this.callStack.length - 1].localArrays[arg]) {
                // Reference to caller's array - get it from saved scope
                this.arrays[param.name] = this.callStack[this.callStack.length - 1].localArrays[arg];
                console.log(`[PARAM] Array ${param.name} -> references caller's array ${arg}`);
              } else {
                // String literal - create array from it
                const charArray = new Array(arg.length + 1);
                for (let j = 0; j < arg.length; j++) {
                  charArray[j] = arg.charCodeAt(j);
                }
                charArray[arg.length] = 0; // Null terminate
                this.arrays[param.name] = charArray;
                console.log(`[PARAM] Array ${param.name} created from string "${arg}"`);
              }
            } else {
              // Arg is a value - for char(0) parameters, this might be a pointer address
              // For now, just store it as a single-element array
              this.arrays[param.name] = [arg];
              console.log(`[PARAM] Array ${param.name} = [${arg}]`);
            }
          } else {
            // Simple variable parameter
            this.variables[param.name] = arg;
            console.log(`[PARAM] Variable ${param.name} = ${arg}`);
          }
        }
      }
      
      this.lineIndex = func.startLine;
    }
    
    // Execute until end of function or waiting for input
    while (this.lineIndex <= func.endLine) {
      // Check if execution was halted
      if (this.halted) {
        console.log('Function execution stopped - halted flag set');
        break;
      }
      
      const line = this.lines[this.lineIndex];
      
      let trimmed = line.trim();
      
      // For single-line functions, extract just the body between [ and ]
      if (this.lineIndex === func.startLine && this.lineIndex === func.endLine) {
        const bodyMatch = trimmed.match(/\[(.+)\]$/);
        if (bodyMatch) {
          trimmed = bodyMatch[1].trim();
        }
      }
      
      // For multi-line functions, extract code after [ on the first line
      if (this.lineIndex === func.startLine && this.lineIndex < func.endLine) {
        const originalTrimmed = trimmed;
        const firstLineMatch = trimmed.match(/\[(.+)$/);
        if (firstLineMatch) {
          trimmed = firstLineMatch[1].trim();
          console.log(`[MULTI-LINE-FUNC-START] ${funcName} original line: "${originalTrimmed}"`);
          console.log(`[MULTI-LINE-FUNC-START] ${funcName} extracted first line code: "${trimmed}"`);
        }
      }
      
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
        // Restore lines if we switched to IPL
        if (savedLines) {
          this.lines = savedLines;
        }
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
    if (savedLines) {
      this.lines = savedLines;
    }
    
    if (this.callStack.length > 0) {
      const prevContext = this.callStack.pop();
      this.currentFunction = prevContext.functionName;
      this.lineIndex = prevContext.lineIndex;
      this.inFunction = true;
      // Restore local variables and arrays from previous function
      if (prevContext.localVariables) {
        this.variables = prevContext.localVariables;
        this.arrays = prevContext.localArrays;
        console.log(`[executeUserFunction] Restored context: ${prevContext.functionName} at line ${prevContext.lineIndex} with local scope`);
      } else {
        console.log(`[executeUserFunction] Restored context: ${prevContext.functionName} at line ${prevContext.lineIndex}`);
      }
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
    
    // Debug: log stack trace for debugging '0' function calls
    if (funcName === '0' || funcName === 'MC') {
      console.log(`[UNDEF-FUNC] Called with funcName="${funcName}" at lineIndex=${this.lineIndex}`);
      console.log(`[UNDEF-FUNC] Current line: "${this.lines[this.lineIndex]}"`);
      console.trace('Stack trace:');
    }
    
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
    
    // Debug array expressions
    if (processed.includes('z(') && depth === 0) {
      console.log(`[EVAL-START] Expression: "${processed}", depth: ${depth}`);
    }
    
    // Handle MC (Machine Call) expressions - e.g., "MC c,1" or "MC 65,1"
    if (processed.startsWith('MC ')) {
      const match = processed.match(/MC\s+([^,]+),(\d+)/);
      if (match) {
        const valueExpr = match[1].trim();
        const mcNumber = parseInt(match[2]);
        // Evaluate the value expression
        const value = this.evaluateExpression(valueExpr, depth + 1);
        console.log(`[MC-EXPR] Executing MC ${mcNumber} with value ${value}`);
        // Push value and execute MC
        this.push(value);
        const isWaiting = this.executeMC(mcNumber);
        if (isWaiting) {
          // MC operation is waiting for input - return a sentinel value
          // The calling code should check waitingForInput flag
          console.log(`[MC-EXPR] MC ${mcNumber} is waiting for input`);
          return 0;
        }
        // Return the value from the stack (MC operations typically push a result)
        const result = this.pop();
        console.log(`[MC-EXPR] MC returned ${result}`);
        return result;
      }
    }
    
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
    
    // Handle character constants BEFORE variable replacement
    // This prevents variable names like 's', 'r', etc. from being replaced inside quotes
    const beforeCharReplace = processed;
    processed = processed.replace(/'([^'])'/g, (match, char) => {
      const code = char.charCodeAt(0);
      console.log(`[CHAR-LITERAL] Replacing ${match} with ${code}`);
      return code.toString();
    });
    if (beforeCharReplace !== processed) {
      console.log(`[CHAR-REPLACE] Before: "${beforeCharReplace}" After: "${processed}"`);
    }
    
    // Special case: if the expression is just a bare array name (for passing as reference/pointer),
    // return the array OBJECT itself, not the name, so it can be passed across function scopes
    // This is needed for functions like gs(arrayname) or ps(b) where we pass the array by reference
    if (/^\w+$/.test(processed) && this.arrays[processed]) {
      console.log(`[EVAL-ARRAY-REF] Returning array object for reference: "${processed}"`);
      return this.arrays[processed]; // Return the actual array object
    }
    
    // Replace variables with their values
    for (const varName in this.variables) {
      // Escape special regex characters in variable name
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedVarName + '\\b', 'g');
      let value = this.variables[varName];
      // Convert booleans to numbers (C-style: false=0, true=1)
      if (typeof value === 'boolean') {
        value = value ? 1 : 0;
      }
      processed = processed.replace(regex, value.toString());
    }
    
    // Replace array access with expressions
    for (const arrName in this.arrays) {
      // Escape special regex characters in array name
      const escapedArrName = arrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match array access with any content inside parens
      const regex = new RegExp(escapedArrName + '\\s*\\(([^)]+)\\)', 'g');
      let match;
      while ((match = regex.exec(processed)) !== null) {
        const indexExpr = match[1];
        try {
          const index = this.evaluateExpression(indexExpr, depth + 1);
          const value = (this.arrays[arrName][parseInt(index)] || 0).toString();
          if (arrName === 'z' && depth === 0) {
            console.log(`[ARRAY-READ] Reading ${arrName}[${index}] = ${value}, actualValue=${this.arrays[arrName][parseInt(index)]}`);
          }
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
      
      // Skip if funcName is a number (like '0' from error recovery)
      if (/^\d+$/.test(funcName)) {
        continue;
      }
      
      // Skip if it's a known non-function pattern or already handled
      if (funcName === 'version' || funcName === 'gn') {
        continue;
      }
      
      // Skip if it's an array (should have been handled earlier)
      // Also skip if it's a variable that looks like it might be an array
      if (this.arrays[funcName] || this.variables[funcName] !== undefined) {
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
      const shouldWait = this.executeUserFunction(funcName, args);
      
      // If the function is waiting for input, we cannot complete this expression evaluation
      // This should be caught at a higher level - for now, we'll use 0 as a placeholder
      // NOTE: This is a limitation - we can't properly handle waiting in nested expressions
      if (shouldWait) {
        console.warn(`Function ${funcName} waiting for input in expression - expression evaluation incomplete`);
        // Restore context but keep waiting state
        this.lineIndex = savedLineIndex;
        this.currentFunction = savedCurrentFunction;
        this.callStack = savedCallStack;
        this.inFunction = savedInFunction;
        this.returnValue = savedReturnValue;
        // Return 0 for now - this is not ideal but expressions can't wait mid-evaluation
        processed = processed.substring(0, index) + '0' + processed.substring(index + match.length);
        continue;
      }
      
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
    
    // Check if it's a bare array name (for passing as pointer/reference)
    if (this.arrays[processed]) {
      console.log(`[EVAL-ARRAY-REF] Returning array name: "${processed}"`);
      return processed; // Return the array name as a reference
    }
    
    // Check if it's a variable name
    if (this.variables[processed] !== undefined) {
      return this.variables[processed];
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
    
    console.log(`[IF-PARSE] Parsed condition: "${condition}", rest: "${rest}"`);
    
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
    
    console.log(`[IF-EVAL] Evaluating condition: "${condition}"`);
    const conditionTrue = this.evaluateCondition(condition);
    console.log(`[IF-RESULT] Condition "${condition}" = ${conditionTrue}`);
    
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
        this.ifChainExecuted = true;  // Mark that this if branch executed
      }
      // If condition false, don't set ifChainExecuted - let else-if check
    }
    
    return false;
  }
  
  // Execute else if statement
  executeElseIf(line) {
    console.log(`[ELSE-IF] Checking ifChainExecuted=${this.ifChainExecuted} for line: "${line}"`);
    // If a previous if/else-if already executed, skip this
    if (this.ifChainExecuted) {
      console.log(`[ELSE-IF-SKIP] Previous branch executed, skipping`);
      return false;
    }

    // Otherwise, treat it like a regular if
    const ifPart = line.substring(5); // Remove "else " to get "if (...) ..."
    console.log(`[ELSE-IF] Processing as if statement: "${ifPart}"`);
    const result = this.executeIf(ifPart);
    return result;
  }
  
  // Execute else statement  
  executeElse(line) {
    console.log(`[ELSE] Checking ifChainExecuted=${this.ifChainExecuted} for line: "${line}"`);
    // If a previous if/else-if already executed, skip this
    if (this.ifChainExecuted) {
      console.log(`[ELSE-SKIP] Previous branch executed, skipping`);
      return false;
    }

    // Otherwise, execute the else part
    const rest = line.substring(5).trim(); // Remove "else "
    console.log(`[ELSE-EXECUTE] Executing statement: "${rest}"`);
    if (rest && !rest.startsWith('[')) {
      const shouldWait = this.executeLine(rest);
      if (shouldWait) return true;
      this.ifChainExecuted = true;
      console.log(`[ELSE-CHAIN] Set ifChainExecuted=true`);
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
    console.log('[executeWhile] ENTERED - lineIndex:', this.lineIndex, 'line:', line);
    
    // Check if line starts with "while" and has opening paren
    const whileMatch = line.match(/^\s*while\s*\(/);
    if (!whileMatch) {
      console.log('[executeWhile] NO MATCH - not a while statement');
      return false;
    }
    
    // Find the matching closing paren for the condition by counting parens
    const startPos = whileMatch[0].length - 1; // position of opening paren
    let parenDepth = 1;
    let condEndPos = startPos + 1;
    
    while (condEndPos < line.length && parenDepth > 0) {
      if (line[condEndPos] === '(') parenDepth++;
      else if (line[condEndPos] === ')') parenDepth--;
      condEndPos++;
    }
    
    if (parenDepth !== 0) {
      console.log('[executeWhile] Could not find matching closing paren');
      return false;
    }
    
    // Extract condition between the parentheses
    let condition = line.substring(startPos + 1, condEndPos - 1);
    
    // Check if there's a bracket after the condition
    const afterCond = line.substring(condEndPos).trim();
    const hasBracket = afterCond.startsWith('[');
    
    // Extract code that appears on the same line as the while statement after the [ or condition
    let sameLineCode = '';
    if (hasBracket && afterCond.length > 1) {
      sameLineCode = afterCond.substring(1).trim(); // Everything after the '['
      console.log('[executeWhile] Same-line code after [:', sameLineCode);
    } else if (!hasBracket && afterCond.length > 0) {
      // No bracket - the rest of the line is the loop body (e.g., while(cond)statement)
      sameLineCode = afterCond;
      console.log('[executeWhile] Single-line while body:', sameLineCode);
    }
    
    // loopStart should be the first line INSIDE the loop, not the while statement itself
    let loopStart = this.lineIndex + 1;
    let loopEnd = hasBracket ? this.findClosingBracket(this.lineIndex) : this.lineIndex;
    console.log('[executeWhile] loopStart:', loopStart, 'loopEnd:', loopEnd, 'condition:', condition);
    
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
    console.log('[executeWhile] Initial condition evaluation:', condition, '=', conditionResult);
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
      
      // If there's code on the same line as the while statement after [, execute it first
      if (sameLineCode) {
        console.log('[executeWhile] Executing same-line code:', sameLineCode);
        const shouldWait = this.executeLine(sameLineCode);
        if (shouldWait) {
          this.loopState = {
            type: 'while',
            condition: condition,
            loopStart: loopStart,
            loopEnd: loopEnd,
            iterations: iterations,
            savedInLoop: savedInLoop,
            sameLineCode: sameLineCode
          };
          this.inLoop = savedInLoop;
          return true;
        }
        if (this.shouldReturn) {
          this.lineIndex = loopEnd;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) {
          break;
        }
      }
      
      // Execute loop body
      this.lineIndex = loopStart;
      console.log('[executeWhile] Starting loop body execution from line', loopStart, 'to', loopEnd);
      while (this.lineIndex <= loopEnd) {
        const lineText = this.lines[this.lineIndex];
        this.lineIndex++;
        
        const trimmed = lineText.trim();
        console.log('[executeWhile] Executing body line', this.lineIndex - 1, ':', trimmed);
        if (trimmed === '' || trimmed.startsWith('/*') || trimmed === '[' || trimmed === ']') continue;
        
        const shouldWait = this.executeLine(trimmed);
        console.log('[executeWhile] executeLine returned shouldWait:', shouldWait);
        
        if (shouldWait) {
          // Save loop state for resumption
          console.log('[executeWhile] SAVING loopState - iterations:', iterations, 'lineIndex:', this.lineIndex);
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
