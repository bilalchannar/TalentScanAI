<script>
    import { onMount } from 'svelte';
    import { apiFetch } from '../../api.js';
    import { notify } from '../../notificationStore.js';

    let jobs = [];
    let resumes = [];
    let loading = true;
    let applying = false;
    let selectedJob = null;
    let selectedResumeId = '';

    onMount(async () => {
        await Promise.all([fetchJobs(), fetchResumes()]);
        loading = false;
    });

    async function fetchJobs() {
        try {
            const res = await apiFetch('/api/jobs/list');
            const data = await res.json();
            if (data.success) jobs = data.data;
        } catch (err) {
            notify('Failed to load jobs', 'error');
        }
    }

    async function fetchResumes() {
        try {
            const res = await apiFetch('/api/resumes/list');
            const data = await res.json();
            if (data.success) {
                resumes = data.data;
                if (resumes.length > 0) selectedResumeId = resumes[0]._id;
            }
        } catch (err) {
            notify('Failed to load resumes', 'error');
        }
    }

    async function handleApply() {
        if (!selectedResumeId) {
            notify('Please upload or select a resume first', 'error');
            return;
        }

        applying = true;
        try {
            const res = await apiFetch('/api/jobs/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: selectedJob._id,
                    resume_id: selectedResumeId
                })
            });
            const data = await res.json();

            if (data.success) {
                notify('Application submitted!', 'success');
                selectedJob = null;
            } else {
                notify(data.message || 'Failed to apply', 'error');
            }
        } catch (err) {
            notify('Connection error', 'error');
        } finally {
            applying = false;
        }
    }
</script>

<div class="job-feed">
    {#if loading}
        <div class="loader">Scanning for opportunities...</div>
    {:else if jobs.length === 0}
        <div class="empty-state">
            <span class="icon">🔍</span>
            <h3>No jobs found</h3>
            <p>Check back later for new opportunities.</p>
        </div>
    {:else}
        <div class="jobs-grid">
            {#each jobs as job}
                <div class="job-card glass">
                    <div class="job-header">
                        <div>
                            <h4>{job.title}</h4>
                            <p class="company">{job.company} • <span class="loc">{job.location}</span></p>
                        </div>
                        <span class="badge">New</span>
                    </div>
                    
                    <div class="job-desc">
                        {job.description.substring(0, 150)}...
                    </div>

                    <div class="job-footer">
                        <span class="date">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                        <button class="apply-btn" on:click={() => selectedJob = job}>Apply Now</button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#if selectedJob}
        <div class="modal-overlay" on:click|self={() => selectedJob = null}>
            <div class="modal glass">
                <button class="close-btn" on:click={() => selectedJob = null}>&times;</button>
                <h3>Apply for {selectedJob.title}</h3>
                <p class="modal-company">{selectedJob.company}</p>

                <div class="apply-section">
                    <label for="resume-select">Select a Resume to Apply With</label>
                    {#if resumes.length > 0}
                        <select id="resume-select" bind:value={selectedResumeId}>
                            {#each resumes as resume}
                                <option value={resume._id}>{resume.original_filename}</option>
                            {/each}
                        </select>
                    {:else}
                        <p class="no-resumes">You haven't uploaded any resumes yet. Go to "My Application" to upload one.</p>
                    {/if}

                    <div class="actions">
                        <button class="cancel-btn" on:click={() => selectedJob = null}>Cancel</button>
                        <button class="submit-btn" on:click={handleApply} disabled={applying || resumes.length === 0}>
                            {#if applying} Submitting... {:else} Confirm Application {/if}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .job-feed {
        animation: fadeIn 0.5s ease-out;
    }

    .jobs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 25px;
    }

    .job-card {
        padding: 24px;
        border-radius: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        transition: var(--transition);
    }

    .job-card:hover {
        transform: translateY(-5px);
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-lg);
    }

    .job-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
    }

    h4 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
    }

    .company {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 4px 0 0 0;
    }

    .loc {
        color: var(--accent-primary);
        font-weight: 600;
    }

    .badge {
        background: rgba(79, 70, 229, 0.1);
        color: var(--accent-primary);
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .job-desc {
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 24px;
        flex: 1;
    }

    .job-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 16px;
        border-top: 1px solid var(--border-color);
    }

    .date {
        font-size: 12px;
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .apply-btn {
        padding: 8px 20px;
        border-radius: 10px;
        background: var(--accent-primary);
        color: white;
        border: none;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: var(--transition);
    }

    .apply-btn:hover {
        background: var(--accent-hover);
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal {
        background: var(--bg-secondary);
        padding: 32px;
        border-radius: 24px;
        width: 90%;
        max-width: 500px;
        position: relative;
        box-shadow: var(--shadow-2xl);
    }

    .close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text-secondary);
        cursor: pointer;
    }

    .modal-company {
        color: var(--accent-primary);
        font-weight: 700;
        margin-top: -8px;
        margin-bottom: 24px;
    }

    .apply-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    label {
        font-size: 14px;
        font-weight: 600;
    }

    select {
        padding: 12px;
        border-radius: 12px;
        background: var(--bg-primary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .no-resumes {
        color: #ef4444;
        font-size: 14px;
        padding: 12px;
        background: #fee2e2;
        border-radius: 10px;
    }

    .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-top: 20px;
    }

    .submit-btn {
        background: var(--accent-primary);
        color: white;
        padding: 12px;
        border-radius: 10px;
        border: none;
        font-weight: 700;
        cursor: pointer;
    }

    .cancel-btn {
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 12px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        cursor: pointer;
    }

    .loader {
        text-align: center;
        padding: 100px;
        color: var(--text-secondary);
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
</style>
