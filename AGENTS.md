# AGENTS.md — PyLearn (Simulador de Práctica Python en el Navegador)

Archivo de contexto y convenciones para retomar el trabajo en sesiones futuras. **Léelo al inicio de cada sesión.**

## Qué es el proyecto

SPA educativa que simula práctica interactiva de Python en el navegador.
Motor real: **CPython compilado a WebAssembly** vía Pyodide, sin backend. Despliegue estático.

- URL de producción (GitHub Pages): https://NotAYeen.github.io/PYLEARN/
- Repositorio: https://github.com/NotAYeen/PYLEARN
- Rama de producción: **`main`** (todo push a `main` redepliega Pages automáticamente).
- Funciona también abriendo `index.html` con doble clic (sin servidor): el worker tiene fallback inline (
  `loadPyodide` en el hilo principal) por si `python-worker.js` no puede cargarse en contexto `file://`.

## Estado actual (punto de retomar)

- Proyecto creado desde cero en `C:\Apps\programas\pylearn` (espejo de SQLEARN adaptado a Python).
- 32 niveles (`mision_01`..`mision_32`) con `solution_code` y `expected_output` escritos en `src/levels.js`.
- Motor Pyodide en **versión 314.0.7** (sincronizada entre CDN jsdelivr, `python-worker.js` y devDependency npm).
- Modalidades: **Terminal** (21), **Depuración** (5: misiones 02, 08, 10, 14, 20), **Auditoría** (3: 11, 25, 31),
  **Ensamblaje** (3: 19, 28, 32).
- Validación por salida: ejecutar código en Pyodide, capturar `stdout` y comparar con `expected_output`
  normalizado (`compareOutput` en `src/compare.js`).
- Briefings escritos para NO revelar la respuesta (lección heredada de SQLEARN).

### Comandos

```bash
npm run dev        # servidor Vite de desarrollo (http://localhost:5173)
npm run build      # genera bundle.js (outDir='.' + emptyOutDir:false)
npm run preview    # Vite preview del build
npm run validate   # valida los 32 niveles (ejecuta solution_code con pyodide y compara expected_output)
npm test           # Vitest (tests/levels.test.js)
```

**REGLA CRÍTICA**: tras editar cualquier archivo de `src/`, ejecutar `npm run build` y **commitear `bundle.js`
regenerado**. El CI (`.github/workflows/ci.yml`) falla si `git diff --exit-code bundle.js` no está limpio.

## Arquitectura y mapa de archivos

- `index.html` — markup SPA + CDNs (Pyodide se carga desde el worker; CodeMirror 5 + modo python, phosphor icons)
  + `#btn-run`, `#db-selector`, paneles de misión/conceptos/entorno/salida esperada.
- `python-worker.js` (raíz) — Worker que carga Pyodide por `importScripts` y responde `init`/`run`
  capturando `stdout`/`stderr` con `setStdout({batched})`. Se sirve en la raíz para Pages y file://.
- `src/main.js` — punto de entrada Vite.
- `src/App.js` (~800 líneas) — controlador: selector por dificultad, `loadLevel`, `setupMode` (editor/auditoría/DND),
  `run`, `checkAnswer`, `checkAudit`, `revealSolution`, modal, resizer, tabs móviles, logros.
- `src/levels.js` (~1050 líneas) — data de los 32 niveles (ver sección de niveles).
- `src/PyRunner.js` — wrapper de Pyodide: worker con fallback inline, timeout de seguridad (8 s → terminate + recrear).
- `src/editor.js` — `SQLEditor`→`PyEditor` (CodeMirror 5) con modo python y autocompletado de keywords.
- `src/DndManager.js` — bloques DND (SortableJS), botones ＋/− persistentes, `data-code` para textos,
  `getQuery` (une con "\n"), `applySolution` (ordena `solution_code` buscando líneas normalizadas, cap 14 bloques).
