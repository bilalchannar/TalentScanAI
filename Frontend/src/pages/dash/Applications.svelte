<script>
    import { onMount } from 'svelte';
    import { apiFetch, withApiBase } from '../../api.js';
    import { notify } from '../../notificationStore.js';
    import { fade, fly, slide } from 'svelte/transition';

    let applications = [];
    let loading = true;
    let userRole = localStorage.getItem('role') || 'candidate';
    let blindMode = false;

    $: isRecruiterLike = userRole === 'recruiter' || userRole === 'admin' || userRole === 'super_admin';

    // Filters
    let scoreFilter = 0;
    let statusFilter = 'all';
    let jobFilter = 'all';
    let skillsFilter = '';
    let dateFilter = 'all';

    // Checkboxes / Selection
    let selectedIds = [];
    let allSelected = false;

    // Collapsible details and candidate withdrawal
    let expandedAppId = null;

    function toggleExpand(id) {
        if (expandedAppId === id) {
            expandedAppId = null;
        } else {
            expandedAppId = id;
        }
    }

    async function withdrawApplication(appId) {
        if (!confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) {
            return;
        }
        try {
            const res = await apiFetch('/api/jobs/withdraw_application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: appId })
            });
            const data = await res.json();
            if (data.success) {
                notify("Application withdrawn successfully", "success");
                await fetchApplications();
            } else {
                notify(data.message || "Failed to withdraw application", "error");
            }
        } catch (err) {
            notify("Error withdrawing application", "error");
        }
    }

    // Modals
    let showReviewModal = null; // Stores the application object being reviewed
    let showScheduleModal = null; // Stores the application object being scheduled
    let showCompareModal = false;

    // Review fields
    let reviewRating = 5;
    let reviewNotes = '';

    // Schedule fields
    let scheduleDate = '';
    let scheduleTime = '';
    let scheduleType = 'Zoom';
    let scheduleLink = '';
    let scheduleNotes = '';
    let schedulingEmail = false;

    $: uniqueJobTitles = [...new Set(applications.map(app => app.job_title))];

    $: filteredApplications = applications.filter(app => {
        // Score filter
        const appScore = app.score || 0;
        if (appScore < scoreFilter) return false;

        // Status filter
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;

        // Job filter
        if (jobFilter !== 'all' && app.job_title !== jobFilter) return false;

        // Skills / Text Search
        if (skillsFilter.trim()) {
            const query = skillsFilter.toLowerCase();
            const candidateName = (app.candidate_name || '').toLowerCase();
            const candidateEmail = (app.candidate_email || '').toLowerCase();
            const jobTitle = (app.job_title || '').toLowerCase();
            const matchedStr = (app.match_analysis && app.match_analysis.matched_skills 
                ? app.match_analysis.matched_skills.join(' ') 
                : '').toLowerCase();
            
            const match = candidateName.includes(query) || 
                          candidateEmail.includes(query) || 
                          jobTitle.includes(query) ||
                          matchedStr.includes(query);
            if (!match) return false;
        }

        // Date filter
        if (dateFilter !== 'all') {
            const appliedDate = new Date(app.applied_at);
            const now = new Date();
            const diffTime = Math.abs(now - appliedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (dateFilter === '24h' && diffDays > 1) return false;
            if (dateFilter === 'week' && diffDays > 7) return false;
            if (dateFilter === 'month' && diffDays > 30) return false;
        }

        return true;
    });

    $: {
        if (filteredApplications.length > 0) {
            allSelected = filteredApplications.every(app => selectedIds.includes(app._id));
        } else {
            allSelected = false;
        }
    }

    onMount(async () => {
        await fetchApplications();
        loading = false;
    });

    async function fetchApplications() {
        const isRec = userRole === 'recruiter' || userRole === 'admin' || userRole === 'super_admin';
        let endpoint = isRec ? '/api/jobs/recruiter_applications' : '/api/jobs/my_applications';
        if (isRec && blindMode) endpoint += '?blind=true';
            
        try {
            const res = await apiFetch(endpoint);
            const data = await res.json();
            if (data.success) {
                applications = data.data || [];
            }
        } catch (err) {
            notify('Failed to load applications', 'error');
        }
    }

    async function toggleBlindMode() {
        blindMode = !blindMode;
        loading = true;
        await fetchApplications();
        loading = false;
    }

    function getIntegrityBadges(app) {
        const badges = [];
        if (app.duplicate_warnings && app.duplicate_warnings.length > 0) {
            badges.push({ label: `⚠️ ${app.duplicate_warnings.length} Duplicate Warning${app.duplicate_warnings.length > 1 ? 's' : ''}`, type: 'warning', details: app.duplicate_warnings });
        }
        if (app.potential_inconsistencies && app.potential_inconsistencies.length > 0) {
            badges.push({ label: `🔍 ${app.potential_inconsistencies.length} Inconsistenc${app.potential_inconsistencies.length > 1 ? 'ies' : 'y'}`, type: 'caution', details: app.potential_inconsistencies });
        }
        return badges;
    }

    // Toggle single checkbox
    function toggleSelect(id) {
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(x => x !== id);
        } else {
            selectedIds = [...selectedIds, id];
        }
    }

    // Toggle select all
    function toggleSelectAll() {
        if (allSelected) {
            // Uncheck all in current view
            const filteredIds = filteredApplications.map(app => app._id);
            selectedIds = selectedIds.filter(id => !filteredIds.includes(id));
        } else {
            // Check all in current view
            const filteredIds = filteredApplications.map(app => app._id);
            selectedIds = [...new Set([...selectedIds, ...filteredIds])];
        }
    }

    async function updateStatus(applicationId, newStatus) {
        try {
            const res = await apiFetch('/api/jobs/application_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    application_id: applicationId,
                    status: newStatus
                })
            });
            const result = await res.json();
            if (result.success) {
                notify(`Status updated to ${newStatus}!`, 'success');
                await fetchApplications();
            } else {
                notify(result.message || 'Failed to update status', 'error');
            }
        } catch (err) {
            notify("Error updating status", "error");
        }
    }

    // Open review modal
    function openReview(app) {
        showReviewModal = app;
        reviewRating = app.recruiter_rating || 5;
        reviewNotes = app.recruiter_notes || '';
    }

    // Submit rating & notes
    async function submitReview() {
        if (!showReviewModal) return;
        try {
            const res = await apiFetch('/api/jobs/application_review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    application_id: showReviewModal._id,
                    rating: reviewRating,
                    notes: reviewNotes
                })
            });
            const data = await res.json();
            if (data.success) {
                notify('Candidate review updated!', 'success');
                showReviewModal = null;
                await fetchApplications();
            } else {
                notify(data.message || 'Failed to update review', 'error');
            }
        } catch (err) {
            notify('Error updating candidate review', 'error');
        }
    }

    // Open schedule modal
    function openSchedule(app) {
        showScheduleModal = app;
        scheduleDate = '';
        scheduleTime = '';
        scheduleType = 'Zoom';
        scheduleLink = '';
        scheduleNotes = '';
    }

    // Schedule interview over SMTP
    async function submitSchedule() {
        if (!showScheduleModal) return;
        schedulingEmail = true;
        try {
            const res = await apiFetch('/api/jobs/schedule_interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    application_id: showScheduleModal._id,
                    date: scheduleDate,
                    time: scheduleTime,
                    meeting_type: scheduleType,
                    meeting_link: scheduleLink,
                    notes: scheduleNotes
                })
            });
            const data = await res.json();
            if (data.success) {
                notify('Interview scheduled & email sent!', 'success');
                showScheduleModal = null;
                await fetchApplications();
            } else {
                notify(data.message || 'Failed to schedule', 'error');
            }
        } catch (err) {
            notify('Error scheduling interview', 'error');
        } finally {
            schedulingEmail = false;
        }
    }

    // Bulk actions
    async function bulkUpdateStatus(bulkStatus) {
        if (selectedIds.length === 0) return;
        try {
            const res = await apiFetch('/api/jobs/bulk_application_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    application_ids: selectedIds,
                    status: bulkStatus
                })
            });
            const data = await res.json();
            if (data.success) {
                notify(`Successfully updated ${selectedIds.length} profiles to ${bulkStatus}`, 'success');
                selectedIds = [];
                await fetchApplications();
            } else {
                notify(data.message || 'Bulk update failed', 'error');
            }
        } catch (err) {
            notify('Network error during bulk action', 'error');
        }
    }

    // Export selected to CSV
    function bulkExport() {
        if (selectedIds.length === 0) return;
        const selectedApps = applications.filter(app => selectedIds.includes(app._id));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Job Title,Candidate Name,Candidate Email,Applied Date,Status,Match Score (%),Rating (1-5),Recruiter Notes\n";
        
        selectedApps.forEach(a => {
            const score = a.score || (a.match_analysis ? a.match_analysis.score : 0);
            const rating = a.recruiter_rating || '';
            const notes = (a.recruiter_notes || '').replace(/"/g, '""');
            const date = new Date(a.applied_at).toLocaleDateString();
            csvContent += `"${a.job_title}","${a.candidate_name}","${a.candidate_email}","${date}","${a.status}",${score},${rating},"${notes}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "selected_applications.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Export all CSV directly from server
    async function exportAllCSV() {
        try {
            // Using withApiBase to call normal browser download with token in headers is tricky.
            // Let's perform a fetch with Authorization headers, parse text, and trigger download.
            const res = await apiFetch('/api/export/applications');
            if (res.ok) {
                const text = await res.text();
                const blob = new Blob([text], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', 'all_applications.csv');
                a.click();
            } else {
                notify('Failed to generate export file.', 'error');
            }
        } catch (err) {
            notify('Export failed', 'error');
        }
    }
</script>

<div class="applications-page" in:fade>
    <div class="header-banner">
        <div>
        <h2>{isRecruiterLike ? 'Hiring Control Pipeline' : 'My Applications Feed'}</h2>
            <p>{isRecruiterLike ? 'Manage, shortlist, and schedule candidates dynamically' : 'Track the review status of your job submissions'}</p>
        </div>
        {#if isRecruiterLike && applications.length > 0}
            <div class="header-actions">
                <label class="blind-toggle" title="Anonymize candidate data for unbiased screening">
                    <input type="checkbox" checked={blindMode} on:change={toggleBlindMode} />
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">🕶️ Blind Mode</span>
                </label>
                <button class="export-btn secondary-btn" on:click={exportAllCSV}>
                    📥 Export All to CSV
                </button>
            </div>
        {/if}
    </div>

    {#if loading}
        <div class="table-container glass skeleton-pulse">
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;"></th>
                        {#if isRecruiterLike}
                            <th style="width: 40px;"></th>
                        {/if}
                        <th>Candidate / Opportunity</th>
                        {#if isRecruiterLike}
                            <th>Match Fit</th>
                            <th>Recruiter Assessment</th>
                        {/if}
                        <th>Status</th>
                        <th>Applied Date</th>
                        {#if isRecruiterLike}
                            <th>Actions</th>
                        {/if}
                    </tr>
                </thead>
                <tbody>
                    {#each Array(5) as _}
                        <tr>
                            <td><div class="skeleton-line" style="width: 20px; height: 20px; margin: 0 auto;"></div></td>
                            {#if isRecruiterLike}
                                <td><div class="skeleton-line" style="width: 16px; height: 16px; margin: 0 auto;"></div></td>
                            {/if}
                            <td>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <div class="skeleton-line" style="width: 140px; height: 16px;"></div>
                                    <div class="skeleton-line" style="width: 100px; height: 12px;"></div>
                                </div>
                            </td>
                            {#if isRecruiterLike}
                                <td><div class="skeleton-line" style="width: 60px; height: 16px;"></div></td>
                                <td><div class="skeleton-line" style="width: 80px; height: 16px;"></div></td>
                            {/if}
                            <td><div class="skeleton-line" style="width: 70px; height: 24px; border-radius: 12px;"></div></td>
                            <td><div class="skeleton-line" style="width: 80px; height: 14px;"></div></td>
                            {#if isRecruiterLike}
                                <td><div class="skeleton-line" style="width: 100px; height: 28px; border-radius: 6px;"></div></td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else if applications.length === 0}
        <div class="empty-state-container">
            <div class="empty-emoji">📁</div>
            <h3>No applications yet</h3>
            <p>{isRecruiterLike ? 'Waiting for candidates to submit profiles.' : 'Apply to job opportunities in the Jobs Feed to see them here.'}</p>
        </div>
    {:else}
        <!-- Recruiter Portal Tools -->
        {#if isRecruiterLike}
            <div class="filters-container glass">
                <div class="filter-row">
                    <div class="filter-group">
                        <label for="search-filter">Keyword / Name Search</label>
                        <input id="search-filter" type="text" bind:value={skillsFilter} placeholder="Search candidate name, email, skills..." />
                    </div>

                    <div class="filter-group">
                        <label for="job-filter">Job Role Filter</label>
                        <select id="job-filter" bind:value={jobFilter}>
                            <option value="all">All Jobs</option>
                            {#each uniqueJobTitles as title}
                                <option value={title}>{title}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="status-filter">Pipeline Status</label>
                        <select id="status-filter" bind:value={statusFilter}>
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interview scheduled">Interview Scheduled</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="hired">Hired</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="date-filter">Applied Date</label>
                        <select id="date-filter" bind:value={dateFilter}>
                            <option value="all">All Time</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                        </select>
                    </div>
                </div>

                <div class="filter-slider-row">
                    <label for="score-filter">Min Match Relevance Score: <strong>{scoreFilter}%</strong></label>
                    <input id="score-filter" type="range" min="0" max="100" bind:value={scoreFilter} />
                </div>
            </div>

            <!-- Bulk action bar -->
            {#if selectedIds.length > 0}
                <div class="bulk-bar-float glass" in:fly={{ y: 50 }}>
                    <div class="bulk-info">
                        <span>Selected <strong>{selectedIds.length}</strong> candidates</span>
                    </div>
                    <div class="bulk-buttons">
                        <button class="bulk-btn shortlist" on:click={() => bulkUpdateStatus('shortlisted')}>Shortlist</button>
                        <button class="bulk-btn accept" on:click={() => bulkUpdateStatus('accepted')}>Accept</button>
                        <button class="bulk-btn reject" on:click={() => bulkUpdateStatus('rejected')}>Reject</button>
                        <button class="bulk-btn export" on:click={bulkExport}>CSV Export</button>
                    </div>
                </div>
            {/if}
        {/if}

        <div class="table-container glass">
            <table>
                <thead>
                    <tr>
                        <th class="expand-th"></th>
                        {#if isRecruiterLike}
                            <th class="checkbox-th">
                                <input type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
                            </th>
                        {/if}
                        <th>{isRecruiterLike ? 'Candidate Profile' : 'Opportunity Details'}</th>
                        {#if isRecruiterLike}
                            <th>Match Fit</th>
                            <th>Recruiter Assessment</th>
                        {/if}
                        <th>Status</th>
                        <th>Applied Date</th>
                        {#if isRecruiterLike}
                            <th>Actions</th>
                        {/if}
                    </tr>
                </thead>
                <tbody>
                    {#each filteredApplications as app}
                        <tr class:selected={selectedIds.includes(app._id)}>
                            <td>
                                <button class="expand-btn-toggle" on:click={() => toggleExpand(app._id)} aria-label="Toggle details">
                                    {expandedAppId === app._id ? '▲' : '▼'}
                                </button>
                            </td>
                            {#if isRecruiterLike}
                                <td>
                                    <input type="checkbox" checked={selectedIds.includes(app._id)} on:change={() => toggleSelect(app._id)} />
                                </td>
                            {/if}
                            <td>
                                <div class="job-info">
                                    <span class="title">{app.job_title}</span>
                                    {#if isRecruiterLike}
                                        <span class="candidate-meta">
                                            <strong>{app.candidate_name}</strong> ({app.candidate_email})
                                        </span>
                                    {/if}
                                    <span class="file-name">📄 {app.resume_name}</span>
                                    {#if isRecruiterLike && !blindMode}
                                        {#each getIntegrityBadges(app) as badge}
                                            <span class="integrity-badge {badge.type}" title={badge.details.join('; ')}>
                                                {badge.label}
                                            </span>
                                        {/each}
                                    {/if}
                                </div>
                            </td>
                            {#if isRecruiterLike}
                                <td>
                                    <div class="match-score-cell">
                                        <div class="score-pill-large" style="--score-color: {app.score >= 80 ? '#10b981' : app.score >= 50 ? '#f59e0b' : '#ef4444'}">
                                            {app.score}% Match
                                        </div>
                                        {#if app.match_analysis && app.match_analysis.hiring_recommendation}
                                            <span class="recommendation-badge">{app.match_analysis.hiring_recommendation}</span>
                                        {/if}
                                    </div>
                                </td>
                                <td>
                                    <div class="assessment-cell">
                                        <div class="rating-stars">
                                            {#if app.recruiter_rating}
                                                {#each Array(5) as _, i}
                                                    <span class="star">{i < app.recruiter_rating ? '★' : '☆'}</span>
                                                {/each}
                                            {:else}
                                                <span class="no-rating">Unrated</span>
                                            {/if}
                                        </div>
                                        {#if app.recruiter_notes}
                                            <p class="notes-preview">"{app.recruiter_notes.substring(0, 50)}{app.recruiter_notes.length > 50 ? '...' : ''}"</p>
                                        {/if}
                                    </div>
                                </td>
                            {/if}
                            <td>
                                <div class="status-cell">
                                    <span class="status-pill {app.status.replace(' ', '-')}">{app.status}</span>
                                    {#if app.status === 'interview scheduled' && app.interview_schedule}
                                        <span class="interview-lbl">📅 {app.interview_schedule.date} @ {app.interview_schedule.time}</span>
                                    {/if}
                                </div>
                            </td>
                            <td>
                                {new Date(app.applied_at).toLocaleDateString()}
                            </td>
                            {#if isRecruiterLike}
                                <td>
                                    <div class="actions-buttons-grid">
                                        <button class="review-btn secondary-btn" on:click={() => openReview(app)}>✍️ Review</button>
                                        <button class="schedule-btn secondary-btn" on:click={() => openSchedule(app)}>📅 Schedule</button>
                                        
                                        <div class="dropdown-status-select">
                                            <select 
                                                value={app.status} 
                                                on:change={(e) => updateStatus(app._id, e.target.value)}
                                                class="status-dropdown"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="shortlisted">Shortlisted</option>
                                                <option value="interview scheduled">Interview Scheduled</option>
                                                <option value="accepted">Accepted</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="hired">Hired</option>
                                            </select>
                                        </div>
                                    </div>
                                </td>
                            {/if}
                        </tr>
                        {#if expandedAppId === app._id}
                            <tr class="expanded-row" transition:slide>
                                <td colspan={isRecruiterLike ? 8 : 5}>
                                    <div class="expansion-detail-panel">
                                        <!-- Application Stepper Timeline -->
                                        <div class="stepper-section">
                                            <h5>Application Timeline</h5>
                                            <div class="stepper-timeline">
                                                <div class="step" class:completed={['pending', 'shortlisted', 'interview scheduled', 'accepted', 'rejected', 'hired'].includes(app.status)}>
                                                    <div class="circle">1</div>
                                                    <span>Applied</span>
                                                </div>
                                                <div class="step-connector" class:completed={['shortlisted', 'interview scheduled', 'accepted', 'rejected', 'hired'].includes(app.status)}></div>
                                                
                                                <div class="step" class:completed={['shortlisted', 'interview scheduled', 'accepted', 'rejected', 'hired'].includes(app.status)}>
                                                    <div class="circle">2</div>
                                                    <span>Shortlisted</span>
                                                </div>
                                                <div class="step-connector" class:completed={['interview scheduled', 'accepted', 'rejected', 'hired'].includes(app.status)}></div>
                                                
                                                <div class="step" class:completed={['interview scheduled', 'accepted', 'rejected', 'hired'].includes(app.status)}>
                                                    <div class="circle">3</div>
                                                    <span>Interview</span>
                                                </div>
                                                <div class="step-connector" class:completed={['accepted', 'rejected', 'hired'].includes(app.status)}></div>
                                                
                                                <div class="step" class:completed={['accepted', 'rejected', 'hired'].includes(app.status)} class:rejected={app.status === 'rejected'}>
                                                    <div class="circle">{app.status === 'rejected' ? '❌' : '4'}</div>
                                                    <span>{app.status === 'rejected' ? 'Rejected' : app.status === 'accepted' || app.status === 'hired' ? 'Accepted' : 'Decision'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Interview Scheduler Details -->
                                        {#if app.status === 'interview scheduled' && app.interview_schedule}
                                            <div class="scheduler-info-card glass">
                                                <h4>📅 Interview Details</h4>
                                                <div class="schedule-grid-details">
                                                    <p><strong>Date:</strong> {app.interview_schedule.date}</p>
                                                    <p><strong>Time:</strong> {app.interview_schedule.time}</p>
                                                    <p><strong>Meeting Type:</strong> {app.interview_schedule.meeting_type}</p>
                                                    {#if app.interview_schedule.meeting_link}
                                                        <p><strong>Meeting Link:</strong> <a href={app.interview_schedule.meeting_link} target="_blank" rel="noopener noreferrer">{app.interview_schedule.meeting_link}</a></p>
                                                    {/if}
                                                </div>
                                                {#if app.interview_schedule.notes}
                                                    <div class="schedule-notes-box">
                                                        <strong>Recruiter Notes for Interview:</strong>
                                                        <p>{app.interview_schedule.notes}</p>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}

                                        <!-- Recruiter Assessment Notes -->
                                        {#if isRecruiterLike || app.recruiter_notes}
                                            <div class="recruiter-feedback-box">
                                                <h4>📝 Recruiter Assessment & Feedback</h4>
                                                {#if app.recruiter_rating}
                                                    <div class="stars-row">
                                                        <strong>Rating:</strong>
                                                        {#each Array(5) as _, i}
                                                            <span class="star" style="color: #f59e0b;">{i < app.recruiter_rating ? '★' : '☆'}</span>
                                                        {/each}
                                                    </div>
                                                {/if}
                                                {#if app.recruiter_notes}
                                                    <p class="notes-content">"{app.recruiter_notes}"</p>
                                                {:else}
                                                    <p class="no-notes">No review notes added yet.</p>
                                                {/if}
                                            </div>
                                        {/if}

                                        <!-- Match Score / Analysis details for Candidate -->
                                        {#if userRole === 'candidate'}
                                            <div class="candidate-analysis-box">
                                                <h4>🧠 AI Match Analysis</h4>
                                                <p><strong>Fit Score:</strong> {app.score}% Match</p>
                                                {#if app.match_analysis}
                                                    {#if app.match_analysis.matched_skills && app.match_analysis.matched_skills.length > 0}
                                                        <p><strong>Matched Skills:</strong> {app.match_analysis.matched_skills.join(', ')}</p>
                                                    {/if}
                                                    {#if app.match_analysis.missing_skills && app.match_analysis.missing_skills.length > 0}
                                                        <p><strong>Recommended Skills to add:</strong> {app.match_analysis.missing_skills.join(', ')}</p>
                                                    {/if}
                                                    {#if app.match_analysis.summary}
                                                        <p class="match-summary"><em>{app.match_analysis.summary}</em></p>
                                                    {/if}
                                                {/if}
                                            </div>
                                        {/if}

                                        <!-- Candidate Withdrawal Control -->
                                        {#if userRole === 'candidate' && app.status === 'pending'}
                                            <div class="withdraw-section">
                                                <p class="withdraw-hint">You can withdraw this application if you no longer wish to be considered for this role.</p>
                                                <button class="withdraw-btn-danger" on:click={() => withdrawApplication(app._id)}>
                                                    Withdraw Application ⚠️
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        </div>

        {#if filteredApplications.length === 0}
            <div class="empty-state-container container-small" style="margin-top: 20px;">
                <div class="empty-emoji">🔍</div>
                <h3>No matching applications</h3>
                <p>Try resetting or widening your keyword search, status filters, or minimum fit score.</p>
            </div>
        {/if}
    {/if}

    <!-- Candidate Comparison Trigger -->
    {#if isRecruiterLike && selectedIds.length >= 2 && selectedIds.length <= 5}
        <button class="floating-compare-trigger" on:click={() => showCompareModal = true} in:fly={{ y: 20 }}>
            ⚖️ Compare Candidates ({selectedIds.length})
        </button>
    {/if}

    <!-- Review Rating & Notes Modal -->
    {#if showReviewModal}
        <div class="modal-overlay" on:click|self={() => showReviewModal = null}>
            <div class="modal glass">
                <button class="close-btn" on:click={() => showReviewModal = null}>&times;</button>
                <h3>Review Candidate Profile</h3>
                <p class="modal-candidate">{showReviewModal.candidate_name} — {showReviewModal.job_title}</p>

                <div class="form-group">
                    <label for="rating-stars-select">Recruiter Assessment Rating (1 to 5 Stars)</label>
                    <div class="stars-select-row" id="rating-stars-select">
                        {#each Array(5) as _, i}
                            <button 
                                class="star-btn" 
                                class:active={i < reviewRating}
                                on:click={() => reviewRating = i + 1}
                            >★</button>
                        {/each}
                    </div>
                </div>

                <div class="form-group" style="margin-top: 15px;">
                    <label for="review-notes-text">Recruiter Feedback / Evaluation Notes</label>
                    <textarea 
                        id="review-notes-text"
                        bind:value={reviewNotes} 
                        placeholder="Add private evaluation notes about key strengths, communication skill, or weaknesses..."
                        rows="5"
                    ></textarea>
                </div>

                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="cancel-btn secondary-btn" on:click={() => showReviewModal = null}>Cancel</button>
                    <button class="submit-btn primary-btn" on:click={submitReview}>Save Review Details</button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Interview Scheduler Modal -->
    {#if showScheduleModal}
        <div class="modal-overlay" on:click|self={() => showScheduleModal = null}>
            <div class="modal glass" style="max-width: 550px;">
                <button class="close-btn" on:click={() => showScheduleModal = null}>&times;</button>
                <h3>Schedule Interview</h3>
                <p class="modal-candidate">Inviting {showScheduleModal.candidate_name} for {showScheduleModal.job_title}</p>

                <div class="modal-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label for="int-date">Interview Date</label>
                        <input id="int-date" type="date" bind:value={scheduleDate} required />
                    </div>
                    <div class="form-group">
                        <label for="int-time">Time Slot</label>
                        <input id="int-time" type="time" bind:value={scheduleTime} required />
                    </div>
                    <div class="form-group">
                        <label for="int-type">Meeting Type</label>
                        <select id="int-type" bind:value={scheduleType}>
                            <option value="Zoom">Zoom Video</option>
                            <option value="Google Meet">Google Meet</option>
                            <option value="Phone Call">Phone Call</option>
                            <option value="On-site">In-Person (On-site)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="int-link">Meeting Link / Location</label>
                        <input id="int-link" type="text" bind:value={scheduleLink} placeholder="https://zoom.us/j/..." />
                    </div>
                </div>

                <div class="form-group" style="margin-top: 15px;">
                    <label for="int-notes">Notes for Candidate</label>
                    <textarea 
                        id="int-notes"
                        bind:value={scheduleNotes} 
                        placeholder="Add joining instructions, required preparations, or interviewers list..."
                        rows="4"
                    ></textarea>
                </div>

                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="cancel-btn secondary-btn" on:click={() => showScheduleModal = null}>Cancel</button>
                    <button class="submit-btn primary-btn" on:click={submitSchedule} disabled={schedulingEmail}>
                        {#if schedulingEmail} Inviting & Notifying... {:else} 🚀 Schedule & Email Candidate {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Candidate Comparison Matrix Modal -->
    {#if showCompareModal}
        <div class="modal-overlay" on:click|self={() => showCompareModal = false}>
            <div class="modal glass compare-modal-layout" style="max-width: 90%; width: 1000px; max-height: 90vh; overflow-y: auto;">
                <button class="close-btn" on:click={() => showCompareModal = false}>&times;</button>
                <h3 style="margin-bottom: 20px;">⚖️ Candidates Comparison Matrix</h3>

                <div class="comparison-grid" style="display: grid; grid-template-columns: repeat({selectedIds.length + 1}, 1fr); gap: 15px; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: var(--bg-primary);">
                    <!-- Row Labels -->
                    <div class="compare-col-labels" style="background: rgba(0,0,0,0.02); display: flex; flex-direction: column;">
                        <div class="compare-cell header">Candidate Details</div>
                        <div class="compare-cell">Match Score</div>
                        <div class="compare-cell">ATS Score</div>
                        <div class="compare-cell">Hiring Fit</div>
                        <div class="compare-cell">Rating</div>
                        <div class="compare-cell skills">Matched Stack</div>
                        <div class="compare-cell skills">Missing Skills</div>
                        <div class="compare-cell summary-cell">AI Profile Fit</div>
                    </div>

                    <!-- Selected Applicants Columns -->
                    {#each applications.filter(app => selectedIds.includes(app._id)) as app}
                        <div class="compare-col" style="display: flex; flex-direction: column; text-align: center; border-left: 1px solid var(--border-color);">
                            <div class="compare-cell header" style="font-weight: 700; background: rgba(0,0,0,0.01);">
                                <span class="comp-name" style="font-size: 15px; display: block; color: var(--accent-primary);">{app.candidate_name}</span>
                                <span class="comp-title" style="font-size: 12px; color: var(--text-secondary);">{app.job_title}</span>
                            </div>
                            <div class="compare-cell" style="font-weight: 800; font-size: 16px; color: {app.score >= 80 ? '#10b981' : app.score >= 50 ? '#f59e0b' : '#ef4444'};">
                                {app.score}% Match
                            </div>
                            <div class="compare-cell" style="font-weight: 700;">
                                {app.ats_score || 0}%
                            </div>
                            <div class="compare-cell">
                                <span class="rec-badge {app.match_analysis && app.match_analysis.hiring_recommendation ? app.match_analysis.hiring_recommendation.toLowerCase().replace(' ', '-') : 'average-match'}">
                                    {(app.match_analysis && app.match_analysis.hiring_recommendation) || 'Average Match'}
                                </span>
                            </div>
                            <div class="compare-cell rating">
                                {#if app.recruiter_rating}
                                    {#each Array(5) as _, idx}
                                        <span class="comp-star" style="color: #f59e0b;">{idx < app.recruiter_rating ? '★' : '☆'}</span>
                                    {/each}
                                {:else}
                                    <span style="font-size: 12px; color: var(--text-secondary);">Unrated</span>
                                {/if}
                            </div>
                            <div class="compare-cell skills">
                                {#if app.match_analysis && app.match_analysis.matched_skills}
                                    <div class="mini-skills-wrap">
                                        {#each app.match_analysis.matched_skills as skill}
                                            <span class="m-skill">{skill}</span>
                                        {/each}
                                    </div>
                                {:else}
                                    <span style="font-size: 11px; color: var(--text-secondary);">None</span>
                                {/if}
                            </div>
                            <div class="compare-cell skills">
                                {#if app.match_analysis && app.match_analysis.missing_skills}
                                    <div class="mini-skills-wrap">
                                        {#each app.match_analysis.missing_skills as skill}
                                            <span class="mis-skill">{skill}</span>
                                        {/each}
                                    </div>
                                {:else}
                                    <span style="font-size: 11px; color: var(--text-secondary);">None</span>
                                {/if}
                            </div>
                            <div class="compare-cell summary-cell" style="font-size: 12px; line-height: 1.4; text-align: left; padding: 15px;">
                                {(app.match_analysis && app.match_analysis.summary) || 'No summary available.'}
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="modal-actions" style="margin-top: 20px; justify-content: flex-end;">
                    <button class="submit-btn primary-btn" on:click={() => showCompareModal = false}>Close Matrix</button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .applications-page {
        animation: fadeIn 0.5s ease-out;
        padding-bottom: 80px;
    }

    .header-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 15px;
    }

    .header-banner h2 {
        font-size: 28px;
        font-weight: 800;
        margin: 0;
    }

    .header-banner p {
        color: var(--text-secondary);
        font-size: 14px;
        margin: 5px 0 0 0;
    }

    .export-btn {
        padding: 10px 20px;
        font-weight: 700;
        font-size: 13px;
        border-radius: 10px;
    }

    /* Filters Layout */
    .filters-container {
        padding: 24px;
        border-radius: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        margin-bottom: 25px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .filter-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .filter-group label, .filter-slider-row label {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .filter-group input, .filter-group select {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 13px;
    }

    .filter-slider-row {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }

    .filter-slider-row input[type="range"] {
        flex: 1;
        cursor: pointer;
        accent-color: var(--accent-primary);
        height: 6px;
        background: var(--border-color);
        border-radius: 10px;
    }

    /* Bulk Action Bar */
    .bulk-bar-float {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 800px;
        padding: 16px 24px;
        border-radius: 16px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-lg);
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 99;
        backdrop-filter: blur(10px);
        flex-wrap: wrap;
        gap: 15px;
    }

    .bulk-info {
        font-size: 14px;
    }

    .bulk-buttons {
        display: flex;
        gap: 10px;
    }

    .bulk-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        color: white;
    }

    .bulk-btn.shortlist { background: var(--accent-primary); }
    .bulk-btn.accept { background: #10b981; }
    .bulk-btn.reject { background: #ef4444; }
    .bulk-btn.export { background: #64748b; }

    /* Comparison trigger */
    .floating-compare-trigger {
        position: fixed;
        bottom: 90px;
        right: 40px;
        background: var(--accent-primary);
        color: white;
        padding: 14px 28px;
        border-radius: 30px;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        border: none;
        box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
        transition: var(--transition);
        z-index: 98;
    }

    .floating-compare-trigger:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 30px rgba(79, 70, 229, 0.5);
    }

    /* Table styles */
    .table-container {
        border-radius: 20px;
        overflow-x: auto;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        box-shadow: var(--shadow);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        min-width: 800px;
    }

    th {
        padding: 16px 20px;
        background: rgba(0,0,0,0.02);
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--border-color);
    }

    td {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        font-size: 14px;
        vertical-align: middle;
    }

    tr.selected {
        background: rgba(79, 70, 229, 0.02);
    }

    .checkbox-th, td:first-child {
        width: 40px;
        text-align: center;
        padding-right: 0;
    }

    input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: var(--accent-primary);
    }

    .job-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .title {
        font-weight: 800;
        font-size: 15px;
    }

    .candidate-meta {
        font-size: 13px;
        color: var(--text-secondary);
    }

    .file-name {
        font-size: 12px;
        color: var(--accent-primary);
        font-weight: 600;
    }

    .match-score-cell {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .score-pill-large {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 800;
        text-align: center;
        background: var(--bg-primary);
        border: 1px solid var(--score-color);
        color: var(--score-color);
        display: inline-block;
        width: fit-content;
    }

    .recommendation-badge {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--text-secondary);
        opacity: 0.8;
    }

    .assessment-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 180px;
    }

    .star {
        color: #f59e0b;
        font-size: 14px;
    }

    .no-rating {
        font-size: 11px;
        color: var(--text-secondary);
        font-style: italic;
    }

    .notes-preview {
        font-size: 11px;
        color: var(--text-secondary);
        margin: 0;
        font-style: italic;
    }

    .status-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .status-pill {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        display: inline-block;
        width: fit-content;
        text-align: center;
    }

    .status-pill.pending { background: #fef3c7; color: #92400e; }
    .status-pill.shortlisted { background: #e0f2fe; color: #0369a1; }
    .status-pill.interview-scheduled { background: #f3e8ff; color: #6b21a8; }
    .status-pill.accepted { background: #d1fae5; color: #065f46; }
    .status-pill.rejected { background: #fee2e2; color: #991b1b; }
    .status-pill.hired { background: #ccfbf1; color: #0f766e; }

    .interview-lbl {
        font-size: 11px;
        font-weight: 700;
        color: #6b21a8;
    }

    .actions-buttons-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    .dropdown-status-select {
        grid-column: span 2;
    }

    .status-dropdown {
        width: 100%;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        cursor: pointer;
    }

    /* Modal layout */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
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
        max-width: 480px;
        position: relative;
        box-shadow: var(--shadow-2xl);
        border: 1px solid var(--border-color);
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

    .modal-candidate {
        font-size: 14px;
        color: var(--accent-primary);
        font-weight: 700;
        margin-top: -8px;
        margin-bottom: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
    }

    input, select, textarea {
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 14px;
    }

    .stars-select-row {
        display: flex;
        gap: 5px;
    }

    .star-btn {
        background: none;
        border: none;
        font-size: 26px;
        cursor: pointer;
        color: var(--border-color);
        transition: color 0.1s;
    }

    .star-btn.active {
        color: #f59e0b;
    }

    .modal-actions {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 15px;
    }

    .primary-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 12px;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
    }

    .primary-btn:hover:not(:disabled) {
        background: var(--accent-hover);
    }

    .primary-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .secondary-btn {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
        text-align: center;
    }

    .secondary-btn:hover {
        background: var(--border-color);
    }

    .cancel-btn {
        padding: 12px;
        border-radius: 10px;
        font-weight: 700;
        text-align: center;
    }

    /* Comparison matrix styles */
    .compare-cell {
        padding: 12px 15px;
        border-bottom: 1px solid var(--border-color);
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
    }

    .compare-cell.header {
        font-weight: 800;
        min-height: 60px;
        flex-direction: column;
        gap: 3px;
        border-bottom: 2px solid var(--border-color);
    }

    .compare-cell.skills {
        min-height: 110px;
        flex-wrap: wrap;
        gap: 5px;
        align-content: center;
    }

    .compare-cell.summary-cell {
        min-height: 150px;
        align-items: flex-start;
    }

    .compare-col-labels .compare-cell {
        font-weight: 700;
        color: var(--text-secondary);
        justify-content: flex-start;
    }

    .mini-skills-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
    }

    .m-skill {
        font-size: 9px;
        font-weight: 700;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .mis-skill {
        font-size: 9px;
        font-weight: 700;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .comp-star {
        font-size: 16px;
    }

    /* Skeleton Loading CSS */
    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
    .skeleton-pulse {
        animation: pulse 1.5s infinite ease-in-out;
    }
    .skeleton-line {
        background: var(--bg-primary);
        border-radius: 4px;
        margin-bottom: 8px;
        display: inline-block;
    }

    /* Empty States Styling */
    .empty-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 40px;
        text-align: center;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        box-shadow: var(--shadow);
        width: 100%;
        margin-top: 20px;
    }
    .empty-state-container.container-small {
        padding: 30px 20px;
        box-shadow: none;
        border-style: dashed;
        background: transparent;
    }
    .empty-emoji {
        font-size: 48px;
        margin-bottom: 16px;
    }
    .empty-state-container h3 {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 8px 0;
    }
    .empty-state-container p {
        font-size: 14px;
        color: var(--text-secondary);
        max-width: 400px;
        margin: 0 0 16px 0;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Expand details styling */
    .expand-th {
        width: 50px;
        text-align: center;
    }

    .expand-btn-toggle {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 12px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
        border: 1px solid var(--border-color);
    }

    .expand-btn-toggle:hover {
        background: var(--border-color);
        color: var(--text-primary);
        transform: scale(1.05);
    }

    .expanded-row {
        background: rgba(0, 0, 0, 0.015);
    }

    .expansion-detail-panel {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        animation: fadeIn 0.3s ease-out;
    }

    /* Stepper Timeline styles */
    .stepper-section {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
    }

    .stepper-section h5 {
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin: 0 0 16px 0;
        letter-spacing: 0.5px;
    }

    .stepper-timeline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 650px;
        margin: 0 auto;
        padding: 10px 0;
    }

    .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        position: relative;
        z-index: 2;
    }

    .step .circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid var(--border-color);
        background: var(--bg-secondary);
        color: var(--text-secondary);
        font-weight: 800;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
    }

    .step span {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
    }

    .step.completed .circle {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: white;
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }

    .step.completed span {
        color: var(--text-primary);
    }

    .step.rejected .circle {
        background: #ef4444;
        border-color: #ef4444;
        color: white;
    }

    .step.rejected span {
        color: #ef4444;
    }

    .step-connector {
        flex: 1;
        height: 3px;
        background: var(--border-color);
        margin-top: -24px;
        border-radius: 2px;
        transition: var(--transition);
        z-index: 1;
    }

    .step-connector.completed {
        background: var(--accent-primary);
    }

    /* Scheduler detail card */
    .scheduler-info-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
    }

    .scheduler-info-card h4, .recruiter-feedback-box h4, .candidate-analysis-box h4 {
        font-size: 14px;
        font-weight: 800;
        margin: 0 0 12px 0;
        color: var(--text-primary);
    }

    .schedule-grid-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 12px;
    }

    .schedule-grid-details p {
        font-size: 13px;
        margin: 0;
    }

    .schedule-grid-details a {
        color: var(--accent-primary);
        text-decoration: none;
        font-weight: 600;
    }

    .schedule-grid-details a:hover {
        text-decoration: underline;
    }

    .schedule-notes-box {
        border-top: 1px solid var(--border-color);
        padding-top: 12px;
        margin-top: 12px;
        font-size: 13px;
    }

    .schedule-notes-box p {
        margin: 6px 0 0 0;
        color: var(--text-secondary);
    }

    /* Feedback and analysis boxes */
    .recruiter-feedback-box, .candidate-analysis-box {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
    }

    .stars-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 13px;
    }

    .notes-content {
        margin: 0;
        font-size: 13px;
        font-style: italic;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    .no-notes {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
        font-style: italic;
    }

    .candidate-analysis-box p {
        font-size: 13px;
        margin: 0 0 8px 0;
    }

    .candidate-analysis-box p:last-child {
        margin-bottom: 0;
    }

    .match-summary {
        background: var(--bg-primary);
        padding: 10px;
        border-radius: 8px;
        color: var(--text-secondary);
        border-left: 3px solid var(--accent-primary);
    }

    /* Withdraw section */
    .withdraw-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid var(--border-color);
        padding-top: 20px;
        margin-top: 10px;
        flex-wrap: wrap;
        gap: 15px;
    }

    .withdraw-hint {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
    }

    .withdraw-btn-danger {
        background: #ef4444;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: var(--transition);
    }

    .withdraw-btn-danger:hover {
        background: #dc2626;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 640px) {
        .stepper-timeline {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
        }

        .step-connector {
            display: none;
        }

        .step {
            flex-direction: row;
            gap: 15px;
        }
    }

    /* Blind Mode Toggle */
    .header-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .blind-toggle {
        display: flex; align-items: center; gap: 8px; cursor: pointer;
        background: var(--glass-bg, rgba(255,255,255,0.06));
        padding: 6px 14px; border-radius: 20px;
        border: 1px solid var(--border-color, rgba(255,255,255,0.1));
        transition: all 0.3s;
    }
    .blind-toggle:hover { border-color: var(--accent-primary, #6366f1); }
    .blind-toggle input[type="checkbox"] { display: none; }
    .toggle-slider {
        width: 36px; height: 20px; border-radius: 10px;
        background: var(--border-color, rgba(255,255,255,0.15));
        position: relative; transition: background 0.3s;
    }
    .toggle-slider::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 16px; height: 16px; border-radius: 50%;
        background: #fff; transition: transform 0.3s;
    }
    .blind-toggle input:checked ~ .toggle-slider {
        background: var(--accent-primary, #6366f1);
    }
    .blind-toggle input:checked ~ .toggle-slider::after {
        transform: translateX(16px);
    }
    .toggle-label { font-size: 13px; font-weight: 600; color: var(--text-primary, #e2e8f0); }

    /* Integrity Badges */
    .integrity-badge {
        display: inline-block; font-size: 10px; font-weight: 600;
        padding: 2px 8px; border-radius: 12px; margin-top: 4px;
        cursor: help;
    }
    .integrity-badge.warning {
        background: rgba(245,158,11,0.15); color: #f59e0b;
        border: 1px solid rgba(245,158,11,0.3);
    }
    .integrity-badge.caution {
        background: rgba(239,68,68,0.12); color: #f87171;
        border: 1px solid rgba(239,68,68,0.25);
    }
</style>
