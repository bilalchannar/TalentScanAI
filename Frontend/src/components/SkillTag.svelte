<script>
    export let skill = "";
</script>

<span class="skill-tag">
    {skill}
</span>

<style>
    .skill-tag {
        display: inline-block;
        padding: 4px 10px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--accent-primary);
        margin: 2px;
        transition: var(--transition);
    }

    .skill-tag:hover {
        background: var(--accent-primary);
        color: white;
        transform: translateY(-1px);
    }
</style>
