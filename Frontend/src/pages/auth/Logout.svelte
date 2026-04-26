<script>
    import { replace } from 'svelte-spa-router';
    import { onMount } from 'svelte';
    import { notify } from '../../notificationStore.js';

    onMount(() => {
        localStorage.clear(); // Wipe everything
        notify("Logged out successfully", "success");
        replace('/auth/login');
    });
</script>

<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif;">
    <p>Securely logging you out...</p>
</div>
