import Sortable from 'sortablejs';

export class DndManager {
    constructor() {
        this.sourceEl = document.getElementById('dnd-source');
        this.targetEl = document.getElementById('dnd-target');
        this.blocks = [];
        this.solutionOrder = [];
        this.init();
    }

    init() {
        Sortable.create(this.sourceEl, {
            group: 'blocks',
            animation: 150,
            onEnd: () => this.sync()
        });
        Sortable.create(this.targetEl, {
            group: 'blocks',
            animation: 150,
            onEnd: () => this.sync()
        });
    }

    makeBlock(raw, id) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'dnd-block';
        div.setAttribute('draggable', 'true');
        div.dataset.code = raw;
        div.appendChild(document.createTextNode(raw));

        const addBtn = document.createElement('button');
        addBtn.className = 'dnd-btn dnd-btn-add';
        addBtn.innerHTML = '＋';
        addBtn.type = 'button';
        addBtn.setAttribute('aria-label', 'Mover bloque al código');

        const remBtn = document.createElement('button');
        remBtn.className = 'dnd-btn dnd-btn-remove';
        remBtn.innerHTML = '−';
        remBtn.type = 'button';
        remBtn.setAttribute('aria-label', 'Quitar bloque del código');

        addBtn.addEventListener('click', () => {
            if (div.parentNode === this.sourceEl) {
                this.sourceEl.removeChild(div);
                this.targetEl.appendChild(div);
                this.sync();
            }
        });

        remBtn.addEventListener('click', () => {
            if (div.parentNode === this.targetEl) {
                this.targetEl.removeChild(div);
                this.sourceEl.appendChild(div);
                this.sync();
            }
        });

        div.appendChild(addBtn);
        div.appendChild(remBtn);
        return div;
    }

    setup(blocks) {
        this.blocks = (blocks || []).map((raw) => ({ raw: String(raw).replace(/^\s*\n/, '') }));
        this.solutionOrder = [];

        this.sourceEl.innerHTML = '';
        this.targetEl.innerHTML = '';
        this.blocks.forEach((b, i) => {
            this.sourceEl.appendChild(this.makeBlock(b.raw, 'dnd-block-' + (i + 1)));
        });
        this.sync();
    }

    getQuery() {
        const lines = [];
        for (const child of this.targetEl.children) {
            lines.push(child.dataset.code || child.textContent);
        }
        return lines.join('\n');
    }

    sync() {
        let hasSource = false;
        for (const child of this.sourceEl.children) {
            if (child.classList.contains('dnd-source-empty')) continue;
            hasSource = true;
            break;
        }
        const emptyEl = this.sourceEl.querySelector('.dnd-source-empty');
        if (!hasSource && !emptyEl) {
            const empty = document.createElement('div');
            empty.className = 'dnd-source-empty';
            empty.textContent = 'No quedan bloques en la caja.';
            this.sourceEl.appendChild(empty);
        } else if (hasSource && emptyEl) {
            emptyEl.remove();
        }
    }

    normalizeLine(line) {
        return line.trim().replace(/\s+/g, ' ').replace(/\s*([;,))])\s*/g, '$1');
    }

    normalizeCode(code) {
        return String(code || '')
            .split('\n')
            .map((l) => this.normalizeLine(l))
            .join('\n');
    }

    buildExpected(expectedQuery) {
        return this.normalizeCode(expectedQuery)
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
    }

    findSolutionOrder(blocks, expectedCode) {
        const exp = this.buildExpected(expectedCode || '');
        if (!exp.length) return null;

        const normExp = exp.join('\n');
        const used = new Array(blocks.length).fill(false);
        const order = [];

        const tryPlace = (pos, usedSet) => {
            if (pos === exp.length) return true;

            const expectedLine = exp[pos];
            for (let i = 0; i < blocks.length; i++) {
                if (usedSet[i]) continue;
                if (this.normalizeLine(blocks[i].raw) === expectedLine) {
                    usedSet[i] = true;
                    order.push(i);
                    if (tryPlace(pos + 1, usedSet)) return true;
                    order.pop();
                    usedSet[i] = false;
                }
            }
            return false;
        };

        const byLine = {};
        blocks.forEach((b, i) => {
            const k = this.normalizeLine(b.raw);
            (byLine[k] = byLine[k] || []).push(i);
        });

        const rebuildOrder = () => {
            const lines = [];
            for (const idx of order) {
                const rawLines = blocks[idx].raw.split('\n');
                lines.push(...rawLines);
            }
            return lines.join('\n');
        };

        if (tryPlace(0, used)) {
            const joined = this.normalizeCode(rebuildOrder());
            if (joined === normExp) return [...order];
        }

        const byValue = byLine;
        const rec = (usedFlags, built) => {
            if (built.length >= exp.length) {
                return built.length === exp.length ? [] : null;
            }
            const expLine = exp[built.length];
            const candidates = byValue[expLine] || [];
            for (const ci of candidates) {
                if (usedFlags[ci]) continue;
                usedFlags[ci] = true;
                const rest = rec(usedFlags, built.concat([ci]));
                if (rest) return [ci].concat(rest);
                usedFlags[ci] = false;
            }
            return null;
        };

        const greedy = rec(new Array(blocks.length).fill(false), []);
        if (greedy && greedy.length === exp.length) return greedy;

        if (blocks.length > 14) return null;

        const perm = (usedFlags, acc) => {
            if (acc.length >= exp.length) {
                if (acc.length === exp.length) return [];
                return null;
            }
            for (let i = 0; i < blocks.length; i++) {
                if (usedFlags[i]) continue;
                const raw = this.normalizeForExpected(blocks[i]);
                const next = acc.concat([raw]).join('\n');
                if (this.normalizeCode(next) === normExp) return [i];
                if (normExp.indexOf(this.normalizeCode(next)) !== 0) continue;
                const rest = perm(usedFlags.slice(0, i).concat([true]).concat(usedFlags.slice(i + 1)), acc.concat([raw]));
                if (rest) return [i].concat(rest);
            }
            return null;
        };

        return perm(new Array(blocks.length).fill(false), []);
    }

    normalizeForExpected(block) {
        return String(block.raw || '').split('\n').map((l) => l.trim()).join('\n');
    }

    applySolution(level) {
        const solution = level.solution_code || level.expected_query || '';
        const blocks = this.blocks;

        this.sourceEl.innerHTML = '';
        this.targetEl.innerHTML = '';

        const order = this.findSolutionOrder(blocks, solution);
        if (!order || order.length !== blocks.length) {
            blocks.forEach((b, i) => {
                this.sourceEl.appendChild(this.makeBlock(b.raw, 'dnd-block-' + (i + 1)));
            });
            this.sync();
            return null;
        }

        order.forEach((idx, pos) => {
            this.targetEl.appendChild(this.makeBlock(blocks[idx].raw, 'dnd-block-' + (pos + 1)));
        });
        this.sync();
        return order;
    }
}