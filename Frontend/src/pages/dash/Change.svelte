<script>
    import { onMount } from 'svelte';
    import { push } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import { fade } from 'svelte/transition';
    import { apiFetch, getToken } from '../../api.js';

    let profile = {
        name: 'User',
        email: '',
        phone: '',
        linkedin: '',
        portfolio: ''
    };

    let passwordData = {
        current: '',
        new: '',
        confirm: ''
    };

    let preferences = {
        emailNotifications: true,
        aiAnalysisAlerts: true,
        darkMode: localStorage.getItem('theme') === 'dark'
    };

    onMount(async () => {
        if (!getToken()) {
            push('/auth/login');
            return;
        }

        profile = {
            name: localStorage.getItem('name') || 'User',
            email: localStorage.getItem('email') || '',
            phone: '',
            linkedin: '',
            portfolio: ''
        };

        try {
            const res = await apiFetch('/api/candidate/profile_status');
            const data = await res.json();
            if (data.success) {
                profile.phone = data.data.phone || '';
                profile.linkedin = data.data.linkedin || '';
                profile.portfolio = data.data.portfolio || '';
            }
        } catch (err) {
            console.error(err);
        }
    });

    async function saveProfile() {
        try {
            const res = await apiFetch('/api/auth/update_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: profile.name, 
                    email: profile.email,
                    phone: profile.phone,
                    linkedin: profile.linkedin,
                    portfolio: profile.portfolio
                })
            });
            const result = await res.json();
            if (result.success) {
                localStorage.setItem('name', profile.name);
                localStorage.setItem('email', profile.email);
                notify("Profile updated successfully", "success");
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                notify(result.message || "Failed to update profile", "error");
            }
        } catch (err) {
            notify("Connection error", "error");
        }
    }

    async function changePassword() {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            notify("All password fields are required", "error");
            return;
        }

        if (passwordData.new !== passwordData.confirm) {
            notify("Passwords do not match", "error");
            return;
        }

        try {
            const res = await apiFetch('/api/auth/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: passwordData.current,
                    new_password: passwordData.new,
                    confirm_password: passwordData.confirm
                })
            });

            const result = await res.json();
            if (result.success) {
                notify("Password changed securely", "success");
                passwordData = { current: '', new: '', confirm: '' };
                return;
            }

            notify(result.message || 'Failed to update password', 'error');
        } catch (error) {
            console.error('Change password error:', error);
            notify('An error occurred while changing password', 'error');
        }
    }

    function toggleDarkMode() {
        preferences.darkMode = !preferences.darkMode;
        const theme = preferences.darkMode ? 'dark' : 'light';
        document.body.classList.toggle('dark', preferences.darkMode);
        localStorage.setItem('theme', theme);
        notify(`Switched to ${theme} mode`, "info");
    }
</script>

