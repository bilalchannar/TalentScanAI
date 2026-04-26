<script>
    import { notifications, dismissNotification } from '../notificationStore.js';
    import { flip } from 'svelte/animate';
    import { fade, fly } from 'svelte/transition';
</script>

<div class="notification-container">
    {#each $notifications as notification (notification.id)}
        <div 
            class="notification {notification.type}" 
            animate:flip={{ duration: 300 }}
            in:fly={{ y: 50, duration: 300 }}
            out:fade={{ duration: 200 }}
        >
            <div class="content">
                {#if notification.type === 'success'}
                    <span class="icon">✅</span>
                {:else if notification.type === 'error'}
                    <span class="icon">❌</span>
                {:else}
                    <span class="icon">ℹ️</span>
                {/if}
                <p>{notification.message}</p>
            </div>
            <button on:click={() => dismissNotification(notification.id)}>&times;</button>
        </div>
    {/each}
</div>

<style>
    .notification-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }

    .notification {
        pointer-events: auto;
        min-width: 300px;
        max-width: 450px;
        padding: 16px;
        border-radius: 12px;
        background: white;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-left: 6px solid #4b62f6;
    }

    .notification.success { border-left-color: #10b981; }
    .notification.error { border-left-color: #ef4444; }
    .notification.info { border-left-color: #3b82f6; }

    .content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .icon {
        font-size: 20px;
    }

    p {
        margin: 0;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
    }

    button {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0 0 0 10px;
    }

    button:hover {
        color: #4b5563;
    }
</style>
