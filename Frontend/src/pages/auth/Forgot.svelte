<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';

    import { notify } from '../../notificationStore.js';

    let email = '';

    async function sendReset() {
        if (!email) {
            notify('Please enter your email address.', 'info');
            return;
        }
        try {
            const res = await fetch('http://127.0.0.1:3000/api/auth/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const { message, success } = await res.json();
            if (success) {
                notify(message, 'success');
                replace('/auth/login');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Forgot error:', error);
            notify('An error occurred. Please try again.', 'error');
        }
    }
</script>

<h2>Forgot Password</h2>
<form on:submit|preventDefault={sendReset}>
    <input type="email" bind:value={email} placeholder="Email address" required>
    <br>
    <button type="submit">Send Password Reset Email</button>
</form>
<div class="extra-links">
    <a href="/#/auth/login">← Go Back to Login</a>
</div>
