<script>
    import { onMount } from 'svelte';
    import { apiFetch } from '../../api.js';
    import { notify } from '../../notificationStore.js';
    import { fade, fly } from 'svelte/transition';

    let activeTab = 'users';
    let loading = true;
    let userRole = localStorage.getItem('role') || 'candidate';

    // User Management
    let users = [];
    let userSearch = '';
    let editingUser = null;
    let editRole = '';
    let editStatus = '';
    let saving = false;

    // Audit Logs
    let auditLogs = [];
    let logSearch = '';
    let logActionFilter = '';
    let logPage = 1;
    let logTotal = 0;
    let logTotalPages = 1;
    let logLoading = false;

    onMount(async () => {
        await fetchUsers();
        loading = false;
    });

    async function fetchUsers() {
        try {
            const params = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';
            const res = await apiFetch(`/api/admin/users${params}`);
            const data = await res.json();
            if (data.success) {
                users = data.data || [];
            } else {
                notify(data.message || 'Failed to load users', 'error');
            }
        } catch (err) {
            notify('Failed to load users', 'error');
        }
    }

    async function fetchAuditLogs() {
        logLoading = true;
        try {
            let params = `?page=${logPage}&limit=30`;
            if (logSearch) params += `&search=${encodeURIComponent(logSearch)}`;
            if (logActionFilter) params += `&action=${encodeURIComponent(logActionFilter)}`;
            const res = await apiFetch(`/api/admin/audit_logs${params}`);
            const data = await res.json();
            if (data.success) {
                auditLogs = data.data.logs || [];
                logTotal = data.data.total || 0;
                logTotalPages = data.data.total_pages || 1;
            }
        } catch (err) {
            notify('Failed to load audit logs', 'error');
        }
        logLoading = false;
    }

    function startEdit(user) {
        editingUser = user._id;
        editRole = user.role;
        editStatus = user.status;
    }

    function cancelEdit() {
        editingUser = null;
        editRole = '';
        editStatus = '';
    }

    async function saveUser(user) {
        saving = true;
        try {
            const body = { user_id: user._id };
            if (editRole !== user.role) body.role = editRole;
            if (editStatus !== user.status) body.status = editStatus;

            if (!body.role && !body.status) {
                notify('No changes made', 'info');
                cancelEdit();
                saving = false;
                return;
            }

            const res = await apiFetch('/api/admin/users/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                notify('User updated successfully', 'success');
                cancelEdit();
                await fetchUsers();
            } else {
                notify(data.message || 'Failed to update user', 'error');
            }
        } catch (err) {
            notify('Failed to update user', 'error');
        }
        saving = false;
    }

    function switchTab(tab) {
        activeTab = tab;
        if (tab === 'logs' && auditLogs.length === 0) {
            fetchAuditLogs();
        }
    }

    function searchUsers() {
        fetchUsers();
    }

    function searchLogs() {
        logPage = 1;
        fetchAuditLogs();
    }

    function prevLogPage() {
        if (logPage > 1) { logPage--; fetchAuditLogs(); }
    }
    function nextLogPage() {
        if (logPage < logTotalPages) { logPage++; fetchAuditLogs(); }
    }

    function getStatusColor(status) {
        if (status === 'active') return '#22c55e';
        if (status === 'blocked') return '#ef4444';
        if (status === 'pending') return '#f59e0b';
        return '#94a3b8';
    }

    function getRoleBadge(role) {
        if (role === 'super_admin') return '👑';
        if (role === 'admin') return '🛡️';
        if (role === 'recruiter') return '🏢';
        return '👤';
    }

    function getActionIcon(action) {
        if (action.includes('login')) return '🔐';
        if (action.includes('resume')) return '📄';
        if (action.includes('job')) return '💼';
        if (action.includes('application')) return '📨';
        if (action.includes('password')) return '🔑';
        if (action.includes('blocked')) return '🚫';
        if (action.includes('unblocked')) return '✅';
        if (action.includes('role')) return '🏷️';
        return '📋';
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    }
</script>

