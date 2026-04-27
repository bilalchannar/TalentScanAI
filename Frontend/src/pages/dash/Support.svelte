<script>
    import { notify } from '../../notificationStore.js';
    import { apiFetch } from '../../api.js';
    import { fade, slide } from 'svelte/transition';

    let contactForm = {
        subject: 'General Inquiry',
        message: ''
    };

    let faqs = [
        { 
            q: "How does the AI Match Score work?", 
            a: "Our engine uses NLP (Natural Language Processing) and Cosine Similarity to compare your Job Description against candidate resumes. It specifically weights technical skills and experience levels for higher accuracy.",
            open: false 
        },
        { 
            q: "Can I upload multiple resumes at once?", 
            a: "Yes! You can drag and drop multiple PDF files into the 'Manage Resumes' section to process your entire candidate pool in seconds.",
            open: false 
        },
        { 
            q: "What file formats are supported?", 
            a: "Currently, we support PDF files as they are the industry standard for professional resumes. Support for DOCX is coming soon.",
            open: false 
        }
    ];

    function toggleFaq(index) {
        faqs[index].open = !faqs[index].open;
        faqs = faqs;
    }

    async function handleSubmit() {
        if (!contactForm.message) {
            notify("Please enter a message", "info");
            return;
        }
        
        try {
            const res = await apiFetch('/api/support/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactForm)
            });
            const result = await res.json();
            if (result.success) {
                notify("Support ticket created! We'll get back to you shortly.", "success");
                contactForm.message = '';
            } else {
                notify(result.message || "Failed to create ticket", "error");
            }
        } catch (err) {
            notify("Connection error", "error");
        }
    }
</script>

<div class="support-page" in:fade>
    <div class="support-grid">
        <!-- Contact Section -->
        <div class="support-card glass">
            <div class="card-header">
                <span class="icon">✉️</span>
                <div>
                    <h3>Contact Support</h3>
                    <p>Have a specific issue? Send us a message.</p>
                </div>
            </div>

            <form on:submit|preventDefault={handleSubmit}>
                <div class="form-group">
                    <label for="subject">Inquiry Type</label>
                    <select id="subject" bind:value={contactForm.subject}>
                        <option>General Inquiry</option>
                        <option>Technical Issue</option>
                        <option>Billing Question</option>
                        <option>Feature Request</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="message">Message</label>
                    <textarea id="message" bind:value={contactForm.message} placeholder="Tell us what's on your mind..."></textarea>
                </div>

                <button type="submit" class="primary-btn">Send Message</button>
            </form>

            <div class="quick-links">
                <div class="link-item">
                    <span class="l-icon">📞</span>
                    <div>
                        <p class="l-label">Support Line</p>
                        <p class="l-val">+1 (555) 123-4567</p>
                    </div>
                </div>
                <div class="link-item">
                    <span class="l-icon">🌐</span>
                    <div>
                        <p class="l-label">Community</p>
                        <p class="l-val">Join our Discord</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- FAQ Section -->
        <div class="support-card glass">
            <div class="card-header">
                <span class="icon">❓</span>
                <div>
                    <h3>Frequently Asked Questions</h3>
                    <p>Quick answers to common questions.</p>
                </div>
            </div>

            <div class="faq-list">
                {#each faqs as faq, i}
                    <div class="faq-item" class:active={faq.open}>
                        <button class="faq-trigger" on:click={() => toggleFaq(i)}>
                            <span>{faq.q}</span>
                            <span class="arrow">{faq.open ? '−' : '+'}</span>
                        </button>
                        {#if faq.open}
                            <div class="faq-answer" transition:slide>
                                <p>{faq.a}</p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <div class="doc-card">
                <h4>Looking for documentation?</h4>
                <p>Read our full API and implementation guides to get the most out of TalentScanAI.</p>
                <button class="outline-btn">Read Docs</button>
            </div>
        </div>
    </div>
</div>

<style>
    .support-page {
        max-width: 1100px;
    }

    .support-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 30px;
    }

    .support-card {
        padding: 40px;
        border-radius: 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow);
        display: flex;
        flex-direction: column;
        gap: 30px;
    }

    .card-header {
        display: flex;
        gap: 20px;
        align-items: center;
    }

    .icon {
        width: 54px;
        height: 54px;
        background: var(--bg-primary);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border: 1px solid var(--border-color);
    }

    .card-header h3 {
        font-size: 20px;
        margin: 0;
    }

    .card-header p {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 4px 0 0 0;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-secondary);
    }

    select, textarea {
        width: 100%;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: inherit;
        font-size: 14px;
        transition: var(--transition);
    }

    textarea {
        min-height: 120px;
        resize: vertical;
    }

    select:focus, textarea:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
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
        transition: var(--transition);
    }

    .primary-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
    }

    .quick-links {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
    }

    .link-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .l-icon {
        font-size: 20px;
    }

    .l-label {
        font-size: 11px;
        color: var(--text-secondary);
        margin: 0;
        font-weight: 600;
        text-transform: uppercase;
    }

    .l-val {
        font-size: 13px;
        font-weight: 700;
        margin: 2px 0 0 0;
    }

    /* FAQ Styles */
    .faq-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .faq-item {
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        transition: var(--transition);
    }

    .faq-item.active {
        background: var(--bg-primary);
        border-color: var(--accent-primary);
    }

    .faq-trigger {
        width: 100%;
        padding: 16px 20px;
        background: none;
        border: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-weight: 600;
        color: var(--text-primary);
        font-size: 14px;
        text-align: left;
    }

    .faq-answer {
        padding: 0 20px 20px 20px;
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.6;
    }

    .doc-card {
        margin-top: auto;
        padding: 24px;
        background: linear-gradient(135deg, var(--accent-primary), #818cf8);
        border-radius: 16px;
        color: white;
    }

    .doc-card h4 { margin: 0; }
    .doc-card p {
        font-size: 13px;
        opacity: 0.9;
        margin: 10px 0 20px 0;
    }

    .outline-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        backdrop-filter: blur(5px);
    }

    @media (max-width: 640px) {
        .support-grid { grid-template-columns: 1fr; }
    }
</style>
