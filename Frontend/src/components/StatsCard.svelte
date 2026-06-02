<script>
    export let title = "";
    export let value = "";
    export let icon = "";
    export let color = "var(--accent-primary)";
</script>

<div class="stats-card" style="--card-color: {color}" on:click>
    <div class="icon-wrapper">
        <span class="icon">{icon}</span>
    </div>
    <div class="content">
        <h3>{title}</h3>
        <p class="value">{value}</p>
    </div>
</div>

<style>
    .stats-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: 24px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        gap: 20px;
        box-shadow: var(--shadow);
        transition: var(--transition);
        flex: 1;
        min-width: 250px;
        cursor: pointer;
    }

    .stats-card:hover {
        transform: translateY(-5px);
        border-color: var(--card-color);
    }

    .icon-wrapper {
        background: var(--bg-primary);
        width: 54px;
        height: 54px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border: 1px solid var(--border-color);
        color: var(--card-color);
    }

    .content h3 {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 4px 0;
        font-weight: 500;
    }

    .value {
        font-size: 24px;
        font-weight: 800;
        margin: 0;
        color: var(--text-primary);
    }
</style>
