<script>
    import { onMount } from 'svelte';
    import { notify } from '../../notificationStore.js';
    import { fade, fly } from 'svelte/transition';
    import SkillTag from '../../components/SkillTag.svelte';
    import StatsCard from '../../components/StatsCard.svelte';
    import { push } from 'svelte-spa-router';

    let resumes = [];
    let totalCount = 0;
    let fileInput;
    let searchQuery = "";
    let isDragging = false;
    let userRole = localStorage.getItem('role') || 'candidate';
    let userName = localStorage.getItem('name') || 'User';
    let userEmail = localStorage.getItem('email') || '';

    $: filteredResumes = resumes.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.skills && r.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    onMount(async () => {
        fetchResumes();
    });

    async function fetchResumes() {
        try {
            // Build URL with optional email filter
            let url = 'http://127.0.0.1:3000/api/resumes/list';
            if (userRole === 'candidate') {
                url += `?owner_email=${userEmail}`;
            }

            const res = await fetch(url);
            const result = await res.json();
            if (result.success) {
                resumes = result.data;
                totalCount = resumes.length;
            }
        } catch (err) {
            console.error("Error fetching resumes:", err);
            notify("Failed to load resumes", "error");
        }
    }

    async function handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('owner_email', userEmail); // Tag upload with owner

        try {
            const res = await fetch('http://127.0.0.1:3000/api/resumes/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                notify("Resume uploaded & analyzed successfully", "success");
                fetchResumes();
            } else {
                notify("Upload failed", "error");
            }
        } catch (err) {
            console.error(err);
            notify("Error uploading resume", "error");
        }
    }

    async function deleteResume(id) {
        try {
            const res = await fetch(`http://127.0.0.1:3000/api/resumes/delete_by_id/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                notify("Resume deleted successfully", "success");
                fetchResumes();
            }
        } catch (err) {
            console.error(err);
            notify("Delete failed", "error");
        }
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

    {#if userRole === 'recruiter'}
        <div class="stats-grid" in:fade>
            <StatsCard title="Total Candidates" value={totalCount} icon="👥" color="#4f46e5" />
            <StatsCard title="Analyzed Skills" value="50+" icon="🧠" color="#10b981" />
            <StatsCard title="Top Matches" value="5" icon="⭐" color="#f59e0b" />
        </div>
    {/if}

    <div class="action-bar">
        <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" bind:value={searchQuery} placeholder={userRole === 'recruiter' ? "Search by name or skill..." : "Search my skills..."} />
        </div>
        
        <div class="upload-section">
            <input type="file" bind:this={fileInput} style="display: none;" on:change={(e) => handleFileUpload(e.target.files)} />
            <button class="primary-btn" on:click={() => fileInput.click()}>
                <span>+</span> {userRole === 'recruiter' ? 'Import Resume' : 'Update My Resume'}
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
        <p>{isDragging ? "Drop it here!" : (userRole === 'recruiter' ? "Drag and drop PDF resumes here to auto-analyze" : "Drag and drop your latest resume here to update your profile")}</p>
    </div>

    <div class="resume-grid">
        {#each filteredResumes as resume (resume._id.$oid)}
            <div class="resume-card" in:fly={{ y: 20, duration: 400 }}>
                <div class="card-header">
                    <div class="avatar">{resume.name[0]}</div>
                    <div class="info">
                        <h3>{resume.name}</h3>
                        <p class="date">Uploaded: {new Date(resume.uploaded_at?.$date || Date.now()).toLocaleDateString()}</p>
                    </div>
                    <button class="delete-btn" on:click={() => deleteResume(resume._id.$oid)}>🗑️</button>
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
        <div class="empty-state">
            <p>No candidates found matching your search.</p>
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
</style>