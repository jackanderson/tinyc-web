// TinyCInterpreter.js - Port of tiny-c interpreter to JavaScript

export class TinyCInterpreter {
  constructor() {
    // Constants from tc.h
    this.MAXSTACK = 30;
    this.MAXVAR = 200;
    this.MAXFUN = 113;
    this.MAXPR = 100000;
    this.VLEN = 8;
    
    // Error codes
    this.errors = {
      STATERR: 1,
      CURSERR: 2,
      SYMBOLERR: 3,
      RPARENERR: 5,
      RANGERR: 6,
      CLASSERR: 7,
      EXPWHILE: 8,
      SYNTAXERR: 9,
      LVALERR: 14,
      POPERR: 15,
      PUSHERR: 16,
      TMFUNERR: 17,
      TMVARERR: 18,
      TMVALERR: 19,
      LINKERR: 20,
      ARGSERR: 21,
      LBRACERR: 22,
      MCERR: 24,
      DECLARERR: 26,
      KILL: 99
    };
    
    // Token types
    this.INTCON = 1;
    this.STRCON = 2;
    this.CHRCON = 3;
    
    // Initialize interpreter state
    this.reset();
  }
  
  reset() {
    // Program buffer
    this.pr = new Array(this.MAXPR).fill('');
    this.cursor = 0;
    this.progend = 0;
    this.prused = 0;
    this.fname = null;
    this.lname = null;
    this.errat = null;
    
    // Stack
    this.stack = [];
    this.top = -1;
    
    // Variables - now a proper object for name->value mapping
    this.variables = {};
    this.nxtvar = 0;
    
    // Functions - object for name->definition mapping
    this.functions = {};
    this.curfun = -1;
    this.curglobal = 1;
    
    // Flags
    this.leave = false;
    this.brake = false;
    this.err = 0;
    this.applvl = 0;
    this.returnValue = undefined;
    
    // Output buffer
    this.output = [];
    
    // Input queue for interactive programs
    this.inputQueue = [];
    this.inputCallback = null;
    this.waitingForInput = false;
    
    // Random seed
    this.seed = 99;
    this.last = 0;
  }
  
  // Scanning routines
  blanks() {
    while (this.cursor < this.progend && 
           (this.pr[this.cursor] === ' ' || 
            this.pr[this.cursor] === '\t' || 
            this.pr[this.cursor] === '\r')) {
      this.cursor++;
    }
    return this.cursor;
  }
  
  isNum(c) {
    return c >= '0' && c <= '9';
  }
  
  isAlpha(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }
  
  isAlphaNum(c) {
    return this.isAlpha(c) || this.isNum(c);
  }
  
  matchConst() {
    this.blanks();
    const c = this.pr[this.cursor];
    
    // Integer constant
    if (c === '+' || c === '-' || this.isNum(c)) {
      this.fname = this.cursor;
      if (c === '+' || c === '-') this.cursor++;
      while (this.isNum(this.pr[this.cursor])) {
        this.cursor++;
      }
      this.lname = this.cursor - 1;
      return this.INTCON;
    }
    
    // String constant
    if (c === '"') {
      this.fname = ++this.cursor;
      while (this.cursor < this.progend && this.pr[this.cursor] !== '"') {
        this.cursor++;
      }
      if (this.cursor < this.progend) {
        this.lname = this.cursor - 1;
        this.cursor++;
        return this.STRCON;
      }
      return this.error(this.errors.CURSERR);
    }
    
    // Character constant
    if (c === "'") {
      this.fname = ++this.cursor;
      while (this.cursor < this.progend && this.pr[this.cursor] !== "'") {
        this.cursor++;
      }
      if (this.cursor < this.progend) {
        this.lname = this.cursor - 1;
        this.cursor++;
        return this.CHRCON;
      }
      return this.error(this.errors.CURSERR);
    }
    
    return 0;
  }
  
  lit(s) {
    this.blanks();
    let pos = this.cursor;
    for (let i = 0; i < s.length; i++) {
      if (this.pr[pos] !== s[i]) {
        return false;
      }
      pos++;
    }
    // Check keyword boundary
    if (this.isAlphaNum(s[s.length - 1]) && this.isAlphaNum(this.pr[pos])) {
      return false;
    }
    this.cursor = pos;
    return true;
  }
  
