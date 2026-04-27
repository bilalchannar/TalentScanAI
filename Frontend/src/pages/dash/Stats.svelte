<script>
    import { onMount } from 'svelte';
    import { push } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import StatsCard from '../../components/StatsCard.svelte';
    import { fade, fly } from 'svelte/transition';
    import { apiFetch } from '../../api.js';

    let userRole = localStorage.getItem('role') || 'candidate';

    let stats = {
        total_resumes: 0,
        total_jobs: 0,
        total_applications: 0,
        top_skills: [],
        recent_activity: [],
        total_skills_found: 0
    };

    onMount(async () => {
        if (userRole !== 'recruiter') {
            notify("Access Denied: Analytics are for recruiters only", "error");
            push('/dash/manage');
            return;
        }

        try {
            const res = await apiFetch('/api/stats');

            if (res.status === 401) {
                notify('Session expired. Please login again', 'error');
                push('/auth/login');
                return;
            }

            if (res.status === 403) {
                notify('Access denied', 'error');
                push('/dash/manage');
                return;
            }

            const result = await res.json();
            if (result.success) {
                stats = result.data;
            } else {
                notify(result.message || 'Error loading analytics data', 'error');
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            notify("Error loading analytics data", "error");
        }
    });
</script>

<div class="stats-page">
    <div class="stats-grid">
        <StatsCard title="Database Size" value={stats.total_resumes} icon="📁" color="#4f46e5" />
        <StatsCard title="Unique Skills" value={stats.total_skills_found} icon="⚡" color="#10b981" />
        <StatsCard title="Active Jobs" value={stats.total_jobs} icon="💼" color="#f59e0b" />
        <StatsCard title="Applications" value={stats.total_applications} icon="📩" color="#8b5cf6" />
    </div>

    <div class="charts-section">
        <div class="chart-container glass">
            <h3>Top Detected Skills</h3>
            <div class="bar-chart">
                {#each stats.top_skills as {skill, count}}
                    <div class="bar-row">
                        <span class="label">{skill}</span>
                        <div class="bar-wrapper">
                            <div class="bar" style="width: {(count / stats.total_resumes) * 100}%"></div>
                            <span class="count">{count}</span>
                        </div>
                    </div>
                {/each}
                {#if stats.top_skills.length === 0}
                    <p class="empty">No skill data available yet.</p>
                {/if}
            </div>
        </div>

        <div class="chart-container glass">
            <h3>Recent Upload Activity</h3>
            <div class="activity-list">
                {#each stats.recent_activity as activity}
                    <div class="activity-item" in:fly={{ x: 20, duration: 400 }}>
                        <div class="dot"></div>
                        <div class="activity-info">
                            <p class="activity-name">{activity.name}</p>
                            <p class="activity-date">{activity.date}</p>
                        </div>
                        <span class="status-tag">Processed</span>
                    </div>
                {/each}
                {#if stats.recent_activity.length === 0}
                    <p class="empty">No recent activity.</p>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .stats-page {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .stats-grid {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
    }

    .charts-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
        gap: 30px;
    }

    .chart-container {
        padding: 30px;
        border-radius: 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
    }

    .chart-container h3 {
        font-size: 18px;
        margin-bottom: 24px;
        color: var(--text-primary);
    }

    .bar-chart {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .bar-row {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .label {
        width: 100px;
        font-size: 14px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .bar-wrapper {
        flex: 1;
        background: var(--bg-primary);
        height: 12px;
        border-radius: 6px;
        position: relative;
        display: flex;
        align-items: center;
    }

    .bar {
        background: linear-gradient(90deg, var(--accent-primary), #818cf8);
        height: 100%;
        border-radius: 6px;
        transition: width 1s ease-out;
    }

    .count {
        position: absolute;
        right: -30px;
        font-size: 12px;
        font-weight: 700;
        color: var(--accent-primary);
    }

    .activity-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .activity-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding-bottom: 15px;
        border-bottom: 1px solid var(--border-color);
    }

    .dot {
        width: 10px;
        height: 10px;
        background: var(--accent-primary);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--accent-primary);
    }

    .activity-info {
        flex: 1;
    }

    .activity-name {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
    }

    .activity-date {
        margin: 4px 0 0 0;
        font-size: 12px;
        color: var(--text-secondary);
    }

    .status-tag {
        font-size: 11px;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        padding: 4px 10px;
        border-radius: 20px;
        font-weight: 700;
    }

    .empty {
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
    }

    @media (max-width: 640px) {
        .charts-section {
            grid-template-columns: 1fr;
        }
    }
</style>
