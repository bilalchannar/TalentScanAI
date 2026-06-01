<script>
    import { notify } from '../../notificationStore.js';
    import SkillTag from '../../components/SkillTag.svelte';
    import { fade, fly } from 'svelte/transition';
    import { push } from 'svelte-spa-router';
    import { reasoningReport } from '../../reasoningStore.js';
    import { apiFetch } from '../../api.js';

    let userRole = localStorage.getItem('role') || 'candidate';

    let jobDescription = '';
    let results = [];
    let isRanking = false;
    let selectedPdf = null;

    async function rankResumes() {
        if (!jobDescription.trim()) {
            notify("Please enter a job description", "info");
            return;
        }

        isRanking = true;
        try {
            const res = await apiFetch('/api/resumes/rank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ job_description: jobDescription })
            });

            if (res.status === 401) {
                notify('Session expired. Please login again.', 'error');
                push('/auth/login');
                return;
            }

            const result = await res.json();
            
            if (result.success) {
                results = result.data || [];
                notify(userRole === 'recruiter' ? 'Ranking complete!' : 'Analysis complete!', 'success');
            } else {
                notify(result.message, 'error');
            }
        } catch (err) {
            console.error(err);
            notify("Analysis failed", "error");
        } finally {
            isRanking = false;
        }
    }

    async function viewPdf(filename) {
        try {
            // Use apiFetch to send token in Authorization header (not in URL)
            const res = await apiFetch(`/api/resumes/view/${encodeURIComponent(filename)}`);
            if (!res.ok) {
                notify('Could not load resume.', 'error');
                return;
            }
            const blob = await res.blob();
            // Revoke previous blob URL to avoid memory leaks
            if (selectedPdf && selectedPdf.startsWith('blob:')) URL.revokeObjectURL(selectedPdf);
            selectedPdf = URL.createObjectURL(blob);
        } catch (err) {
            notify('Failed to load resume.', 'error');
        }
    }

    function showReasoning(result) {
        result.job_description = jobDescription;
        reasoningReport.set(result);
        push('/dash/reasoning');
    }

    let minScore = 0;
    $: filteredResults = results.filter(r => r.score >= minScore);
</script>

