const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { criarConsultaHorarios } = require('../horarios');
const { consultarHorarios } = require('../supabase');

async function request(t, query, consultar) {
    const app = express();
    app.get('/api/horarios', criarConsultaHorarios(consultar));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/horarios?${query}`);
    return { status: response.status, body: await response.json() };
}

test('rejeita filtros ausentes, inválidos, repetidos ou muito longos sem consultar o banco', async t => {
    for (const query of ['', 'turma=3C&dia=DOMINGO', 'turma=3C&dia=SEXTA&dia=SEGUNDA', 'turma[x]=3C&dia=SEXTA', `turma=${'x'.repeat(101)}&dia=SEXTA`]) {
        const response = await request(t, query, () => assert.fail('Não deve consultar o banco'));
        assert.equal(response.status, 400);
        assert.ok(response.body.erro);
    }
});

test('normaliza o dia e preserva o nome exato da turma', async t => {
    const aulas = [{ numero_aula: 1, disciplina: 'PB' }];
    const response = await request(t, new URLSearchParams({ turma: ' 3ºC (DS) ', dia: ' sexta ' }), async (turma, dia) => {
        assert.equal(turma, '3ºC (DS)'); assert.equal(dia, 'SEXTA'); return aulas;
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { turma: '3ºC (DS)', dia: 'SEXTA', aulas });
});

test('lista vazia retorna 200 sem inventar aulas', async t => {
    const response = await request(t, 'turma=3C&dia=TER%C3%87A', async () => []);
    assert.equal(response.status, 200); assert.deepEqual(response.body.aulas, []);
});

test('indisponibilidade de configuração retorna 503', async t => {
    const response = await request(t, 'turma=3C&dia=SEXTA', async () => { throw Object.assign(new Error('interno'), { status: 503 }); });
    assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(response.body), /interno/);
});

test('falha do Supabase retorna 502 sem expor detalhes', async t => {
    const response = await request(t, 'turma=3C&dia=SEXTA', async () => { throw new Error('detalhes privados'); });
    assert.equal(response.status, 502); assert.doesNotMatch(JSON.stringify(response.body), /privados/);
});

test('consulta apenas a tabela e colunas autorizadas, com filtros exatos e ordenação', async () => {
    const calls = [];
    const rows = [{ numero_aula: 1 }];
    const source = {};
    for (const method of ['from', 'select', 'eq', 'order']) source[method] = (...args) => { calls.push([method, ...args]); return source; };
    source.abortSignal = signal => { assert.ok(signal instanceof AbortSignal); return Promise.resolve({ data: rows, error: null }); };
    assert.deepEqual(await consultarHorarios('3ºC (DS)', 'SEXTA', source), rows);
    assert.deepEqual(calls, [
        ['from', 'horario_aulatarde'],
        ['select', 'turma, dia_semana, numero_aula, horario_inicio, professor, disciplina'],
        ['eq', 'turma', '3ºC (DS)'], ['eq', 'dia_semana', 'SEXTA'],
        ['order', 'numero_aula', { ascending: true }]
    ]);
});
