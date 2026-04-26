<script>
    import './SharedAuthStyles.css';
    import { replace } from 'svelte-spa-router';
    import { notify } from '../../notificationStore.js';
    import { fade } from 'svelte/transition';
    
    let name = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let role = 'candidate';

    async function signup(event) {
        event.preventDefault();
        
        if (password !== confirmPassword) {
            notify("Passwords don't match!", "error");
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:3000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, role }),
            });

            const { message } = await response.json();
            
            if(response.status === 201) {
                notify(`Success! Registered as ${role.toUpperCase()}`, 'success');
                replace('/auth/login');
            } else {
                notify(message, 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            notify('An error occurred during signup', 'error');
        }
    }
</script>

<div class="auth-wrapper" in:fade>
    <div class="auth-container">
        <div class="auth-form-section">
            <div class="auth-header">
                <h2>Create Account</h2>
                <p>Join the future of AI-powered recruitment</p>
            </div>

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

            <form on:submit={signup}>
                <div class="input-group">
                    <label>Full Name</label>
                    <input type="text" bind:value={name} placeholder="e.g. Bilal Tariq" required>
                </div>
                
                <div class="input-group">
                    <label>Email Address</label>
                    <input type="email" bind:value={email} placeholder="email@example.com" required>
                </div>

                <div class="input-group">
                    <label>Password</label>
                    <input type="password" bind:value={password} placeholder="Create a strong password" required>
                </div>

                <div class="input-group">
                    <label>Confirm Password</label>
                    <input type="password" bind:value={confirmPassword} placeholder="Repeat password" required>
                </div>

                <button type="submit" class="submit-btn">Get Started</button>
            </form>

            <div class="extra-links">
                <p>Already have an account? <a href="/#/auth/login">Sign In</a></p>
            </div>
        </div>

        <div class="auth-image-section">
            <img src="imgs/front.png" alt="Signup Illustration">
            <h3>Start Your Journey</h3>
            <p style="opacity: 0.8; margin-top: 10px; font-size: 14px;">Whether you're hiring or seeking, our AI ensures the perfect match every single time.</p>
        </div>
    </div>
</div>