<div class="admin-container" in:fade>
    <!-- Tab Header -->
    <div class="tab-bar">
        <button class="tab-btn" class:active={activeTab === 'users'} on:click={() => switchTab('users')}>
            🛡️ User Management
        </button>
        <button class="tab-btn" class:active={activeTab === 'logs'} on:click={() => switchTab('logs')}>
            📋 Audit Logs
        </button>
    </div>

    {#if loading}
        <div class="skeleton-grid">
            {#each Array(6) as _}
                <div class="skeleton-row"><div class="skel-line"></div><div class="skel-line short"></div></div>
            {/each}
        </div>
    {:else if activeTab === 'users'}
        <!-- User Management Tab -->
        <div class="panel" in:fly={{ y: 20, duration: 300 }}>
            <div class="panel-header">
                <h3>All Registered Users <span class="count-badge">{users.length}</span></h3>
                <div class="search-bar">
                    <input type="text" bind:value={userSearch} placeholder="Search by name, email, or role..." on:keydown={(e) => e.key === 'Enter' && searchUsers()} />
                    <button on:click={searchUsers}>🔍</button>
                </div>
            </div>

            {#if users.length === 0}
                <div class="empty-state">
                    <span class="empty-icon">👥</span>
                    <p>No users found</p>
                </div>
            {:else}
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each users as user}
                                <tr class:editing={editingUser === user._id}>
                                    <td>
                                        <div class="user-cell">
                                            <span class="avatar">{user.name ? user.name[0].toUpperCase() : '?'}</span>
                                            <span>{user.name || 'Unnamed'}</span>
                                        </div>
                                    </td>
                                    <td><span class="email-text">{user.email}</span></td>
                                    <td>
                                        {#if editingUser === user._id}
                                            <select bind:value={editRole} class="inline-select">
                                                <option value="candidate">Candidate</option>
                                                <option value="recruiter">Recruiter</option>
                                                {#if userRole === 'super_admin'}
                                                    <option value="admin">Admin</option>
                                                    <option value="super_admin">Super Admin</option>
                                                {/if}
                                            </select>
                                        {:else}
                                            <span class="role-badge">{getRoleBadge(user.role)} {user.role}</span>
                                        {/if}
                                    </td>
                                    <td>
                                        {#if editingUser === user._id}
                                            <select bind:value={editStatus} class="inline-select">
                                                <option value="active">Active</option>
                                                <option value="blocked">Blocked</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        {:else}
                                            <span class="status-dot" style="background: {getStatusColor(user.status)}"></span>
                                            <span class="status-label">{user.status}</span>
                                        {/if}
                                    </td>
                                    <td><span class="date-text">{formatDate(user.created_at)}</span></td>
                                    <td>
                                        {#if editingUser === user._id}
                                            <button class="btn-save" on:click={() => saveUser(user)} disabled={saving}>
                                                {saving ? '...' : '💾'}
                                            </button>
                                            <button class="btn-cancel" on:click={cancelEdit}>✕</button>
                                        {:else}
                                            <button class="btn-edit" on:click={() => startEdit(user)}>✏️</button>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>

    {:else if activeTab === 'logs'}
        <!-- Audit Logs Tab -->
        <div class="panel" in:fly={{ y: 20, duration: 300 }}>
            <div class="panel-header">
                <h3>Security Audit Logs <span class="count-badge">{logTotal}</span></h3>
                <div class="search-bar log-search">
                    <input type="text" bind:value={logSearch} placeholder="Search by user or action..." on:keydown={(e) => e.key === 'Enter' && searchLogs()} />
                    <select bind:value={logActionFilter} on:change={searchLogs}>
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="resume uploaded">Resume Upload</option>
                        <option value="job created">Job Created</option>
                        <option value="job status changed">Job Status Changed</option>
                        <option value="application status changed">Application Status</option>
                        <option value="password">Password</option>
                        <option value="user blocked">User Blocked</option>
                        <option value="user role changed">Role Changed</option>
                    </select>
                    <button on:click={searchLogs}>🔍</button>
                </div>
            </div>

            {#if logLoading}
                <div class="skeleton-grid">
                    {#each Array(8) as _}
                        <div class="skeleton-row"><div class="skel-line"></div><div class="skel-line short"></div></div>
                    {/each}
                </div>
            {:else if auditLogs.length === 0}
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>No audit logs found</p>
                </div>
            {:else}
                <div class="log-list">
                    {#each auditLogs as log}
                        <div class="log-entry" in:fade>
                            <span class="log-icon">{getActionIcon(log.action)}</span>
                            <div class="log-content">
                                <span class="log-action">{log.action}</span>
                                <span class="log-user">{log.email || 'anonymous'}</span>
                                {#if log.target_type}
                                    <span class="log-target">{log.target_type} → {log.target_id || ''}</span>
                                {/if}
                                {#if log.metadata && Object.keys(log.metadata).length > 0}
                                    <span class="log-meta">{JSON.stringify(log.metadata).slice(0, 120)}</span>
                                {/if}
                            </div>
                            <span class="log-time">{formatDate(log.timestamp)}</span>
                        </div>
                    {/each}
                </div>

                <!-- Pagination -->
                <div class="pagination">
                    <button on:click={prevLogPage} disabled={logPage <= 1}>← Prev</button>
                    <span>Page {logPage} / {logTotalPages}</span>
                    <button on:click={nextLogPage} disabled={logPage >= logTotalPages}>Next →</button>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .admin-container { padding: 0; max-width: 1200px; margin: 0 auto; }
    .tab-bar { display: flex; gap: 0; margin-bottom: 24px; background: var(--glass-bg, rgba(255,255,255,0.06)); border-radius: 14px; overflow: hidden; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); }
    .tab-btn { flex: 1; padding: 14px 20px; background: none; border: none; color: var(--text-secondary, #94a3b8); font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s ease; letter-spacing: 0.3px; }
    .tab-btn.active { background: linear-gradient(135deg, var(--accent-primary, #6366f1), var(--accent-secondary, #8b5cf6)); color: #fff; }
    .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.04); }

    .panel { background: var(--glass-bg, rgba(255,255,255,0.04)); border-radius: 16px; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); overflow: hidden; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.06)); flex-wrap: wrap; gap: 12px; }
    .panel-header h3 { margin: 0; font-size: 18px; color: var(--text-primary, #e2e8f0); display: flex; align-items: center; gap: 10px; }
    .count-badge { background: var(--accent-primary, #6366f1); color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }

    .search-bar { display: flex; gap: 8px; align-items: center; }
    .search-bar input { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.12)); background: var(--input-bg, rgba(0,0,0,0.2)); color: var(--text-primary, #e2e8f0); font-size: 13px; width: 220px; }
    .search-bar select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.12)); background: var(--input-bg, rgba(0,0,0,0.2)); color: var(--text-primary, #e2e8f0); font-size: 12px; }
    .search-bar button { padding: 8px 14px; border: none; border-radius: 8px; background: var(--accent-primary, #6366f1); color: #fff; cursor: pointer; font-size: 14px; }
    .log-search { flex-wrap: wrap; }

    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary, #94a3b8); border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.06)); }
    tbody td { padding: 12px 16px; font-size: 13px; color: var(--text-primary, #e2e8f0); border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.03)); }
    tbody tr { transition: background 0.2s; }
    tbody tr:hover { background: rgba(99,102,241,0.04); }
    tbody tr.editing { background: rgba(99,102,241,0.08); }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0; }
    .email-text { color: var(--text-secondary, #94a3b8); font-size: 12px; }
    .date-text { color: var(--text-secondary, #94a3b8); font-size: 12px; }
    .role-badge { font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .status-label { font-size: 12px; text-transform: capitalize; }

    .inline-select { padding: 4px 8px; border-radius: 6px; border: 1px solid var(--accent-primary, #6366f1); background: var(--input-bg, rgba(0,0,0,0.3)); color: var(--text-primary, #e2e8f0); font-size: 12px; }

    .btn-edit, .btn-save, .btn-cancel { border: none; background: none; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; }
    .btn-edit:hover { background: rgba(99,102,241,0.15); }
    .btn-save { color: #22c55e; }
    .btn-save:hover { background: rgba(34,197,94,0.15); }
    .btn-cancel { color: #ef4444; font-size: 14px; }
    .btn-cancel:hover { background: rgba(239,68,68,0.15); }

    .log-list { padding: 0; }
    .log-entry { display: flex; align-items: flex-start; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.04)); transition: background 0.2s; }
    .log-entry:hover { background: rgba(99,102,241,0.03); }
    .log-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    .log-content { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .log-action { font-weight: 600; font-size: 13px; color: var(--text-primary, #e2e8f0); text-transform: capitalize; }
    .log-user { font-size: 12px; color: var(--accent-primary, #6366f1); }
    .log-target { font-size: 11px; color: var(--text-secondary, #94a3b8); }
    .log-meta { font-size: 11px; color: var(--text-secondary, #64748b); font-family: monospace; word-break: break-all; opacity: 0.7; }
    .log-time { font-size: 11px; color: var(--text-secondary, #94a3b8); white-space: nowrap; flex-shrink: 0; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px; }
    .pagination button { padding: 6px 16px; border: 1px solid var(--border-color, rgba(255,255,255,0.12)); border-radius: 8px; background: var(--glass-bg, rgba(255,255,255,0.04)); color: var(--text-primary, #e2e8f0); cursor: pointer; font-size: 13px; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { font-size: 13px; color: var(--text-secondary, #94a3b8); }

    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { color: var(--text-secondary, #94a3b8); font-size: 15px; }

    .skeleton-grid { padding: 20px; }
    .skeleton-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .skel-line { height: 16px; border-radius: 8px; background: var(--border-color, rgba(255,255,255,0.08)); animation: pulse 1.5s ease-in-out infinite; flex: 1; }
    .skel-line.short { max-width: 120px; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

    @media (max-width: 768px) {
        .panel-header { flex-direction: column; align-items: stretch; }
        .search-bar { width: 100%; }
        .search-bar input { width: 100%; flex: 1; }
        .tab-btn { font-size: 12px; padding: 10px 12px; }
        table { font-size: 12px; }
        thead th, tbody td { padding: 8px 10px; }
    }
</style>
