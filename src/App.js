import { LEVELS } from './levels.js';
import { PyEditor } from './editor.js';
import { DndManager } from './DndManager.js';
import { PyRunner } from './PyRunner.js';
import { compareOutput } from './compare.js';
import { PyDocs } from './docs.js';
import { AchievementsManager } from './Achievements.js';
import { AudioFX } from './AudioFX.js';
import { Storage } from './storage.js';
import { WindowManager } from './WindowManager.js';

const $ = (id) => document.getElementById(id);

const DIFFICULTY_ORDER = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];

export class App {
    constructor() {
        this.levelIndex = 0;
        this.currentLevel = null;
        this.solutionRevealed = false;
        this.auditSolved = false;
        this.editor = null;
        this.dnd = null;
        this.engine = null;
        this.achievements = null;
        this.windowManager = null;
        this.lastFocused = null;
        this.running = false;
        this.theme = 'dark';
        this._modalKeyHandler = null;
        this._trapApp = null;
        this._trapDocs = null;
        this._modalOnOk = null;
        this._modalOnNext = null;
        this._modalOnCancel = null;
    }

    /* ============================================================
       INIT
       ============================================================ */
    init() {
        this.loadTheme();
        this.achievements = new AchievementsManager();
        this.windowManager = new WindowManager();
        this.editor = new PyEditor();
        this.applyTheme(this.theme);

        this.dnd = new DndManager();
        this.engine = new PyRunner((status) => {
            const el = $('py-status');
            if (el) el.textContent = status;
        });

        this.engine.init();

        this.bindEvents();
        this.buildSelector();
        this.renderDocs();

        const saved = Storage.getItem('py_sim_current_level', '0');
        let startIndex = parseInt(saved, 10);
        if (isNaN(startIndex) || startIndex < 0 || startIndex >= LEVELS.length) startIndex = 0;
        this.loadLevel(startIndex);
    }

    /* ============================================================
       TEMA (data-theme en <html>)
       ============================================================ */
    applyTheme(theme) {
        const dark = theme !== 'light';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';

        const icon = $('theme-icon');
        if (icon) icon.className = dark ? 'ph ph-moon' : 'ph ph-sun';

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#1e1e1e' : '#eef0f3');

        if (this.editor) this.editor.setTheme(dark);
    }

