<script>
    import { onMount } from 'svelte';
    import { push } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import StatsCard from '../../components/StatsCard.svelte';
    import { fade, fly } from 'svelte/transition';
    import { apiFetch } from '../../api.js';

    let userRole = localStorage.getItem('role') || 'candidate';
    $: isRecruiterLike = userRole === 'recruiter' || userRole === 'admin' || userRole === 'super_admin';

    let loading = true;

    let stats = {
        total_resumes: 0,
        total_jobs: 0,
        active_jobs: 0,
        total_applications: 0,
        pending_applications: 0,
        applications_today: 0,
        average_match_score: 0,
        top_detected_skill: "None",
        db_size: "0 KB",
        applications_by_status: {},
        match_score_distribution: { weak: 0, good: 0, strong: 0 },
        top_skills: [],
        recent_activity: [],
        total_skills_found: 0
    };

    onMount(async () => {
        if (!isRecruiterLike) {
            notify("Access Denied: Analytics are for authorized personnel only", "error");
            push('/dash/manage');
            return;
        }

        loading = true;
            const res = await apiFetch('/api/stats');

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
        } finally {
            loading = false;
        }
    });

    $: dist = stats.match_score_distribution || { weak: 0, good: 0, strong: 0 };
    $: totalDist = (dist.weak + dist.good + dist.strong) || 1;
</script>