<div class="rank-page">
    <div class="rank-container glass">
        <div class="header-section">
            <div class="title-group">
                <h2>{userRole === 'recruiter' ? 'AI Matching Engine' : 'AI Match Checker'}</h2>
                <p>{userRole === 'recruiter' ? 'Paste your Job Description below to find the best candidates' : 'Paste a Job Description to see how well you match the role'}</p>
            </div>
            <button class="primary-btn" on:click={rankResumes} disabled={isRanking}>
                {#if isRanking}
                    <span class="spinner"></span> Analyzing...
                {:else}
                    {userRole === 'recruiter' ? '✨ Start AI Ranking' : '🚀 Analyze My Match'}
                {/if}
            </button>
        </div>

        <textarea 
            bind:value={jobDescription} 
            placeholder="Requirements: Python, Svelte, 3+ years experience..."
            rows="10"
        ></textarea>
    </div>

    {#if results.length > 0}
        <div class="results-section" in:fade>
            <div class="section-header">
                <h3>{userRole === 'recruiter' ? `Match Results (${filteredResults.length})` : 'Your Match Analysis'}</h3>
                <div class="score-filter">
                    <label for="scoreRange">Min Match Score: <strong>{minScore}%</strong></label>
                    <input id="scoreRange" type="range" min="0" max="100" bind:value={minScore} />
                </div>
            </div>
            
            <div class="results-grid">
                {#each filteredResults as result, index}
                    <div class="result-card" in:fly={{ y: 20, delay: index * 100 }}>
                        <div class="rank-badge">#{index + 1}</div>
                        <div class="card-content">
                            <div class="main-info">
                                <h4>{result.name}</h4>
                                <div class="score-pill" style="--score-color: {result.score > 80 ? '#10b981' : result.score > 50 ? '#f59e0b' : '#64748b'}">
                                    {result.score}% Match
                                </div>
                            </div>
                            
                            <p class="filename">📄 {result.filename.split('_').slice(1).join('_')}</p>
                            
                            <div class="skills-preview">
                                {#each (result.matched_skills || []).slice(0, 3) as skill}
                                    <SkillTag {skill} />
                                {/each}
                                {#if (result.matched_skills || []).length > 3}
                                    <span class="more-skills">+{result.matched_skills.length - 3} more</span>
                                {/if}
                                {#if (result.matched_skills || []).length === 0}
                                    <span style="font-size: 12px; color: var(--text-secondary);">No keyword matches</span>
                                {/if}
                            </div>

                            <div class="actions">
                                <button class="secondary-btn" on:click={() => viewPdf(result.filename)}>👁️ View Resume</button>
                                <button class="text-btn" on:click={() => showReasoning(result)}>View Reasoning</button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            {#if filteredResults.length === 0}
                <div class="empty-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>No candidates match the selected minimum score of {minScore}%.</p>
                </div>
            {/if}
        </div>
    {/if}

    {#if selectedPdf}
        <div
            class="modal-overlay"
            role="button"
            tabindex="0"
            on:click={() => selectedPdf = null}
            on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    selectedPdf = null;
                }
            }}
        >
            <div
                class="modal-content"
                role="presentation"
                tabindex="-1"
                on:click|stopPropagation
                on:keydown|stopPropagation={() => {}}
            >
                <div class="modal-header">
                    <h3>Resume Preview</h3>
                    <button class="close-btn" on:click={() => selectedPdf = null}>&times;</button>
                </div>
                <iframe src={selectedPdf} title="PDF Preview" width="100%" height="800px"></iframe>
            </div>
        </div>
    {/if}
</div>

<style>
    .rank-page {
        display: flex;
        flex-direction: column;
        gap: 40px;
    }

    .rank-container {
        padding: 40px;
        border-radius: 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
    }

    .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
    }

    .title-group h2 {
        margin: 0;
        font-size: 24px;
    }

    .title-group p {
        color: var(--text-secondary);
        margin: 8px 0 0 0;
        font-size: 14px;
    }

    textarea {
        width: 100%;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 15px;
        resize: vertical;
        transition: var(--transition);
    }

    textarea:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }

    .primary-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 14px 28px;
        border-radius: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
        box-shadow: 0 8px 15px rgba(79, 70, 229, 0.2);
    }

    .primary-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 12px 20px rgba(79, 70, 229, 0.3);
    }

    .primary-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }

    .result-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 24px;
        position: relative;
        display: flex;
        gap: 20px;
        box-shadow: var(--shadow);
    }

    .rank-badge {
        background: var(--accent-primary);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 14px;
        flex-shrink: 0;
    }

    .card-content {
        flex: 1;
    }

    .main-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .main-info h4 {
        margin: 0;
        font-size: 18px;
    }

    .score-pill {
        background: var(--bg-primary);
        color: var(--score-color);
        border: 1px solid var(--score-color);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
    }

    .filename {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 16px;
    }

    .skills-preview {
        margin-bottom: 20px;
    }

    .actions {
        display: flex;
        gap: 15px;
    }

    .secondary-btn {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
    }

    .secondary-btn:hover {
        background: var(--border-color);
    }

    .text-btn {
        background: none;
        border: none;
        color: var(--accent-primary);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    }

    .modal-content {
        background: var(--bg-secondary);
        width: 90%;
        max-width: 1000px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 30px;
        color: var(--text-secondary);
        cursor: pointer;
    }

    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .more-skills {
        font-size: 12px;
        color: var(--text-secondary);
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 600;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
    }

    .score-filter {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: 8px 16px;
        border-radius: 12px;
        box-shadow: var(--shadow);
    }

    .score-filter label {
        font-size: 13px;
        color: var(--text-primary);
        font-weight: 600;
    }

    .score-filter input[type="range"] {
        cursor: pointer;
        accent-color: var(--accent-primary);
        width: 150px;
    }
</style>