  rem() {
    while (this.cursor < this.progend) {
      this.blanks();
      const c = this.pr[this.cursor];
      
      if (c === '\n' || c === '\r') {
        this.cursor++;
        continue;
      }
      
      if (c === '/' && this.pr[this.cursor + 1] === '*') {
        this.cursor += 2;
        while (this.cursor < this.progend - 1) {
          if (this.pr[this.cursor] === '*' && this.pr[this.cursor + 1] === '/') {
            this.cursor += 2;
            break;
          }
          this.cursor++;
        }
        continue;
      }
      
      break;
    }
    return this.cursor;
  }
  
  // Stack operations
  push(classType, lvalue, size, value) {
    if (this.top >= this.MAXSTACK - 1) {
      return this.error(this.errors.PUSHERR);
    }
    this.stack[++this.top] = {
      class: classType,
      lvalue: lvalue,
      size: size,
      value: value
    };
    return 0;
  }
  
  pop() {
    if (this.top < 0) {
      return this.error(this.errors.POPERR);
    }
    return this.stack[this.top--];
  }
  
  pushInt(val) {
    return this.push('A', 0, 4, val);
  }
  
  topToInt() {
    if (this.top < 0) {
      this.error(this.errors.POPERR);
      return 0;
    }
    const item = this.stack[this.top--];
    return item.value;
  }
  
  // Error handling
  error(code) {
    this.err = code;
    const errorMessages = {
      1: "Statement error",
      2: "Cursor error",
      3: "Symbol error",
      5: "Missing right parenthesis",
      6: "Range error",
      7: "Class error",
      8: "Expected 'while'",
      9: "Syntax error",
      14: "L-value error",
      15: "Pop error",
      16: "Push error",
      17: "Too many functions",
      18: "Too many variables",
      19: "Too many values",
      20: "Link error",
      21: "Arguments error",
      22: "Missing left brace",
      24: "Machine call error",
      26: "Declaration error",
      99: "Fatal error"
    };
    
    this.output.push(`ERROR ${code}: ${errorMessages[code] || 'Unknown error'}`);
    return code;
  }
  
  // Load program
  loadProgram(code) {
    this.reset();
    for (let i = 0; i < code.length && i < this.MAXPR; i++) {
      this.pr[i] = code[i];
    }
    this.progend = Math.min(code.length, this.MAXPR);
    this.prused = this.progend;
    this.cursor = 0;
  }
  
  // Output
  putChar(c) {
    if (typeof c === 'number') {
      c = String.fromCharCode(c);
    }
    this.output.push(c);
  }
  
  putString(s) {
    this.output.push(s);
  }
  
  getOutput() {
    return this.output.join('');
  }
  
  clearOutput() {
    this.output = [];
  }
  
  // Simple expression evaluator
  evalExpression(expr) {
    // This is a simplified evaluator for basic expressions
    try {
      // Handle simple integer expressions
      const cleaned = expr.trim();
      if (/^[0-9+\-*/() ]+$/.test(cleaned)) {
        return eval(cleaned);
      }
      return 0;
    } catch (e) {
      this.error(this.errors.SYNTAXERR);
      return 0;
    }
  }
  
  // Get identifier name
  getIdentifier() {
    this.blanks();
    if (!this.isAlpha(this.pr[this.cursor])) {
      return null;
    }
    
    let start = this.cursor;
    while (this.isAlphaNum(this.pr[this.cursor])) {
      this.cursor++;
    }
    return this.pr.slice(start, this.cursor).join('');
  }
  
  // Parse function call - returns {name, args}
  parseFunctionCall() {
    const funcName = this.getIdentifier();
    if (!funcName) return null;
    
    const args = [];
    this.blanks();
    
    // Check for arguments - can be with or without parentheses
    const hasParens = this.pr[this.cursor] === '(';
    if (hasParens) {
      this.cursor++; // skip (
      this.blanks();
    }
    
    // Parse arguments until we hit ), newline, or ;
    while (this.cursor < this.progend) {
      // Check for end of arguments
      if (hasParens && this.pr[this.cursor] === ')') {
        this.cursor++;
        break;
      }
      if (!hasParens && (this.pr[this.cursor] === '\n' || this.pr[this.cursor] === ';' || this.pr[this.cursor] === ']')) {
        break;
      }
      
      this.blanks();
      
      const tokenType = this.matchConst();
      if (tokenType === this.STRCON) {
        args.push({
          type: 'string',
          value: this.pr.slice(this.fname, this.lname + 1).join('')
        });
      } else if (tokenType === this.INTCON) {
        const numStr = this.pr.slice(this.fname, this.lname + 1).join('');
        args.push({
          type: 'number',
          value: parseInt(numStr)
        });
      } else if (this.lit(',')) {
        // Skip commas
        this.blanks();
        continue;
      } else {
        // Could be identifier or expression
        const id = this.getIdentifier();
        if (id) {
          // Check if it's a variable reference
          if (this.variables.hasOwnProperty(id)) {
            args.push({
              type: 'number',
              value: this.variables[id]
            });
          } else {
            args.push({
              type: 'identifier',
              value: id
            });
          }
        } else {
          break;
        }
      }
      this.blanks();
      
      // If no parens, stop after first argument for simple cases
      if (!hasParens && args.length > 0) break;
    }
    
    return { name: funcName, args: args };
  }
  