{#if loading}
    <div class="stats-page" in:fade>
        <div class="stats-grid">
            {#each Array(5) as _}
                <div class="stats-card skeleton-pulse" style="--card-color: var(--border-color)">
                    <div class="icon-wrapper skeleton-element" style="width: 54px; height: 54px; border-radius: 14px;"></div>
                    <div class="content" style="flex: 1;">
                        <div class="skeleton-line" style="width: 80px; height: 12px; margin-bottom: 8px;"></div>
                        <div class="skeleton-line" style="width: 40px; height: 20px;"></div>
                    </div>
                </div>
            {/each}
        </div>
        
        <div class="charts-section" style="margin-top: 30px;">
            {#each Array(4) as _}
                <div class="chart-container glass skeleton-pulse">
                    <div class="skeleton-line" style="width: 150px; height: 20px; margin-bottom: 24px;"></div>
                    {#each Array(4) as _}
                        <div style="display: flex; gap: 15px; margin-bottom: 16px; align-items: center;">
                            <div class="skeleton-line" style="width: 85px; height: 14px; margin: 0;"></div>
                            <div class="skeleton-line" style="flex: 1; height: 12px; margin: 0;"></div>
                        </div>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
{:else}
    <div class="stats-page" in:fade>
        <div class="stats-grid">
            <StatsCard title="Database Size" value={stats.db_size || "0 KB"} icon="📁" color="#4f46e5" on:click={() => push('/dash/manage')} />
            <StatsCard title="Unique Skills" value={stats.total_skills_found ?? 0} icon="⚡" color="#10b981" />
            <StatsCard title="Active Jobs" value={stats.active_jobs ?? 0} icon="💼" color="#f59e0b" on:click={() => push('/dash/applications')} />
            <StatsCard title="Total Candidates" value={stats.total_resumes ?? 0} icon="👥" color="#ec4899" on:click={() => push('/dash/manage')} />
            <StatsCard title="Total Applications" value={stats.total_applications ?? 0} icon="📩" color="#8b5cf6" on:click={() => push('/dash/applications')} />
        </div>

        <div class="charts-section">
            <!-- Top Detected Skills -->
            <div class="chart-container glass">
                <h3>Top Detected Skills</h3>
                <div class="bar-chart">
                    {#each stats.top_skills as {skill, count}}
                        <div class="bar-row">
                            <span class="label">{skill}</span>
                            <div class="bar-wrapper">
                                <div class="bar" style="width: {stats.total_resumes > 0 ? (count / stats.total_resumes * 100).toFixed(1) : 0}%"></div>
                                <span class="count">{count}</span>
                            </div>
                        </div>
                    {/each}
                    {#if stats.top_skills.length === 0}
                        <p class="empty">No skill data available yet.</p>
                    {/if}
                </div>
            </div>

            <!-- Recent Activity -->
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

            <!-- Applications by Status -->
            <div class="chart-container glass">
                <h3>Applications by Status</h3>
                <div class="status-bars-list">
                    {#each Object.entries(stats.applications_by_status || {}) as [status, count]}
                        {@const total = stats.total_applications || 1}
                        {@const percentage = ((count / total) * 100).toFixed(0)}
                        <div class="status-bar-row">
                            <span class="status-label">{status}</span>
                            <div class="status-bar-track">
                                <div class="status-bar-fill {status.replace(' ', '-')}" style="width: {percentage}%"></div>
                            </div>
                            <span class="status-value">{count} ({percentage}%)</span>
                        </div>
                    {/each}
                    {#if Object.keys(stats.applications_by_status || {}).length === 0}
                        <p class="empty">No application status data available yet.</p>
                    {/if}
                </div>
            </div>

            <!-- Match Score Distribution -->
            <div class="chart-container glass">
                <h3>Match Score Distribution</h3>
                <div class="score-dist-container">
                    <div class="dist-card weak-card">
                        <div class="dist-header">
                            <span class="dot-indicator weak-dot"></span>
                            <h4>Weak (&lt; 50%)</h4>
                            <span class="count-badge">{dist.weak}</span>
                        </div>
                        <div class="dist-progress">
                            <div class="dist-progress-fill weak-fill" style="width: {((dist.weak / totalDist) * 100).toFixed(0)}%"></div>
                        </div>
                        <p class="percentage">{((dist.weak / totalDist) * 100).toFixed(0)}% of candidates</p>
                    </div>
                    
                    <div class="dist-card good-card">
                        <div class="dist-header">
                            <span class="dot-indicator good-dot"></span>
                            <h4>Good (50% - 80%)</h4>
                            <span class="count-badge">{dist.good}</span>
                        </div>
                        <div class="dist-progress">
                            <div class="dist-progress-fill good-fill" style="width: {((dist.good / totalDist) * 100).toFixed(0)}%"></div>
                        </div>
                        <p class="percentage">{((dist.good / totalDist) * 100).toFixed(0)}% of candidates</p>
                    </div>
                    
                    <div class="dist-card strong-card">
                        <div class="dist-header">
                            <span class="dot-indicator strong-dot"></span>
                            <h4>Strong (&ge; 80%)</h4>
                            <span class="count-badge">{dist.strong}</span>
                        </div>
                        <div class="dist-progress">
                            <div class="dist-progress-fill strong-fill" style="width: {((dist.strong / totalDist) * 100).toFixed(0)}%"></div>
                        </div>
                        <p class="percentage">{((dist.strong / totalDist) * 100).toFixed(0)}% of candidates</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

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

    /* Applications by Status */
    .status-bars-list {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }
    .status-bar-row {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    .status-label {
        width: 140px;
        font-size: 13px;
        font-weight: 600;
        text-transform: capitalize;
        color: var(--text-secondary);
    }
    .status-bar-track {
        flex: 1;
        height: 10px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 5px;
        overflow: hidden;
    }
    .status-bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 1s ease-out;
    }
    .status-bar-fill.pending {
        background: #f59e0b;
    }
    .status-bar-fill.shortlisted {
        background: #3b82f6;
    }
    .status-bar-fill.interview-scheduled {
        background: #8b5cf6;
    }
    .status-bar-fill.accepted {
        background: #10b981;
    }
    .status-bar-fill.rejected {
        background: #ef4444;
    }
    .status-bar-fill.hired {
        background: #059669;
    }
    .status-value {
        width: 80px;
        text-align: right;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-primary);
    }

    /* Match Score Distribution */
    .score-dist-container {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }
    .dist-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        padding: 16px;
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: var(--transition);
    }
    .dist-card:hover {
        border-color: var(--accent-primary);
    }
    .dist-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .dot-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }
    .dot-indicator.weak-dot {
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
    }
    .dot-indicator.good-dot {
        background: #f59e0b;
        box-shadow: 0 0 8px #f59e0b;
    }
    .dot-indicator.strong-dot {
        background: #10b981;
        box-shadow: 0 0 8px #10b981;
    }
    .dist-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        flex: 1;
    }
    .count-badge {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
    }
    .dist-progress {
        height: 6px;
        background: var(--bg-secondary);
        border-radius: 3px;
        overflow: hidden;
    }
    .dist-progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 1s ease-out;
    }
    .dist-progress-fill.weak-fill {
        background: #ef4444;
    }
    .dist-progress-fill.good-fill {
        background: #f59e0b;
    }
    .dist-progress-fill.strong-fill {
        background: #10b981;
    }
    .dist-card .percentage {
        margin: 0;
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    /* Skeleton Loading CSS */
    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
    .skeleton-pulse {
        animation: pulse 1.5s infinite ease-in-out;
    }
    .skeleton-element {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
    }
    .skeleton-line {
        background: var(--bg-primary);
        border-radius: 4px;
        margin-bottom: 8px;
    }

    @media (max-width: 1024px) {
        .charts-section {
            grid-template-columns: 1fr;
        }
    }
</style>
