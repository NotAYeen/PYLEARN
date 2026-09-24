import { LEVELS, getLevelByIndex, getLevelIndex } from './levels.js';
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
    }

    init() {
        this.loadTheme();
        this.achievements = new AchievementsManager();
        this.windowManager = new WindowManager();
        this.editor = new PyEditor();
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

    loadTheme() {
        const theme = Storage.getItem('py_sim_theme', 'dark');
        document.body.classList.add(theme === 'light' ? 'light-theme' : 'dark-theme');
    }

    toggleTheme() {
        const isLight = document.body.classList.contains('light-theme');
        document.body.classList.toggle('light-theme', !isLight);
        document.body.classList.toggle('dark-theme', isLight);
        Storage.setItem('py_sim_theme', isLight ? 'dark' : 'light');
    }

    bindEvents() {
        $('btn-theme-toggle').addEventListener('click', () => this.toggleTheme());
        $('btn-mute').addEventListener('click', () => {
            AudioFX.muted = !AudioFX.muted;
            const icon = $('btn-mute').querySelector('i');
            icon.className = AudioFX.muted ? 'ph ph-speaker-x' : 'ph-fill ph-speaker-high';
        });
        $('btn-settings').addEventListener('click', () => this.showSettings());
        $('btn-contact').addEventListener('click', () => this.showContact());
        $('btn-run').addEventListener('click', () => this.run());
        $('btn-hint').addEventListener('click', () => this.showHint());
        $('btn-solution').addEventListener('click', () => this.revealSolution());
        $('toggle-hints-btn').addEventListener('click', () => this.toggleHints());
        $('db-selector').addEventListener('change', (e) => this.loadLevel(parseInt(e.target.value, 10)));
        $('retro-modal-ok').addEventListener('click', () => this.closeModal());
        $('retro-modal-cancel').addEventListener('click', () => this.closeModal());
        $('retro-modal-x').addEventListener('click', () => this.closeModal());
        $('retro-modal-overlay').addEventListener('click', (e) => {
            if (e.target === $('retro-modal-overlay')) this.closeModal();
        });

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
        resizer.addEventListener('mousedown', (e) => {
            dragging = true;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const bounds = $('layout-mid').getBoundingClientRect();
            const resizerRect = resizer.getBoundingClientRect();
            if (e.button !== 0) return;
            const newHeight = results.getBoundingClientRect().height + (resizerRect.top - e.clientY) * -1;
            const min = 80;
            const max = bounds.bottom - $('editor-container').getBoundingClientRect().top - min;
            results.style.height = `${Math.max(min, Math.min(newHeight, max))}px`;
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    setupTabs() {
        const tabs = ['editor', 'schema', 'mission'];
        const setupBtn = (name) => {
            const btn = $(`tab-btn-${name}`);
            btn.addEventListener('click', () => {
                tabs.forEach((t) => {
                    $(`layout-${t === 'editor' ? 'mid' : t}`).classList.toggle('mobile-show-panel', t === name);
                    $(`layout-${t === 'editor' ? 'mid' : t}`).classList.toggle('mobile-hide-panel', t !== name);
                    $(`tab-btn-${t}`).classList.toggle('active', t === name);
                    $(`tab-btn-${t}`).setAttribute('aria-selected', String(t === name));
                });
            });
        };
        tabs.forEach(setupBtn);
    }

    buildSelector() {
        const select = $('db-selector');
        select.innerHTML = '';
        DIFFICULTY_ORDER.forEach((difficulty) => {
            const levels = LEVELS.filter((l) => l.dificultad === difficulty);
            if (!levels.length) return;
            const group = document.createElement('optgroup');
            group.label = difficulty;
            levels.forEach((l, i) => {
                const idx = LEVELS.indexOf(l);
                const opt = document.createElement('option');
                opt.value = String(idx);
                opt.textContent = `${String(idx + 1).padStart(2, '0')}. ${l.title}`;
                group.appendChild(opt);
            });
            select.appendChild(group);
        });
    }

    loadLevel(index) {
        this.levelIndex = index;
        this.currentLevel = LEVELS[index];
        this.solutionRevealed = false;
        this.auditSolved = false;

        $('db-selector').value = String(index);
        Storage.setItem('py_sim_current_level', String(index));

        this.renderMission();
        this.renderConcepts();
        this.renderResources();
        this.renderExpected();
        this.renderEnv();
        this.updateHints();
        this.setupMode();
        this.editor.focus();
    }

    setupMode() {
        const editorContainer = $('editor-container');
        const auditContainer = $('audit-container');
        const dndContainer = $('dnd-container');
        const runBtn = $('btn-run');

        const mode = this.currentLevel.modalidad;

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
            this.hideResults();
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
            this.hideResults();
        }
    }

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
        list.style.display = 'none';
    }

    toggleHints() {
        const list = $('resources-list');
        const btn = $('toggle-hints-btn');
        const hidden = list.style.display === 'none';
        list.style.display = hidden ? 'block' : 'none';
        btn.textContent = hidden ? 'Ocultar' : 'Mostrar';
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
            li.innerHTML = `<strong style="color: var(--accent);">${cat.category}</strong><ul style="margin-top:4px; padding-left:14px;">${cat.items.map((it) =>
                `<li><button class="docs-item" data-doc="${it.name}" style="background:none;border:none;color:var(--text-primary);cursor:pointer;text-align:left;width:100%;padding:2px 0;">${it.name}</button></li>`
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

    async run() {
        AudioFX.init();
        AudioFX.keyPress();

        if (this.currentLevel.modalidad === 'Auditoría') return;

        const code = this.getCurrentCode();
        if (!code || !code.trim()) {
            this.showModal('Práctica Python', 'Escribe o ensambla tu código antes de ejecutar.', { okLabel: 'Aceptar' });
            return;
        }

        this.showResults();
        $('results-output').textContent = 'Ejecutando…';

        const result = await this.engine.run(code);
        const stdout = result.stdout || '';
        const stderr = result.stderr || '';

        if (!result.ok) {
            $('results-output').textContent = stderr || 'Error de ejecución.';
            this.showModal('Error de Ejecución', 'Tu programa no terminó correctamente. Revisa el mensaje en los resultados.', { okLabel: 'Aceptar' });
            AudioFX.error();
            return;
        }

        $('results-output').textContent = stdout || '(Sin salida)';
        this.checkAnswer(stdout, code);
    }

    showResults() {
        $('results-placeholder').style.display = 'none';
        $('results-content').style.display = 'block';
    }

    hideResults() {
        $('results-placeholder').style.display = 'block';
        $('results-content').style.display = 'none';
    }

    checkAnswer(stdout, code) {
        if (this.currentLevel.modalidad === 'Auditoría') return;

        const { pass } = compareOutput(stdout, this.currentLevel.expected_output);

        if (pass) {
            AudioFX.success();
            this.storageLevelComplete();
            this.unlockAchievements();
            this.showModal('¡Misión Completada!', `Excelente, agente. Tu programa produce exactamente la salida esperada.`, { okLabel: 'Continuar' });
        } else {
            AudioFX.error();
            this.showModal('Salida Incorrecta', 'Tu programa se ejecutó pero la salida no coincide con la esperada. Revisa la Salida Esperada en el panel derecho.', { okLabel: 'Reintentar' });
        }
    }

    storageLevelComplete() {
        const completados = JSON.parse(Storage.getItem('py_sim_completed', '[]') || '[]');
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
            this.showModal('¡Detective!', 'Enhorabuena, ubicaste el fragmento defectuoso. La solución correcta se revela con "Ver Solución".', { okLabel: 'Continuar' });
        } else {
            AudioFX.error();
            this.showModal('Sigue Buscando', 'Ese fragmento no es el problema. Observa qué instrucción cortaría el comportamiento de la misión.', { okLabel: 'Seguir' });
        }
    }

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
        const modal = $('retro-modal-overlay');
        $('retro-modal-msg').innerHTML = `
            <strong>Simulador PyLearn</strong><br>
            Motor: CPython (WebAssembly / Pyodide).<br><br>
            <button id="reset-progress-btn" class="nav-btn" style="margin-top:6px;">Restablecer Progreso</button>
        `;
        $('retro-modal-title').textContent = 'Ajustes';
        $('retro-modal-cancel').style.display = 'none';
        $('retro-modal-ok').textContent = 'Cerrar';
        modal.classList.remove('hidden');
        modal.classList.add('modal-open');
        this.lastFocused = document.activeElement;

        const resetBtn = $('reset-progress-btn');
        resetBtn.onclick = () => {
            Storage.removeItem('py_sim_achievements');
            Storage.removeItem('py_sim_completed');
            Storage.removeItem('py_sim_current_level');
            localStorage.removeItem('py_sim_editor_mision_01');
            location.reload();
        };
    }

    showContact() {
        $('retro-modal-title').textContent = 'Contacto';
        $('retro-modal-msg').innerHTML = '¿Encontraste un error o quieres proponer un desafío Python?<br><br>Escribe al autor del proyecto: <strong>NotAYeen</strong> en GitHub.';
        $('retro-modal-cancel').style.display = 'none';
        $('retro-modal-ok').textContent = 'Cerrar';
        $('retro-modal-overlay').classList.remove('hidden');
        $('retro-modal-overlay').classList.add('modal-open');
        this.lastFocused = document.activeElement;
    }

    showModal(title, msg, opts = {}) {
        $('retro-modal-title').textContent = title;
        $('retro-modal-msg').textContent = msg;
        $('retro-modal-ok').textContent = opts.okLabel || 'Aceptar';
        $('retro-modal-cancel').style.display = opts.showCancel === true ? 'inline-block' : 'none';
        $('retro-modal-cancel').onclick = () => this.closeModal();
        $('retro-modal-overlay').classList.remove('hidden');
        $('retro-modal-overlay').classList.add('modal-open');
        this.lastFocused = document.activeElement;
        const ok = $('retro-modal-ok');
        ok.focus();
    }

    closeModal() {
        $('retro-modal-overlay').classList.add('hidden');
        $('retro-modal-overlay').classList.remove('modal-open');
        if (this.lastFocused && this.lastFocused.focus) {
            setTimeout(() => this.lastFocused.focus(), 0);
        }
    }
}