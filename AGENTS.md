# AGENTS.md — PyLearn (Simulador de Práctica Python en el Navegador)

Archivo de contexto y convenciones para retomar el trabajo en sesiones futuras. **Léelo al inicio de cada sesión.**

## Qué es el proyecto

SPA educativa que simula práctica interactiva de Python en el navegador.
Motor real: **CPython compilado a WebAssembly** vía Pyodide, sin backend. Despliegue estático.

- URL de producción (GitHub Pages): https://NotAYeen.github.io/PYLEARN/
- Repositorio: https://github.com/NotAYeen/PYLEARN
- Rama de producción: **`main`** (todo push a `main` redepliega Pages automáticamente en ~1-2 min).
- Funciona también abriendo `index.html` con doble clic (sin servidor): el worker tiene fallback inline
  (`loadPyodide` en el hilo principal) por si `python-worker.js` no puede cargarse en contexto `file://`.

## Estado actual (punto de retomar)

- Último commit: `8b75399` — "A11y/UX: Arregla fila de pistas (sin wrap) y suaviza tema claro sin blanco puro".
- Historia reciente: `8b75399` (fix pistas + tema claro suave) ← `ce4cefb` (rediseño Monokai/VSCode, temas
  funcionales, modal accesible, progreso/UX) ← `ebec532` (Feat: proyecto base, 32 misiones).
- **Rediseño completado**: identidad visual VSCode Dark+/Light con acentos Monokai; tema claro sin blanco puro;
  modal accesible (focus trap + Esc + inert + botón "Nivel siguiente"); progreso N/32 con ✔ en el selector;
  diff "Obtenido vs Esperado"; botón Reiniciar nivel; autosave real; doble-run guard.
- 32 niveles (`mision_01`..`mision_32`), motor Pyodide **314.0.7** (CDN jsdelivr + `python-worker.js` + devDependency npm sincronizados).
- Modalidades: **Terminal** (21), **Depuración** (5: misiones 02, 08, 10, 14, 20), **Auditoría** (3: 11, 25, 31),
  **Ensamblaje** (3: 19, 28, 32).
- Validación por salida: ejecutar código en Pyodide, capturar `stdout` y comparar con `expected_output`
  normalizado (`compareOutput` en `src/compare.js`). Briefings escritos para NO revelar la respuesta.
- Todo verificado: `npm run validate` → 32/32, `npm test` → 8/8, `npm run build` → OK (~103 kB bundle.js).

## Comandos

```bash
npm run dev        # servidor Vite de desarrollo (http://localhost:5173)
npm run build      # genera bundle.js (outDir='.' + emptyOutDir:false)
npm run preview    # Vite preview del build
npm run validate   # valida los 32 niveles (ejecuta solution_code con pyodide y compara expected_output)
npm test           # Vitest (tests/levels.test.js)
```

**REGLA CRÍTICA**: tras editar cualquier archivo de `src/`, ejecutar `npm run build` y **commitear `bundle.js`
regenerado**. El CI (`.github/workflows/ci.yml`) falla si `git diff --exit-code bundle.js` no está limpio.
`index.html` y `css/` NO generan bundle, pero `src/*` sí.

## Sistema de tema (reglas de diseño impuestas)

- El tema se gestiona con **`document.documentElement.dataset.theme = 'dark'|'light'`** (lo aplica
  `App.applyTheme()`). El CSS define: `:root` = DARK (VSCode Dark+ / Monokai) y `[data-theme="light"]` = LIGHT.
  **No usar clases `body.dark-theme/light-theme`** (ese fue el bug histórico: el CSS leía `data-theme`).
- Default: dark. Si no hay valor guardado, respetar `prefers-color-scheme`. Persistir en `py_sim_theme`
  y pintar `meta theme-color` según el tema.
- **Tema claro PROHIBE blanco puro**: paleta suave aprobada —
  `--bg-desktop:#eef0f3`, `--bg-panel:#f8f9fb`, `--bg-panel-2:#e9edf1`, `--bg-hover:#e3e8ee`,
  `--bg-active:#d9dfe6`, `--border:#cfd6dd`, `--border-light:#dfe5ea`, `--output-bg:#fbfcfd`,
  `--scrollbar*` tonos `#ecf0f3/#c3cbd3/#a9b3bd`. El fondo del CodeMirror claro se suaviza a `#fbfcfd`.
- **Tema oscuro**: bg `#1e1e1e`, panel `#252526`, panel-2 `#2d2d30`, header `#2d2d2d`, borde `#3c3c3c`,
  focus `#007fd4`, selección `#264f78`. Acentos Monokai: verde `#a6e22e`, naranja `#fd971f`, rosa `#f92672`,
  cian `#66d9ef`, amarillo `#e6db74`, púrpura `#ae81ff`. Ratio de contraste siempre ≥ 4.5:1.
