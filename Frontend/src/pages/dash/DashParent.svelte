<script>
    import Router, { location, replace } from 'svelte-spa-router';
    import ThemeToggle from '../../components/ThemeToggle.svelte';
    import { onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { getToken, apiFetch } from '../../api.js';

    import Change from "./Change.svelte";
    import Manage from "./Manage.svelte";
    import Rank from "./Rank.svelte";
    import Support from "./Support.svelte";
    import Stats from "./Stats.svelte";
    import Reasoning from "./Reasoning.svelte";
    import PostJob from "./PostJob.svelte";
    import JobFeed from "./JobFeed.svelte";
    import Applications from "./Applications.svelte";
    import Admin from "./Admin.svelte";

    // Read from localStorage immediately (not in onMount) to avoid flash
    let userRole = localStorage.getItem('role') || 'candidate';
    let userName = localStorage.getItem('name') || 'User';
    let userEmail = localStorage.getItem('email') || '';
    let isMobileMenuOpen = false;
    
    // Global search
    let globalSearchQuery = '';
    let globalSearchResults = null;
    let searchLoading = false;
    let showSearchResults = false;
    let searchDebounce;

    async function performGlobalSearch() {
        if (!globalSearchQuery || globalSearchQuery.length < 2) {
            globalSearchResults = null;
            showSearchResults = false;
            return;
        }
        searchLoading = true;
        showSearchResults = true;
        try {
            const res = await apiFetch(`/api/search?q=${encodeURIComponent(globalSearchQuery)}`);
            const data = await res.json();
            if (data.success) {
                globalSearchResults = data.data;
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
        searchLoading = false;
    }

    function onSearchInput() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(performGlobalSearch, 400);
    }

    function closeSearch() {
        showSearchResults = false;
        globalSearchResults = null;
    }

    function navigateToResult(path) {
        closeSearch();
        globalSearchQuery = '';
        window.location.hash = path;
    }

    // Notifications State
    let notifications = [];
    let unreadCount = 0;
    let showDropdown = false;
    let pollingInterval;

    async function fetchUnreadCount() {
        if (!getToken()) return;
        try {
            const res = await apiFetch('/api/notifications/unread_count');
            const data = await res.json();
            if (data.success) {
                unreadCount = data.data.unread_count;
            }
        } catch (err) {
            console.error("Error fetching unread count:", err);
        }
    }

    async function fetchNotifications() {
        if (!getToken()) return;
        try {
            const res = await apiFetch('/api/notifications');
            const data = await res.json();
            if (data.success) {
                notifications = data.data || [];
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    }

    async function toggleDropdown() {
        showDropdown = !showDropdown;
        if (showDropdown) {
            await fetchNotifications();
        }
    }

    async function markAsRead(id) {
        try {
            const res = await apiFetch('/api/notifications/mark_read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notification_id: id })
            });
            const data = await res.json();
            if (data.success) {
                notifications = notifications.map(n => n._id === id ? { ...n, is_read: true } : n);
                await fetchUnreadCount();
            }
        } catch (err) {
            console.error("Error marking read:", err);
        }
    }

    async function markAllAsRead() {
        try {
            const res = await apiFetch('/api/notifications/mark_all_read', {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                notifications = notifications.map(n => ({ ...n, is_read: true }));
                unreadCount = 0;
            }
        } catch (err) {
            console.error("Error marking all read:", err);
        }
    }

    function handleWindowClick(e) {
        const bell = document.querySelector('.bell-container');
        if (bell && !bell.contains(e.target)) {
            showDropdown = false;
        }
    }

    onMount(() => {
        if (!getToken()) {
            replace('/auth/login');
        } else {
            fetchUnreadCount();
            // Poll for notifications count every 10 seconds
            pollingInterval = setInterval(fetchUnreadCount, 10000);
        }
        window.addEventListener('click', handleWindowClick);
    });

    onDestroy(() => {
        if (pollingInterval) clearInterval(pollingInterval);
        if (typeof window !== 'undefined') {
            window.removeEventListener('click', handleWindowClick);
        }
    });

    const routes = {
        '/dash/change': Change,
        '/dash/manage': Manage,
        '/dash/rank': Rank,
        '/dash/support': Support,
        '/dash/stats': Stats,
        '/dash/reasoning': Reasoning,
        '/dash/post-job': PostJob,
        '/dash/job-feed': JobFeed,
        '/dash/applications': Applications,
        '/dash/admin': Admin
    }
    
    $: isAdminRole = userRole === 'admin' || userRole === 'super_admin';
    $: isRecruiterLike = userRole === 'recruiter' || isAdminRole;

    $: isActive = (path) => $location === path;
</script>

<div class="container">
    {#if isMobileMenuOpen}
        <div class="sidebar-backdrop" on:click={() => isMobileMenuOpen = false} transition:fade={{ duration: 200 }}></div>
    {/if}

    <aside class="sidebar" class:mobile-open={isMobileMenuOpen}>
        <div class="top-section">
            <div class="logo" on:click={() => isMobileMenuOpen = false}>
                <img src="/imgs/logo.png" alt="TalentScanAI Logo" style="max-height: 40px; width: auto; object-fit: contain;" />
            </div>

            <div class="user-pill">
                <div class="u-avatar">{userName[0]}</div>
                <div class="u-info">
                    <p class="u-name">{userName}</p>
                    <p class="u-role">{userRole.toUpperCase()}</p>
                </div>
            </div>
            
            <nav>
                <ul>
                    {#if isRecruiterLike}
                        <li>
                            <a href="/#/dash/manage" class:active={isActive('/dash/manage')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📁</span> Manage Resumes
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/post-job" class:active={isActive('/dash/post-job')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">➕</span> Post Job
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/applications" class:active={isActive('/dash/applications')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📨</span> Applications
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/rank" class:active={isActive('/dash/rank')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📊</span> AI Ranking
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/stats" class:active={isActive('/dash/stats')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📈</span> Analytics
                            </a>
                        </li>
                        {#if isAdminRole}
                            <li>
                                <a href="/#/dash/admin" class:active={isActive('/dash/admin')} on:click={() => isMobileMenuOpen = false}>
                                    <span class="nav-icon">🛡️</span> Admin Panel
                                </a>
                            </li>
                        {/if}
                    {:else}
                        <li>
                            <a href="/#/dash/manage" class:active={isActive('/dash/manage')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📄</span> My Profile
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/job-feed" class:active={isActive('/dash/job-feed')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">💼</span> Find Jobs
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/applications" class:active={isActive('/dash/applications')} on:click={() => isMobileMenuOpen = false}>
                                <span class="nav-icon">📤</span> My Applications
                            </a>
                        </li>
                    {/if}
                    
                    <li>
                        <a href="/#/dash/support" class:active={isActive('/dash/support')} on:click={() => isMobileMenuOpen = false}>
                            <span class="nav-icon">🎧</span> Support
                        </a>
                    </li>
                    <li>
                        <a href="/#/dash/change" class:active={isActive('/dash/change')} on:click={() => isMobileMenuOpen = false}>
                            <span class="nav-icon">⚙️</span> Settings
                        </a>
                    </li>
                </ul>
            </nav>
        </div>

        <div class="bottom-section">
            <div class="theme-wrapper">
                <ThemeToggle />
            </div>
            <a href="/#/auth/logout" class="logout-btn" on:click={() => isMobileMenuOpen = false}>
                <span class="nav-icon">🚪</span> Logout
            </a>
        </div>
    </aside>

    <main class="main-content">
        <div class="glass-header">
            <button class="hamburger-btn" on:click={() => isMobileMenuOpen = !isMobileMenuOpen} aria-label="Toggle Menu">
                <span class="hamburger-icon">{isMobileMenuOpen ? '✕' : '☰'}</span>
            </button>

            <!-- Global Search Bar -->
            <div class="global-search-container">
                <div class="global-search-input-wrap">
                    <span class="search-icon-gs">🔍</span>
                    <input type="text" class="global-search-input" 
                           bind:value={globalSearchQuery}
                           on:input={onSearchInput}
                           on:focus={() => { if (globalSearchResults) showSearchResults = true; }}
                           placeholder="Search candidates, jobs, applications..." />
                    {#if globalSearchQuery}
                        <button class="search-clear" on:click={() => { globalSearchQuery = ''; closeSearch(); }}>✕</button>
                    {/if}
                </div>
                {#if showSearchResults}
                    <div class="search-results-dropdown">
                        {#if searchLoading}
                            <div class="search-loading">Searching...</div>
                        {:else if globalSearchResults}
                            {#if globalSearchResults.candidates && globalSearchResults.candidates.length > 0}
                                <div class="search-category">
                                    <h5>👤 Candidates</h5>
                                    {#each globalSearchResults.candidates as c}
                                        <div class="search-result-item" on:click={() => navigateToResult('/dash/manage')}>
                                            <span class="sr-name">{c.name}</span>
                                            <span class="sr-detail">{c.email} · {(c.skills || []).slice(0,3).join(', ')}</span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                            {#if globalSearchResults.jobs && globalSearchResults.jobs.length > 0}
                                <div class="search-category">
                                    <h5>💼 Jobs</h5>
                                    {#each globalSearchResults.jobs as j}
                                        <div class="search-result-item" on:click={() => navigateToResult(isRecruiterLike ? '/dash/applications' : '/dash/job-feed')}>
                                            <span class="sr-name">{j.title}</span>
                                            <span class="sr-detail">{j.company || ''} · {j.location || ''} · {j.status}</span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                            {#if globalSearchResults.applications && globalSearchResults.applications.length > 0}
                                <div class="search-category">
                                    <h5>📨 Applications</h5>
                                    {#each globalSearchResults.applications as a}
                                        <div class="search-result-item" on:click={() => navigateToResult('/dash/applications')}>
                                            <span class="sr-name">{a.candidate_name || a.job_title}</span>
                                            <span class="sr-detail">{a.job_title} · {a.status} · Score: {a.score}%</span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                            {#if (!globalSearchResults.candidates || globalSearchResults.candidates.length === 0) && (!globalSearchResults.jobs || globalSearchResults.jobs.length === 0) && (!globalSearchResults.applications || globalSearchResults.applications.length === 0)}
                                <div class="search-empty">No results found for "{globalSearchQuery}"</div>
                            {/if}
                        {/if}
                    </div>
                    <div class="search-backdrop" on:click={closeSearch}></div>
                {/if}
            </div>

            <h2>
                {#if isRecruiterLike}
                    {isActive('/dash/manage') ? 'Resume Management' : 
                     isActive('/dash/rank') ? 'AI Ranking Engine' : 
                     isActive('/dash/stats') ? 'Talent Analytics' : 
                     isActive('/dash/change') ? 'Account Settings' : 
                     isActive('/dash/support') ? 'Help & Support' :
                     isActive('/dash/post-job') ? 'Post a Job' :
                     isActive('/dash/applications') ? 'All Applications' :
                     isActive('/dash/admin') ? 'Admin Panel' : 'Dashboard'}
                {:else}
                    {isActive('/dash/manage') ? 'My Professional Profile' : 
                     isActive('/dash/job-feed') ? 'Discover Opportunities' : 
                     isActive('/dash/applications') ? 'Application History' : 
                     isActive('/dash/change') ? 'Account Settings' : 
                     isActive('/dash/support') ? 'Help & Support' :
                     isActive('/dash/reasoning') ? 'AI Diagnostic Report' : 'Candidate Portal'}
                {/if}
            </h2>

            <!-- Notification BellDropdown -->
            <div class="bell-container">
                <button class="bell-btn" on:click={toggleDropdown} aria-label="Toggle notifications">
                    <span class="bell-icon">🔔</span>
                    {#if unreadCount > 0}
                        <span class="bell-badge">{unreadCount}</span>
                    {/if}
                </button>

                {#if showDropdown}
                    <div class="notif-dropdown glass">
                        <div class="dropdown-header">
                            <h3>Notifications</h3>
                            <button class="mark-all-btn" on:click={markAllAsRead} disabled={unreadCount === 0}>
                                Mark all read
                            </button>
                        </div>

                        <div class="dropdown-body">
                            {#each notifications as notif}
                                <div class="notif-item" class:unread={!notif.is_read} on:click={() => markAsRead(notif._id)}>
                                    <div class="notif-content-row">
                                        <div class="notif-indicator {notif.type || 'info'}"></div>
                                        <div class="notif-info">
                                            <h4 class="notif-title">{notif.title}</h4>
                                            <p class="notif-msg">{notif.message}</p>
                                            <span class="notif-time">{new Date(notif.created_at || Date.now()).toLocaleString()}</span>
                                        </div>
                                        {#if !notif.is_read}
                                            <div class="unread-dot"></div>
                                        {/if}
                                    </div>
                                </div>
                            {:else}
                                <div class="empty-notifs">
                                    <p>No notifications yet.</p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
        <div class="page-content">
            <Router {routes} />
        </div>
    </main>
</div>

<style>
.container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary);
}

.sidebar {
    width: 280px;
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    padding: 30px 20px;
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100%;
    z-index: 100;
}

.top-section {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
    /* Hide scrollbar but allow scrolling */
    scrollbar-width: none;
}
.top-section::-webkit-scrollbar {
    display: none;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 40px;
    color: var(--accent-primary);
}

.logo-icon {
    background: var(--accent-primary);
    color: white;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 14px;
}

.user-pill {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: var(--bg-primary);
    border-radius: 16px;
    margin-bottom: 30px;
    border: 1px solid var(--border-color);
}

.u-avatar {
    width: 36px;
    height: 36px;
    background: var(--accent-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 14px;
}

.u-name {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
}

.u-role {
    font-size: 10px;
    font-weight: 800;
    margin: 2px 0 0 0;
    color: var(--text-secondary);
    opacity: 0.7;
}

nav ul {
    list-style: none;
    padding: 0;
}

nav ul li {
    margin-bottom: 8px;
}

nav ul li a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 12px;
    transition: var(--transition);
}

nav ul li a:hover {
    background-color: var(--bg-primary);
    color: var(--accent-primary);
}

nav ul li a.active {
    background-color: var(--accent-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.nav-icon {
    font-size: 18px;
}

.bottom-section {
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.logout-btn {
    color: #ef4444;
    text-decoration: none;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    border-radius: 12px;
    transition: var(--transition);
}

.logout-btn:hover {
    background-color: #fee2e2;
}

.main-content {
    margin-left: 280px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.glass-header {
    position: sticky;
    top: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border-color);
    padding: 20px 40px;
    z-index: 90;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Notification bell styling */
.bell-container {
    position: relative;
}

.bell-btn {
    background: none;
    border: 1px solid var(--border-color);
    cursor: pointer;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: var(--transition);
    background: var(--bg-secondary);
}

.bell-btn:hover {
    background: var(--border-color);
    transform: scale(1.05);
}

.bell-icon {
    font-size: 18px;
}

.bell-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 800;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-secondary);
}

/* Dropdown container */
.notif-dropdown {
    position: absolute;
    top: 50px;
    right: 0;
    width: 360px;
    max-height: 480px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow: hidden;
    animation: notifFadeIn 0.2s ease-out;
}

@keyframes notifFadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.01);
}

.dropdown-header h3 {
    font-size: 15px;
    font-weight: 800;
    margin: 0;
    color: var(--text-primary);
}

.mark-all-btn {
    background: none;
    border: none;
    color: var(--accent-primary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: var(--transition);
}

.mark-all-btn:hover:not(:disabled) {
    background: rgba(79, 70, 229, 0.05);
}

.mark-all-btn:disabled {
    color: var(--text-secondary);
    opacity: 0.5;
    cursor: not-allowed;
}

.dropdown-body {
    overflow-y: auto;
    flex: 1;
    max-height: 400px;
}

/* Notification items */
.notif-item {
    padding: 15px 16px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: var(--transition);
}

.notif-item:hover {
    background: var(--bg-primary);
}

.notif-item.unread {
    background: rgba(79, 70, 229, 0.02);
}

.notif-content-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.notif-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
}

.notif-indicator.info { background: #3b82f6; }
.notif-indicator.application_submitted { background: #3b82f6; }
.notif-indicator.application_accepted { background: #10b981; }
.notif-indicator.application_rejected { background: #ef4444; }
.notif-indicator.shortlisted { background: #6366f1; }
.notif-indicator.interview_scheduled { background: #8b5cf6; }
.notif-indicator.new_recommendation { background: #f59e0b; }
.notif-indicator.resume_parsed { background: #10b981; }
.notif-indicator.profile_updated { background: #64748b; }

.notif-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.notif-title {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
}

.notif-msg {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
}

.notif-time {
    font-size: 10px;
    color: var(--text-secondary);
    opacity: 0.8;
}

.unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-primary);
    align-self: center;
}

.empty-notifs {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 13px;
}

.page-content {
    padding: 40px;
    max-width: 1200px;
}

/* Add styling for hamburger button */
.hamburger-btn {
    display: none;
    background: none;
    border: 1px solid var(--border-color);
    cursor: pointer;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    background: var(--bg-secondary);
    color: var(--text-primary);
}
.hamburger-btn:hover {
    background: var(--border-color);
}
.hamburger-icon {
    font-size: 20px;
    line-height: 1;
}

/* Backdrop */
.sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 99; /* Just below sidebar (100) */
}

@media (max-width: 1024px) {
    .sidebar {
        width: 80px;
        padding: 30px 10px;
    }
    .logo span, nav ul li a span:not(.nav-icon), .u-info {
        display: none;
    }
    .user-pill {
        padding: 10px;
        justify-content: center;
    }
    .main-content {
        margin-left: 80px;
    }
}

@media (max-width: 768px) {
    .hamburger-btn {
        display: flex;
    }
    
    .sidebar {
        width: 280px;
        position: fixed;
        left: 0;
        top: 0;
        height: 100%;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.1);
    }
    
    .sidebar.mobile-open {
        transform: translateX(0);
    }
    
    .sidebar.mobile-open .logo span, 
    .sidebar.mobile-open nav ul li a span:not(.nav-icon), 
    .sidebar.mobile-open .u-info {
        display: block !important;
    }
    
    .sidebar.mobile-open .user-pill {
        padding: 15px !important;
        justify-content: flex-start !important;
    }
    
    .main-content {
        margin-left: 0;
    }
    
    .glass-header {
        padding: 15px 20px;
        gap: 15px;
    }
    
    .glass-header h2 {
        font-size: 18px;
        flex: 1;
        text-align: left;
    }
    
    .page-content {
        padding: 20px;
    }

    .global-search-container {
        display: none;
    }
}

/* Global Search Styles */
.global-search-container {
    position: relative;
    flex: 1;
    max-width: 400px;
    z-index: 50;
}
.global-search-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}
.search-icon-gs {
    position: absolute;
    left: 12px;
    font-size: 14px;
    pointer-events: none;
    opacity: 0.5;
}
.global-search-input {
    width: 100%;
    padding: 9px 36px 9px 36px;
    border-radius: 10px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    background: var(--glass-bg, rgba(255,255,255,0.05));
    color: var(--text-primary, #e2e8f0);
    font-size: 13px;
    outline: none;
    transition: border-color 0.3s, box-shadow 0.3s;
}
.global-search-input:focus {
    border-color: var(--accent-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}
.global-search-input::placeholder {
    color: var(--text-secondary, #94a3b8);
    font-size: 12px;
}
.search-clear {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: var(--text-secondary, #94a3b8);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
}
.search-results-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 6px;
    background: var(--bg-secondary, #1e293b);
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    border-radius: 12px;
    max-height: 380px;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    z-index: 200;
}
.search-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 49;
}
.search-loading, .search-empty {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary, #94a3b8);
    font-size: 13px;
}
.search-category {
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));
}
.search-category:last-child { border-bottom: none; }
.search-category h5 {
    margin: 0;
    padding: 6px 16px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-secondary, #94a3b8);
}
.search-result-item {
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.search-result-item:hover {
    background: rgba(99,102,241,0.08);
}
.sr-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #e2e8f0);
}
.sr-detail {
    font-size: 11px;
    color: var(--text-secondary, #94a3b8);
}
</style>
