<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import { fade } from 'svelte/transition';
    import { withApiBase } from '../../api.js';

    let email = '';
    let password = '';
    let role = 'candidate';
    let loading = false;

    async function login() {
        if (loading) return;
        loading = true;
        try {
            const response = await fetch(withApiBase('/api/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, role }),
            });

            const { data, message } = await response.json();
            
            if(response.status === 200) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('name', data.name);
                localStorage.setItem('email', data.email);
                notify(`Welcome back, ${data.name}! Logged in as ${data.role}`, 'success');
                replace('/dash/manage');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            notify('An error occurred during login', 'error');
        } finally {
            loading = false;
        }
    }
</script>

<div class="auth-wrapper" in:fade>
    <div class="auth-container">
        <div class="auth-form-section">
            <div class="auth-header">
                <h2>Welcome Back</h2>
                <p>Sign in to access your dashboard</p>
            </div>

            <!-- Role Selector -->
            <div class="role-toggle">
                <button 
                    class="role-btn" 
                    class:active={role === 'candidate'} 
                    on:click={() => role = 'candidate'}
                >
                    👤 Candidate
                </button>
                <button 
                    class="role-btn" 
                    class:active={role === 'recruiter'} 
                    on:click={() => role = 'recruiter'}
                >
                    🏢 Recruiter
                </button>
            </div>

            <form on:submit|preventDefault={login}>
                <div class="input-group">
                    <label for="email">Email Address</label>
                    <input 
                        type="email" 
                        id="email"
                        bind:value={email} 
                        placeholder="e.g. bilal@example.com" 
                        required 
                    />
                </div>
                
                <div class="input-group">
                    <label for="password">Password</label>
                    <input 
                        type="password" 
                        id="password"
                        bind:value={password} 
                        placeholder="••••••••" 
                        required 
                    />
                </div>

                <button type="submit" class="submit-btn" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div class="extra-links">
                <p>Don't have an account? <a href="/#/auth/signup">Create Account</a></p>
                <a href="/#/auth/forgot" style="display: block; margin-top: 15px; font-weight: 500; font-size: 13px;">Forgot Password?</a>
            </div>
        </div>

        <div class="auth-image-section">
            <img src="/imgs/front.png" alt="Login Graphic">
            <h3>Enterprise-Grade AI Ranking</h3>
            <p style="opacity: 0.8; margin-top: 10px; font-size: 14px;">Join thousands of recruiters finding the best talent in seconds with TalentScanAI.</p>
        </div>
    </div>
</div>
