const PYTHON_KEYWORDS = [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
    'while', 'with', 'yield', 'print', 'len', 'range', 'sum', 'input',
    'int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set', 'abs', 'round'
];

export class PyEditor {
    constructor() {
        this.textarea = document.getElementById('py-editor');
        this.editor = null;
        this.init();
    }

    init() {
        if (typeof CodeMirror !== 'undefined' && this.textarea) {
            this.editor = CodeMirror.fromTextArea(this.textarea, {
                mode: 'python',
                theme: 'monokai',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                smartIndent: true,
                indentWithTabs: false,
                lineWrapping: false,
                autofocus: false,
                extraKeys: {
                    'Tab': (cm) => cm.replaceSelection('    '),
                    'Ctrl-Space': 'autocomplete'
                },
                hintOptions: { completeSingle: false }
            });
        }

        if (this.editor) {
            this.editor.setOption('extraKeys', {
                'Tab': (cm) => cm.replaceSelection('    '),
                'Ctrl-Space': 'autocomplete'
            });

            CodeMirror.registerHelper('hint', 'pythonSim', (cm) => {
                const cursor = cm.getCursor();
                const token = cm.getTokenAt(cursor);
                const start = token ? token.start : cursor.ch;
                const end = cursor.ch;
                const prefix = cm.getRange({ line: cursor.line, ch: start }, cursor);

                const lastWord = (prefix.match(/\w+$/) || [''])[0].toLowerCase();
                if (this.currentWords && lastWord.length >= 1) {
                    const source = this.currentWords.filter((w) =>
                        w.toLowerCase().startsWith(lastWord)
                    );
                    return {
                        list: source.length ? source : PYTHON_KEYWORDS,
                        from: CodeMirror.Pos(cursor.line, start),
                        to: CodeMirror.Pos(cursor.line, end)
                    };
                }

                return { list: [], from: CodeMirror.Pos(cursor.line, end), to: CodeMirror.Pos(cursor.line, end) };
            });

            CodeMirror.commands.autocomplete = (cm) => {
                CodeMirror.showHint(cm, { hint: CodeMirror.hint.pythonSim });
            };

            this.editor.on('inputRead', (cm) => {
                if (!cm.state.completionActive) {
                    const ch = cm.getCursor().ch;
                    const last = cm.getLine(cm.getCursor().line).charAt(ch - 1);
                    if (/[\w]/.test(last)) {
                        CodeMirror.showHint(cm, { hint: CodeMirror.hint.pythonSim });
                    }
                }
            });
        }
    }

    setValue(code) {
        if (this.editor) this.editor.setValue(code);
        else if (this.textarea) this.textarea.value = code;
    }

    getValue() {
        return this.editor ? this.editor.getValue() : this.textarea?.value || '';
    }

    setTheme(dark) {
        if (this.editor) this.editor.setOption('theme', dark ? 'monokai' : 'eclipse');
    }

    setLineWrapping(enabled) {
        if (this.editor) this.editor.setOption('lineWrapping', !!enabled);
    }

    onchange(cb) {
        if (this.editor) this.editor.on('change', () => cb(this.getValue()));
        else if (this.textarea) this.textarea.addEventListener('input', () => cb(this.value));
    }

    updateHints(words) {
        this.currentWords = (words || []).concat(PYTHON_KEYWORDS);
    }

    focus() {
        if (this.editor) this.editor.focus();
    }
}