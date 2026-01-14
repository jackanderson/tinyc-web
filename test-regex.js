const line = "if(!c)c='\"';return MC c,1";
console.log("Line:", line);
console.log("Has semicolon:", line.includes(";"));
console.log("Has string literal (pattern 1):", /("[^"]*")/.test(line));
console.log("Has string literal (pattern 2):", /"[^"]*"/.test(line));
console.log("Should split (pattern 1):", line.includes(";") && !/("[^"]*")/.test(line));
console.log("Should split (pattern 2):", line.includes(";") && !/"[^"]*"/.test(line));
