<script>
    import './SharedAuthStyles.css';
    import { replace, querystring } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import { fade } from 'svelte/transition';
    import { withApiBase } from '../../api.js';
    import { onMount } from 'svelte';

    let resetToken = '';
    let newPassword = '';
    let confirmPassword = '';
    let loading = false;

    onMount(() => {
        // Try to read token from URL query string (e.g. /#/auth/reset?token=abc123)
        const params = new URLSearchParams($querystring);
        const tokenFromUrl = params.get('token');
        if (tokenFromUrl) {
            resetToken = tokenFromUrl;
        }
    });

    async function resetPassword() {
        if (loading) return;

        if (!resetToken) {
            notify('Reset token is missing. Please use the link from your email.', 'error');
            return;
        }
        if (!newPassword || !confirmPassword) {
            notify('All fields are required.', 'info');
            return;
        }
        if (newPassword !== confirmPassword) {
            notify("Passwords don't match.", 'error');
            return;
        }

        loading = true;
        try {
            const res = await fetch(withApiBase('/api/auth/reset'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
            });
            const { message, success } = await res.json();
            if (success) {
                notify('Password reset successfully! Please login.', 'success');
                replace('/auth/login');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            notify('An error occurred. Please try again.', 'error');
        } finally {
            loading = false;
        }
    }
</script>

<div class="auth-wrapper" in:fade>
    <div class="auth-container" style="max-width: 520px;">
        <div class="auth-form-section">

            <div class="auth-header">
                <h2>Reset Password</h2>
                <p>Choose a strong new password for your account.</p>
            </div>

            <form on:submit|preventDefault={resetPassword}>

                <!-- Token field — pre-filled from URL, user can also paste manually -->
                <div class="input-group">
                    <label for="resetToken">Reset Token</label>
                    <input
                        id="resetToken"
                        type="text"
                        bind:value={resetToken}
                        placeholder="Paste your reset token here"
                        required
                    />
                    <small style="color: #94a3b8; font-size: 12px; margin-top: 4px; display: block;">
                        This was included in the reset link we emailed you.
                    </small>
                </div>

                <div class="input-group">
                    <label for="newPassword">New Password</label>
                    <input
                        id="newPassword"
                        type="password"
                        bind:value={newPassword}
                        placeholder="Min 8 chars, uppercase, number, symbol"
                        required
                        autocomplete="new-password"
                    />
                </div>

                <div class="input-group">
                    <label for="confirmPassword">Confirm New Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        bind:value={confirmPassword}
                        placeholder="Repeat your new password"
                        required
                        autocomplete="new-password"
                    />
                </div>

                <button type="submit" class="submit-btn" disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <div class="extra-links">
                <a href="/#/auth/login">← Back to Login</a>
            </div>

        </div>
    </div>
</div>
