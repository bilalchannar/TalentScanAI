<script>
    import { onMount } from 'svelte';

    let isDark = false;

    onMount(() => {
        isDark = localStorage.getItem('theme') === 'dark';
        if (isDark) {
            document.body.classList.add('dark');
        }
    });

    function toggleTheme() {
        isDark = !isDark;
        if (isDark) {
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }
</script>

<button on:click={toggleTheme} class="theme-toggle" aria-label="Toggle theme">
    {#if isDark}
        <span class="icon">☀️</span>
    {:else}
        <span class="icon">🌙</span>
    {/if}
</button>

<style>
    .theme-toggle {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
        box-shadow: var(--shadow);
    }

    .theme-toggle:hover {
        background: var(--border-color);
        transform: translateY(-2px);
    }

    .icon {
        font-size: 18px;
    }
</style>
