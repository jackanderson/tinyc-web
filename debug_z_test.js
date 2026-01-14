import { TinyCInterpreter } from './src/interpreter/TinyCInterpreter.js';
import { readFileSync } from 'fs';

const interpreter = new TinyCInterpreter();

// Load the Trek program
const trekCode = readFileSync('../tinyc/trek.tc', 'utf8');

console.log("Running Trek test with 'r' command...");

try {
  interpreter.execute(trekCode);
  
  // Provide inputs step by step
  console.log("=== Providing seed input ===");
  interpreter.addInput("5");
  interpreter.continueExecution();
  
  console.log("=== Providing difficulty input ===");
  interpreter.addInput("n");
  let result = interpreter.continueExecution();
  console.log("After difficulty input - waiting for input:", interpreter.isWaitingForInput());
  
  console.log("=== Providing command input (r) ===");
  interpreter.addInput("r");
  result = interpreter.continueExecution();
  console.log("After r command - waiting for input:", interpreter.isWaitingForInput());
  
  console.log("=== Final output ===");
  console.log(interpreter.getOutput());
  
} catch (error) {
  console.error("Error:", error.message);
  console.log("Output so far:", interpreter.getOutput());
}