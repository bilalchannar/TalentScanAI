def get_base_template(title, body_content, button_text=None, button_url=None):
    btn_markup = ""
    if button_text and button_url:
        btn_markup = f"""
        <div style="text-align: center; margin: 30px 0;">
            <a href="{button_url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 14px;">{button_text}</a>
        </div>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; border-collapse: collapse;">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #4f46e5; padding: 30px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TalentScanAI</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px; line-height: 1.6; font-size: 15px; color: #1e293b;">
                                <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 20px;">{title}</h2>
                                {body_content}
                                {btn_markup}
                                <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    If you have any questions or need support, please contact us through the <a href="{button_url if button_url else '#'}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Help & Support</a> portal.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                                &copy; 2026 TalentScanAI. All rights reserved. Automated notification service.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_accept_email(cand_name, job_title, company, client_url):
    body = f"""
    <p>Dear {cand_name},</p>
    <p>Congratulations! We are pleased to inform you that your application for the <strong>{job_title}</strong> position at <strong>{company}</strong> has been accepted.</p>
    <p>The recruiting team will contact you shortly regarding the next steps in our onboarding or final process. In the meantime, you can track your status in your applications dashboard.</p>
    """
    return get_base_template("Application Accepted", body, "View Applications Feed", f"{client_url}/#/dash/applications")

def get_reject_email(cand_name, job_title, company, client_url):
    body = f"""
    <p>Dear {cand_name},</p>
    <p>Thank you for taking the time to apply for the <strong>{job_title}</strong> position at <strong>{company}</strong>.</p>
    <p>Our recruiting team has reviewed your qualifications and resume carefully. While we were impressed with your background, we have decided to move forward with other candidates whose profiles more closely match our current requirements.</p>
    <p>We appreciate your interest in joining our team and wish you the best of luck in your job search.</p>
    """
    return get_base_template("Application Update", body, "Find More Jobs", f"{client_url}/#/dash/job-feed")

def get_interview_email(cand_name, job_title, company, date, time, meeting_type, meeting_link, notes, client_url):
    link_section = f'<p style="margin: 0 0 8px 0;"><strong>Meeting Link:</strong> <a href="{meeting_link}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">{meeting_link}</a></p>' if meeting_link else ''
    notes_section = f'<div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin-top: 15px; font-style: italic; font-size: 14px; border-radius: 4px;">{notes}</div>' if notes else ''
    body = f"""
    <p>Dear {cand_name},</p>
    <p>You have been invited for an interview for the <strong>{job_title}</strong> position at <strong>{company}</strong>.</p>
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Date:</strong> {date}</p>
        <p style="margin: 0 0 8px 0;"><strong>Time:</strong> {time}</p>
        <p style="margin: 0 0 8px 0;"><strong>Type:</strong> {meeting_type}</p>
        {link_section}
    </div>
    <p><strong>Message from Recruiter:</strong></p>
    {notes_section}
    """
    return get_base_template("Interview Invitation", body, "View Application Progress", f"{client_url}/#/dash/applications")

def get_password_reset_email(cand_name, reset_url, client_url):
    body = f"""
    <p>Hello {cand_name},</p>
    <p>We received a request to reset the password for your TalentScanAI account. Click the button below to choose a new password. This link will expire in 1 hour.</p>
    <p>If you did not request this password reset, please ignore this email or contact support if you have security concerns.</p>
    """
    return get_base_template("Password Reset Request", body, "Reset Password", reset_url)

def get_support_email(cand_name, message, client_url):
    body = f"""
    <p>Hello {cand_name},</p>
    <p>Your account profile has been updated. If you did not make this change, please contact support immediately.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 15px; margin-top: 15px; border-radius: 4px;">
        <strong>Details:</strong> {message}
    </div>
    """
    return get_base_template("Profile Update Security Alert", body, "Go to Settings", f"{client_url}/#/dash/change")

def get_applied_email(cand_name, job_title, company, client_url):
    body = f"""
    <p>Dear {cand_name},</p>
    <p>Thank you for submitting your application for the <strong>{job_title}</strong> position at <strong>{company}</strong>.</p>
    <p>Your application has been received and is currently under review by the recruiting team. You can monitor the progress of your application in your candidate dashboard.</p>
    """
    return get_base_template("Application Received", body, "View Application Progress", f"{client_url}/#/dash/applications")
