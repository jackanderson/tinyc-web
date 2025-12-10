// SimpleTinyCInterpreter.js - Simplified tiny-c interpreter for web
// This runs tiny-c code by executing the standard library functions
// Version: 2.0.8 - Fix lineIndex increment timing for input wait
console.log('*** SimpleTinyCInterpreter loaded - Version 2.0.8 ***');

export class SimpleTinyCInterpreter {
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
  
  // Execute a tiny-c program
  execute(code) {
    this.reset();
    this.code = code;
    this.lines = code.split('\n');
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
    try {
      // If we have a saved loop state, resume the loop
      if (this.loopState) {
        const shouldWait = this.resumeLoop();
        if (shouldWait) {
          return this.getOutput();
        }
        this.loopState = null;
      }
      
      // If we're in a function, continue executing it
      if (this.currentFunction) {
        const shouldWait = this.executeUserFunction(this.currentFunction);
        if (shouldWait) {
          return this.getOutput();
        }
      }
      
      // Continue from where we left off
      while (this.lineIndex < this.lines.length) {
        const i = this.lineIndex;
        
        const trimmed = this.lines[i].trim();
        
        // Skip comments and empty lines
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
    console.log('Executing line:', line);
    
    // Skip MC (machine code) commands
    if (line.startsWith('MC ')) {
      return false;
    }
    
    // Handle multiple statements on one line separated by semicolons
    if (line.includes(';') && !line.includes('"')) {
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
      return this.executeDo(line);
    }
    
    // Check for for loop
    if (line.match(/^for\s*\(/)) {
      return this.executeFor(line);
    }
    
    // Function call
    if (line.match(/^(\w+)\s*\(/)) {
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
    
    // Variable or array assignment
    const assignMatch = line.match(/^(\w+)(?:\s*\((\d+)\))?\s*=\s*(.+)/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const arrayIndex = assignMatch[2];
      const expr = assignMatch[3];
      
      console.log(`[assignment] varName="${varName}" expr="${expr}"`);
      
      // Check for getnum
      const getnumMatch = expr.match(/getnum\("([^"]*)"\)/);
      console.log(`[getnum check] match result:`, getnumMatch);
      if (getnumMatch) {
        console.log('[getnum] Matched! Checking input queue...');
        console.log('[getnum] inputQueue.length:', this.inputQueue.length);
        if (this.inputQueue.length > 0) {
          console.log('[getnum] Has input, processing...');
          const input = this.getInput();
          this.print(input + '\n');
          const value = parseInt(input);
          console.log(`[getnum] input="${input}" parsed to ${value}`);
          if (arrayIndex !== undefined) {
            this.arrays[varName][parseInt(arrayIndex)] = value;
          } else {
            this.variables[varName] = value;
          }
          return false;
        } else {
          console.log('[getnum] No input, requesting...');
          this.requestInput(getnumMatch[1] + ' ');
          console.log('[getnum] Returning true to wait');
          return true; // Wait for input
        }
      }
      
      // Check for getcmd
      const getcmdMatch = expr.match(/getcmd\("([^"]*)"\)/);
      if (getcmdMatch) {
        if (this.inputQueue.length > 0) {
          const input = this.getInput();
          this.print(input + '\n');
          const value = input.charAt(0);
          if (arrayIndex !== undefined) {
            this.arrays[varName][parseInt(arrayIndex)] = value.charCodeAt(0);
          } else {
            this.variables[varName] = value.charCodeAt(0);
          }
          return false;
        } else {
          this.requestInput(getcmdMatch[1] + ' ');
          return true; // Wait for input
        }
      }
      
      // Check for chained assignment (e.g., k = b = 0)
      // expr is "b = 0" when we have "k = b = 0"
      const chainedMatch = expr.match(/^(\w+)\s*=\s*(.+)$/);
      if (chainedMatch) {
        // This is chained assignment: k = b = 0
        const innerVar = chainedMatch[1];  // b
        const finalExpr = chainedMatch[2];  // 0
        const value = this.evaluateExpression(finalExpr);
        
        // Assign to both variables
        this.variables[innerVar] = value;
        if (arrayIndex !== undefined) {
          this.arrays[varName][parseInt(arrayIndex)] = value;
        } else {
          this.variables[varName] = value;
        }
        console.log(`Chained assignment: ${varName} = ${innerVar} = ${value}`);
        return false;
      }
      
      // Regular assignment
      const value = this.evaluateExpression(expr);
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
    
    // Built-in functions
    if (funcName === 'version') {
      return false; // Returns 7
    }
    
    if (funcName === 'random') {
      // Called but not assigned - just execute
      const args = argsStr.split(',').map(a => this.evaluateExpression(a.trim()));
      this.randomFunc(args[0] || 100);
      return false;
    }
    
    if (funcName === 'getcmd') {
      const promptMatch = argsStr.match(/"([^"]*)"/);
      if (promptMatch) {
        if (this.inputQueue.length > 0) {
          const input = this.getInput();
          this.print(input + '\n');
          return false;
        } else {
          this.requestInput(promptMatch[1] + ' ');
          return true;
        }
      }
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
    
    // gs() - get string input
    if (funcName === 'gs') {
      if (this.inputQueue.length > 0) {
        const input = this.getInput();
        this.print(input + '\n');
        // Return length of string
        this.returnValue = input.length;
        return false;
      } else {
        this.requestInput('');
        return true;
      }
    }
    
    // User-defined function
    if (this.functions[funcName]) {
      this.executeUserFunction(funcName);
    }
    
    return false;
  }
  
  executeUserFunction(funcName) {
    const func = this.functions[funcName];
    if (!func) return false;
    
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
      this.lineIndex = func.startLine + 1;
      this.inFunction = true;
      this.shouldReturn = false;
      this.returnValue = null;
    }
    
    // Execute until end of function or waiting for input
    while (this.lineIndex <= func.endLine) {
      const line = this.lines[this.lineIndex];
      this.lineIndex++;
      
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('/*')) continue;
      if (trimmed === ']') break;
      
      const shouldWait = this.executeLine(trimmed);
      if (shouldWait) {
        // Waiting for input - will resume here
        return true;
      }
      
      if (this.shouldReturn) {
        break;
      }
    }
    
    // Finished function - restore previous context if any
    if (this.callStack.length > 0) {
      const prevContext = this.callStack.pop();
      this.currentFunction = prevContext.functionName;
      this.lineIndex = prevContext.lineIndex;
      this.inFunction = true;
    } else {
      this.currentFunction = null;
      this.inFunction = false;
    }
    this.shouldReturn = false;
    return false;
  }
  
  randomFunc(range) {
    if (!this.last) this.last = this.seed = 99;
    this.last = (this.last * this.seed) & 0xFFFFFFFF;
    if (this.last < 0) this.last = -this.last;
    return Math.floor((this.last / 7) % range) + 1;
  }
  
  evaluateExpression(expr) {
    let processed = expr.trim().replace(/[;\]]$/, '');
    
    console.log('Evaluating expression:', processed);
    
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
    const beforeChar = processed;
    processed = processed.replace(/'([^'])'/g, (match, char) => char.charCodeAt(0).toString());
    if (beforeChar !== processed) {
      console.log('After character replacement:', processed);
    }
    
    // Replace array access with expressions
    for (const arrName in this.arrays) {
      // Match array access with any content inside parens
      const regex = new RegExp(arrName + '\\s*\\(([^)]+)\\)', 'g');
      let match;
      while ((match = regex.exec(processed)) !== null) {
        const indexExpr = match[1];
        try {
          const index = this.evaluateExpression(indexExpr);
          const value = (this.arrays[arrName][parseInt(index)] || 0).toString();
          processed = processed.substring(0, match.index) + value + processed.substring(match.index + match[0].length);
          regex.lastIndex = 0; // Reset regex after modification
        } catch (e) {
          console.error('Error evaluating array index:', indexExpr, e);
        }
      }
    }
    
    // Handle function calls AFTER variable substitution
    if (processed.includes('random(')) {
      const match = processed.match(/random\(([^)]+)\)/);
      if (match) {
        const rangeExpr = match[1];
        const range = parseInt(rangeExpr) || 100;
        const result = this.randomFunc(range);
        console.log(`random(${range}) = ${result}`);
        processed = processed.replace(match[0], result.toString());
      }
    }
    
    if (processed.includes('version()')) {
      processed = processed.replace(/version\(\)/g, '7');
    }
    
    if (processed.includes('abs(')) {
      const match = processed.match(/abs\(([^)]+)\)/);
      if (match) {
        const val = this.evaluateExpression(match[1]);
        processed = processed.replace(match[0], Math.abs(val).toString());
      }
    }
    
    // Evaluate basic math expressions
    try {
      if (/^[\d+\-*/()\s%<>=!&|]+$/.test(processed)) {
        let result = eval(processed);
        // Convert boolean results to numbers (C-style: false=0, true=1)
        if (typeof result === 'boolean') {
          result = result ? 1 : 0;
        }
        console.log('Expression result:', result);
        return result;
      }
      const num = parseInt(processed);
      if (!isNaN(num)) {
        console.log('Parsed as number:', num);
        return num;
      }
    } catch (e) {
      console.error('Expression evaluation error:', e);
    }
    
    console.log('Expression defaulted to 0');
    return 0;
  }
  
