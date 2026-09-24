import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels.js';
import { normalizeOutput, compareOutput } from '../src/compare.js';

describe('Niveles PYLEARN', () => {
    it('deben existir 32 niveles', () => {
        expect(LEVELS).toHaveLength(32);
    });

    it('deben tener ids únicos y consecutivos mision_XX', () => {
        const ids = LEVELS.map((l) => l.id_nivel);
        expect(new Set(ids).size).toBe(LEVELS.length);
        LEVELS.forEach((l, i) => {
            const num = String(i + 1).padStart(2, '0');
            expect(l.id_nivel).toBe(`mision_${num}`);
        });
    });

    it('deben tener dificultad, modalidad, briefing y solución', () => {
        for (const l of LEVELS) {
            expect(l.dificultad).toBeTruthy();
            expect(['Básico', 'Intermedio', 'Avanzado', 'Experto']).toContain(l.dificultad);
            expect(l.modalidad).toBeTruthy();
            expect(['Terminal', 'Depuración', 'Auditoría', 'Ensamblaje']).toContain(l.modalidad);
            expect(l.briefing_mision).toBeTruthy();
            expect(l.solution_code).toBeTruthy();
            expect(l.expected_output).toBeTruthy();
        }
    });

    it('las modalidades especiales deben traer sus campos', () => {
        const dep = LEVELS.filter((l) => l.modalidad === 'Depuración');
        expect(dep.length).toBeGreaterThan(0);
        for (const l of dep) {
            expect(l.query_defectuoso).toBeTruthy();
            expect(l.query_defectuoso).not.toBe(l.solution_code);
        }

        const audit = LEVELS.filter((l) => l.modalidad === 'Auditoría');
        expect(audit.length).toBeGreaterThan(0);
        for (const l of audit) {
            expect(l.audit_tokens).toHaveLength(l.solution_code.replace(/\n$/, '').split('\n').length);
            expect(l.token_error_index).toBeGreaterThanOrEqual(0);
            expect(l.token_error_index).toBeLessThan(l.audit_tokens.length);
        }

        const dnd = LEVELS.filter((l) => l.modalidad === 'Ensamblaje');
        expect(dnd.length).toBeGreaterThan(0);
        for (const l of dnd) {
            expect(l.dnd_blocks.length).toBeGreaterThanOrEqual(6);
            expect(l.dnd_blocks.length).toBeLessThanOrEqual(14);
        }
    });
});

describe('compareOutput', () => {
    it('normaliza retornos de carro y saltos finales', () => {
        expect(normalizeOutput('hola\r\nmundo\r\n')).toBe('hola\nmundo');
        expect(normalizeOutput(' hola \n mundo  \n\n')).toBe(' hola\n mundo');
    });

    it('compara salidas sin importar espacios al final de línea', () => {
        const r = compareOutput('a  \nb', 'a\nb');
        expect(r.pass).toBe(true);
        expect(r.actual).toBe('a\nb');
    });

    it('detecta salidas distintas', () => {
        const r = compareOutput('a\nc', 'a\nb');
        expect(r.pass).toBe(false);
    });

    it('trata entradas nulas como vacío', () => {
        expect(normalizeOutput(null)).toBe('');
        expect(normalizeOutput('')).toBe('');
    });
});