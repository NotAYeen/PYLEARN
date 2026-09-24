const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

export class PyRunner {
    constructor(onStatus) {
        this.worker = null;
        this.inlinePyodide = null;
        this.pending = null;
        this.onStatus = onStatus || (() => {});
        this.num = 0;
    }

    init() {
        this.num = Math.floor(Math.random() * 1e9);
        if (typeof Worker !== 'undefined') {
            try {
                this.worker = new Worker('python-worker.js');
                this.worker.onmessage = (e) => this.onWorkerMessage(e);
                this.worker.onerror = () => this.warmupInline();
                this.worker.postMessage({ type: 'init' });
                this.onStatus('Motor: cargando CPython (WebAssembly)…');
                return;
            } catch (e) {
                this.worker = null;
            }
        }
        this.warmupInline();
    }

    onWorkerMessage(e) {
        const data = e.data || {};
        if (data.type === 'ready') {
            if (data.ok) {
                this.onStatus('Motor Python listo ✓');
            } else {
                this.worker = null;
                this.warmupInline();
            }
        } else if (data.type === 'result') {
            if (this.pending) {
                const p = this.pending;
                this.pending = null;
                p.resolve({ ok: data.ok, stdout: data.stdout || '', stderr: data.stderr || '' });
            }
        }
    }

    warmupInline() {
        if (this.inlinePyodide) { this.onStatus('Motor Python listo ✓'); return; }

        this.onStatus('Motor: modo compatibilidad activo…');

        if (typeof loadPyodide === 'function') {
            this.bootInline();
        } else {
            const existing = document.querySelector('script[data-pyodide]');
            if (existing) {
                existing.onload = () => { if (this.num) this.bootInline(); };
            } else {
                const script = document.createElement('script');
                script.src = PYODIDE_URL + 'pyodide.js';
                script.dataset.pyodide = '1';
                script.onload = () => this.bootInline();
                script.onerror = () => {
                    this.onStatus('Error: no se pudo cargar el motor Python.');
                };
                document.head.appendChild(script);
            }
        }
    }

    async bootInline() {
        try {
            this.inlinePyodide = await loadPyodide({ indexURL: PYODIDE_URL });
            this.onStatus('Motor Python listo ✓');
        } catch (e) {
            this.onStatus('Error: no se pudo inicializar CPython.');
        }
    }

    run(code) {
        if (!code) {
            return Promise.resolve({ ok: true, stdout: '', stderr: '' });
        }

        if (this.worker) {
            return new Promise((resolve) => {
                this.pending = { resolve };
                let timedOut = false;
                const timer = setTimeout(() => {
                    timedOut = true;
                    if (this.pending) {
                        const p = this.pending;
                        this.pending = null;
                        p.resolve({ ok: false, stdout: '', stderr: 'Tiempo de ejecución agotado (8s). Bucle infinito?' });
                    }
                    try { this.worker.terminate(); } catch (e) {}
                    this.worker = null;
                    this.warmupInline();
                }, 8000);

                const orig = this.worker.onmessage;
                this.worker.onmessage = (e) => {
                    clearTimeout(timer);
                    if (this.pending) orig(e);
                };

                this.worker.postMessage({ type: 'run', code });
            });
        }

        if (this.inlinePyodide) {
            return Promise.resolve(this.runInline(code));
        }

        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (this.inlinePyodide) {
                    clearInterval(check);
                    resolve(this.runInline(code));
                }
            }, 100);
            setTimeout(() => clearInterval(check), 30000);
        });
    }

    runInline(code) {
        const py = this.inlinePyodide;
        let stdout = '';
        let stderr = '';
        py.setStdout({ batched: (t) => { stdout += t + '\n'; } });
        py.setStderr({ batched: (t) => { stderr += t + '\n'; } });
        try {
            py.runPython(code);
            try { py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()'); } catch (e) {}
            return { ok: true, stdout, stderr };
        } catch (e) {
            const msg = String((e && e.message) || e);
            try { py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()'); } catch (e2) {}
            return { ok: false, stdout, stderr: stderr + msg };
        }
    }
}