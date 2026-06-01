<script>
    import { onMount, onDestroy } from 'svelte';
    import { reasoningReport } from '../../reasoningStore.js';
    import { fade, fly, slide } from 'svelte/transition';
    import SkillTag from '../../components/SkillTag.svelte';
    import { push } from 'svelte-spa-router';
    import { apiFetch } from '../../api.js';
    import { notify } from '../../notificationStore.js';

    let report = null;
    let unsubscribe;

    let questions = [];
    let loadingQuestions = false;
    let showQuestions = false;
    let openGapIndex = -1;

    onMount(() => {
        unsubscribe = reasoningReport.subscribe(val => {
            report = val;
            // If no report data, go back to ranking
            if (!val) push('/dash/rank');
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    async function generateQuestions() {
        if (!report || !report.id) return;
        loadingQuestions = true;
        showQuestions = true;
        try {
            const res = await apiFetch('/api/resumes/interview_questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: report.job_description || '',
                    resume_id: report.id
                })
            });
            const data = await res.json();
            if (data.success) {
                questions = data.data || [];
                notify('Interview guide generated!', 'success');
            } else {
                notify(data.message || 'Failed to generate questions', 'error');
            }
        } catch (err) {
            console.error(err);
            notify('Error generating questions', 'error');
        } finally {
            loadingQuestions = false;
        }
    }

    function toggleGap(index) {
        openGapIndex = openGapIndex === index ? -1 : index;
    }
</script>

<div class="reasoning-page" in:fade>
    <div class="header">
        <button class="back-btn" on:click={() => push('/dash/rank')}>← Back to Matching</button>
        <h1>AI Fit Assessment & Diagnostics</h1>
    </div>

    {#if report}
        <div class="report-grid">
            <!-- Narrative Summary & Recommendations Header -->
            <div class="report-card glass highlight">
                <div class="card-header">
                    <div class="score-circle-container">
                        <div class="score-circle">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle match" stroke-dasharray="{report.score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" class="percentage">{report.score}%</text>
                            </svg>
                        </div>
                        <span class="score-label">JD Match</span>
                    </div>

                    <div class="score-circle-container">
                        <div class="score-circle">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle ats" stroke-dasharray="{report.ats_score || 0}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <text x="18" y="20.35" class="percentage">{report.ats_score || 0}%</text>
                            </svg>
                        </div>
                        <span class="score-label">ATS Score</span>
                    </div>

                    <div class="title-info">
                        <div class="name-rec-line">
                            <h2>{report.name}</h2>
                            <span class="rec-badge {report.hiring_recommendation ? report.hiring_recommendation.toLowerCase().replace(' ', '-') : 'average-match'}">
                                {report.hiring_recommendation || 'Average Match'}
                            </span>
                        </div>
                        <p class="summary-text"><strong>AI Profile Summary:</strong> {report.summary}</p>
                    </div>
                </div>
            </div>

            <!-- ATS Score Breakdown Visual Gauges -->
            <div class="report-card glass breakdown-card">
                <h3>📊 ATS Scan Diagnostics</h3>
                <p class="desc">ATS formatting and content structure completeness checklist.</p>
                
                {#if report.ats_breakdown}
                    <div class="breakdown-grid">
                        <div class="gauge-item">
                            <div class="mini-gauge">
                                <div class="gauge-bar" style="height: {(report.ats_breakdown.contact_info / 15) * 100}%; background: #3b82f6;"></div>
                            </div>
                            <span class="gauge-val">{report.ats_breakdown.contact_info}/15</span>
                            <span class="gauge-lbl">Contact Info</span>
                        </div>
                        <div class="gauge-item">
                            <div class="mini-gauge">
                                <div class="gauge-bar" style="height: {(report.ats_breakdown.sections / 45) * 100}%; background: #10b981;"></div>
                            </div>
                            <span class="gauge-val">{report.ats_breakdown.sections}/45</span>
                            <span class="gauge-lbl">Sections Found</span>
                        </div>
                        <div class="gauge-item">
                            <div class="mini-gauge">
                                <div class="gauge-bar" style="height: {(report.ats_breakdown.formatting / 15) * 100}%; background: #8b5cf6;"></div>
                            </div>
                            <span class="gauge-val">{report.ats_breakdown.formatting}/15</span>
                            <span class="gauge-lbl">Formatting</span>
                        </div>
                        <div class="gauge-item">
                            <div class="mini-gauge">
                                <div class="gauge-bar" style="height: {(report.ats_breakdown.keywords / 25) * 100}%; background: #f59e0b;"></div>
                            </div>
                            <span class="gauge-val">{report.ats_breakdown.keywords}/25</span>
                            <span class="gauge-lbl">Keyword Weight</span>
                        </div>
                    </div>
                {/if}

                {#if report.suggestions && report.suggestions.weak_sections && report.suggestions.weak_sections.length > 0}
                    <div class="weak-alerts">
                        <strong>Warnings detected:</strong>
                        <ul>
                            {#each report.suggestions.weak_sections as weak}
                                <li class="warn-li">⚠️ {weak}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>

            <!-- Experience Signals -->
            <div class="report-card glass signals-card">
                <h3>🔍 Parsed Experience Signals</h3>
                <p class="desc">Key indicators and achievements extracted from candidate history.</p>
                <div class="signals-list">
                    {#if report.experience_signals && report.experience_signals.length > 0}
                        {#each report.experience_signals as signal}
                            <div class="signal-tag">
                                <span class="sig-icon">📌</span>
                                <span class="sig-txt">{signal}</span>
                            </div>
                        {/each}
                    {:else}
                        <p class="empty">No specific leadership or duration signals detected in resume text.</p>
                    {/if}
                </div>
            </div>

            <!-- Matched Skills -->
            <div class="report-card glass">
                <h3>✅ Matched Keywords ({report.matched_skills.length})</h3>
                <p class="desc">Skills required by the JD that were successfully parsed.</p>
                <div class="skills-list">
                    {#each report.matched_skills as skill}
                        <SkillTag {skill} />
                    {/each}
                    {#if report.matched_skills.length === 0}
                        <p class="empty">No required keywords matched.</p>
                    {/if}
                </div>
            </div>

            <!-- Missing Qualifications -->
            <div class="report-card glass danger">
                <h3>❌ Missing Keywords ({report.missing_skills.length})</h3>
                <p class="desc">Keywords in the Job Description not found on the resume.</p>
                <div class="skills-list">
                    {#each report.missing_skills as skill}
                        <div class="missing-tag">{skill}</div>
                    {/each}
                    {#if report.missing_skills.length === 0}
                        <p class="success-msg">✨ Perfect keyword alignment! No gaps detected.</p>
                    {/if}
                </div>
            </div>

            <!-- Strategic Advice -->
            <div class="report-card glass advice">
                <h3>💡 Formatting & Improvement Tips</h3>
                <p class="desc">General ATS compliance recommendations.</p>
                <ul class="advice-list">
                    {#if report.suggestions}
                        <li><strong>Action Verbs:</strong> {report.suggestions.suggested_wording}</li>
                        {#each report.suggestions.ats_tips as tip}
                            <li>{tip}</li>
                        {/each}
                    {:else}
                        {#each report.recommendations as rec}
                            <li>{rec}</li>
                        {/each}
                    {/if}
                </ul>
            </div>

            <!-- Skill Gap Learning Paths Accordion -->
            <div class="report-card glass paths-card full-width">
                <h3>🚀 Recommended Learning Paths</h3>
                <p class="desc">Expand any missing skill to see why it matters and follow the structured project path.</p>
                
                {#if report.skill_gaps && report.skill_gaps.length > 0}
                    <div class="accordion">
                        {#each report.skill_gaps as gap, i}
                            <div class="accordion-item" class:open={openGapIndex === i}>
                                <button class="accordion-header" on:click={() => toggleGap(i)}>
                                    <span class="skill-name">📖 Learn {gap.skill}</span>
                                    <span class="arrow">{openGapIndex === i ? '▼' : '▶'}</span>
                                </button>
                                {#if openGapIndex === i}
                                    <div class="accordion-body" transition:slide>
                                        <p><strong>Why it matters:</strong> {gap.why}</p>
                                        <p><strong>Suggested Path:</strong> {gap.path}</p>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="success-msg">🎉 Zero skill gaps found! No learning paths required.</p>
                {/if}
            </div>

            <!-- Interview Questions Guide Generator -->
            <div class="report-card glass questions-card full-width">
                <div class="q-header">
                    <div>
                        <h3>🙋 AI Interview Questions Guide</h3>
                        <p class="desc">Generate custom technical and HR questions tailored specifically to this match.</p>
                    </div>
                    <button class="primary-btn" on:click={generateQuestions} disabled={loadingQuestions}>
                        {#if loadingQuestions} Generating... {:else} 🔮 Generate Interview Guide {/if}
                    </button>
                </div>

                {#if showQuestions}
                    <div class="questions-list" in:fade>
                        {#if loadingQuestions}
                            <div class="q-loader">Analysing skill vectors and crafting questions...</div>
                        {:else if questions.length === 0}
                            <p class="empty">No custom questions generated.</p>
                        {:else}
                            <div class="q-grid">
                                {#each questions as q}
                                    <div class="q-card">
                                        <div class="q-badge-line">
                                            <span class="q-cat">{q.category}</span>
                                            <span class="q-level {q.level.toLowerCase()}">{q.level}</span>
                                        </div>
                                        <p class="q-text">"{q.question}"</p>
                                        <p class="q-rationale"><strong>Rationale:</strong> {q.rationale}</p>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

        </div>
    {/if}
</div>

<style>
    .reasoning-page {
        max-width: 1100px;
        padding-bottom: 60px;
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

    .full-width {
        grid-column: span 2;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 30px;
        flex-wrap: wrap;
    }

    .score-circle-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .score-label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.5px;
    }

    .score-circle {
        width: 90px;
    }

    .circular-chart {
        display: block;
        max-width: 100%;
        max-height: 90px;
    }

    .circle-bg {
        fill: none;
        stroke: var(--border-color);
        stroke-width: 2.8;
    }

    .circle {
        fill: none;
        stroke-width: 2.8;
        stroke-linecap: round;
        transition: stroke-dasharray 0.3s ease;
    }

    .circle.match { stroke: var(--accent-primary); }
    .circle.ats { stroke: #10b981; }

    .percentage {
        fill: var(--text-primary);
        font-family: inherit;
        font-size: 0.5em;
        text-anchor: middle;
        font-weight: 800;
    }

    .title-info {
        flex: 1;
        min-width: 280px;
    }

    .name-rec-line {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }

    .title-info h2 {
        margin: 0;
        font-size: 26px;
    }

    .rec-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
    }
    .rec-badge.strong-match { background: #d1fae5; color: #065f46; }
    .rec-badge.good-match { background: #e0f2fe; color: #0369a1; }
    .rec-badge.average-match { background: #fef3c7; color: #92400e; }
    .rec-badge.weak-match { background: #ffedd5; color: #c2410c; }
    .rec-badge.not-recommended { background: #fee2e2; color: #991b1b; }

    .summary-text {
        color: var(--text-secondary);
        margin: 15px 0 0 0;
        font-size: 15px;
        line-height: 1.6;
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

    .danger { border-top: 4px solid #ef4444; }
    .advice { border-top: 4px solid #f59e0b; }

    /* Breakdown visual styles */
    .breakdown-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 20px;
        text-align: center;
    }

    .gauge-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .mini-gauge {
        width: 12px;
        height: 60px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: flex-end;
    }

    .gauge-bar {
        width: 100%;
        transition: height 0.5s ease-out;
    }

    .gauge-val {
        font-size: 12px;
        font-weight: 700;
    }

    .gauge-lbl {
        font-size: 11px;
        color: var(--text-secondary);
    }

    .weak-alerts {
        background: rgba(239, 68, 68, 0.05);
        border: 1px solid rgba(239, 68, 68, 0.1);
        border-radius: 12px;
        padding: 15px;
    }

    .weak-alerts strong {
        color: #ef4444;
        font-size: 13px;
    }

    .weak-alerts ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
    }

    .warn-li {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 4px;
    }

    /* Experience signals styles */
    .signals-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .signal-tag {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--bg-primary);
        padding: 12px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
    }

    .sig-txt {
        font-size: 13px;
        line-height: 1.4;
    }

    /* Accordion styles */
    .accordion {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .accordion-item {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        background: var(--bg-primary);
    }

    .accordion-header {
        width: 100%;
        padding: 15px 20px;
        background: none;
        border: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        color: var(--text-primary);
        font-weight: 700;
        font-size: 14px;
        text-align: left;
    }

    .accordion-header:hover {
        background: rgba(0,0,0,0.02);
    }

    .accordion-body {
        padding: 20px;
        border-top: 1px solid var(--border-color);
        background: var(--bg-secondary);
        font-size: 13px;
        line-height: 1.6;
    }

    /* Questions Generator styles */
    .q-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 25px;
    }

    .primary-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
        transition: var(--transition);
    }

    .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(79, 70, 229, 0.3);
    }

    .primary-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .questions-list {
        border-top: 1px dashed var(--border-color);
        padding-top: 25px;
    }

    .q-loader {
        text-align: center;
        padding: 40px;
        color: var(--text-secondary);
        font-style: italic;
    }

    .q-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
    }

    .q-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .q-badge-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .q-cat {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--accent-primary);
    }

    .q-level {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 20px;
    }
    .q-level.easy { background: #d1fae5; color: #065f46; }
    .q-level.medium { background: #fef3c7; color: #92400e; }
    .q-level.hard { background: #fee2e2; color: #991b1b; }

    .q-text {
        font-size: 14px;
        font-weight: 600;
        font-style: italic;
        line-height: 1.5;
        margin: 0;
    }

    .q-rationale {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
        border-top: 1px solid var(--border-color);
        padding-top: 10px;
    }

    @media (max-width: 768px) {
        .report-grid { grid-template-columns: 1fr; }
        .highlight { grid-column: span 1; }
        .full-width { grid-column: span 1; }
    }
</style>
