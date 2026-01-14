import {TinyCInterpreter} from './src/interpreter/TinyCInterpreter.js';
import {readFileSync} from 'fs';

const iplCode = readFileSync('./tinycx.ipl', 'utf-8');
const code = 'main [ ps "Hi" ]';
const interp = new TinyCInterpreter();
interp.loadIPL(iplCode);
const output = interp.execute(code);
console.log('Output:', JSON.stringify(output));
