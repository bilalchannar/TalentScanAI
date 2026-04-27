<script>
    import { onMount } from 'svelte';
    import { apiFetch } from '../../api.js';
    import { notify } from '../../notificationStore.js';

    let applications = [];
    let loading = true;
    let userRole = localStorage.getItem('role') || 'candidate';

    onMount(async () => {
        await fetchApplications();
        loading = false;
    });

    async function fetchApplications() {
        const endpoint = userRole === 'recruiter' 
            ? '/api/jobs/recruiter_applications' 
            : '/api/jobs/my_applications';
            
        try {
            const res = await apiFetch(endpoint);
            const data = await res.json();
            if (data.success) applications = data.data;
        } catch (err) {
            notify('Failed to load applications', 'error');
        }
    }
</script>

<div class="applications-page">
    {#if loading}
        <div class="loader">Fetching records...</div>
    {:else if applications.length === 0}
        <div class="empty-state">
            <span class="icon">📁</span>
            <h3>No applications yet</h3>
            <p>{userRole === 'recruiter' ? 'Waiting for candidates to apply.' : 'Start applying to see your history here.'}</p>
        </div>
    {:else}
        <div class="table-container glass">
            <table>
                <thead>
                    <tr>
                        <th>Job Title</th>
                        <th>{userRole === 'recruiter' ? 'Candidate' : 'Status'}</th>
                        <th>Resume</th>
                        <th>Applied Date</th>
                    </tr>
                </thead>
                <tbody>
                    {#each applications as app}
                        <tr>
                            <td>
                                <div class="job-info">
                                    <span class="title">{app.job_title}</span>
                                    {#if userRole === 'recruiter'}
                                        <span class="email">{app.candidate_email}</span>
                                    {/if}
                                </div>
                            </td>
                            <td>
                                {#if userRole === 'recruiter'}
                                    <span class="candidate-name">{app.candidate_name}</span>
                                {:else}
                                    <span class="status-pill {app.status}">{app.status}</span>
                                {/if}
                            </td>
                            <td>
                                <span class="resume-link">📄 {app.resume_name}</span>
                            </td>
                            <td>
                                {new Date(app.applied_at).toLocaleDateString()}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .applications-page {
        animation: fadeIn 0.5s ease-out;
    }

    .table-container {
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    th {
        padding: 20px;
        background: rgba(0,0,0,0.02);
        font-size: 13px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        font-size: 14px;
    }

    .job-info {
        display: flex;
        flex-direction: column;
    }

    .title {
        font-weight: 700;
        font-size: 15px;
    }

    .email {
        font-size: 12px;
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .status-pill {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .status-pill.pending { background: #fef3c7; color: #92400e; }
    .status-pill.accepted { background: #d1fae5; color: #065f46; }

    .resume-link {
        color: var(--accent-primary);
        font-weight: 600;
    }

    .loader {
        text-align: center;
        padding: 100px;
        color: var(--text-secondary);
    }

    .empty-state {
        text-align: center;
        padding: 80px;
        color: var(--text-secondary);
    }

    .icon { font-size: 48px; margin-bottom: 20px; display: block; }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
