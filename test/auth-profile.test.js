const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { setImmediate: flush } = require('node:timers/promises');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const script = readFileSync(resolve(__dirname, '../public/auth.js'), 'utf8');

function openPage(profileRequest) {
    const elements = new Map();
    const handlers = new Map();
    const element = id => {
        if (!elements.has(id)) {
            elements.set(id, {
                addEventListener: (event, handler) => handlers.set(`${id}:${event}`, handler),
                setAttribute() {}
            });
        }
        return elements.get(id);
    };

    const user = { id: 'user-id', email: 'auth@example.com', user_metadata: { name: 'Nome Auth' } };
    const client = {
        auth: {
            async getSession() { return { data: { session: {} } }; },
            async getUser() { return { data: { user } }; },
            onAuthStateChange() {},
            async signOut(options) { assert.equal(options.scope, 'local'); return {}; }
        },
        from(table) {
            assert.equal(table, 'suri_perfis');
            return {
                select(columns) { assert.equal(columns, 'nome, email'); return this; },
                eq(column, value) {
                    assert.equal(column, 'id');
                    assert.equal(value, user.id);
                    return this;
                },
                abortSignal() { return this; },
                maybeSingle: profileRequest
            };
        }
    };

    runInNewContext(script, {
        document: {
            getElementById: element,
            querySelectorAll: () => [element('logout')],
            addEventListener(event, handler) {
                if (event === 'DOMContentLoaded') handler();
            }
        },
        window: {
            addEventListener() {},
            supabase: {
                createClient(url, key, { auth }) {
                    assert.equal(auth.persistSession, true);
                    assert.equal(auth.flowType, 'pkce');
                    return client;
                }
            }
        },
        fetch: async () => ({ ok: true, json: async () => ({ available: true, googleEnabled: true }) }),
        location: { search: '', hash: '' },
        URLSearchParams,
        AbortSignal,
        clearTimeout
    });

    return { element, logout: () => handlers.get('logout:click')() };
}

test('a sessão restaurada exibe o perfil do próprio usuário', async () => {
    const page = openPage(async () => ({ data: { nome: 'Nome Perfil', email: 'perfil@example.com' } }));
    await flush();
    assert.equal(page.element('account-name').textContent, 'Nome Perfil');
    assert.equal(page.element('account-email').textContent, 'perfil@example.com');
});

test('uma falha na leitura do perfil mantém os dados confirmados pelo Auth', async () => {
    const page = openPage(async () => ({ error: new Error('Data API indisponível') }));
    await flush();
    assert.equal(page.element('account-status').textContent, 'Perfil conectado');
    assert.equal(page.element('account-name').textContent, 'Nome Auth');
    assert.equal(page.element('account-email').textContent, 'auth@example.com');
});

test('uma resposta atrasada do perfil não restaura a conta depois de sair', async () => {
    const profile = Promise.withResolvers();
    const page = openPage(() => profile.promise);
    await flush();
    await page.logout();
    profile.resolve({ data: { nome: 'Nome Perfil' } });
    await flush();
    assert.equal(page.element('account-status').textContent, 'Visitante');
    assert.equal(page.element('account-email').textContent, '');
    assert.equal(page.element('continue-visitor').hidden, false);
});
