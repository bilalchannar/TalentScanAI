<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import { fade } from 'svelte/transition';
    import { withApiBase } from '../../api.js';

    let email = '';
    let loading = false;
    let submitted = false;

    async function sendReset() {
        if (loading) return;
        if (!email) {
            notify('Please enter your email address.', 'info');
            return;
        }
        loading = true;
        try {
            const res = await fetch(withApiBase('/api/auth/forgot'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const { message, success } = await res.json();
            if (success) {
                submitted = true;
                notify(message, 'success');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Forgot error:', error);
            notify('An error occurred. Please try again.', 'error');
        } finally {
            loading = false;
        }
    }
</script>

<div class="auth-wrapper" in:fade>
    <div class="auth-container" style="max-width: 520px;">
        <div class="auth-form-section">

            {#if submitted}
                <!-- Success state -->
                <div class="success-state">
                    <div class="success-icon">📧</div>
                    <h2>Check Your Email</h2>
                    <p>If an account with <strong>{email}</strong> exists, we've sent a password reset link to that address.</p>
                    <p class="hint">The link will expire in 15 minutes. Check your spam folder if you don't see it.</p>
                    <button class="submit-btn" on:click={() => replace('/auth/login')}>
                        ← Back to Login
                    </button>
                </div>
            {:else}
                <!-- Form state -->
                <div class="auth-header">
                    <h2>Forgot Password</h2>
                    <p>Enter your email and we'll send you a reset link.</p>
                </div>

                <form on:submit|preventDefault={sendReset}>
                    <div class="input-group">
                        <label for="forgotEmail">Email Address</label>
                        <input
                            id="forgotEmail"
                            type="email"
                            bind:value={email}
                            placeholder="your@email.com"
                            required
                            autocomplete="email"
                        />
                    </div>

                    <button type="submit" class="submit-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div class="extra-links">
                    <a href="/#/auth/login">← Back to Login</a>
                </div>
            {/if}

        </div>
    </div>
</div>

<style>
    .success-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
        padding: 20px 0;
    }

    .success-icon {
        font-size: 56px;
    }

    .success-state h2 {
        font-size: 28px;
        font-weight: 800;
        color: var(--auth-text, #1e293b);
        margin: 0;
    }

    .success-state p {
        color: var(--auth-secondary, #64748b);
        font-size: 15px;
        line-height: 1.6;
        margin: 0;
    }

    .hint {
        font-size: 13px !important;
        color: #94a3b8 !important;
    }
</style>
