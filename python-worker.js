var PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
importScripts(PYODIDE_URL + "pyodide.js");

var pyodideReady = null;

function ensurePyodide() {
    if (!pyodideReady) {
        pyodideReady = loadPyodide({ indexURL: PYODIDE_URL });
    }
    return pyodideReady;
}

self.onmessage = async function (event) {
    var data = event.data || {};

    if (data.type === "init") {
        try {
            await ensurePyodide();
            self.postMessage({ type: "ready", ok: true });
        } catch (e) {
            self.postMessage({ type: "ready", ok: false, error: String((e && e.message) || e) });
        }
        return;
    }

    if (data.type === "run") {
        var pyodide;
        try {
            pyodide = await ensurePyodide();
        } catch (e) {
            self.postMessage({ type: "result", ok: false, stdout: "", stderr: "No se pudo cargar el motor Python: " + String((e && e.message) || e) });
            return;
        }

        var stdout = "";
        var stderr = "";
        pyodide.setStdout({ batched: function (t) { stdout += t + "\n"; } });
        pyodide.setStderr({ batched: function (t) { stderr += t + "\n"; } });

        try {
            await pyodide.runPythonAsync(data.code || "");
            try { pyodide.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()"); } catch (e) { }
            self.postMessage({ type: "result", ok: true, stdout: stdout, stderr: stderr });
        } catch (e) {
            var msg = String((e && e.message) || e);
            try { pyodide.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()"); } catch (e2) { }
            self.postMessage({ type: "result", ok: false, stdout: stdout, stderr: stderr + msg });
        }
    }
};