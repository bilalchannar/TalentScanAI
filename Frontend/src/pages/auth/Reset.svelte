<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';

    import { notify } from '../../notificationStore.js';

    let resetToken = '';
    let newPassword = '';
    let confirmPassword = '';

    async function resetPassword() {
        if (!resetToken || !newPassword || !confirmPassword) {
            notify('All fields are required.', 'info');
            return;
        }
        if (newPassword !== confirmPassword) {
            notify("Passwords don't match.", 'error');
            return;
        }
        try {
            const res = await fetch('http://127.0.0.1:3000/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
            });
            const { message, success } = await res.json();
            if (success) {
                notify(message, 'success');
                replace('/auth/login');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            notify('An error occurred. Please try again.', 'error');
        }
    }
</script>

<h2>Reset Password</h2>
<form on:submit|preventDefault={resetPassword}>
    <input type="text" bind:value={resetToken} placeholder="Reset Token" required>
    <input type="password" bind:value={newPassword} placeholder="New Password" required>
    <input type="password" bind:value={confirmPassword} placeholder="Confirm Password" required>
    <br>
    <button type="submit">Reset Password</button>
</form>
<div class="extra-links">
    <a href="/#/auth/login">← Go Back to Login</a>
</div>