  // Execute tiny-c built-in functions (from tinycx.ipl)
  executeBuiltin(funcName, args) {
    switch(funcName) {
      // Print functions
      case 'ps': // print string (no newline)
        if (args.length > 0 && args[0].type === 'string') {
          this.putString(args[0].value);
        }
        break;
        
      case 'pl': // print line (with newline)
        if (args.length > 0 && args[0].type === 'string') {
          this.putString(args[0].value);
        }
        this.putChar('\n');
        break;
        
      case 'pn': // print number with space prefix
        this.putChar(' ');
        if (args.length > 0) {
          if (args[0].type === 'number') {
            this.putString(args[0].value.toString());
          } else if (args[0].type === 'identifier') {
            const val = this.variables[args[0].value];
            if (val !== undefined) {
              this.putString(val.toString());
            }
          }
        }
        break;
      
      case 'pnf': // print number formatted (in a field width)
        // For web version, just print the number with minimal formatting
        if (args.length > 0) {
          let num = 0;
          if (args[0].type === 'number') {
            num = args[0].value;
          } else if (args[0].type === 'identifier') {
            num = this.variables[args[0].value] || 0;
          }
          // Simple right-justified formatting
          const width = args.length > 1 && args[1].type === 'number' ? args[1].value : 4;
          const str = num.toString();
          const spaces = Math.max(0, width - str.length);
          this.putString(' '.repeat(spaces) + str);
        }
        break;
        
      // Input functions
      case 'getchar':
      case 'gc':
        if (this.inputQueue.length > 0) {
          const line = this.inputQueue.shift();
          return line.charCodeAt(0) || 13;
        }
        this.waitingForInput = true;
        this.putString('> ');
        return 13;
        
      case 'gs': // get string - stores in buffer
        if (this.inputQueue.length > 0) {
          return this.inputQueue.shift().length;
        }
        this.waitingForInput = true;
        this.putString('> ');
        return 0;
        
      case 'gn': // get number
        if (this.inputQueue.length > 0) {
          const input = this.inputQueue.shift();
          const num = parseInt(input);
          return isNaN(num) ? 0 : num;
        }
        this.waitingForInput = true;
        this.putString('> ');
        return 0;
        
      case 'getnum': // get number with prompt
        if (args.length > 0 && args[0].type === 'string') {
          this.putString(args[0].value + ' ');
        }
        if (this.inputQueue.length > 0) {
          const input = this.inputQueue.shift();
          const num = parseInt(input);
          this.putString(input + '\n');
          return isNaN(num) ? 0 : num;
        }
        this.waitingForInput = true;
        return 0;
        
      case 'getcmd': // get command character with prompt
        if (args.length > 0 && args[0].type === 'string') {
          this.putString(args[0].value + ' ');
        }
        if (this.inputQueue.length > 0) {
          const input = this.inputQueue.shift();
          this.putString(input + '\n');
          return input.charCodeAt(0) || 0;
        }
        this.waitingForInput = true;
        return 0;
        
      // String functions
      case 'strlen':
        if (args.length > 0 && args[0].type === 'string') {
          return args[0].value.length;
        }
        return 0;
        
      case 'strcpy':
      case 'strcat':
        // Would need array/pointer support
        break;
        
      // Math/utility functions
      case 'abs':
        if (args.length > 0) {
          let num = 0;
          if (args[0].type === 'number') {
            num = args[0].value;
          } else if (args[0].type === 'identifier') {
            num = this.variables[args[0].value] || 0;
          }
          return Math.abs(num);
        }
        return 0;
        
      case 'random':
        // random(low, high) or random(range) - uses simple LCG
        if (!this.last) this.last = this.seed = 99;
        if (args.length === 2) {
          const low = args[0].type === 'number' ? args[0].value : 1;
          const high = args[1].type === 'number' ? args[1].value : 100;
          const range = high - low + 1;
          this.last = this.last * this.seed;
          if (this.last < 0) this.last = -this.last;
          return low + Math.floor((this.last / 7) % range);
        } else if (args.length === 1) {
          const range = args[0].type === 'number' ? args[0].value : 100;
          this.last = this.last * this.seed;
          if (this.last < 0) this.last = -this.last;
          return Math.floor((this.last / 7) % range) + 1;
        }
        return Math.floor(Math.random() * 100) + 1;
        
      // Version and system
      case 'version':
        return 1007; // Version 10.07 (web version)
        
      case 'exit':
        this.putString('\n[Program terminated]\n');
        this.err = 99; // Stop execution
        break;
        
      case 'cls':
        this.output = []; // Clear output
        break;
        
      // Utility
      case 'beep':
        this.putString('[BEEP]');
        break;
        
      case 'sak': // stop and acknowledge
        this.putString('Press Enter ... ');
        break;
        
      default:
        return false;
    }
    return true;
  }
  
