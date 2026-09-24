# PyLearn

Simulador interactivo y retro para **aprender y practicar Python directamente en el navegador**.
Ejecuta **CPython real** (compilado a WebAssembly con [Pyodide](https://pyodide.org/)) sin backend y sin instalar nada.

🚀 **Pruébalo:** https://NotAYeen.github.io/PYLEARN/

## Características

- **32 misiones** progresivas: Básico, Intermedio, Avanzado y Experto.
- **4 modalidades:** escribir código en el editor, corregir un programa roto (depuración),
  localizar el fragmento defectuoso (auditoría) y ensamblar programas arrastrando bloques (DND).
- **Motor real:** CPython vía Pyodide (WebAssembly) — lo que practicas es lo que se ejecuta, en tu navegador.
- **Validación por salida:** el programa se ejecuta y se compara con la salida esperada del nivel.
- **Logros, enciclopedia de Python, pistas, solución por nivel y salida esperada.**
- **Sin servidor:** funciona abriendo `index.html` con doble clic (el motor tiene un modo de compatibilidad para `file://`).
- Tema claro/oscuro y soporte táctil.

## Tecnologías

- [Pyodide](https://pyodide.org/) (CPython → WebAssembly) vía Worker Web (`python-worker.js`).
- [CodeMirror 5](https://codemirror.net/5/) con modo Python y autocompletado.
- [SortableJS](https://sortablejs.github.io/Sortable/) para los bloques de ensamblaje.
- [Vite](https://vitejs.dev/) → un único `bundle.js` estático para GitHub Pages.

## Desarrollo

```bash
npm install
npm run dev       # servidor Vite de desarrollo
npm run validate  # valida los 32 niveles (ejecuta cada solución con Pyodide)
npm test          # tests Vitest
npm run build     # genera bundle.js (raíz del repo)
```

El CI (`main`) ejecuta `validate → test → build` y falla si `bundle.js` no está regenerado.

## Cómo jugar

1. Selecciona una misión en el desplegable.
2. Lee el informe de la misión en el panel derecho.
3. Escribe tu código (o arrastra los bloques) y pulsa **Ejecutar**.
4. Revisa la *Salida Esperada* para afinar tu solución.

## Estructura

```
src/levels.js          # las 32 misiones (énfasis, briefing, solución, salida esperada)
src/App.js             # controlador de la SPA
src/PyRunner.js        # puente con Pyodide (worker + fallback inline)
python-worker.js       # worker del motor Python
scripts/validate-levels.mjs  # validador CLI de niveles
tests/levels.test.js   # pruebas automáticas
```

## Licencia

ISC.