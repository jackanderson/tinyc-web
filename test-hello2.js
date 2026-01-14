import {TinyCInterpreter} from './src/interpreter/TinyCInterpreter.js';
import {readFileSync} from 'fs';

const iplCode = readFileSync('./tinycx.ipl', 'utf-8');
const code = 'main [ ps "Hello World" ]';
const interp = new TinyCInterpreter();
console.log('Loading IPL...');
interp.loadIPL(iplCode);
console.log('Executing...');
const output = interp.execute(code);
console.log('Output:', output);