    loadTheme() {
        let stored = null;
        try { stored = localStorage.getItem('py_sim_theme'); } catch (e) {}

        if (!stored) {
            stored = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        }
        this.theme = stored === 'light' ? 'light' : 'dark';
        this.applyTheme(this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        Storage.setItem('py_sim_theme', this.theme);
        this.applyTheme(this.theme);
    }

    updateMuteIcon() {
        const icon = $('mute-icon');
        if (icon) icon.className = AudioFX.muted ? 'ph ph-speaker-x' : 'ph-fill ph-speaker-high';
    }

    /* ============================================================
       EVENTOS
       ============================================================ */
    bindEvents() {
        $('btn-theme-toggle').addEventListener('click', () => this.toggleTheme());
        $('btn-mute').addEventListener('click', () => {
            AudioFX.muted = !AudioFX.muted;
            Storage.setItem('py_sim_muted', AudioFX.muted ? '1' : '0');
            this.updateMuteIcon();
        });
        $('btn-settings').addEventListener('click', () => this.showSettings());
        $('btn-contact').addEventListener('click', () => this.showContact());
        $('btn-run').addEventListener('click', () => this.run());
        $('btn-reset').addEventListener('click', () => this.confirmResetLevel());
        $('btn-hint').addEventListener('click', () => this.showHint());
        $('btn-solution').addEventListener('click', () => this.revealSolution());
        $('toggle-hints-btn').addEventListener('click', () => this.toggleHints());
        $('db-selector').addEventListener('change', (e) => this.loadLevel(parseInt(e.target.value, 10)));

        $('retro-modal-ok').addEventListener('click', () => {
            const cb = this._modalOnOk;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-cancel').addEventListener('click', () => {
            const cb = this._modalOnCancel;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-next').addEventListener('click', () => {
            const cb = this._modalOnNext;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-x').addEventListener('click', () => this.closeModal());
        $('retro-modal-overlay').addEventListener('click', (e) => {
            if (e.target === $('retro-modal-overlay')) this.closeModal();
        });

        AudioFX.muted = Storage.getItem('py_sim_muted', '0') === '1';
        this.updateMuteIcon();

        this.editor.onchange((code) => {
            if (this.currentLevel && this.currentLevel.modalidad === 'Terminal') {
                Storage.setItem(`py_sim_editor_${this.currentLevel.id_nivel}`, code);
            }
        });

        const wrapMq = window.matchMedia('(max-width: 560px)');
        const applyWrap = () => this.editor.setLineWrapping(wrapMq.matches);
        applyWrap();
        if (typeof wrapMq.addEventListener === 'function') wrapMq.addEventListener('change', applyWrap);

        this.setupResizer();
        this.setupTabs();

        document.addEventListener('click', (e) => {
            const t = e.target.closest('.docs-item');
            if (t) {
                const item = this.findDocItem(t.dataset.doc);
                if (item) this.windowManager.showDoc(item);
            }
        });
    }

    setupResizer() {
        const resizer = $('vertical-resizer');
        const results = $('results-panel');
        let dragging = false;

        const start = (e) => {
            dragging = true;
            e.preventDefault();
            resizer.classList.add('resizing');
        };
        const move = (e) => {
            if (!dragging) return;
            const bounds = $('layout-mid').getBoundingClientRect();
            const resizerRect = resizer.getBoundingClientRect();
            const newHeight = results.getBoundingClientRect().height + (resizerRect.top - e.clientY) * -1;
            const min = 80;
            const max = bounds.bottom - $('editor-container').getBoundingClientRect().top - min;
            results.style.height = `${Math.max(min, Math.min(newHeight, max))}px`;
        };
        const end = () => {
            dragging = false;
            resizer.classList.remove('resizing');
        };

        resizer.addEventListener('pointerdown', start);
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        resizer.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
    }

    setupTabs() {
        const tabs = ['editor', 'schema', 'mission'];
        const setupBtn = (name) => {
            const btn = $(`tab-btn-${name}`);
            btn.addEventListener('click', () => {
                tabs.forEach((t) => {
                    const layout = $(`layout-${t === 'editor' ? 'mid' : t}`);
                    layout.classList.toggle('mobile-show-panel', t === name);
                    layout.classList.toggle('mobile-hide-panel', t !== name);
                    $(`tab-btn-${t}`).classList.toggle('active', t === name);
                    $(`tab-btn-${t}`).setAttribute('aria-selected', String(t === name));
                });
            });
        };
        tabs.forEach(setupBtn);
    }

    /* ============================================================
       PROGRESO / SELECTOR
       ============================================================ */
    getCompleted() {
        try {
            return JSON.parse(Storage.getItem('py_sim_completed', '[]') || '[]');
        } catch (e) {
            return [];
        }
    }

    updateProgress() {
        const badge = $('progress-badge');
        if (badge) badge.textContent = `${this.getCompleted().length} / ${LEVELS.length}`;
    }

    buildSelector() {
        const select = $('db-selector');
        const completed = this.getCompleted();
        select.innerHTML = '';
        DIFFICULTY_ORDER.forEach((difficulty) => {
            const levels = LEVELS.filter((l) => l.dificultad === difficulty);
            if (!levels.length) return;
            const group = document.createElement('optgroup');
            group.label = difficulty;
            levels.forEach((l) => {
                const idx = LEVELS.indexOf(l);
                const opt = document.createElement('option');
                opt.value = String(idx);
                opt.textContent = `${String(idx + 1).padStart(2, '0')}. ${l.title}${completed.includes(l.id_nivel) ? ' ✓' : ''}`;
                group.appendChild(opt);
            });
            select.appendChild(group);
        });
        select.value = String(this.levelIndex);
        this.updateProgress();
    }

    /* ============================================================
       CARGA DE NIVEL
       ============================================================ */
    loadLevel(index) {
        this.levelIndex = index;
        this.currentLevel = LEVELS[index];
        this.solutionRevealed = false;
        this.auditSolved = false;

        $('db-selector').value = String(index);
        Storage.setItem('py_sim_current_level', String(index));

        document.title = `${String(index + 1).padStart(2, '0')}. ${this.currentLevel.title} · PyLearn`;

        this.renderMission();
        this.renderConcepts();
        this.renderResources();
        this.renderExpected();
        this.renderEnv();
        this.updateHints();
        this.setupMode();
        this.buildSelector();
        this.editor.focus();
    }

    setupMode() {
        const editorContainer = $('editor-container');
        const auditContainer = $('audit-container');
        const dndContainer = $('dnd-container');
        const runBtn = $('btn-run');

        const mode = this.currentLevel.modalidad;

        this.hideResults();
        this.clearDiff();

        if (mode === 'Auditoría') {
            editorContainer.style.display = 'none';
            auditContainer.style.display = 'block';
            dndContainer.style.display = 'none';
            runBtn.style.display = 'none';
            this.renderAudit();
        } else if (mode === 'Ensamblaje') {
            editorContainer.style.display = 'none';
            auditContainer.style.display = 'none';
            dndContainer.style.display = 'block';
            runBtn.style.display = 'flex';
            this.dnd.setup(this.currentLevel.dnd_blocks || []);
        } else {
            editorContainer.style.display = 'block';
            auditContainer.style.display = 'none';
            dndContainer.style.display = 'none';
            runBtn.style.display = 'flex';
            if (mode === 'Depuración') {
                this.editor.setValue(this.currentLevel.query_defectuoso || '');
            } else {
                const saved = Storage.getItem(`py_sim_editor_${this.currentLevel.id_nivel}`);
                this.editor.setValue(saved != null ? saved : (this.currentLevel.init_code || ''));
            }
        }
    }

    confirmResetLevel() {
        this.showModal('Reiniciar Nivel', 'Se restablecerá el código de este nivel a su estado inicial. ¿Continuar?', {
            okLabel: 'Reiniciar',
            showCancel: true,
            onOk: () => this.resetLevel()
        });
    }

    resetLevel() {
        const mode = this.currentLevel.modalidad;
        this.solutionRevealed = false;
        this.auditSolved = false;

        if (mode === 'Auditoría') {
            this.renderAudit();
        } else if (mode === 'Ensamblaje') {
            this.dnd.setup(this.currentLevel.dnd_blocks || []);
        } else {
            Storage.removeItem(`py_sim_editor_${this.currentLevel.id_nivel}`);
            if (mode === 'Depuración') {
                this.editor.setValue(this.currentLevel.query_defectuoso || '');
            } else {
                this.editor.setValue(this.currentLevel.init_code || '');
            }
        }
        this.hideResults();
        this.clearDiff();
        this.editor.focus();
    }

    /* ============================================================
       RENDER
       ============================================================ */
    renderMission() {
        const briefing = this.currentLevel.briefing_mision;
        $('mission-briefing').textContent = briefing;
        $('mobile-mission-briefing').textContent = `${this.levelIndex + 1}. ${this.currentLevel.title}`;
    }

    renderConcepts() {
        const list = $('conceptos-list');
        list.innerHTML = '';
        (this.currentLevel.conceptos || []).forEach((c) => {
            const li = document.createElement('li');
            li.textContent = c;
            list.appendChild(li);
        });
    }

    renderResources() {
        const list = $('resources-list');
        list.innerHTML = '';
        (this.currentLevel.pistas || []).forEach((p, i) => {
            const li = document.createElement('li');
            li.textContent = `${i + 1}. ${p}`;
            list.appendChild(li);
        });
        const btn = $('toggle-hints-btn');
        btn.textContent = 'Mostrar';
        btn.setAttribute('aria-expanded', 'false');
        list.style.display = 'none';
    }

    toggleHints() {
        const list = $('resources-list');
        const btn = $('toggle-hints-btn');
        const hidden = list.style.display === 'none';
        list.style.display = hidden ? 'block' : 'none';
        btn.textContent = hidden ? 'Ocultar' : 'Mostrar';
        btn.setAttribute('aria-expanded', String(!hidden));
    }

    renderExpected() {
        const panel = $('expected-panel');
        const pre = $('expected-output');
        const out = this.currentLevel.expected_output || '';
        pre.textContent = out;
        panel.style.display = out ? 'block' : 'none';
    }

    renderEnv() {
        const el = $('env-info-content');
        const mode = this.currentLevel.modalidad;
        const icon = { 'Terminal': '💻', 'Depuración': '🔧', 'Auditoría': '🔍', 'Ensamblaje': '🧩' }[mode] || '💻';
        el.innerHTML = `
            <div class="env-row">Motor: CPython (WebAssembly)</div>
            <div class="env-row">Modalidad: ${icon} ${mode}</div>
            <div class="env-row">Nivel: ${this.levelIndex + 1} / ${LEVELS.length}</div>
            <div class="env-row">Dificultad: ${this.currentLevel.dificultad}</div>
        `;
    }

    updateHints() {
        this.editor.updateHints(this.currentLevel.keywords || []);
    }

    renderDocs() {
        const list = $('docs-list');
        list.innerHTML = '';
        PyDocs.forEach((cat) => {
            const li = document.createElement('li');
            li.style.margin = '0 0 8px 0';
            li.innerHTML = `<strong style="color: var(--mono-cyan);">${cat.category}</strong><ul style="margin-top:4px; padding-left:14px;">${cat.items.map((it) =>
                `<li><button class="docs-item" data-doc="${it.name}">${it.name}</button></li>`
            ).join('')}</ul>`;
            list.appendChild(li);
        });
    }

    findDocItem(name) {
        for (const cat of PyDocs) {
            const found = cat.items.find((i) => i.name === name);
            if (found) return found;
        }
        return null;
    }

    getCurrentCode() {
        const mode = this.currentLevel.modalidad;
        if (mode === 'Ensamblaje') return this.dnd.getQuery();
        return this.editor.getValue();
    }

    /* ============================================================
       EJECUCIÓN / RESULTADOS
       ============================================================ */
    async run() {
        AudioFX.init();
        AudioFX.keyPress();

        if (this.currentLevel.modalidad === 'Auditoría') return;
        if (this.running) return;

        const code = this.getCurrentCode();
        if (!code || !code.trim()) {
            this.showModal('Práctica Python', 'Escribe o ensambla tu código antes de ejecutar.', { okLabel: 'Aceptar' });
            return;
        }

        this.running = true;
        const runBtn = $('btn-run');
        runBtn.disabled = true;

        try {
            this.showResults();
            $('results-output').textContent = 'Ejecutando…';
            this.clearDiff();

            const result = await this.engine.run(code);
            const stdout = result.stdout || '';
            const stderr = result.stderr || '';

            if (!result.ok) {
                $('results-output').textContent = stderr || 'Error de ejecución.';
                $('results-output').classList.add('py-error');
                this.showModal('Error de Ejecución', 'Tu programa no terminó correctamente. Revisa el mensaje en los resultados.', { okLabel: 'Aceptar' });
                AudioFX.error();
                return;
            }

            $('results-output').classList.remove('py-error');
            $('results-output').textContent = stdout || '(Sin salida)';
            this.checkAnswer(stdout, code);
        } finally {
            this.running = false;
            runBtn.disabled = false;
        }
    }

    showResults() {
        $('results-placeholder').style.display = 'none';
        $('results-content').style.display = 'block';
    }

    hideResults() {
        $('results-placeholder').style.display = 'block';
        $('results-content').style.display = 'none';
        const out = $('results-output');
        out.textContent = '';
        out.classList.remove('py-error');
    }

    renderDiff(actual, expected) {
        const wrap = $('results-content');
        let compare = wrap.querySelector('.output-compare');
        if (!compare) {
            compare = document.createElement('div');
            compare.className = 'output-compare';
            wrap.appendChild(compare);
        }
        compare.innerHTML = `
            <span class="compare-status status-bad" role="status">✗ No coincide con la salida esperada</span>
            <div class="compare-block compare-bad"><div class="compare-block-label">Obtenido</div><pre></pre></div>
            <div class="compare-block compare-ok"><div class="compare-block-label">Esperado</div><pre></pre></div>
        `;
        compare.querySelectorAll('pre')[0].textContent = actual || '(sin salida)';
        compare.querySelectorAll('pre')[1].textContent = expected || '(vacío)';
    }

    clearDiff() {
        const wrap = $('results-content');
        const compare = wrap.querySelector('.output-compare');
        if (compare) compare.remove();
    }

    checkAnswer(stdout, code) {
        if (this.currentLevel.modalidad === 'Auditoría') return;

        const { pass, actual, expected } = compareOutput(stdout, this.currentLevel.expected_output);

        if (pass) {
            this.clearDiff();
            AudioFX.success();
            this.storageLevelComplete();
            this.unlockAchievements();
            this.buildSelector();

            const nextIndex = this.levelIndex + 1 < LEVELS.length ? this.levelIndex + 1 : -1;
            const opts = { okLabel: 'Continuar' };
            if (nextIndex >= 0) {
                opts.nextLabel = 'Nivel siguiente →';
                opts.onNext = () => this.loadLevel(nextIndex);
            }
            this.showModal('¡Misión Completada!', 'Excelente, agente. Tu programa produce exactamente la salida esperada.', opts);
        } else {
            this.renderDiff(actual, expected);
            AudioFX.error();
            this.showModal('Salida Incorrecta', 'Tu programa se ejecutó pero la salida no coincide con la esperada. En los resultados verás ambos bloques para compararlos.', { okLabel: 'Reintentar' });
        }
    }

    storageLevelComplete() {
        const completados = this.getCompleted();
        if (!completados.includes(this.currentLevel.id_nivel)) {
            completados.push(this.currentLevel.id_nivel);
            Storage.setItem('py_sim_completed', JSON.stringify(completados));
        }
    }

    unlockAchievements() {
        const id = this.currentLevel.id_nivel;
        const mode = this.currentLevel.modalidad;
        if (id === 'mision_01') this.achievements.unlock('first_steps');
        if (id === 'mision_16') this.achievements.unlock('half_way');
        if (id === 'mision_32') this.achievements.unlock('master');
        if (mode === 'Ensamblaje') this.achievements.unlock('builder');
    }

    /* ============================================================
       AUDITORÍA
       ============================================================ */
    renderAudit() {
        const area = $('audit-code-area');
        area.innerHTML = '';
        const tokens = this.currentLevel.audit_tokens || [];
        tokens.forEach((line, i) => {
            if (!line.trim()) {
                const spacer = document.createElement('div');
                spacer.className = 'audit-token audit-spacer';
                area.appendChild(spacer);
                return;
            }
            const span = document.createElement('span');
            span.className = 'audit-token';
            span.textContent = line;
            span.dataset.idx = String(i);
            span.addEventListener('click', () => this.checkAudit(i));
            area.appendChild(span);
        });
    }

    checkAudit(idx) {
        if (this.auditSolved) return;
        if (idx === this.currentLevel.token_error_index) {
            this.auditSolved = true;
            const spans = $('audit-code-area').querySelectorAll('.audit-token');
            spans.forEach((s) => {
                if (Number(s.dataset.idx) === idx) s.classList.add('audit-correct');
            });
            AudioFX.success();
            this.storageLevelComplete();
            this.achievements.unlock('detective');
            this.buildSelector();

            const nextIndex = this.levelIndex + 1 < LEVELS.length ? this.levelIndex + 1 : -1;
            const opts = { okLabel: 'Continuar' };
            if (nextIndex >= 0) {
                opts.nextLabel = 'Nivel siguiente →';
                opts.onNext = () => this.loadLevel(nextIndex);
            }
            this.showModal('¡Detective!', 'Enhorabuena, ubicaste el fragmento defectuoso. La solución correcta se revela con "Ver Solución".', opts);
        } else {
            AudioFX.error();
            this.showModal('Sigue Buscando', 'Ese fragmento no es el problema. Observa qué instrucción cortaría el comportamiento de la misión.', { okLabel: 'Seguir' });
        }
    }

    /* ============================================================
       SOLUCIÓN / PISTAS
       ============================================================ */
    revealSolution() {
        const level = this.currentLevel;
        const mode = level.modalidad;
        const title = level.title;

        if (mode === 'Auditoría') {
            const spans = $('audit-code-area').querySelectorAll('.audit-token');
            spans.forEach((s) => {
                if (Number(s.dataset.idx) === level.token_error_index) s.classList.add('solution-reveal');
            });
            this.showModal(`Solución - ${title}`, level.explicacion || 'Ubica el fragmento defectuoso y haz clic en él.', { okLabel: 'Entendido' });
            return;
        }

        if (mode === 'Ensamblaje') {
            const order = this.dnd.applySolution(level);
            if (!order || order.length !== (level.dnd_blocks || []).length) {
                this.showModal(`Solución - ${title}`, 'No se pudo ensamblar automáticamente. La solución correcta es:\n\n' + (level.solution_code || ''), { okLabel: 'Entendido' });
            } else {
                this.showModal(`Solución - ${title}`, 'Los bloques se han ordenado en tu código. Pulsa Ejecutar para verificar el resultado.', { okLabel: 'Ejecutar Después' });
            }
            return;
        }

        this.solutionRevealed = true;
        this.editor.setValue(level.solution_code || '');
        this.showModal(`Solución - ${title}`, 'Se ha colocado el código solución en el editor. Pulsa Ejecutar para verificar el resultado.', { okLabel: 'Ejecutar Después' });
    }

    showHint() {
        const pistas = this.currentLevel.pistas || [];
        const hint = pistas.length ? pistas[0] : 'No hay pistas extras para este nivel.';
        this.showModal('Pista', hint, { okLabel: 'Aceptar' });
    }

    showSettings() {
        $('retro-modal-title').textContent = 'Ajustes';
        $('retro-modal-msg').innerHTML = `
            <strong>Simulador PyLearn</strong><br>
            Motor: CPython (WebAssembly / Pyodide).<br><br>
            <button id="reset-progress-btn" class="nav-btn" style="margin-top:6px;">Restablecer Progreso</button>
        `;
        this._openModal({ okLabel: 'Cerrar' });

        const resetBtn = $('reset-progress-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                Storage.removeItem('py_sim_achievements');
                Storage.removeItem('py_sim_completed');
                Storage.removeItem('py_sim_current_level');
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('py_sim_editor_')) localStorage.removeItem(k);
                    }
                } catch (e) {}
                location.reload();
            };
        }
    }

    showContact() {
        $('retro-modal-title').textContent = 'Contacto';
        $('retro-modal-msg').innerHTML = '¿Encontraste un error o quieres proponer un desafío Python?<br><br>Escribe al autor del proyecto: <strong>NotAYeen</strong> en GitHub.';
        this._openModal({ okLabel: 'Cerrar' });
    }

    /* ============================================================
       MODAL (focus trap + Esc + inert)
       ============================================================ */
    showModal(title, msg, opts = {}) {
        $('retro-modal-title').textContent = title;
        $('retro-modal-msg').innerHTML = String(msg)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        this._openModal(opts);
    }

    _openModal(opts = {}) {
        const overlay = $('retro-modal-overlay');
        const ok = $('retro-modal-ok');
        const cancel = $('retro-modal-cancel');
        const next = $('retro-modal-next');

        ok.textContent = opts.okLabel || 'Aceptar';
        cancel.style.display = opts.showCancel === true ? 'inline-block' : 'none';
        next.style.display = opts.nextLabel && opts.onNext ? 'inline-block' : 'none';
        if (opts.nextLabel) next.textContent = opts.nextLabel;

        this._modalOnOk = opts.onOk || null;
        this._modalOnNext = opts.onNext || null;
        this._modalOnCancel = opts.onCancel || null;

        overlay.classList.remove('hidden');
        this.lastFocused = document.activeElement;

        this._trapApp = document.querySelector('.app-container');
        this._trapDocs = $('docs-window');
        try {
            if (this._trapApp) this._trapApp.inert = true;
            if (this._trapDocs) this._trapDocs.inert = true;
        } catch (e) {}

        this._modalKeyHandler = (e) => {
            if (e.key === 'Escape') { this.closeModal(); return; }
            if (e.key === 'Tab') this._trapFocus(e);
        };
        document.addEventListener('keydown', this._modalKeyHandler);

        const focusable = this._modalFocusables();
        if (focusable.length) focusable[0].focus();
    }

    _modalFocusables() {
        return Array.from($('retro-modal-overlay').querySelectorAll('button, [href], input, select, textarea'))
            .filter((el) => el.getClientRects().length > 0);
    }

    _trapFocus(e) {
        const f = this._modalFocusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    closeModal() {
        const overlay = $('retro-modal-overlay');
        if (overlay.classList.contains('hidden')) return;
        overlay.classList.add('hidden');

        try {
            if (this._trapApp) this._trapApp.inert = false;
            if (this._trapDocs) this._trapDocs.inert = false;
        } catch (e) {}

        if (this._modalKeyHandler) {
            document.removeEventListener('keydown', this._modalKeyHandler);
            this._modalKeyHandler = null;
        }

        if (this.lastFocused && this.lastFocused.focus) {
            setTimeout(() => this.lastFocused.focus(), 0);
        }
    }
}