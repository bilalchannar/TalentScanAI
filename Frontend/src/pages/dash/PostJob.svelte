<script>
    import { onMount } from 'svelte';
    import { apiFetch } from '../../api.js';
    import { push } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';

    let jobData = {
        title: '',
        company: '',
        location: 'Remote',
        description: ''
    };

    let loading = false;
    let myJobs = [];
    let loadingJobs = true;

    onMount(async () => {
        await fetchMyJobs();
    });

    async function fetchMyJobs() {
        loadingJobs = true;
        try {
            const res = await apiFetch('/api/jobs/list');
            const data = await res.json();
            if (data.success) {
                // Filter jobs posted by current user
                const email = localStorage.getItem('email');
                myJobs = data.data.filter(j => j.posted_by === email);
            }
        } catch (err) {
            console.error(err);
        } finally {
            loadingJobs = false;
        }
    }

    async function handlePostJob() {
        if (!jobData.title || !jobData.description) {
            notify('Title and Description are required', 'error');
            return;
        }

        loading = true;
        try {
            const res = await apiFetch('/api/jobs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            const data = await res.json();

            if (data.success) {
                notify('Job posted successfully!', 'success');
                jobData = { title: '', company: '', location: 'Remote', description: '' };
                await fetchMyJobs();
            } else {
                notify(data.message || 'Failed to post job', 'error');
            }
        } catch (err) {
            notify('Connection error', 'error');
        } finally {
            loading = false;
        }
    }
</script>

<div class="post-job-container">
    <div class="form-card glass">
        <h3>Post a New Opportunity</h3>
        <p class="subtitle">Reach out to top talent with AI-powered scanning</p>

        <div class="form-grid">
            <div class="form-group">
                <label for="title">Job Title</label>
                <input type="text" id="title" bind:value={jobData.title} placeholder="e.g. Senior Software Engineer" />
            </div>

            <div class="form-group">
                <label for="company">Company Name</label>
                <input type="text" id="company" bind:value={jobData.company} placeholder="Your Company Name" />
            </div>

            <div class="form-group">
                <label for="location">Location</label>
                <select id="location" bind:value={jobData.location}>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                </select>
            </div>

            <div class="form-group full-width">
                <label for="description">Job Description (Requirements & Skills)</label>
                <textarea id="description" bind:value={jobData.description} placeholder="Paste requirements here. Our AI will use this to rank candidates." rows="6"></textarea>
            </div>
        </div>

        <button class="post-btn" on:click={handlePostJob} disabled={loading}>
            {#if loading}
                <span class="spinner"></span> Posting...
            {:else}
                🚀 Post Job Opportunity
            {/if}
        </button>
    </div>

    <div class="my-jobs-section glass">
        <h3>My Recent Postings</h3>
        {#if loadingJobs}
            <p>Loading your jobs...</p>
        {:else if myJobs.length === 0}
            <p class="empty-msg">You haven't posted any jobs yet.</p>
        {:else}
            <div class="jobs-list">
                {#each myJobs as job}
                    <div class="job-item">
                        <div class="info">
                            <span class="title">{job.title}</span>
                            <span class="meta">{job.company} • {job.location}</span>
                        </div>
                        <span class="date">{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .post-job-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 40px;
        animation: fadeIn 0.5s ease-out;
    }

    .form-card, .my-jobs-section {
        width: 100%;
        max-width: 800px;
        padding: 40px;
        border-radius: 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-lg);
    }

    h3 {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 8px;
        color: var(--text-primary);
    }

    .subtitle {
        color: var(--text-secondary);
        font-size: 14px;
        margin-bottom: 32px;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .full-width {
        grid-column: span 2;
    }

    label {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-primary);
    }

    input, textarea, select {
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 15px;
    }

    .post-btn {
        width: 100%;
        padding: 16px;
        border-radius: 12px;
        background: var(--accent-primary);
        color: white;
        font-weight: 700;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }

    .jobs-list {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .job-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: var(--bg-primary);
        border-radius: 12px;
        border: 1px solid var(--border-color);
    }

    .info {
        display: flex;
        flex-direction: column;
    }

    .title {
        font-weight: 700;
        font-size: 16px;
    }

    .meta {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .date {
        font-size: 12px;
        opacity: 0.6;
    }

    .empty-msg {
        color: var(--text-secondary);
        font-style: italic;
        margin-top: 20px;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
