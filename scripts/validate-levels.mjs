import { loadPyodide } from 'pyodide';
import { LEVELS } from '../src/levels.js';
import { compareOutput } from '../src/compare.js';

let pyodide = null;

function capture(py, code) {
    let stdout = '';
    let stderr = '';
    py.setStdout({ batched: (t) => { stdout += t + '\n'; } });
    py.setStderr({ batched: (t) => { stderr += t + '\n'; } });
    try {
        py.runPython(code);
        return { ok: true, stdout, stderr };
    } catch (e) {
        const msg = String((e && e.message) || e);
        return { ok: false, stdout, stderr: stderr + msg };
    }
}

async function main() {
    pyodide = await loadPyodide();

    const problems = [];
    let okCount = 0;

    for (const level of LEVELS) {
        const id = level.id_nivel;

        if (!level.title) problems.push(`${id}: falta title`);
        if (!level.briefing_mision) problems.push(`${id}: falta briefing_mision`);
        if (!level.solution_code) problems.push(`${id}: falta solution_code`);
        if (level.dificultad === undefined) problems.push(`${id}: falta dificultad`);
        if (!level.modalidad) problems.push(`${id}: falta modalidad`);

        if (level.modalidad === 'Depuración' && !level.query_defectuoso) {
            problems.push(`${id}: modalidad Depuración sin query_defectuoso`);
        }
        if (level.modalidad === 'Auditoría') {
            if (!level.audit_tokens || !Array.isArray(level.audit_tokens)) {
                problems.push(`${id}: auditoría sin audit_tokens`);
            } else if (level.token_error_index === undefined || level.token_error_index < 0 ||
                level.token_error_index >= level.audit_tokens.length) {
                problems.push(`${id}: token_error_index fuera de rango`);
            }
        }
        if (level.modalidad === 'Ensamblaje') {
            if (!level.dnd_blocks || !Array.isArray(level.dnd_blocks) || level.dnd_blocks.length > 14) {
                problems.push(`${id}: dnd_blocks inválido o mayor a 14`);
            }
            const solLines = level.solution_code.split('\n').filter((l) => l.trim());
            if (level.dnd_blocks.length !== solLines.length) {
                problems.push(`${id}: dnd_blocks (${level.dnd_blocks.length}) != líneas solución (${solLines.length})`);
            }
        }

        const res = capture(pyodide, level.solution_code);
        if (!res.ok) {
            problems.push(`${id}: solución falla al ejecutar -> ${res.stderr}`);
            continue;
        }

        if (!level.expected_output) {
            problems.push(`${id}: falta expected_output`);
            continue;
        }

        const cmp = compareOutput(res.stdout, level.expected_output);
        if (cmp.pass) {
            okCount++;
        } else {
            problems.push(`${id}: salida no coincide`);
            problems.push(`  esperado: ${JSON.stringify(level.expected_output)}`);
            problems.push(`  obtenido: ${JSON.stringify(cmp.actual)}`);
        }
    }

    console.log(`Niveles válidos: ${okCount}/${LEVELS.length}`);
    if (problems.length) {
        console.log('\nProblemas:');
        problems.forEach((p) => console.log('  - ' + p));
        process.exit(1);
    }

    const dep = LEVELS.filter((l) => l.modalidad === 'Depuración');
    for (const level of dep) {
        const res = capture(pyodide, level.query_defectuoso);
        const cmp = compareOutput(res.stdout, level.expected_output);
        if (res.ok && cmp.pass) {
            console.log(`Aviso: ${level.id_nivel} el query_defectuoso ya produce la salida esperada (¿bug de diseño?).`);
        }
    }

    console.log('Todo correcto.');
}

main().catch((e) => {
    console.error('Fallo del validador: ' + String((e && e.message) || e));
    process.exit(1);
});