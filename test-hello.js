import {TinyCInterpreter} from './src/interpreter/TinyCInterpreter.js';

const code = 'main [ ps "Hello World" ]';
const interp = new TinyCInterpreter();
console.log('Executing...');
const output = interp.execute(code);
console.log('Output:', output);
