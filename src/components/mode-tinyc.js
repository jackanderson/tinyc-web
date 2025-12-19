import ace from 'ace-builds/src-noconflict/ace';

ace.define('ace/mode/tinyc_highlight_rules', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function(require, exports, module) {
  const oop = require("../lib/oop");
  const TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

  const TinyCHighlightRules = function() {
    // Keywords for TinyC
    const keywords = (
      "if|else|while|for|return|int|char|main|break|continue"
    );

    // Built-in functions
    const builtinFunctions = (
      "ps|pl|pn|pr|getnum|random|abs|itoa|pnf|MC"
    );

    this.$rules = {
      start: [
        {
          token: "comment",
          regex: /\/\*.*$/
        },
        {
          token: "string",
          regex: /"(?:[^"\\]|\\.)*?"/
        },
        {
          token: "string.single",
          regex: /'(?:[^'\\]|\\.)*?'/
        },
        {
          token: "constant.numeric",
          regex: /\b\d+\b/
        },
        {
          token: "keyword",
          regex: "\\b(?:" + keywords + ")\\b"
        },
        {
          token: "support.function",
          regex: "\\b(?:" + builtinFunctions + ")\\b"
        },
        {
          token: "variable.parameter",
          regex: /\b[a-z_][a-zA-Z0-9_]*\s*\(/,
          next: "function_call"
        },
        {
          token: "keyword.operator",
          regex: /[+\-*\/%=<>!&|]/
        },
        {
          token: "paren.lparen",
          regex: /[\[({]/
        },
        {
          token: "paren.rparen",
          regex: /[\])}]/
        },
        {
          token: "text",
          regex: /\s+/
        },
        {
          token: "variable",
          regex: /\b[a-z_][a-zA-Z0-9_]*\b/
        }
      ],
      function_call: [
        {
          token: "variable.parameter",
          regex: /\)/,
          next: "start"
        },
        {
          token: "text",
          regex: /./
        }
      ]
    };
  };

  oop.inherits(TinyCHighlightRules, TextHighlightRules);
  exports.TinyCHighlightRules = TinyCHighlightRules;
});

ace.define('ace/mode/tinyc', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/tinyc_highlight_rules'], function(require, exports, module) {
  const oop = require("../lib/oop");
  const TextMode = require("./text").Mode;
  const TinyCHighlightRules = require("./tinyc_highlight_rules").TinyCHighlightRules;

  const Mode = function() {
    this.HighlightRules = TinyCHighlightRules;
    this.$behaviour = this.$defaultBehaviour;
  };
  oop.inherits(Mode, TextMode);

  (function() {
    this.lineCommentStart = "//";
    this.blockComment = {start: "/*", end: "*/"};
    this.$id = "ace/mode/tinyc";
  }).call(Mode.prototype);

  exports.Mode = Mode;
});
