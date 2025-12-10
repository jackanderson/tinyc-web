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
- **Built-in functions**:
  - `ps "text"` - print string
  - `pl "text"` - print line (with newline)
  - `pn num` - print number
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

## Implementation Notes

This is a **simplified port** of the original tiny-c interpreter. The JavaScript version includes:

- Tiny-C syntax parsing with `[]` blocks
- Function definitions and calls
- Built-in functions: `ps`, `pl`, `pn` (print string, print line, print number)
- String and number constants
- Comment support
- Basic lexical scanning and tokenization
- Error handling and reporting

The full tiny-c language features (variables, expressions, control structures, arrays, etc.) can be expanded upon this foundation.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service.

## Future Enhancements

- [ ] Full tiny-c language support (variables, functions, loops, conditionals)
- [ ] Syntax highlighting in the code editor
- [ ] Step-by-step debugging capabilities
- [ ] Save/load programs from browser storage
- [ ] Multiple code examples and tutorials
- [ ] Interactive language documentation

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
