<script>
    import { onMount } from 'svelte';
    import { reasoningReport } from '../../reasoningStore.js';
    import { fade, fly, slide } from 'svelte/transition';
    import SkillTag from '../../components/SkillTag.svelte';
    import { push } from 'svelte-spa-router';

    let report = null;

    onMount(() => {
        reasoningReport.subscribe(val => {
            report = val;
        });

        // If no report data, go back to ranking
        if (!report) {
            push('/dash/rank');
        }
    });
</script>

<div class="reasoning-page" in:fade>
    <div class="header">
        <button class="back-btn" on:click={() => push('/dash/rank')}>← Back to Ranking</button>
        <h1>AI Diagnostic Report</h1>
    </div>

    {#if report}
        <div class="report-grid">
            <!-- Summary Card -->
            <div class="report-card glass highlight">
                <div class="card-header">
                    <div class="score-circle">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle" stroke-dasharray="{report.score}, 100}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.35" class="percentage">{report.score}%</text>
                        </svg>
                    </div>
                    <div class="title-info">
                        <h2>{report.name}</h2>
                        <p class="summary-text">{report.summary}</p>
                    </div>
                </div>
            </div>

            <!-- Matched Skills -->
            <div class="report-card glass" in:fly={{ y: 20, delay: 100 }}>
                <h3>✅ Matched Keywords</h3>
                <p class="desc">These skills were found in both the JD and the resume.</p>
                <div class="skills-list">
                    {#each report.matched_skills as skill}
                        <SkillTag {skill} />
                    {/each}
                    {#if report.matched_skills.length === 0}
                        <p class="empty">No direct keyword matches found.</p>
                    {/if}
                </div>
            </div>

            <!-- Missing Skills -->
            <div class="report-card glass danger" in:fly={{ y: 20, delay: 200 }}>
                <h3>❌ Missing Qualifications</h3>
                <p class="desc">The Job Description required these, but they weren't found.</p>
                <div class="skills-list">
                    {#each report.missing_skills as skill}
                        <div class="missing-tag">{skill}</div>
                    {/each}
                    
                    {#if report.missing_skills.length === 0}
                        {#if report.score > 85}
                            <p class="success-msg">✨ Perfect Match! No missing technical skills found.</p>
                        {:else}
                            <p class="warning-msg">⚠️ Insufficient Data: Your Job Description might be too short. Add more technical requirements for a better analysis.</p>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- AI Recommendations -->
            <div class="report-card glass advice" in:fly={{ y: 20, delay: 300 }}>
                <h3>💡 Strategic Recommendations</h3>
                <p class="desc">AI-generated tips to improve this candidate's match.</p>
                <ul class="advice-list">
                    {#each report.recommendations as rec}
                        <li>{rec}</li>
                    {/each}
                    <li>Suggest the candidate updates their resume with concrete project examples for missing tools.</li>
                </ul>
            </div>
        </div>
    {/if}
</div>

<style>
    .reasoning-page {
        max-width: 1000px;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 40px;
    }

    .back-btn {
        background: none;
        border: 1px solid var(--border-color);
        padding: 8px 16px;
        border-radius: 10px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: var(--transition);
        font-weight: 600;
    }

    .back-btn:hover {
        background: var(--bg-secondary);
        color: var(--accent-primary);
    }

    .report-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
    }

    .report-card {
        padding: 30px;
        border-radius: 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
    }

    .highlight {
        grid-column: span 2;
        background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary));
        border-left: 6px solid var(--accent-primary);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 30px;
    }

    .score-circle {
        width: 100px;
    }

    .circular-chart {
        display: block;
        max-width: 100%;
        max-height: 100px;
    }

    .circle-bg {
        fill: none;
        stroke: var(--border-color);
        stroke-width: 2.8;
    }

    .circle {
        fill: none;
        stroke: var(--accent-primary);
        stroke-width: 2.8;
        stroke-linecap: round;
        transition: stroke-dasharray 0.3s ease;
    }

    .percentage {
        fill: var(--text-primary);
        font-family: inherit;
        font-size: 0.5em;
        text-anchor: middle;
        font-weight: 800;
    }

    .title-info h2 {
        margin: 0;
        font-size: 28px;
    }

    .summary-text {
        color: var(--text-secondary);
        margin: 10px 0 0 0;
        font-size: 16px;
    }

    .desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 20px;
    }

    .skills-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .missing-tag {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .advice-list {
        padding-left: 20px;
        color: var(--text-primary);
    }

    .advice-list li {
        margin-bottom: 12px;
        font-size: 14px;
        line-height: 1.5;
    }

    .success-msg {
        color: #10b981;
        font-weight: 600;
        font-size: 14px;
    }

    .warning-msg {
        color: #f59e0b;
        font-weight: 600;
        font-size: 14px;
        line-height: 1.6;
    }

    .danger { border-top: 4px solid #ef4444; }
    .advice { border-top: 4px solid #f59e0b; }

    @media (max-width: 768px) {
        .report-grid { grid-template-columns: 1fr; }
        .highlight { grid-column: span 1; }
    }
</style>
