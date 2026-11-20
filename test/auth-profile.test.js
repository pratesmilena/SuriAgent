const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { setImmediate: flush } = require('node:timers/promises');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const script = readFileSync(resolve(__dirname, '../public/auth.js'), 'utf8');

function openPage(profileRequest, { createdAt, pending, emailForms = false } = {}) {
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

    if (emailForms) {
        for (const id of ['email-login', 'email-register']) {
            const form = element(id);
            const fieldset = {};
            const details = {};
            Object.assign(form, {
                tagName: 'FORM',
                closest: () => details,
                querySelector: selector => selector === 'fieldset' ? fieldset : element(`${id}-status`),
                reset() {}
            });
        }
    }

    const emailCalls = [];
    const user = { created_at: createdAt, id: 'user-id', email: 'auth@example.com', user_metadata: { name: 'Nome Auth' } };
    const oauthRequests = [];
    const client = {
        auth: {
            async getSession() { return { data: { session: {} } }; },
            async getUser() { return { data: { user } }; },
            onAuthStateChange() {},
            async signUp(request) { emailCalls.push(request); return { data: { session: {} } }; },
            async signInWithPassword(request) { emailCalls.push(request); return { data: { session: {} } }; },
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
        sessionStorage: {
            getItem: () => pending ? JSON.stringify(pending) : null,
            removeItem: () => { pending = undefined; },
            setItem() {}
        },
        FormData: class {
            get(key) { return { name: 'Nome Teste', email: 'teste@example.com', password: 'senha-de-teste' }[key]; }
        },
        URLSearchParams,
        AbortSignal,
        clearTimeout
    });

    return {
        element,
        oauthRequests,
        emailCalls,
        submit: id => handlers.get(`${id}:submit`)({ preventDefault() {}, currentTarget: element(id) }),
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

test('a saudação Google usa a data de criação da conta e aparece só após acesso iniciado no site', async () => {
    const startedAt = Date.now();
    const pending = { startedAt, method: 'google' };
    const profile = async () => ({ data: { nome: 'Nome Perfil' } });
    const newAccount = openPage(profile, { pending, createdAt: new Date(startedAt).toISOString() });
    const returningAccount = openPage(profile, { pending, createdAt: '2020-01-01T00:00:00Z' });
    const restored = openPage(profile, { createdAt: new Date(startedAt).toISOString() });
    await flush();

    assert.match(newAccount.element('welcome-toast-message').textContent, /Sua conta foi criada/);
    assert.match(returningAccount.element('welcome-toast-message').textContent, /ter você de volta/);
    assert.equal(restored.element('welcome-toast-message').textContent, undefined);
});

test('cadastro e login por e-mail usam Supabase Auth e exibem saudações distintas', async () => {
    const profile = async () => ({ data: { nome: 'Nome Perfil' } });
    const signup = openPage(profile, { emailForms: true });
    const login = openPage(profile, { emailForms: true });
    await flush();

    await signup.submit('email-register');
    await login.submit('email-login');

    assert.equal(signup.emailCalls[0].options.data.full_name, 'Nome Teste');
    assert.equal(signup.emailCalls[0].options.emailRedirectTo, 'https://suri-agent.netlify.app/#chat-panel');
    assert.equal(login.emailCalls[0].email, 'teste@example.com');
    assert.match(signup.element('welcome-toast-message').textContent, /Sua conta foi criada/);
    assert.match(login.element('welcome-toast-message').textContent, /ter você de volta/);
});
