<script>
    import Router, { location, replace } from 'svelte-spa-router';
    import ThemeToggle from '../../components/ThemeToggle.svelte';
    import { onMount } from 'svelte';
    import { getToken } from '../../api.js';

    import Change from "./Change.svelte";
	import Education from "./Education.svelte";
	import Manage from "./Manage.svelte";
	import Rank from "./Rank.svelte";
	import Support from "./Support.svelte";
	import Stats from "./Stats.svelte";
    import Reasoning from "./Reasoning.svelte";
    import PostJob from "./PostJob.svelte";
    import JobFeed from "./JobFeed.svelte";
    import Applications from "./Applications.svelte";

    let userRole = 'candidate';
    let userName = 'User';
    let userEmail = '';

    onMount(() => {
        if (!getToken()) {
            replace('/auth/login');
            return;
        }

        userRole = localStorage.getItem('role') || 'candidate';
        userName = localStorage.getItem('name') || 'User';
        userEmail = localStorage.getItem('email') || '';
    });

	const routes = {
        '/dash/change': Change,
		'/dash/education': Education,
		'/dash/manage': Manage,
		'/dash/rank': Rank,
		'/dash/support': Support,
        '/dash/stats': Stats,
        '/dash/reasoning': Reasoning,
        '/dash/post-job': PostJob,
        '/dash/job-feed': JobFeed,
        '/dash/applications': Applications
    }

    $: isActive = (path) => $location === path;
</script>

<div class="container">
    <aside class="sidebar">
        <div class="top-section">
            <div class="logo">
                <div class="logo-icon">TS</div>
                <span>TalentScanAI</span>
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
                    {#if userRole === 'recruiter'}
                        <li>
                            <a href="/#/dash/manage" class:active={isActive('/dash/manage')}>
                                <span class="nav-icon">📁</span> Manage Resumes
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/post-job" class:active={isActive('/dash/post-job')}>
                                <span class="nav-icon">➕</span> Post Job
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/applications" class:active={isActive('/dash/applications')}>
                                <span class="nav-icon">📨</span> Applications
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/rank" class:active={isActive('/dash/rank')}>
                                <span class="nav-icon">📊</span> AI Ranking
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/stats" class:active={isActive('/dash/stats')}>
                                <span class="nav-icon">📈</span> Analytics
                            </a>
                        </li>
                    {:else}
                        <li>
                            <a href="/#/dash/manage" class:active={isActive('/dash/manage')}>
                                <span class="nav-icon">📄</span> My Profile
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/job-feed" class:active={isActive('/dash/job-feed')}>
                                <span class="nav-icon">💼</span> Find Jobs
                            </a>
                        </li>
                        <li>
                            <a href="/#/dash/applications" class:active={isActive('/dash/applications')}>
                                <span class="nav-icon">📤</span> My Applications
                            </a>
                        </li>
                    {/if}
                    
                    <li>
                        <a href="/#/dash/support" class:active={isActive('/dash/support')}>
                            <span class="nav-icon">🎧</span> Support
                        </a>
                    </li>
                    <li>
                        <a href="/#/dash/change" class:active={isActive('/dash/change')}>
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
            <a href="/#/auth/logout" class="logout-btn">
                <span class="nav-icon">🚪</span> Logout
            </a>
        </div>
    </aside>

    <main class="main-content">
        <div class="glass-header">
            <h2>
                {#if userRole === 'recruiter'}
                    {isActive('/dash/manage') ? 'Resume Management' : 
                     isActive('/dash/rank') ? 'AI Ranking Engine' : 
                     isActive('/dash/stats') ? 'Talent Analytics' : 
                     isActive('/dash/change') ? 'Account Settings' : 'Recruiter Dashboard'}
                {:else}
                    {isActive('/dash/manage') ? 'My Professional Profile' : 
                     isActive('/dash/job-feed') ? 'Discover Opportunities' : 
                     isActive('/dash/applications') ? 'Application History' : 
                     isActive('/dash/change') ? 'Account Settings' : 'Candidate Portal'}
                {/if}
            </h2>
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
}

.page-content {
    padding: 40px;
    max-width: 1200px;
}

@media (max-width: 1024px) {
    .sidebar {
        width: 80px;
        padding: 30px 10px;
    }
    .logo span, nav ul li a span:not(.nav-icon) {
        display: none;
    }
    .main-content {
        margin-left: 80px;
    }
}
</style>