  // Parse and execute function definition
  parseFunctionDef() {
    const funcName = this.getIdentifier();
    if (!funcName) return false;
    
    this.blanks();
    
    // Skip parameter list if exists (for now, just find the [)
    while (this.cursor < this.progend && this.pr[this.cursor] !== '[') {
      this.cursor++;
    }
    
    if (this.pr[this.cursor] === '[') {
      this.cursor++; // skip [
      
      // Find matching ]
      let bracketCount = 1;
      const bodyStart = this.cursor;
      
      while (bracketCount > 0 && this.cursor < this.progend) {
        if (this.pr[this.cursor] === '[') {
          bracketCount++;
        } else if (this.pr[this.cursor] === ']') {
          bracketCount--;
        }
        if (bracketCount > 0) {
          this.cursor++;
        }
      }
      
      const bodyEnd = this.cursor;
      this.cursor++; // skip final ]
      
      // Store function
      this.functions[funcName] = {
        body: this.pr.slice(bodyStart, bodyEnd).join('')
      };
      
      return true;
    }
    
    return false;
  }
  
  // Execute user-defined function
  executeUserFunction(funcName) {
    const func = this.functions[funcName];
    if (!func) return false;
    
    // Save current cursor and return value
    const savedCursor = this.cursor;
    const savedPr = this.pr;
    const savedProgend = this.progend;
    const savedReturn = this.returnValue;
    
    // Reset return value for this function call
    this.returnValue = undefined;
    
    // Execute function body
    this.pr = func.body.split('');
    this.progend = this.pr.length;
    this.cursor = 0;
    
    this.executeStatements();
    
    // Capture return value before restoring
    const funcReturnValue = this.returnValue;
    
    // Restore cursor and context
    this.pr = savedPr;
    this.progend = savedProgend;
    this.cursor = savedCursor;
    this.returnValue = savedReturn;
    
    return funcReturnValue !== undefined ? funcReturnValue : true;
  }
  
  // Parse variable declarations like: int a, b, c
  parseVarDeclaration() {
    const savedCursor = this.cursor;
    
    // Check for type keyword
    if (this.lit('int') || this.lit('char')) {
      this.blanks();
      
      // Parse variable names
      while (this.cursor < this.progend) {
        const varName = this.getIdentifier();
        if (!varName) break;
        
        // Initialize variable
        this.variables[varName] = 0;
        
        this.blanks();
        
        // Check for array declaration: name(size)
        if (this.pr[this.cursor] === '(') {
          this.cursor++;
          const tokenType = this.matchConst();
          if (tokenType === this.INTCON) {
            // Array size specified - for simplicity, just mark it
            this.variables[varName] = [];
          }
          if (this.pr[this.cursor] === ')') {
            this.cursor++;
          }
        }
        
        this.blanks();
        
        // Check for comma (more variables) or end of statement
        if (this.pr[this.cursor] === ',') {
          this.cursor++;
          this.blanks();
        } else {
          break;
        }
      }
      return true;
    }
    
    this.cursor = savedCursor;
    return false;
  }
  