- `src/compare.js` — `normalizeOutput`/`compareOutput` (CRLF→LF, trimEnd por línea, quita saltos finales).
- `src/Achievements.js` — logros (`first_steps`, `half_way`, `detective`, `builder`, `master`), claveados por `id_nivel`.
- `src/docs.js` — Enciclopedia Python (categorías + ejemplos).
- `src/{WindowManager,AudioFX,storage}.js` — ventana docs, sonido, localStorage.
- `css/style.css` (~1050 líneas) — heredado de SQLEARN + bloque PYLEARN al final.
- `scripts/validate-levels.mjs` — validador CLI (ejecuta `solution_code` con pyodide npm).
- `tests/levels.test.js` — tests Vitest (integridad de niveles + comparador).
- `.github/workflows/ci.yml` — push a `main`: npm ci → validate → test → build → guard de bundle.js.
- `vite.config.js` — `outDir: '.'`, `emptyOutDir: false`, minify terser, output `bundle.js` (iife, PyApp).
- `public/niveles` NO existe; los niveles viven en `src/levels.js`.

## Niveles (src/levels.js)

32 niveles con `id_nivel` (`mision_01`..`mision_32`). Dificultad: 1-6 Básico, 7-16 Intermedio, 17-24 Avanzado, 25-32 Experto.
Campos: `id_nivel`, `title`, `dificultad`, `modalidad`, `briefing_mision`, `init_code`, `solution_code`,
`expected_output`, `conceptos`, `pistas`, `keywords`, y según modalidad: `query_defectuoso` /
`audit_tokens` + `token_error_index` / `dnd_blocks`.

- **Terminal/Depuración**: `Ver Solución` rellena el editor con `solution_code`.
- **Auditoría**: `Ver Solución` resalta el token erróneo con `.solution-reveal` y muestra modal con `explicacion`.
  NO resuelve el nivel: el estudiante debe hacer clic en el token correcto (logro `detective`).
  Estos niveles tienen `audit_tokens` (el código defectuoso, línea por línea) y `token_error_index`.
- **Ensamblaje**: `Ver Solución` ordena los bloques vía `DndManager.applySolution(solution_code)`.
  `dnd_blocks` corresponde 1:1 a las líneas de `solution_code` (mismas, salvo que puede no incluir líneas en blanco).
- `expected_output` es la salida EXACTA de `solution_code` (verificada por el validador). Al editar niveles,
  ejecutar `npm run validate` para recalibrar si cambia la salida.
- Depuración: `query_defectuoso` se prefija en el editor y NO debe producir ya la salida esperada (el validador avisa).
- Logros: `first_steps` (mision_01), `half_way` (mision_16), `detective` (auditoría), `builder` (ensamblaje), `master` (mision_32).

## Git / entorno Windows

- Shell: **PowerShell 5.1** (sin `rg`; usar Grep/Glob/Read). No usar `&&`; usar `cmd1; if ($?) { cmd2 }`.
- Repo `pylearn` en `C:\Apps\programas\pylearn` (renombrable). `safe.directory` global ya configurado.
- Identidad git a nivel de repo (configurar si falta): `Anton <anthonysmith120999@gmail.com>`.
- Estilo de commits: `Prefijo: Descripción en español` (p. ej. `Fix:`, `Feat:`, `Chore:`).
- **Solo commitea/pushea cuando el usuario lo pida explícitamente.**
- El usuario trabaja en español; responder en español.

## Flujo recomendado para retomar

1. Leer este AGENTS.md.
2. `git status` y `git log --oneline -5` para contexto.
3. Para tocar niveles: `src/levels.js`, `scripts/validate-levels.mjs`, `tests/levels.test.js`.
4. Ante dudas del motor: probar con node + pyodide npm (`import { loadPyodide } from 'pyodide'`).
5. Tras tocar `src/*`: `npm run validate`, `npm test`, `npm run build`, y commitear `bundle.js`.
6. Al terminar: `git add ...`, commit en español, `git push origin main`.

## Pendientes/notas

- Si Pages no levanta, revisar el fallback inline en `file://` y el `base` de Vite (no usar `/` absoluto).
- La imagen `preview.png` y `favicon.svg` se copiaron de SQLEARN; conviene rediseñarlas para el branding PyLearn.
- `origin/master` no existe en PYLEARN (repo nuevo); solo `main`.