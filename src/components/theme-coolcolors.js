import ace from 'ace-builds/src-noconflict/ace';

ace.define('ace/theme/coolcolors', ['require', 'exports', 'module', 'ace/lib/dom'], function(require, exports, module) {
  
  exports.isDark = true;
  exports.cssClass = "ace-coolcolors";
  exports.cssText = `
.ace-coolcolors .ace_gutter {
  background: #0a0e14;
  color: #4a6b8a;
}

.ace-coolcolors .ace_print-margin {
  width: 1px;
  background: #1a2332;
}

.ace-coolcolors {
  background-color: #0d1117;
  color: #c8d3e0;
}

.ace-coolcolors .ace_cursor {
  color: #6fb3d2;
}

.ace-coolcolors .ace_marker-layer .ace_selection {
  background: #1e3a5f;
}

.ace-coolcolors.ace_multiselect .ace_selection.ace_start {
  box-shadow: 0 0 3px 0px #0d1117;
}

.ace-coolcolors .ace_marker-layer .ace_step {
  background: #2a4a6a;
}

.ace-coolcolors .ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  border: 1px solid #4a7a9a;
}

.ace-coolcolors .ace_marker-layer .ace_active-line {
  background: #151b24;
}

.ace-coolcolors .ace_gutter-active-line {
  background-color: #1a2332;
}

.ace-coolcolors .ace_marker-layer .ace_selected-word {
  border: 1px solid #2a5a7a;
}

.ace-coolcolors .ace_invisible {
  color: #3a4a5a;
}

/* Keywords - bright cyan/blue */
.ace-coolcolors .ace_keyword {
  color: #4fc3f7;
  font-weight: bold;
}

/* Built-in functions - bright yellow-gold */
.ace-coolcolors .ace_support.ace_function {
  color: #ffd866;
  font-weight: 500;
}

/* Strings - bright green */
.ace-coolcolors .ace_string {
  color: #7ee787;
}

/* Comments - muted purple-gray */
.ace-coolcolors .ace_comment {
  color: #8b949e;
  font-style: italic;
}

/* Numbers - bright orange */
.ace-coolcolors .ace_constant.ace_numeric {
  color: #ff9e64;
}

/* Variables - light periwinkle */
.ace-coolcolors .ace_variable {
  color: #c3a6ff;
}

/* Operators - bright magenta/pink */
.ace-coolcolors .ace_keyword.ace_operator {
  color: #ff79c6;
  font-weight: normal;
}

/* Parentheses, brackets - light blue */
.ace-coolcolors .ace_paren {
  color: #89ddff;
}

.ace-coolcolors .ace_paren.ace_lparen,
.ace-coolcolors .ace_paren.ace_rparen {
  color: #7aa8cc;
}

/* Function parameters */
.ace-coolcolors .ace_variable.ace_parameter {
  color: #9dc5f0;
}

/* Fold widgets */
.ace-coolcolors .ace_fold {
  background-color: #5eb3d6;
  border-color: #c8d3e0;
}

.ace-coolcolors .ace_storage,
.ace-coolcolors .ace_storage.ace_type {
  color: #5eb3d6;
}

.ace-coolcolors .ace_entity.ace_name.ace_function,
.ace-coolcolors .ace_entity.ace_other,
.ace-coolcolors .ace_entity.ace_other.ace_attribute-name,
.ace-coolcolors .ace_variable {
  color: #a8cef0;
}

.ace-coolcolors .ace_constant.ace_character,
.ace-coolcolors .ace_constant.ace_language,
.ace-coolcolors .ace_constant.ace_other {
  color: #82d4f7;
}

.ace-coolcolors .ace_invalid {
  color: #ff6b9d;
  background-color: #2a1a2a;
}

.ace-coolcolors .ace_invalid.ace_deprecated {
  color: #ff8fab;
  background-color: #3a2a3a;
}

.ace-coolcolors .ace_indent-guide {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC) right repeat-y;
}

.ace-coolcolors .ace_indent-guide-active {
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHBzcfkPAAO4Ac/6+4aKAAAAAElFTkSuQmCC) right repeat-y;
}
`;

  const dom = require("../lib/dom");
  dom.importCssString(exports.cssText, exports.cssClass, false);
});