  // Find matching closing bracket
  findClosingBracket(startLine) {
    let depth = 0;
    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      for (const char of line) {
        if (char === '[') depth++;
        if (char === ']') {
          depth--;
          if (depth === 0) return i;
        }
      }
    }
    return this.lines.length;
  }
  
  // Evaluate a condition expression
  evaluateCondition(condExpr) {
    const result = this.evaluateExpression(condExpr);
    console.log('Condition:', condExpr, '=', result);
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
    
    console.log('executeIf: condition =', condition, 'rest =', rest);
    
    // Check if condition contains getcmd() - need to handle input
    const getcmdMatch = condition.match(/getcmd\("([^"]*)"\)/);
    if (getcmdMatch) {
      console.log('executeIf: Found getcmd in condition');
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
        console.log('If condition after replacements:', newCondition);
        const conditionTrue = this.evaluateCondition(newCondition);
        console.log('If condition with getcmd result:', conditionTrue);
        
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
    console.log('If condition result:', conditionTrue);
    
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
          this.lineIndex = loopEnd + 1;
          this.inLoop = savedInLoop;
          this.loopState = null;
          return false;
        }
        if (this.shouldBreak) {
          this.lineIndex = loopEnd + 1;
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
      while (conditionResult) {
        iterCount++;
        console.log('While iteration', iterCount, 'condition:', condition, '=', conditionResult);
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
            this.lineIndex = loopEnd + 1;
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
      }
      
      console.log('While loop ended after', iterCount, 'iterations');
      this.lineIndex = loopEnd + 1;
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
      
      this.lineIndex = loopEnd + 1;
      this.shouldBreak = false;
      this.inLoop = savedInLoop;
      this.loopState = null;
      return false;
    }
    
    return false;
  }
  
  // Execute while loop
  executeWhile(line) {
    const match = line.match(/^while\s*\(([^)]+)\)\s*\[?$/);
    if (!match) return false;
    
    const condition = match[1];
    const loopStart = this.lineIndex;
    const loopEnd = this.findClosingBracket(this.lineIndex - 1);
    
    console.log('While loop:', condition, 'lines', loopStart, 'to', loopEnd);
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
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
    
    console.log('While loop ended after', iterations, 'iterations');
    this.lineIndex = loopEnd + 1;
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    return false;
  }
  
  // Execute do-while loop
  executeDo(line) {
    const loopStart = this.lineIndex;
    const loopEnd = this.findClosingBracket(this.lineIndex - 1);
    
    console.log('executeDo: Starting do-while loop from line', loopStart, 'to', loopEnd);
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
    let continueLoop = true;
    
    while (continueLoop) {
      iterations++;
      console.log('Do-while iteration', iterations);
      if (iterations > 10000) {
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
          console.log('[executeDo] Do-while end:', trimmed);
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
              console.log('[executeDo] Extracted:', condition);
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
          console.log('Do-while: Waiting for input, saving state at lineIndex', this.lineIndex);
          this.loopState = {
            type: 'do-while',
            loopStart: loopStart,
            loopEnd: loopEnd,
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
    }
    
    this.lineIndex = loopEnd + 1;
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    return false;
  }
  
  // Execute for loop
  executeFor(line) {
    const match = line.match(/^for\s*\(([^;]*);([^;]*);([^)]*)\)\s*\[?$/);
    if (!match) return false;
    
    const init = match[1].trim();
    const condition = match[2].trim();
    const increment = match[3].trim();
    
    console.log('For loop:', init, ';', condition, ';', increment);
    
    // Execute initialization
    if (init) {
      this.executeLine(init);
    }
    
    const loopStart = this.lineIndex;
    const loopEnd = this.findClosingBracket(this.lineIndex - 1);
    
    const savedInLoop = this.inLoop;
    this.inLoop = true;
    
    let iterations = 0;
    let conditionResult = !condition || this.evaluateCondition(condition);
    while (conditionResult) {
      iterations++;
      if (iterations > 10000) {
        console.error('For loop exceeded 10000 iterations - breaking');
        break;
      }
      console.log('For iteration', iterations, 'condition:', condition || 'none', '=', conditionResult);
      
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
          this.lineIndex = loopEnd + 1;
          this.inLoop = savedInLoop;
          return false;
        }
        if (this.shouldBreak) break;
        if (this.shouldContinue) break;
      }
      
      if (this.shouldBreak) break;
      
      // Execute increment
      if (increment) {
        console.log('Executing increment:', increment);
        this.executeLine(increment);
      }
      
      // Re-evaluate condition for next iteration
      conditionResult = !condition || this.evaluateCondition(condition);
    }
    
    console.log('For loop ended after', iterations, 'iterations');
    this.lineIndex = loopEnd + 1;
    this.shouldBreak = false;
    this.inLoop = savedInLoop;
    return false;
  }
  
}