  // Parse assignment: varname = expression
  parseAssignment() {
    const savedCursor = this.cursor;
    const varName = this.getIdentifier();
    
    if (varName) {
      this.blanks();
      if (this.pr[this.cursor] === '=') {
        this.cursor++;
        this.blanks();
        
        // Simple expression evaluation (numbers and basic operators)
        const exprStart = this.cursor;
        let depth = 0;
        while (this.cursor < this.progend) {
          const ch = this.pr[this.cursor];
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          else if (depth === 0 && (ch === '\n' || ch === ';' || ch === ']')) {
            break;
          }
          this.cursor++;
        }
        
        const expr = this.pr.slice(exprStart, this.cursor).join('').trim();
        const value = this.evalSimpleExpression(expr);
        this.variables[varName] = value;
        return true;
      }
    }
    
    this.cursor = savedCursor;
    return false;
  }
  
  // Simple expression evaluator
  evalSimpleExpression(expr) {
    try {
      // Replace variable names with their values
      let processed = expr;
      for (const varName in this.variables) {
        const value = this.variables[varName];
        if (typeof value === 'number') {
          // Use word boundaries to avoid partial matches
          const regex = new RegExp('\\b' + varName + '\\b', 'g');
          processed = processed.replace(regex, value.toString());
        }
      }
      
      // Evaluate basic arithmetic
      if (/^[\d+\-*/()\s]+$/.test(processed)) {
        return eval(processed);
      }
      
      // Try direct number
      const num = parseInt(processed);
      if (!isNaN(num)) {
        return num;
      }
    } catch (e) {
      // Ignore evaluation errors
    }
    return 0;
  }
  
  // Execute statements in current context
  executeStatements() {
    while (this.cursor < this.progend && !this.err && this.returnValue === undefined) {
      this.rem();
      if (this.cursor >= this.progend) break;
      
      const savedCursor = this.cursor;
      
      // Try variable declaration
      if (this.parseVarDeclaration()) {
        this.skipLineTerminators();
        continue;
      }
      
      // Try assignment
      if (this.parseAssignment()) {
        this.skipLineTerminators();
        continue;
      }
      
      // Try return statement
      if (this.lit('return')) {
        this.blanks();
        const exprStart = this.cursor;
        while (this.cursor < this.progend && 
               this.pr[this.cursor] !== '\n' && 
               this.pr[this.cursor] !== ';' &&
               this.pr[this.cursor] !== ']') {
          this.cursor++;
        }
        const expr = this.pr.slice(exprStart, this.cursor).join('').trim();
        this.returnValue = this.evalSimpleExpression(expr);
        return;
      }
      
      // Try function call
      this.cursor = savedCursor;
      const call = this.parseFunctionCall();
      
      if (call) {
        // Try built-in function first
        const result = this.executeBuiltin(call.name, call.args);
        if (!result) {
          // Try user function
          this.executeUserFunction(call.name);
        }
      } else {
        // Not recognized, skip this token/line
        this.cursor = savedCursor;
        while (this.cursor < this.progend && 
               this.pr[this.cursor] !== '\n' && 
               this.pr[this.cursor] !== ';') {
          this.cursor++;
        }
      }
      
      this.skipLineTerminators();
    }
  }
  
  skipLineTerminators() {
    while (this.cursor < this.progend && 
           (this.pr[this.cursor] === '\n' || 
            this.pr[this.cursor] === ';' || 
            this.pr[this.cursor] === '\r')) {
      this.cursor++;
    }
  }
  
  // Add input to the queue
  addInput(input) {
    this.inputQueue.push(input);
    this.waitingForInput = false;
  }
  
  // Check if waiting for input
  isWaitingForInput() {
    return this.waitingForInput;
  }
  
  // Continue execution after receiving input
  continueExecution() {
    if (!this.waitingForInput) {
      this.executeStatements();
    }
    return this.getOutput();
  }
  
  // Main execute function
  execute() {
    this.clearOutput();
    this.cursor = 0;
    this.err = 0;
    this.functions = {};
    this.variables = {};
    this.returnValue = undefined;
    this.waitingForInput = false;
    
    // First pass: collect global variable declarations and function definitions
    while (this.cursor < this.progend && !this.err) {
      this.rem();
      if (this.cursor >= this.progend) break;
      
      const savedCursor = this.cursor;
      
      // Try to parse variable declaration
      if (this.parseVarDeclaration()) {
        this.skipLineTerminators();
        continue;
      }
      
      // Try to parse function definition
      if (!this.parseFunctionDef()) {
        this.cursor = savedCursor;
        // Skip to next line
        while (this.cursor < this.progend && this.pr[this.cursor] !== '\n') {
          this.cursor++;
        }
        this.cursor++;
      }
    }
    
    // Second pass: execute top-level statements and function calls
    this.cursor = 0;
    this.executeStatements();
    
    return this.getOutput();
  }
}
