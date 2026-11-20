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
    const oauthRequests = [];
    const client = {
        auth: {
            async getSession() { return { data: { session: {} } }; },
            async getUser() { return { data: { user } }; },
            onAuthStateChange() {},
            async signInWithOAuth(request) { oauthRequests.push(request); return {}; },
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
        location: { search: '', hash: '', origin: 'https://suri-agent.netlify.app', pathname: '/' },
        URLSearchParams,
        AbortSignal,
        clearTimeout
    });

    return {
        element,
        oauthRequests,
        click: id => handlers.get(`${id}:click`)({ currentTarget: element(id) }),
        logout: () => handlers.get('logout:click')()
    };
}

test('a sessão restaurada exibe o perfil do próprio usuário', async () => {
    const page = openPage(async () => ({ data: { nome: 'Nome Perfil', email: 'perfil@example.com' } }));
    await flush();
    assert.equal(page.element('account-name').textContent, 'Nome Perfil');
    assert.equal(page.element('account-email').textContent, 'perfil@example.com');
    assert.equal(page.element('profile-storage-status').textContent, 'Cadastro salvo.');
});

test('uma falha na leitura do perfil mantém os dados confirmados pelo Auth', async () => {
    const page = openPage(async () => ({ error: new Error('Data API indisponível') }));
    await flush();
    assert.equal(page.element('account-status').textContent, 'Perfil conectado');
    assert.equal(page.element('account-name').textContent, 'Nome Auth');
    assert.equal(page.element('account-email').textContent, 'auth@example.com');
    assert.match(page.element('profile-storage-status').textContent, /Não foi possível confirmar/);
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

test('cadastro abre o seletor de contas e login preserva o fluxo normal', async () => {
    const cadastro = openPage(async () => ({}));
    const login = openPage(async () => ({}));
    await flush();

    await cadastro.click('google-register');
    await login.click('google-login');

    assert.equal(cadastro.oauthRequests[0].options.queryParams.prompt, 'select_account');
    assert.equal(login.oauthRequests[0].options.queryParams, undefined);
    for (const page of [cadastro, login]) {
        assert.equal(page.oauthRequests[0].provider, 'google');
        assert.equal(page.oauthRequests[0].options.redirectTo, 'https://suri-agent.netlify.app/#chat-panel');
        assert.equal(page.element('google-login').disabled, true);
        assert.equal(page.element('google-register').disabled, true);
    }
});
