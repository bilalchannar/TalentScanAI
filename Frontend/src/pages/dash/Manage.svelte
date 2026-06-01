<script>
    import { onMount } from 'svelte';
    import { notify } from '../../notificationStore.js';
    import { fade, fly, slide } from 'svelte/transition';
    import SkillTag from '../../components/SkillTag.svelte';
    import StatsCard from '../../components/StatsCard.svelte';
    import { push } from 'svelte-spa-router';
    import { apiFetch } from '../../api.js';

    let resumes = [];
    let totalCount = 0;
    let fileInput;
    let searchQuery = "";
    let isDragging = false;
    let userRole = localStorage.getItem('role') || 'candidate';

    // Activity Feed
    let activityFeed = [];
    let activityLoading = false;

    $: isRecruiterLike = userRole === 'recruiter' || userRole === 'admin' || userRole === 'super_admin';

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

    // Candidate specific state
    let profileStatus = {
        score: 0,
        checklist: {
            resume: false,
            name: false,
            email: false,
            phone: false,
            skills: false,
            education: false,
            experience: false,
            linkedin: false
        }
    };
    let recommendations = [];
    let loadingStatus = true;
    let loadingRecs = true;
    let loadingResumes = true;
    let generatingCL = false;
    let clText = '';
    let clTone = 'Professional';
    let clJobDescription = '';

    // Summary metrics for Candidate
    let applicationsCount = 0;
    let latestApplicationStatus = "";

    $: activeResume = resumes.find(r => r.is_active);
    $: activeResumeName = activeResume ? activeResume.name : "None";

    $: filteredResumes = resumes.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.skills && r.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    $: uniqueSkillsCount = new Set(resumes.flatMap(r => r.skills || [])).size;

    onMount(async () => {
        await fetchResumes();
        if (isRecruiterLike) {
            await Promise.all([fetchStats(), fetchActivity()]);
        } else {
            await Promise.all([
                fetchProfileStatus(),
                fetchRecommendations(),
                fetchCandidateApplicationsSummary(),
                fetchActivity()
            ]);
        }
    });

    async function fetchActivity() {
        activityLoading = true;
        try {
            const res = await apiFetch('/api/activity?limit=10');
            const data = await res.json();
            if (data.success) {
                activityFeed = data.data || [];
            }
        } catch (err) {
            console.error('Error fetching activity:', err);
        }
        activityLoading = false;
    }

    async function fetchStats() {
        if (!isRecruiterLike) return;
        try {
            const res = await apiFetch('/api/stats');
            const result = await res.json();
            if (result.success) {
                stats = result.data;
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    }

    async function fetchProfileStatus() {
        loadingStatus = true;
        try {
            const res = await apiFetch('/api/candidate/profile_status');
            const data = await res.json();
            if (data.success) {
                profileStatus = data.data;
            }
        } catch (err) {
            console.error("Error fetching status:", err);
        } finally {
            loadingStatus = false;
        }
    }

    async function fetchRecommendations() {
        loadingRecs = true;
        try {
            const res = await apiFetch('/api/candidate/recommendations');
            const data = await res.json();
            if (data.success) {
                recommendations = data.data || [];
            }
        } catch (err) {
            console.error("Error fetching recommendations:", err);
        } finally {
            loadingRecs = false;
        }
    }

    async function fetchCandidateApplicationsSummary() {
        if (userRole !== 'candidate') return;
        try {
            const res = await apiFetch('/api/jobs/my_applications');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const apps = data.data;
                applicationsCount = apps.length;
                if (apps.length > 0) {
                    const sortedApps = [...apps].sort((a, b) => {
                        const dateA = a.applied_at ? new Date(a.applied_at) : new Date(0);
                        const dateB = b.applied_at ? new Date(b.applied_at) : new Date(0);
                        return dateB - dateA;
                    });
                    latestApplicationStatus = sortedApps[0].status || "pending";
                } else {
                    latestApplicationStatus = "";
                }
            }
        } catch (err) {
            console.error("Error fetching my applications:", err);
        }
    }

    async function fetchResumes() {
        loadingResumes = true;
        try {
            const res = await apiFetch('/api/resumes/list');
            if (res.status === 401) {
                notify('Session expired. Please login again.', 'error');
                push('/auth/login');
                return;
            }

            const result = await res.json();
            if (result.success) {
                resumes = result.data;
                totalCount = resumes.length;
                if (userRole === 'recruiter') fetchStats();
            } else {
                notify(result.message || 'Failed to load resumes', 'error');
            }
        } catch (err) {
            console.error("Error fetching resumes:", err);
            notify("Failed to load resumes", "error");
        } finally {
            loadingResumes = false;
        }
    }

    async function handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        formData.append('file', files[0]);

        try {
            const res = await apiFetch('/api/resumes/upload', {
                method: 'POST',
                body: formData
            });

            if (res.status === 401) {
                notify('Session expired. Please login again.', 'error');
                push('/auth/login');
                return;
            }

            const result = await res.json();
            if (result.success) {
                notify("Resume uploaded & analyzed successfully", "success");
                await fetchResumes();
                if (userRole === 'candidate') {
                    await Promise.all([
                        fetchProfileStatus(),
                        fetchRecommendations(),
                        fetchCandidateApplicationsSummary()
                    ]);
                }
            } else {
                notify(result.message || 'Upload failed', 'error');
            }
        } catch (err) {
            console.error(err);
            notify("Error uploading resume", "error");
        }
    }

    async function deleteResume(id) {
        try {
            const res = await apiFetch(`/api/resumes/delete_by_id/${id}`, {
                method: 'DELETE'
            });

            if (res.status === 401) {
                notify('Session expired. Please login again.', 'error');
                push('/auth/login');
                return;
            }

            const result = await res.json();
            if (result.success) {
                notify("Resume deleted successfully", "success");
                await fetchResumes();
                if (userRole === 'candidate') {
                    await Promise.all([
                        fetchProfileStatus(),
                        fetchRecommendations(),
                        fetchCandidateApplicationsSummary()
                    ]);
                }
            } else {
                notify(result.message || 'Delete failed', 'error');
            }
        } catch (err) {
            console.error(err);
            notify("Delete failed", "error");
        }
    }

    async function setResumeActive(id) {
        try {
            const res = await apiFetch('/api/resumes/set_active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resume_id: id })
            });
            const data = await res.json();
            if (data.success) {
                notify('Active resume updated!', 'success');
                await fetchResumes();
                await Promise.all([
                    fetchProfileStatus(),
                    fetchRecommendations(),
                    fetchCandidateApplicationsSummary()
                ]);
            } else {
                notify(data.message || 'Failed to update active resume', 'error');
            }
        } catch (err) {
            notify('Error saving active resume', 'error');
        }
    }

    async function generateCoverLetter() {
        if (!clJobDescription.trim()) {
            notify('Please enter a job description or details first.', 'info');
            return;
        }
        generatingCL = true;
        try {
            const res = await apiFetch('/api/candidate/generate_cover_letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: clJobDescription,
                    tone: clTone
                })
            });
            const data = await res.json();
            if (data.success) {
                clText = data.data.cover_letter;
                notify('Cover letter drafted successfully!', 'success');
            } else {
                notify(data.message || 'Failed to draft cover letter', 'error');
            }
        } catch (err) {
            notify('Error generating cover letter', 'error');
        } finally {
            generatingCL = false;
        }
    }

    function selectJobDescription(desc) {
        clJobDescription = desc;
        notify('Job description loaded into draft workspace.', 'info');
    }

    function copyCoverLetter() {
        if (!clText) return;
        navigator.clipboard.writeText(clText);
        notify('Copied to clipboard!', 'success');
    }

    function downloadCoverLetter() {
        if (!clText) return;
        const blob = new Blob([clText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'cover_letter.txt');
        link.click();
    }

    function handleDrop(e) {
        e.preventDefault();
        isDragging = false;
        handleFileUpload(e.dataTransfer.files);
    }
</script>

<div class="manage-page">
    <div class="glass-header-title">
        <h2>{userRole === 'recruiter' ? 'Talent Database' : 'My Professional Portfolio'}</h2>
        <p>{userRole === 'recruiter' ? 'Manage and analyze all candidate resumes in your system' : 'Update and manage your personal professional documents'}</p>
    </div>

    {#if isRecruiterLike}
        <div class="stats-grid" in:fade>
            {#if loadingResumes}
                {#each Array(6) as _}
                    <div class="stats-card skeleton-pulse" style="--card-color: var(--border-color)">
                        <div class="icon-wrapper skeleton-element" style="width: 54px; height: 54px; border-radius: 14px;"></div>
                        <div class="content" style="flex: 1;">
                            <div class="skeleton-line" style="width: 80px; height: 12px; margin-bottom: 8px;"></div>
                            <div class="skeleton-line" style="width: 40px; height: 20px;"></div>
                        </div>
                    </div>
                {/each}
            {:else}
                <StatsCard title="Total Candidates" value={stats.total_resumes ?? totalCount} icon="👥" color="#4f46e5" />
                <StatsCard title="Active Jobs" value={stats.active_jobs ?? 0} icon="💼" color="#10b981" />
                <StatsCard title="Pending Applications" value={stats.pending_applications ?? 0} icon="⏳" color="#f59e0b" />
                <StatsCard title="Applications Today" value={stats.applications_today ?? 0} icon="📅" color="#ec4899" />
                <StatsCard title="Avg Match Score" value={(stats.average_match_score ?? 0) + '%'} icon="🎯" color="#3b82f6" />
                <StatsCard title="Top Detected Skill" value={stats.top_detected_skill ?? 'None'} icon="🧠" color="#8b5cf6" />
            {/if}
        </div>

        <!-- Recruiter Activity Feed -->
        <div class="activity-feed-section">
            <h3 class="section-heading">⚡ Recent Activity</h3>
            {#if activityLoading}
                <div class="activity-skeleton">
                    {#each Array(4) as _}
                        <div class="skeleton-row"><div class="skel-circle"></div><div class="skel-lines"><div class="skel-line"></div><div class="skel-line short"></div></div></div>
                    {/each}
                </div>
            {:else if activityFeed.length === 0}
                <div class="empty-activity"><p>No recent activity yet.</p></div>
            {:else}
                <div class="activity-list">
                    {#each activityFeed.slice(0, 8) as item}
                        <div class="activity-item" in:fly={{ y: 10, duration: 200 }}>
                            <div class="activity-dot" style="background: {item.action.includes('job') ? '#10b981' : item.action.includes('resume') ? '#6366f1' : item.action.includes('application') ? '#f59e0b' : '#94a3b8'}"></div>
                            <div class="activity-content">
                                <span class="activity-desc">{item.description}</span>
                                <span class="activity-time">{item.timestamp}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="action-bar">
            <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" bind:value={searchQuery} placeholder="Search by name or skill..." />
            </div>
            
            <div class="upload-section">
                <input type="file" bind:this={fileInput} style="display: none;" on:change={(e) => handleFileUpload(e.target.files)} />
                <button class="primary-btn" on:click={() => fileInput.click()}>
                    <span>+</span> Import Resume
                </button>
            </div>
        </div>

        <div 
            class="drop-zone" 
            class:dragging={isDragging}
            on:dragover|preventDefault={() => isDragging = true}
            on:dragleave={() => isDragging = false}
            on:drop={handleDrop}
        >
            <p>{isDragging ? "Drop it here!" : "Drag and drop PDF resumes here to auto-analyze"}</p>
        </div>

        {#if loadingResumes}
            <div class="resume-grid">
                {#each Array(6) as _}
                    <div class="resume-card skeleton-pulse">
                        <div class="card-header">
                            <div class="avatar skeleton-element" style="border-radius: 12px; width: 48px; height: 48px;"></div>
                            <div class="info" style="flex: 1;">
                                <div class="skeleton-line skeleton-title"></div>
                                <div class="skeleton-line skeleton-subtitle"></div>
                            </div>
                        </div>
                        <div class="skills-section" style="margin-top: 15px;">
                            <div class="skeleton-line skeleton-skill" style="width: 60px;"></div>
                            <div class="skeleton-line skeleton-skill" style="width: 80px;"></div>
                            <div class="skeleton-line skeleton-skill" style="width: 50px;"></div>
                        </div>
                        <div class="card-footer" style="margin-top: auto; padding-top: 16px;">
                            <div class="skeleton-line skeleton-footer"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="resume-grid">
                {#each filteredResumes as resume (resume._id)}
                    <div class="resume-card" in:fly={{ y: 20, duration: 400 }}>
                        <div class="card-header">
                            <div class="avatar">{resume.name ? resume.name[0] : 'C'}</div>
                            <div class="info">
                                <h3>{resume.name}</h3>
                                <p class="date">Uploaded: {new Date(resume.uploaded_at || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <button class="delete-btn" on:click={() => deleteResume(resume._id)}>🗑️</button>
                        </div>
                        
                        <div class="skills-section">
                            {#if resume.skills && resume.skills.length > 0}
                                {#each resume.skills.slice(0, 6) as skill}
                                    <SkillTag {skill} />
                                {/each}
                                {#if resume.skills.length > 6}
                                    <span class="more-count">+{resume.skills.length - 6} more</span>
                                {/if}
                            {:else}
                                <p class="no-skills">No skills extracted</p>
                            {/if}
                        </div>

                        <div class="card-footer">
                            <a href="/#/dash/rank" class="rank-link">AI Match Analysis</a>
                        </div>
                    </div>
                {/each}
            </div>

            {#if filteredResumes.length === 0}
                <div class="empty-state-container" in:fade>
                    <div class="empty-emoji">🔍</div>
                    <h3>No candidates found</h3>
                    <p>Try adjusting your search query or upload a new candidate resume.</p>
                </div>
            {/if}
        {/if}
    {:else}
        <!-- Candidate Dashboard Container -->
        <div class="candidate-dashboard-container" in:fade>
            <!-- 5-card metrics summary row -->
            <div class="candidate-metrics-row">
                <!-- Profile Completeness Card -->
                <div class="metric-card profile-completeness-card">
                    <div class="metric-header">
                        <span class="icon">📈</span>
                        <h3>Profile Completeness</h3>
                    </div>
                    <div class="metric-body" style="width: 100%;">
                        {#if loadingStatus}
                            <div class="skeleton-pulse" style="display: flex; align-items: center; width: 100%; gap: 10px;">
                                <div class="skeleton-line" style="flex: 1; height: 8px; margin: 0;"></div>
                                <div class="skeleton-line" style="width: 30px; height: 16px; margin: 0;"></div>
                            </div>
                        {:else}
                            <div class="gauge-container">
                                <div class="gauge-bar" style="background: linear-gradient(90deg, #ec4899, #8b5cf6); width: {profileStatus.score}%"></div>
                            </div>
                            <span class="value">{profileStatus.score}%</span>
                        {/if}
                    </div>
                </div>

                <!-- Active Resume Card -->
                <div class="metric-card">
                    <div class="icon-wrapper" style="color: #3b82f6">📄</div>
                    <div class="content">
                        <h3>Active Resume</h3>
                        {#if loadingResumes}
                            <div class="skeleton-line skeleton-title skeleton-pulse" style="width: 80px; margin: 0;"></div>
                        {:else}
                            <p class="value-text" title={activeResumeName}>{activeResumeName}</p>
                        {/if}
                    </div>
                </div>

                <!-- Applications Submitted Card -->
                <div class="metric-card">
                    <div class="icon-wrapper" style="color: #10b981">📥</div>
                    <div class="content">
                        <h3>Applications Submitted</h3>
                        {#if loadingStatus}
                            <div class="skeleton-line skeleton-title skeleton-pulse" style="width: 40px; margin: 0;"></div>
                        {:else}
                            <p class="value">{applicationsCount}</p>
                        {/if}
                    </div>
                </div>

                <!-- Recommendations Card -->
                <div class="metric-card">
                    <div class="icon-wrapper" style="color: #f59e0b">💼</div>
                    <div class="content">
                        <h3>Recommendations</h3>
                        {#if loadingRecs}
                            <div class="skeleton-line skeleton-title skeleton-pulse" style="width: 40px; margin: 0;"></div>
                        {:else}
                            <p class="value">{recommendations.length}</p>
                        {/if}
                    </div>
                </div>

                <!-- Latest Status Card -->
                <div class="metric-card">
                    <div class="icon-wrapper" style="color: #8b5cf6">🔔</div>
                    <div class="content">
                        <h3>Latest Status</h3>
                        {#if loadingStatus}
                            <div class="skeleton-line skeleton-title skeleton-pulse" style="width: 80px; margin: 0;"></div>
                        {:else}
                            <p class="status-tag {latestApplicationStatus ? latestApplicationStatus.toLowerCase().replace(' ', '-') : 'no-applications'}">
                                {latestApplicationStatus || 'None'}
                            </p>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Two-column dashboard layout -->
            <div class="candidate-dashboard-cols">
                <!-- Left Column: Profile Scorecard & Resume document list -->
                <div class="dashboard-col left-col">
                    <!-- Profile Completeness Scorecard -->
                    {#if loadingStatus}
                        <div class="card completeness-card glass skeleton-pulse">
                            <div class="skeleton-line" style="width: 180px; height: 20px; margin-bottom: 20px;"></div>
                            <div class="skeleton-line" style="width: 100%; height: 10px; margin-bottom: 20px;"></div>
                            <div class="checklist-grid">
                                {#each Array(6) as _}
                                    <div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
                                        <div class="skeleton-element" style="width: 16px; height: 16px; border-radius: 50%;"></div>
                                        <div class="skeleton-line" style="width: 120px; height: 14px; margin: 0;"></div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div class="card completeness-card glass">
                            <div class="card-title-row">
                                <h3>Profile Completeness</h3>
                                <span class="score-badge" style="background: {profileStatus.score >= 80 ? '#10b981' : profileStatus.score >= 50 ? '#f59e0b' : '#ef4444'}">{profileStatus.score}%</span>
                            </div>
                            
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: {profileStatus.score}%"></div>
                            </div>
                            
                            <div class="checklist-grid">
                                <div class="checklist-item" class:completed={profileStatus.checklist.resume}>
                                    <span class="icon">{profileStatus.checklist.resume ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Active Resume</strong>
                                        <p>Upload at least one resume document</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.name}>
                                    <span class="icon">{profileStatus.checklist.name ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Full Name</strong>
                                        <p>Provide your official name</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.email}>
                                    <span class="icon">{profileStatus.checklist.email ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Email Address</strong>
                                        <p>Verified email for recruiter contact</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.phone}>
                                    <span class="icon">{profileStatus.checklist.phone ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Phone Number</strong>
                                        <p>Provide or parse mobile contact</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.skills}>
                                    <span class="icon">{profileStatus.checklist.skills ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Extracted Skills</strong>
                                        <p>AI extracted skills list</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.education}>
                                    <span class="icon">{profileStatus.checklist.education ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Academic History</strong>
                                        <p>Degree details parsed from resume</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.experience}>
                                    <span class="icon">{profileStatus.checklist.experience ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Work History</strong>
                                        <p>Past employment references parsed</p>
                                    </div>
                                </div>
                                <div class="checklist-item" class:completed={profileStatus.checklist.linkedin}>
                                    <span class="icon">{profileStatus.checklist.linkedin ? '✅' : '⏳'}</span>
                                    <div class="item-text">
                                        <strong>Professional Links</strong>
                                        <p>LinkedIn or portfolio URL provided</p>
                                    </div>
                                </div>
                            </div>

                            <a href="/#/dash/change" class="action-link-btn">
                                Complete Profile in Settings ⚙️
                            </a>
                        </div>
                    {/if}

                    <!-- Resume Version Control -->
                    <div class="card resume-versions-card glass">
                        <div class="card-header-action">
                            <h3>Resume Document Control</h3>
                            <button class="primary-btn-sm" on:click={() => fileInput.click()}>
                                + Upload New
                            </button>
                            <input type="file" bind:this={fileInput} style="display: none;" on:change={(e) => handleFileUpload(e.target.files)} />
                        </div>

                        <div 
                            class="drop-zone-sm" 
                            class:dragging={isDragging}
                            on:dragover|preventDefault={() => isDragging = true}
                            on:dragleave={() => isDragging = false}
                            on:drop={handleDrop}
                        >
                            <p>{isDragging ? "Drop here!" : "Drag & drop PDF to upload new version"}</p>
                        </div>

                        <div class="version-list">
                            {#if loadingResumes}
                                {#each Array(2) as _}
                                    <div class="version-item skeleton-pulse">
                                        <div class="file-icon skeleton-element" style="width: 32px; height: 32px; border-radius: 6px;"></div>
                                        <div class="version-info" style="flex: 1;">
                                            <div class="skeleton-line skeleton-title"></div>
                                            <div class="skeleton-line skeleton-subtitle"></div>
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                {#each resumes as resume}
                                    <div class="version-item" class:active-version={resume.is_active}>
                                        <div class="file-icon">📄</div>
                                        <div class="version-info">
                                            <div class="title-row">
                                                <h4>{resume.name}</h4>
                                                {#if resume.is_active}
                                                    <span class="badge active-badge">Active Profile</span>
                                                {/if}
                                            </div>
                                            <p class="upload-date">Uploaded: {new Date(resume.uploaded_at || Date.now()).toLocaleDateString()}</p>
                                            
                                            <div class="version-skills">
                                                {#if resume.skills && resume.skills.length > 0}
                                                    {#each resume.skills.slice(0, 4) as skill}
                                                        <span class="mini-skill-tag">{skill}</span>
                                                    {/each}
                                                    {#if resume.skills.length > 4}
                                                        <span class="more-skills">+{resume.skills.length - 4}</span>
                                                    {/if}
                                                {/if}
                                            </div>
                                        </div>
                                        <div class="version-actions">
                                            {#if !resume.is_active}
                                                <button class="set-active-btn" on:click={() => setResumeActive(resume._id)}>Set Active</button>
                                            {/if}
                                            <button class="delete-btn-sm" on:click={() => deleteResume(resume._id)}>🗑️</button>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="empty-state-container container-small" in:fade>
                                        <div class="empty-emoji">📄</div>
                                        <h3>No resumes uploaded</h3>
                                        <p>Upload your first PDF resume to begin parsing skills and unlocking AI matching.</p>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Right Column: Recommendations & AI Cover Letter Workspace -->
                <div class="dashboard-col right-col">
                    <!-- Job Recommendations -->
                    <div class="card recommendations-card glass">
                        <h3>Smart Job Recommendations</h3>
                        <p class="section-desc">Based on AI semantic matching between your active resume skills and open job descriptions.</p>

                        {#if loadingRecs}
                            <div class="recs-list">
                                {#each Array(2) as _}
                                    <div class="rec-item skeleton-pulse">
                                        <div class="rec-header">
                                            <div class="job-meta">
                                                <div class="skeleton-line skeleton-title" style="width: 180px;"></div>
                                                <div class="skeleton-line skeleton-subtitle" style="width: 120px;"></div>
                                            </div>
                                            <div class="avatar skeleton-element" style="width: 44px; height: 44px; border-radius: 50%;"></div>
                                        </div>
                                        <div class="skeleton-line" style="width: 90%; height: 14px; margin-top: 10px;"></div>
                                        <div class="skeleton-line" style="width: 75%; height: 14px;"></div>
                                    </div>
                                {/each}
                            </div>
                        {:else if recommendations.length === 0}
                            <div class="empty-state-container container-small" in:fade>
                                <div class="empty-emoji">💡</div>
                                <h3>No recommendations yet</h3>
                                <p>Once you upload and activate a resume, our AI will recommend matching jobs here.</p>
                                <a href="/#/dash/jobs" class="find-jobs-link">Browse Job Feed</a>
                            </div>
                        {:else}
                            <div class="recs-list">
                                {#each recommendations as rec}
                                    <div class="rec-item">
                                        <div class="rec-header">
                                            <div class="job-meta">
                                                <h4>{rec.title}</h4>
                                                <p>{rec.company} — {rec.location || 'Remote'}</p>
                                            </div>
                                            <div class="score-badge-circle" style="border-color: {rec.score >= 80 ? '#10b981' : rec.score >= 50 ? '#f59e0b' : '#ef4444'}; color: {rec.score >= 80 ? '#10b981' : rec.score >= 50 ? '#f59e0b' : '#ef4444'};">
                                                {rec.score}%
                                            </div>
                                        </div>
                                        
                                        <p class="rec-reason">{rec.reason}</p>
                                        
                                        <div class="skills-alignment">
                                            {#if rec.matched_skills && rec.matched_skills.length > 0}
                                                <div class="skills-row">
                                                    <span class="label">Matched:</span>
                                                    <div class="skills-tags">
                                                        {#each rec.matched_skills.slice(0, 5) as skill}
                                                            <span class="m-skill">{skill}</span>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {/if}
                                            {#if rec.missing_skills && rec.missing_skills.length > 0}
                                                <div class="skills-row">
                                                    <span class="label">Missing:</span>
                                                    <div class="skills-tags">
                                                        {#each rec.missing_skills.slice(0, 5) as skill}
                                                            <span class="mis-skill">{skill}</span>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>

                                        <div class="rec-actions">
                                            <a href="/#/dash/jobs" class="apply-direct-btn">View Job</a>
                                            <button class="draft-cl-btn" on:click={() => selectJobDescription(`${rec.title} role at ${rec.company}. Description:\n${rec.reason || ""}`)}>
                                                Draft Cover Letter ✍️
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Cover Letter Builder -->
                    <div class="card cover-letter-card glass">
                        <h3>AI Cover Letter Draftsman</h3>
                        <p class="section-desc">Generate tailored cover letters by aligning your active resume skills with any job description.</p>

                        <div class="form-group">
                            <label for="cl-jd">Paste Job Description or Details</label>
                            <textarea 
                                id="cl-jd"
                                bind:value={clJobDescription} 
                                placeholder="Enter the job title, company, requirements, or paste the entire job posting description here..." 
                                rows="4"
                            ></textarea>
                        </div>

                        <div class="cl-controls-row">
                            <div class="form-group select-group">
                                <label for="cl-tone">Select Letter Tone</label>
                                <select id="cl-tone" bind:value={clTone}>
                                    <option value="Professional">💼 Professional</option>
                                    <option value="Enthusiastic">🔥 Enthusiastic</option>
                                    <option value="Creative">🎨 Creative</option>
                                    <option value="Simple">📄 Simple / Short</option>
                                </select>
                            </div>
                            
                            <button class="primary-btn generate-btn" on:click={generateCoverLetter} disabled={generatingCL || !clJobDescription.trim()}>
                                {#if generatingCL}
                                    Drafting cover letter...
                                {:else}
                                    Generate Cover Letter 🚀
                                {/if}
                            </button>
                        </div>

                        {#if clText}
                            <div class="cl-result-container" in:slide>
                                <div class="cl-header-bar">
                                    <strong>Generated Cover Letter</strong>
                                    <div class="cl-result-actions">
                                        <button class="cl-action-btn" on:click={copyCoverLetter}>📋 Copy</button>
                                        <button class="cl-action-btn" on:click={downloadCoverLetter}>📥 Download</button>
                                    </div>
                                </div>
                                <textarea 
                                    class="cl-output-textarea"
                                    bind:value={clText}
                                    rows="12"
                                ></textarea>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Candidate Activity Feed -->
        <div class="activity-feed-section">
            <h3 class="section-heading">⚡ Your Recent Activity</h3>
            {#if activityLoading}
                <div class="activity-skeleton">
                    {#each Array(3) as _}
                        <div class="skeleton-row"><div class="skel-circle"></div><div class="skel-lines"><div class="skel-line"></div><div class="skel-line short"></div></div></div>
                    {/each}
                </div>
            {:else if activityFeed.length === 0}
                <div class="empty-activity"><p>No activity yet. Upload a resume or apply for jobs to see your activity here.</p></div>
            {:else}
                <div class="activity-list">
                    {#each activityFeed.slice(0, 6) as item}
                        <div class="activity-item" in:fly={{ y: 10, duration: 200 }}>
                            <div class="activity-dot" style="background: {item.action.includes('login') ? '#10b981' : item.action.includes('resume') ? '#6366f1' : item.action.includes('password') ? '#f59e0b' : '#94a3b8'}"></div>
                            <div class="activity-content">
                                <span class="activity-desc">{item.description}</span>
                                <span class="activity-time">{item.timestamp}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .manage-page {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .glass-header-title {
        margin-bottom: 10px;
    }

    .glass-header-title h2 {
        font-size: 28px;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0;
    }

    .glass-header-title p {
        color: var(--text-secondary);
        font-size: 14px;
        margin-top: 5px;
    }

    .stats-grid {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
    }

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }

    .search-wrapper {
        position: relative;
        flex: 1;
        max-width: 400px;
    }

    .search-icon {
        position: absolute;
        left: 15px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
    }

    .search-wrapper input {
        width: 100%;
        padding: 12px 15px 12px 45px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 14px;
        transition: var(--transition);
    }

    .search-wrapper input:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }

    .primary-btn {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: var(--transition);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    }

    .primary-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
    }

    .drop-zone {
        border: 2px dashed var(--border-color);
        background: var(--bg-secondary);
        padding: 30px;
        border-radius: 20px;
        text-align: center;
        color: var(--text-secondary);
        transition: var(--transition);
    }

    .drop-zone.dragging {
        border-color: var(--accent-primary);
        background: rgba(79, 70, 229, 0.05);
        color: var(--accent-primary);
    }

    .resume-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
    }

    .resume-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 24px;
        box-shadow: var(--shadow);
        transition: var(--transition);
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .resume-card:hover {
        transform: translateY(-4px);
        border-color: var(--accent-primary);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .avatar {
        width: 48px;
        height: 48px;
        background: var(--bg-primary);
        color: var(--accent-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        font-size: 20px;
        font-weight: 800;
        border: 1px solid var(--border-color);
    }

    .info h3 {
        font-size: 16px;
        margin: 0;
    }

    .date {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 4px 0 0 0;
    }

    .delete-btn {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        transition: var(--transition);
    }

    .delete-btn:hover {
        opacity: 1;
        transform: scale(1.2);
    }

    .skills-section {
        min-height: 80px;
    }

    .no-skills {
        font-size: 12px;
        color: var(--text-secondary);
        font-style: italic;
    }

    .more-count {
        font-size: 11px;
        color: var(--text-secondary);
        margin-left: 5px;
    }

    .card-footer {
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid var(--border-color);
    }

    .rank-link {
        text-decoration: none;
        color: var(--accent-primary);
        font-size: 14px;
        font-weight: 600;
        display: block;
        text-align: center;
    }

    .rank-link:hover {
        text-decoration: underline;
    }

    .empty-state {
        text-align: center;
        padding: 60px;
        color: var(--text-secondary);
    }

    @media (max-width: 640px) {
        .action-bar {
            flex-direction: column;
            align-items: stretch;
        }
    }

    /* Candidate Dashboard Styles */
    .candidate-dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .candidate-dashboard-cols {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 30px;
        align-items: start;
    }

    .candidate-metrics-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
    }

    .metric-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: 20px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: var(--shadow);
        transition: var(--transition);
        min-width: 180px;
        overflow: hidden;
    }

    .metric-card:hover {
        transform: translateY(-4px);
        border-color: var(--accent-primary);
    }

    .metric-card .icon-wrapper {
        background: var(--bg-primary);
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 1px solid var(--border-color);
        flex-shrink: 0;
    }

    .metric-card .content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }

    .metric-card h3 {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0 0 4px 0;
        font-weight: 500;
    }

    .metric-card .value {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
        color: var(--text-primary);
    }

    .metric-card .value-text {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .metric-card.profile-completeness-card {
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        gap: 8px;
    }

    .profile-completeness-card .metric-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .profile-completeness-card .metric-header h3 {
        margin: 0;
    }

    .profile-completeness-card .metric-body {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .profile-completeness-card .gauge-container {
        flex: 1;
        height: 8px;
        background: var(--bg-primary);
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid var(--border-color);
    }

    .profile-completeness-card .gauge-bar {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease-out;
    }

    .status-tag {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        width: fit-content;
        margin: 0;
    }

    .status-tag.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .status-tag.shortlisted {
        background: rgba(59, 131, 246, 0.1);
        color: #3b82f6;
        border: 1px solid rgba(59, 131, 246, 0.2);
    }

    .status-tag.interview-scheduled {
        background: rgba(139, 92, 246, 0.1);
        color: #8b5cf6;
        border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .status-tag.accepted, .status-tag.hired {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-tag.rejected {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-tag.no-applications {
        background: rgba(156, 163, 175, 0.1);
        color: var(--text-secondary);
        border: 1px solid rgba(156, 163, 175, 0.2);
    }

    /* Skeleton Loading CSS */
    @keyframes pulse {
        0%, 100% {
            opacity: 0.6;
        }
        50% {
            opacity: 1;
        }
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

    .skeleton-title {
        width: 150px;
        height: 16px;
    }

    .skeleton-subtitle {
        width: 100px;
        height: 12px;
    }

    .skeleton-skill {
        width: 80%;
        height: 14px;
        display: inline-block;
        margin-right: 5px;
    }

    .skeleton-footer {
        width: 40%;
        height: 12px;
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

    .dashboard-col {
        display: flex;
        flex-direction: column;
        gap: 25px;
    }

    .card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 24px;
        box-shadow: var(--shadow);
        transition: var(--transition);
    }

    .card h3 {
        font-size: 18px;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .section-desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 20px;
    }

    /* Completeness Scorecard */
    .card-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .score-badge {
        color: white;
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 800;
    }

    .progress-bar-container {
        width: 100%;
        height: 10px;
        background: var(--bg-primary);
        border-radius: 5px;
        overflow: hidden;
        margin-bottom: 24px;
    }

    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-primary), #6366f1);
        border-radius: 5px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .checklist-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
    }

    @media (max-width: 640px) {
        .checklist-grid {
            grid-template-columns: 1fr;
        }
    }

    .checklist-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        opacity: 0.7;
        transition: var(--transition);
    }

    .checklist-item.completed {
        border-color: rgba(16, 185, 129, 0.2);
        background: rgba(16, 185, 129, 0.03);
        opacity: 1;
    }

    .checklist-item .icon {
        font-size: 16px;
        line-height: 1.2;
    }

    .checklist-item .item-text strong {
        font-size: 13px;
        font-weight: 700;
        display: block;
    }

    .checklist-item .item-text p {
        font-size: 11px;
        color: var(--text-secondary);
        margin: 2px 0 0 0;
    }

    .action-link-btn {
        display: block;
        text-align: center;
        padding: 12px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        color: var(--text-primary);
        text-decoration: none;
        font-weight: 700;
        font-size: 13px;
        transition: var(--transition);
    }

    .action-link-btn:hover {
        background: var(--border-color);
        border-color: var(--text-secondary);
    }

    /* Resume Document Control */
    .card-header-action {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .primary-btn-sm {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
    }

    .primary-btn-sm:hover {
        background: var(--accent-hover);
    }

    .drop-zone-sm {
        border: 2px dashed var(--border-color);
        background: var(--bg-primary);
        padding: 15px;
        border-radius: 12px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 12px;
        margin-bottom: 20px;
        transition: var(--transition);
    }

    .drop-zone-sm.dragging {
        border-color: var(--accent-primary);
        background: rgba(79, 70, 229, 0.05);
        color: var(--accent-primary);
    }

    .version-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .version-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 16px;
        border-radius: 12px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        transition: var(--transition);
    }

    .version-item.active-version {
        border-left: 4px solid var(--accent-primary);
        background: var(--bg-secondary);
    }

    .version-item .file-icon {
        font-size: 24px;
    }

    .version-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .version-info .title-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .version-info h4 {
        font-size: 14px;
        font-weight: 700;
        margin: 0;
        word-break: break-all;
    }

    .badge {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .active-badge {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .upload-date {
        font-size: 11px;
        color: var(--text-secondary);
        margin: 0;
    }

    .version-skills {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
    }

    .mini-skill-tag {
        font-size: 10px;
        background: var(--border-color);
        color: var(--text-primary);
        padding: 1px 6px;
        border-radius: 4px;
    }

    .more-skills {
        font-size: 10px;
        color: var(--text-secondary);
        font-weight: 700;
        align-self: center;
    }

    .version-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .set-active-btn {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
    }

    .set-active-btn:hover {
        background: var(--border-color);
    }

    .delete-btn-sm {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        padding: 4px;
        transition: var(--transition);
    }

    .delete-btn-sm:hover {
        opacity: 1;
        transform: scale(1.1);
    }

    .empty-versions {
        text-align: center;
        padding: 30px 10px;
        color: var(--text-secondary);
        font-size: 12px;
        border: 1px dashed var(--border-color);
        border-radius: 12px;
    }

    /* Recommendations Card */
    .recs-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .rec-item {
        padding: 16px;
        border-radius: 16px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: var(--transition);
    }

    .rec-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
    }

    .rec-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
    }

    .rec-header .job-meta h4 {
        font-size: 15px;
        font-weight: 800;
        margin: 0;
    }

    .rec-header .job-meta p {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 0 0;
    }

    .score-badge-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        background: var(--bg-secondary);
        flex-shrink: 0;
    }

    .rec-reason {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.4;
    }

    .skills-alignment {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .skills-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .skills-row .label {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
        width: 60px;
        flex-shrink: 0;
    }

    .skills-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
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
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .rec-actions {
        display: flex;
        gap: 10px;
        margin-top: 5px;
    }

    .apply-direct-btn {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        text-align: center;
        transition: var(--transition);
    }

    .apply-direct-btn:hover {
        background: var(--border-color);
    }

    .draft-cl-btn {
        flex: 1;
        background: var(--bg-primary);
        border: 1px solid var(--accent-primary);
        color: var(--accent-primary);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
    }

    .draft-cl-btn:hover {
        background: var(--accent-primary);
        color: white;
    }

    .empty-recs {
        text-align: center;
        padding: 40px 10px;
        color: var(--text-secondary);
        font-size: 13px;
        border: 1px dashed var(--border-color);
        border-radius: 16px;
    }

    .find-jobs-link {
        display: inline-block;
        margin-top: 12px;
        background: var(--accent-primary);
        color: white;
        padding: 8px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        text-decoration: none;
        transition: var(--transition);
    }

    .find-jobs-link:hover {
        background: var(--accent-hover);
    }

    /* Cover Letter Builder Workspace */
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    }

    .form-group label {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .form-group textarea, .form-group select {
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        transition: var(--transition);
    }

    .form-group textarea:focus, .form-group select:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }

    .cl-controls-row {
        display: flex;
        align-items: flex-end;
        gap: 15px;
        margin-bottom: 20px;
    }

    .select-group {
        flex: 1;
        margin-bottom: 0;
    }

    .generate-btn {
        padding: 11px 24px;
        font-size: 13px;
        box-shadow: none;
    }

    .cl-result-container {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        margin-top: 15px;
    }

    .cl-header-bar {
        background: var(--bg-primary);
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .cl-header-bar strong {
        font-size: 12px;
        text-transform: uppercase;
        color: var(--text-secondary);
        letter-spacing: 0.5px;
    }

    .cl-result-actions {
        display: flex;
        gap: 8px;
    }

    .cl-action-btn {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: var(--transition);
    }

    .cl-action-btn:hover {
        background: var(--border-color);
    }

    .cl-output-textarea {
        width: 100%;
        border: none;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        padding: 16px;
        line-height: 1.6;
        resize: vertical;
    }

    .cl-output-textarea:focus {
        outline: none;
    }

    .mini-loader {
        text-align: center;
        padding: 40px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    @media (max-width: 1024px) {
        .candidate-dashboard-cols {
            grid-template-columns: 1fr;
        }
        .candidate-metrics-row {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 768px) {
        .candidate-metrics-row {
            grid-template-columns: 1fr;
        }
    }

    /* Activity Feed */
    .activity-feed-section {
        margin-top: 8px;
        background: var(--glass-bg, rgba(255,255,255,0.04));
        border-radius: 16px;
        border: 1px solid var(--border-color, rgba(255,255,255,0.08));
        padding: 20px 24px;
    }
    .section-heading {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary, #e2e8f0);
    }
    .activity-list { display: flex; flex-direction: column; gap: 0; }
    .activity-item {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.04));
    }
    .activity-item:last-child { border-bottom: none; }
    .activity-dot {
        width: 10px; height: 10px; border-radius: 50%;
        flex-shrink: 0; margin-top: 5px;
    }
    .activity-content { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .activity-desc { font-size: 13px; color: var(--text-primary, #e2e8f0); }
    .activity-time { font-size: 11px; color: var(--text-secondary, #94a3b8); }
    .empty-activity { text-align: center; padding: 24px; }
    .empty-activity p { color: var(--text-secondary, #94a3b8); font-size: 13px; }
    .activity-skeleton { display: flex; flex-direction: column; gap: 12px; }
    .activity-skeleton .skeleton-row {
        display: flex; gap: 12px; align-items: center;
    }
    .skel-circle {
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--border-color, rgba(255,255,255,0.1));
        animation: pulse 1.5s ease-in-out infinite;
    }
    .skel-lines { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .skel-line {
        height: 14px; border-radius: 7px;
        background: var(--border-color, rgba(255,255,255,0.1));
        animation: pulse 1.5s ease-in-out infinite;
    }
    .skel-line.short { max-width: 100px; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
</style>