<div class="settings-page" in:fade>
    <div class="settings-grid">
        <!-- Profile Section -->
        <div class="settings-card glass">
            <h3>👤 Profile Settings</h3>
            <p class="section-desc">Manage your public identity and contact details.</p>
            
            <div class="profile-preview">
                <div class="p-avatar">{profile.name?.[0]?.toUpperCase() || 'U'}</div>
                <div>
                    <h4>{profile.name}</h4>
                    <p>{profile.email}</p>
                </div>
            </div>

            <div class="form-group">
                <label for="profileName">Full Name</label>
                <input id="profileName" type="text" bind:value={profile.name} placeholder="Your Name" />
            </div>
            <div class="form-group">
                <label for="profileEmail">Email Address</label>
                <input id="profileEmail" type="email" bind:value={profile.email} placeholder="Email" />
            </div>
            <div class="form-group">
                <label for="profilePhone">Phone Number</label>
                <input id="profilePhone" type="text" bind:value={profile.phone} placeholder="+923135100014" />
            </div>
            <div class="form-group">
                <label for="profileLinkedin">LinkedIn Profile Link</label>
                <input id="profileLinkedin" type="url" bind:value={profile.linkedin} placeholder="https://linkedin.com/in/username" />
            </div>
            <div class="form-group">
                <label for="profilePortfolio">Portfolio Website Link</label>
                <input id="profilePortfolio" type="url" bind:value={profile.portfolio} placeholder="https://myportfolio.com" />
            </div>
            <button class="primary-btn" on:click={saveProfile}>Save Changes</button>
        </div>

        <!-- Security Section -->
        <div class="settings-card glass">
            <h3>🔒 Security</h3>
            <p class="section-desc">Update your password and secure your account.</p>

            <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <input id="currentPassword" type="password" bind:value={passwordData.current} placeholder="••••••••" />
            </div>
            <div class="form-group">
                <label for="newPassword">New Password</label>
                <input id="newPassword" type="password" bind:value={passwordData.new} placeholder="New Password" />
            </div>
            <div class="form-group">
                <label for="confirmNewPassword">Confirm Password</label>
                <input id="confirmNewPassword" type="password" bind:value={passwordData.confirm} placeholder="Confirm New Password" />
            </div>
            <button class="secondary-btn" on:click={changePassword}>Update Password</button>
        </div>

        <!-- Preferences Section -->
        <div class="settings-card glass">
            <h3>⚙️ Preferences</h3>
            <p class="section-desc">Customize your dashboard experience.</p>

            <div class="toggle-group">
                <div class="toggle-item">
                    <div>
                        <p class="t-label">Email Notifications</p>
                        <p class="t-desc">Get weekly summaries of your matches.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" bind:checked={preferences.emailNotifications}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="toggle-item">
                    <div>
                        <p class="t-label">AI Analysis Alerts</p>
                        <p class="t-desc">Notify when a high-match candidate is found.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" bind:checked={preferences.aiAnalysisAlerts}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="toggle-item">
                    <div>
                        <p class="t-label">Dark Interface</p>
                        <p class="t-desc">Easier on your eyes in low light.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" checked={preferences.darkMode} on:change={toggleDarkMode}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-card glass danger">
            <h3>⚠️ Danger Zone</h3>
            <p class="section-desc">Irreversible account actions.</p>
            <div class="danger-actions">
                <button class="outline-btn" on:click={() => push('/auth/logout')}>Logout from session</button>
                <button class="delete-btn" on:click={() => notify("Account deletion is restricted for this demo", "info")}>Delete My Account</button>
            </div>
        </div>
    </div>
</div>

<style>
    .settings-page {
        max-width: 1200px;
    }

    .settings-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 30px;
    }

    .settings-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 24px;
        padding: 30px;
        box-shadow: var(--shadow);
    }

    .settings-card h3 {
        font-size: 18px;
        margin-bottom: 8px;
    }

    .section-desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 24px;
    }

    .profile-preview {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 20px;
        background: var(--bg-primary);
        border-radius: 16px;
        margin-bottom: 24px;
        border: 1px solid var(--border-color);
    }

    .p-avatar {
        width: 50px;
        height: 50px;
        background: var(--accent-primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 800;
    }

    .profile-preview h4 { margin: 0; }
    .profile-preview p { margin: 4px 0 0 0; font-size: 12px; color: var(--text-secondary); }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 8px;
        color: var(--text-secondary);
        text-transform: uppercase;
    }

    input {
        width: 100%;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 14px;
        transition: var(--transition);
    }

    input:focus {
        outline: none;
        border-color: var(--accent-primary);
    }

    .primary-btn {
        width: 100%;
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    .secondary-btn {
        width: 100%;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 14px;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    /* Toggle Switches */
    .toggle-group {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .toggle-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .t-label {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
    }

    .t-desc {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 4px 0 0 0;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
    }

    .switch input { opacity: 0; width: 0; height: 0; }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: var(--border-color);
        transition: .4s;
        border-radius: 34px;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 18px; width: 18px;
        left: 3px; bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    input:checked + .slider { background-color: var(--accent-primary); }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Danger zone */
    .danger { border-color: #fee2e2; }
    .danger-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .outline-btn {
        background: none;
        border: 1px solid var(--border-color);
        padding: 12px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        color: var(--text-primary);
    }

    .delete-btn {
        background: #fee2e2;
        color: #ef4444;
        border: none;
        padding: 12px;
        border-radius: 10px;
        font-weight: 700;
        cursor: pointer;
    }
</style>