- CodeMirror cambia de tema con el activo: `monokai` (dark) ↔ `eclipse` (light); `index.html` debe cargar
  AMBOS `.min.css` del theme (monokai + eclipse). `App.applyTheme` llama `editor.setTheme(dark)`.
- Tipografías: **JetBrains Mono** (Google Fonts, en `index.html`) para código y **Segoe UI/sistema** para UI
  (`--font-ui` / `--font-mono`). No reintroducir Inter/Source Code Pro.
- Ícono del toggle de tema (`#theme-icon`): `ph ph-moon` en tema oscuro y `ph ph-sun` en claro, lo asigna
  `App.applyTheme`. Botón sonido `#mute-icon`. Ajustes/Contacto usan `.btn-label` oculto en <560px.

## A11y / WCAG / responsividad (reglas aplicadas)

- **Modal**: `showModal(title,msg,opts)` con foco inicial en botón, **focus trap** (Tab/Shift+Tab ciclan),
  cierre con **Esc** y clic en backdrop, e `inert` en `.app-container` + `#docs-window` mientras está abierto.
  `opts`: `okLabel`, `showCancel`, `onOk`, `nextLabel`, `onNext` (botón #retro-modal-next "Nivel siguiente →").
  Restaurar foco al elemento previo al cerrar.
- **Nunca color como único indicador**: ✔/✗/◈ + texto (audit tokens, compare status, toasts). Focus visible
  `outline:2px solid var(--focus)`. Cerrar modal con `Esc` y restaurar foco.
- `prefers-reduced-motion`: anular animaciones/transiciones. Targets táctiles ≥ 44px en `(pointer:coarse)`.
  En `max-width:560px` ocultar `.btn-label` (botones solo ícono) y activar `lineWrapping` del editor
  (matchMedia en `App.bindEvents`).
- Botón pistas `#toggle-hints-btn` debe llevar `aria-expanded` sincronizado en `renderResources`/`toggleHints`.
- Barra de progreso `#progress-badge` con `aria-live="polite"`; selector marca `✓` los completados.
- `document.title` dinámico por nivel: `NN. Título · PyLearn`.

## Arquitectura y mapa de archivos (estado tras rediseño)

- `index.html` — markup SPA + CDNs (CodeMirror 5 con themes monokai Y eclipse, show-hint, phosphor, SortableJS,
  Google Fonts JetBrains Mono) + `#btn-theme-toggle/#theme-icon`, `#btn-mute/#mute-icon`, `#btn-reset`,
  `#progress-badge`, `aria-data-theme` gestionado desde JS, `#retro-modal-next`, paneles. `meta theme-color` inicial `#1e1e1e`.
- `python-worker.js` (raíz) — Worker Pyodide por `importScripts`, responde `init`/`run` con `setStdout({batched})`.
- `src/main.js` — punto de entrada Vite.
- `src/App.js` (~570 líneas) — controlador: **`applyTheme`/`loadTheme`/`toggleTheme`** (data-theme), `loadLevel`,
  `setupMode`, `run` (guard anti doble + `#btn-run.disabled` + `PyRunner` con try/finally), `checkAnswer`
  (¿pass? → logro + `buildSelector` + modal con next), `renderDiff`/`clearDiff`, `checkAudit`, `revealSolution`,
  `showModal`/`_openModal`/`_modalFocusables`/`_trapFocus`/`closeModal` (focus trap + inert + Esc),
  `showSettings` (reset progreso limpia `py_sim_achievements`, `py_sim_completed`, `py_sim_current_level`,
  `py_sim_editor_*`), `setupResizer` (Pointer Events), `setupTabs`, `buildSelector` (+✓), `storageLevelComplete`/`getCompleted`.
- `src/levels.js` (~1050 líneas) — data de los 32 niveles (ver sección de niveles).
- `src/PyRunner.js` — wrapper: worker con fallback inline; timeout 8 s (terminate + recrear); **`onerror`
  resuelve el `pending` pendiente** (evita "Ejecutando…" infinito) antes del fallback inline.
- `src/editor.js` — `PyEditor` (CodeMirror 5 modo python): `setValue/getValue`, **`setTheme(dark)`**,
  **`setLineWrapping(bool)`**, **`onchange(cb)`** (autosave), autocompletado de keywords.
- `src/DndManager.js` — SortableJS, botones ＋/− persistentes, `data-code`, `getQuery` (une "\n"),
  `applySolution` (ordena `solution_code` normalizando líneas, cap 14 bloques).
- `src/compare.js` — `normalizeOutput`/`compareOutput` (CRLF→LF, trimEnd por línea, salta vacíos finales).
- `src/Achievements.js` — logros (`first_steps`, `half_way`, `detective`, `builder`, `master`), toasts vía
  clase CSS **`.retro-toast`** (NO estilos inline `gold` hardcodeados).
- `src/docs.js`, `src/WindowManager.js`, `src/AudioFX.js`, `src/storage.js` — enciclopedia, ventana docs, sonido (persistir `py_sim_muted`), localStorage.
- `css/style.css` (~1420 líneas) — **reescrito por completo**: tokens `:root`/`[data-theme="light"]`, botones/
  paneles/badges/scrollbars tematizados, `.section-title-toggle` con ellipsis (fix del wrap), `.output-compare`
  (diff), `.retro-toast`, `.compare-status`, media queries (≤1080/≤768/≤560, pointer:coarse) y `prefers-reduced-motion`.
- `scripts/validate-levels.mjs` — validador CLI (ejecuta `solution_code` con pyodide npm).
- `tests/levels.test.js` — tests Vitest (integridad + comparador).
- `.github/workflows/ci.yml` — push a `main`: npm ci → validate → test → build → guard de `bundle.js`.
- `vite.config.js` — `outDir: '.'`, `emptyOutDir: false`, minify terser, output `bundle.js` (iife, PyApp).

## Niveles (src/levels.js)

32 niveles con `id_nivel` (`mision_01`..`mision_32`). Dificultad: 1-6 Básico, 7-16 Intermedio, 17-24 Avanzado, 25-32 Experto.
Campos: `id_nivel`, `title`, `dificultad`, `modalidad`, `briefing_mision`, `init_code`, `solution_code`,
`expected_output`, `conceptos`, `pistas`, `keywords`, y según modalidad: `query_defectuoso` /
`audit_tokens` + `token_error_index` / `dnd_blocks`.

- **Terminal/Depuración**: `Ver Solución` rellena el editor con `solution_code`.
- **Auditoría**: `Ver Solución` resalta el token erróneo con `.solution-reveal` (+ icono ◈) y muestra modal con
  `explicacion`. NO resuelve el nivel: el estudiante debe hacer clic en el token correcto (logro `detective`).
- **Ensamblaje**: `Ver Solución` ordena los bloques vía `DndManager.applySolution(solution_code)`.
  `dnd_blocks` corresponde 1:1 a las líneas de `solution_code`.
- `expected_output` es la salida EXACTA de `solution_code` (verificada por validador). Al editar niveles,
  ejecutar `npm run validate` para recalibrar si cambia la salida.
- Depuración: `query_defectuoso` se prefiere en el editor y NO debe producir la salida esperada.
- Logros: `first_steps` (mision_01), `half_way` (mision_16), `detective` (auditoría), `builder` (ensamblaje), `master` (mision_32).

## Git / entorno Windows (reglas de trabajo)

- Shell: **PowerShell 5.1** (sin `rg`; usar Grep/Glob/Read). No usar `&&`; usar `cmd1; if ($?) { cmd2 }`.
- Repo `pylearn` en `C:\Apps\programas\pylearn`. `safe.directory` global ya configurado.
- Identidad git a nivel de repo: `Anton <anthonysmith120999@gmail.com>` (heredada de commits previos).
- Estilo de commits: `Prefijo: Descripción en español` (p. ej. `Fix:`, `Feat:`, `A11y/UX:`, `Chore:`).
- **Solo commitea/pushea cuando el usuario lo pida explícitamente.** Patrón habitual: el usuario pide
  "guarda en git" / "si" al final de cada tarea; entonces commit → `git push origin main` → comprobar CI
  (check-runs de `build` ✅, `deploy` ✅, sitio HTTP 200).
- `gh` no está instalado; usar la API REST con credencial obtenida vía `git credential fill`
  (stdin `protocol=https\nhost=github.com\n`) y `Authorization: Basic`, sin imprimir el token.
- El usuario trabaja en español; responder en español.

## Flujo recomendado para retomar

1. Leer este AGENTS.md.
2. `git status` y `git log --oneline -5` para contexto.
3. Para tocar niveles: `src/levels.js`, `scripts/validate-levels.mjs`, `tests/levels.test.js`.
4. Ante dudas del motor: probar con node + pyodide npm (`import { loadPyodide } from 'pyodide'`.
   Recordar: `setStdout({batched})` NO emite el `\n` final → apendar `'\n'` por callback; `raw` pasa códigos.
5. Tras tocar `src/*`: `npm run validate`, `npm test`, `npm run build`, y commitear `bundle.js`.
6. Al terminar: `git add ...`, commit en español, `git push origin main` (Pages se actualiza solo) y verificar CI + sitio.

## Pendientes/notas

- `favicon.svg` y `preview.png` aún son copias de SQLEARN; conviene rediseñarlas con el branding PyLearn
  (Monokai + JetBrains Mono).
- `origin/master` no existe en PYLEARN (repo nuevo); solo `main`.
- Mantener coherencia de grupos 🟢/🟡/🔴 del selector si se cambia `dificultad` o se añaden niveles.