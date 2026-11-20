document.addEventListener('DOMContentLoaded', () => {
    const googleLogin = document.getElementById('google-login');
    const googleRegister = document.getElementById('google-register');
    const googleButtons = [googleLogin, googleRegister].filter(Boolean);
    const emailLogin = document.getElementById('email-login');
    const emailRegister = document.getElementById('email-register');
    const emailForms = [emailLogin, emailRegister].filter(form => form?.tagName === 'FORM');
    const status = document.getElementById('auth-status');
    const signOutButtons = [
        ...document.querySelectorAll('[data-sign-out]')
    ];
    const logoutError = document.getElementById('logout-error');
    const welcomeToast = document.getElementById('welcome-toast');
    const loginMarker = 'suri-login-pending';

    let client;
    let signingIn = false;
    let signingOut = false;
    const emailMarker = 'suri-email-signup';
    const callback = new URLSearchParams(location.search).has('code');
    let googleAvailable = false;
    let emailAvailable = false;
    let signupAvailable = false;
    let pendingEmailLogin;
    let verificationId = 0;
    let verificationTimer;

    const hasAuthError =
        new URLSearchParams(location.search).has('error') ||
        location.hash.includes('error=');

    function setText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    function setHidden(id, hidden) {
        const element = document.getElementById(id);
        if (element) element.hidden = hidden;
    }

    function setStatus(message) {
        if (status) status.textContent = message;
    }

    function clearPendingWelcome() {
        try {
            sessionStorage.removeItem(loginMarker);
        } catch {}
    }

    if (hasAuthError) clearPendingWelcome();

    function welcomeAfterLogin(user, name) {
        let pending;

        try {
            pending = pendingEmailLogin || JSON.parse(
                sessionStorage.getItem(loginMarker) || 'null'
            );
        } catch {}

        clearPendingWelcome();
        pendingEmailLogin = undefined;

        let confirmedSignup = false;
        if (callback && !hasAuthError) {
            try {
                const expected = JSON.parse(localStorage.getItem(emailMarker) || 'null');
                confirmedSignup = expected?.id === user.id &&
                    Date.now() - expected.startedAt < 24 * 60 * 60 * 1000;
                if (confirmedSignup) localStorage.removeItem(emailMarker);
            } catch {}
        }

        const age = Date.now() - pending?.startedAt;
        const validLogin = Number.isFinite(age) && age >= 0 && age <= 10 * 60 * 1000;
        if (hasAuthError || (!confirmedSignup && !validLogin)) return;

        // A data do Auth distingue um primeiro acesso Google de um retorno.
        const created = Date.parse(user.created_at);
        const newGoogleAccount = pending?.method === 'google' &&
            created >= pending.startedAt - 5000 &&
            created <= Date.now() + 5000;
        const newAccount = confirmedSignup || pending?.method === 'signup' || newGoogleAccount;

        setText(
            'welcome-toast-message',
            newAccount
                ? `Boas-vindas ao SuriAgent, ${name}! Sua conta foi criada.`
                : `Que bom ter você de volta, ${name}!`
        );

        if (welcomeToast && window.bootstrap?.Toast) {
            window.bootstrap.Toast.getOrCreateInstance(
                welcomeToast,
                { delay: 5000, autohide: true }
            ).show();
        }
    }

    function updateAuthControls() {
        googleButtons.forEach(button => {
            button.disabled = !googleAvailable || signingIn || (button === googleRegister && !signupAvailable);
        });
        emailForms.forEach(form => {
            const registering = form === emailRegister;
            form.closest('details').hidden = !emailAvailable || (registering && !signupAvailable);
            form.querySelector('fieldset').disabled = signingIn || !emailAvailable || (registering && !signupAvailable);
        });
    }

    function render(user, profile) {
        const metadata = user?.user_metadata || {};
        const candidate = [
            profile?.nome,
            metadata.full_name,
            metadata.name,
            user?.email?.split('@')[0]
        ].find(value =>
            typeof value === 'string' && value.trim()
        );

        const name = candidate?.trim().slice(0, 120) || 'estudante';

        setHidden('signed-out-view', !!user);
        setHidden('signed-in-view', !user);

        setText('account-status', user ? 'Perfil conectado' : 'Visitante');
        setText('account-open', user ? 'Meu perfil' : 'Entrar →');
        setText('account-name', user ? name : '');
        setText(
            'account-email',
            user ? profile?.email ?? user.email ?? '' : ''
        );

        setText('profile-storage-status', user ? 'Verificando o cadastro…' : '');
        setText('sidebar-profile-name', 'Aprenda do seu jeito');
        setText(
            'sidebar-profile-note',
            user
                ? 'Gerencie sua conta em Meu perfil.'
                : 'Com sua conta ou como visitante.'
        );
        setText(
            'sidebar-profile-open',
            user ? 'Meu perfil' : 'Minha conta'
        );

        setHidden('account-title', !!user);
        setHidden('profile-dialog-title', !user);

        document.getElementById('account-modal')?.setAttribute(
            'aria-labelledby',
            user ? 'profile-dialog-title' : 'account-title'
        );

        setText(
            'account-description',
            user
                ? 'Esta é a sua conta conectada ao SuriAgent.'
                : 'Entre ou crie sua conta com Google. Você também pode continuar como visitante.'
        );

        setHidden('visitor-divider', !!user);
        setHidden('continue-visitor', !!user);

        if (logoutError) {
            logoutError.hidden = true;
            logoutError.textContent = '';
        }

        signingIn = false;
        updateAuthControls();

        if (user) {
            welcomeAfterLogin(user, name);
        } else if (welcomeToast && window.bootstrap?.Toast) {
            window.bootstrap.Toast.getInstance(welcomeToast)?.hide();
        }
    }

    async function verifySession() {
        if (!client || signingOut) return;

        const current = ++verificationId;
        let user;

        try {
            const { data, error } = await client.auth.getSession();

            if (current !== verificationId) return;
            if (error) throw error;

            if (!data?.session) {
                render(null);
                return;
            }

            const result = await client.auth.getUser();

            if (current !== verificationId) return;
            if (result.error) throw result.error;

            if (!result.data?.user) {
                throw new Error('Sessão não confirmada');
            }

            user = result.data.user;
        } catch (error) {
            if (current !== verificationId) return;

            if (error?.status === 401 || error?.status === 403) {
                render(null);
                setStatus(
                    'Não foi possível validar sua sessão. Entre novamente para acessar seu perfil.'
                );
            } else {
                // Uma falha de conexão não significa que houve logout.
                setStatus(
                    'Não foi possível verificar sua sessão agora. Tentaremos novamente quando você voltar à página ou recuperar a conexão.'
                );
            }

            return;
        }

        // Exibe a conta confirmada mesmo se a consulta do perfil estiver lenta.
        render(user);
        setStatus('');

        let saved = false;
        try {
            const { data: profile, error } = await client
                .from('suri_perfis')
                .select('nome, email')
                .eq('id', user.id)
                .abortSignal(AbortSignal.timeout(5000))
                .maybeSingle();

            if (current === verificationId && !error && profile) {
                render(user, profile);
                saved = true;
            }
        } catch {
            // O perfil do Auth continua disponível se a Data API falhar.
        }

        if (current === verificationId) {
            setText('profile-storage-status', saved
                ? 'Cadastro salvo.'
                : 'Sua sessão está ativa. Não foi possível confirmar o cadastro agora.');
        }
    }

    function scheduleVerification() {
        if (!client || signingIn || signingOut) return;

        clearTimeout(verificationTimer);
        verificationTimer = setTimeout(() => {
            void verifySession();
        }, 0);
    }

    window.addEventListener('online', scheduleVerification);
    window.addEventListener('focus', scheduleVerification);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleVerification();
        }
    });

    async function startGoogleLogin({ currentTarget }) {
        const registering = currentTarget === googleRegister;
        if (!client || !googleAvailable || signingIn || signingOut) {
            return;
        }

        try {
            sessionStorage.setItem(
                loginMarker,
                JSON.stringify({ startedAt: Date.now(), method: 'google' })
            );
        } catch {}

        signingIn = true;
        updateAuthControls();
        setStatus(registering ? 'Abrindo o cadastro com Google…' : 'Abrindo o login com Google…');

        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo:
                        `${location.origin}${location.pathname}#chat-panel`,
                    scopes: 'openid email profile',
                    ...(registering && { queryParams: { prompt: 'select_account' } })
                }
            });

            if (error) throw error;
        } catch {
            clearPendingWelcome();
            signingIn = false;
            updateAuthControls();

            setStatus(
                'Não foi possível iniciar o login Google. Continue como visitante ou tente novamente.'
            );
        }
    }

    googleButtons.forEach(button => button.addEventListener('click', startGoogleLogin));

    async function submitEmail(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const registering = form === emailRegister;
        if (!client || !emailAvailable || signingIn || signingOut || (registering && !signupAvailable)) return;

        const fields = new FormData(form);
        const email = fields.get('email').trim();
        const password = fields.get('password');
        const name = registering ? fields.get('name').trim() : '';
        const feedback = form.querySelector('[data-email-status]');
        if (registering && !name) {
            feedback.textContent = 'Informe seu nome.';
            return;
        }

        clearPendingWelcome();
        signingIn = true;
        updateAuthControls();
        feedback.textContent = registering ? 'Criando sua conta…' : 'Entrando…';

        try {
            const { data, error } = registering
                ? await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name },
                        emailRedirectTo: `${location.origin}${location.pathname}#chat-panel`
                    }
                })
                : await client.auth.signInWithPassword({ email, password });

            if (error) throw error;
            form.reset();
            if (data.session) {
                pendingEmailLogin = { startedAt: Date.now(), method: registering ? 'signup' : 'password' };
                feedback.textContent = '';
                signingIn = false;
                await verifySession();
            } else if (registering) {
                if (data.user?.id && data.user.identities?.length) {
                    try {
                        localStorage.setItem(emailMarker, JSON.stringify({
                            id: data.user.id, startedAt: Date.now()
                        }));
                    } catch {}
                }
                feedback.textContent = 'Se o cadastro foi solicitado para um e-mail novo, confira sua caixa de entrada e abra o link de confirmação neste navegador. Se já tem conta, use Entrar com e-mail.';
            }
        } catch (error) {
            if (error.code === 'email_not_confirmed') {
                feedback.textContent = 'Confirme seu e-mail pelo link recebido antes de entrar.';
            } else if (error.code === 'email_address_not_authorized') {
                feedback.textContent = 'O envio de confirmação para este e-mail está indisponível. Você pode entrar com Google ou acessar como visitante.';
            } else if (error.code === 'weak_password') {
                feedback.textContent = 'Use uma senha mais forte e tente novamente.';
            } else if (error.status === 429) {
                feedback.textContent = 'Muitas tentativas. Aguarde um pouco e tente novamente.';
            } else {
                feedback.textContent = registering
                    ? 'Não foi possível criar a conta agora. Confira os dados e tente novamente.'
                    : 'Não foi possível entrar. Confira o e-mail e a senha.';
            }
        } finally {
            signingIn = false;
            updateAuthControls();
        }
    }

    emailForms.forEach(form => form.addEventListener('submit', submitEmail));

    async function signOut() {
        if (!client || signingOut) return;

        signingOut = true;
        ++verificationId;
        clearTimeout(verificationTimer);

        signOutButtons.forEach(button => {
            button.disabled = true;
        });

        if (logoutError) logoutError.hidden = true;

        try {
            const { error } = await client.auth.signOut({
                scope: 'local'
            });

            if (error) throw error;

            ++verificationId;
            clearPendingWelcome();
            render(null);

            setStatus(
                'Você saiu do perfil neste dispositivo. Continue como visitante quando quiser.'
            );
        } catch {
            if (logoutError) {
                logoutError.textContent =
                    'Não foi possível sair do perfil. Tente novamente.';
                logoutError.hidden = false;
            }
        } finally {
            signingOut = false;

            signOutButtons.forEach(button => {
                button.disabled = false;
            });
        }
    }

    signOutButtons.forEach(button => {
        button.addEventListener('click', signOut);
    });

    async function initializeAuth() {
        updateAuthControls();

        try {
            const response = await fetch('/api/auth/config', {
                cache: 'no-store',
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                throw new Error('Configuração indisponível');
            }

            const config = await response.json();

            if (!config.available) {
                setStatus(
                    config.message ||
                    'O login está indisponível. Continue como visitante.'
                );
                return;
            }

            if (!window.supabase?.createClient) {
                throw new Error('Biblioteca de autenticação indisponível');
            }

            client = window.supabase.createClient(
                config.url,
                config.publishableKey,
                {
                    auth: {
                        flowType: 'pkce',
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

            googleAvailable = config.googleEnabled !== false;
            emailAvailable = config.emailEnabled !== false;
            signupAvailable = config.signupEnabled !== false;

            updateAuthControls();

            setStatus(
                googleAvailable
                    ? ''
                    : 'O login com Google está indisponível.'
            );

            client.auth.onAuthStateChange(event => {
                // Mantém o callback síncrono; verifica fora dele.
                if (event === 'SIGNED_OUT') {
                    ++verificationId;
                    clearTimeout(verificationTimer);
                    clearPendingWelcome();
                    render(null);
                    return;
                }

                if (signingIn) return;

                if (
                    event === 'SIGNED_IN' ||
                    event === 'TOKEN_REFRESHED' ||
                    event === 'USER_UPDATED'
                ) {
                    ++verificationId;
                    scheduleVerification();
                }
            });

            await verifySession();

            if (hasAuthError) {
                clearPendingWelcome();

                setStatus(
                    'O login foi cancelado ou não pôde ser concluído. Você pode tentar novamente ou continuar como visitante.'
                );

                const modal = document.getElementById('account-modal');

                if (modal && window.bootstrap?.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(modal).show();
                }

                const url = new URL(location.href);

                ['error', 'error_code', 'error_description'].forEach(key => {
                    url.searchParams.delete(key);
                });

                url.hash = 'chat-panel';
                history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
        } catch {
            setStatus(
                'O acesso à conta está indisponível no momento. As consultas continuam disponíveis como visitante.'
            );
        }
    }

    void initializeAuth();
});