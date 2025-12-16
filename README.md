# Tiny-C Web Interpreter

A web-based port of the classic **tiny-c** interpreter originally created by Scott B. Guthery in 1984. This project brings the tiny-c language to the browser using JavaScript and React.

## About Tiny-C

Tiny-C is a small, C-like interpreted programming language designed for educational purposes. The original interpreter was written in C and provided a simple environment for learning programming concepts.

## Features

- 🌐 **Browser-Based**: Run tiny-c programs directly in your web browser
- ⚡ **Real-Time Execution**: Instant feedback as you write code
- 🎨 **Modern UI**: Clean, VS Code-inspired interface
- 📝 **Code Editor**: Syntax-aware editor with tab support
- 🚀 **No Installation Required**: Just open and start coding

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd tinyc-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Write your tiny-c code in the left editor panel
2. Click the "▶️ Run" button to execute your program
3. View the output in the right panel
4. Use "📄 Load Example" to see sample programs
5. Use "🗑️ Clear" to reset the editor

### Example Program

```c
/* Simple Tiny-C Program */

hello[
  pl "Hello, World!"
  pl "Welcome to Tiny-C!"
]

hello()
```

### Tiny-C Syntax Basics

- **Functions**: `funcname[body]` or `funcname type param1, param2[body]`
- **Blocks**: Use `[]` instead of `{}`
- **Variables**: `int a, b, c` or `char str(10)` for arrays
- **Built-in functions**: See [Built-in Functions Reference](#built-in-functions-reference) below
- **Control flow**: `if (cond)[...]`, `while (cond)[...]`, `for (init; cond; update)[...]`
- **Comments**: `/* comment */`

## Project Structure

```
tinyc-web/
├── src/
│   ├── interpreter/
│   │   └── TinyCInterpreter.js    # Core interpreter logic
│   ├── components/
│   │   ├── CodeEditor.jsx         # Code editor component
│   │   ├── CodeEditor.css
│   │   ├── OutputPanel.jsx        # Output display component
│   │   └── OutputPanel.css
│   ├── App.jsx                    # Main application component
│   ├── App.css
│   ├── main.jsx                   # React entry point
│   └── index.css
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Built-in Functions Reference

The Tiny-C Web Interpreter includes a comprehensive library of built-in functions compatible with the original tiny-c implementation:

### Input/Output Functions

#### Character I/O
- **`putchar(c)`** - Output single character. If c=0, outputs '"'
- **`getchar()`** - Input single character, returns ASCII code
- **`chrdy()`** - Check if character ready for input (returns 1 if available, 0 if not)
- **`gc()`** - Get character (same as getchar)

#### String I/O
- **`ps("text")`** - Print string without newline
- **`pl("text")`** - Print line with newline
- **`pn(num)`** - Print number with space prefix
- **`gs(buffer)`** - Get string input into character array

#### Number I/O  
- **`gn()`** - Get number input, prompts until valid number entered

### String Functions

- **`strlen(str)`** - Return length of null-terminated string
- **`strcat(dest, src)`** - Concatenate src string to dest string
- **`strcpy(dest, src)`** - Copy src string to dest string
- **`tolower(str)`** - Convert string to lowercase in place
- **`toupper(str)`** - Convert string to uppercase in place

### Parsing Functions

- **`alphanum(c)`** - Check if character is alphanumeric (A-Z, a-z, 0-9, _)
- **`num(buffer, value)`** - Parse up to 5 digits from buffer into value variable
- **`atoi(buffer, value)`** - ASCII to integer conversion with sign handling

### String Search & Comparison

- **`ceqn(str1, str2, n)`** - Compare first n characters of two strings
- **`index(haystack, len, needle, nlen)`** - Find substring position in string
- **`countch(array, end, char)`** - Count occurrences of character
- **`scann(array, end, char, count)`** - Scan for first occurrence of character

### Memory Operations

- **`move(src, dest)`** - Copy string from source to destination
- **`movebl(src, dest, n)`** - Move block of memory (simplified in web version)
- **`memset(array, size, value)`** - Set memory array to specific value

### Terminal Control

- **`cls()`** - Clear screen (clears output in web version)
- **`beep(freq, dur)`** - Generate audio tone (frequency in Hz, duration in ms)
- **`cnormal()`**, **`chide()`**, **`csolid()`** - Cursor control (no-op in web)
- **`color(c)`**, **`hilo(c)`** - Color control (no-op in web)
- **`posc(row, col)`** - Position cursor (no-op in web)
- **`on()`**, **`off()`**, **`solid()`** - Display attributes (no-op in web)

### System Functions

- **`version()`** - Return interpreter version (returns 7)
- **`random(range)`** - Generate random number from 1 to range
- **`sak()`** - "Strike any key" - prompt and wait for input
- **`exit()`** - Exit program

### File Operations

File operations return -1 (not supported in web version):
- **`readfile(name, buffer, size, unit)`** 
- **`writefile(name, buffer, end, unit)`**
- **`fopen(rw, name, size, unit)`**
- **`fread(buffer, unit)`**
- **`fwrite(from, to, unit)`**
- **`fclose(unit)`**

### Usage Examples

```c
/* String operations */
char name(20), greeting(50)
strcpy(name, "World")
strcpy(greeting, "Hello, ")
strcat(greeting, name)
pl greeting  /* Outputs: Hello, World */

/* Input handling */
char input(10)
pl "Enter your name:"
gs input
ps "Hello, "
pl input

/* Number processing */
int num
pl "Enter a number:"
num = gn()
pn num
```

## Implementation Notes

This is a **full-featured port** of the original tiny-c interpreter. The JavaScript version includes:

- Complete Tiny-C syntax parsing with `[]` blocks
- Function definitions and calls with parameters
- Full built-in function library (48+ functions)
- Variable declarations and expressions
- Control flow (if, while, for loops)
- Array support with character and integer arrays
- String and number constants
- Comment support
- Interactive input handling
- Error handling and reporting
- Compatible with original tiny-c programs

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

## Language Features

The Tiny-C Web Interpreter supports the complete tiny-c language:

### Variable Declarations
```c
int a, b, c           /* Integer variables */
char str(10), buf(20) /* Character arrays */
```

### Function Definitions
```c
/* Simple function */
hello[
  pl "Hello World!"
]

/* Function with parameters */
add int x, y[
  return x + y
]
```

### Control Structures
```c
/* If statements */
if (condition)[
  /* statements */
]

/* While loops */
while (condition)[
  /* statements */
]

/* For loops */
for (i = 0; i < 10; ++i)[
  /* statements */
]
```

### Arrays and Strings
```c
char message(50)
strcpy(message, "Hello, Tiny-C!")
pl message
```

## Future Enhancements

- [ ] Syntax highlighting in the code editor  
- [ ] Step-by-step debugging capabilities
- [ ] Save/load programs from browser storage
- [ ] Multiple code examples and tutorials
- [ ] Interactive language documentation
- [ ] File I/O simulation for web environment

## Credits

- **Original tiny-c Interpreter**: Scott B. Guthery (1984)
- **Linux Port Updates**: Lee Bradley, Ed Davis (2017)
- **Web Port**: 2025

## License

This web port is provided as-is for educational purposes. Please refer to the original tiny-c license for terms regarding the interpreter design and implementation.

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## Links

- [Original tiny-c documentation](../tiny-c/readme.txt)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

---

*Built with ❤️ using React and Vite*
# tinyc-web
# tinyc-web
