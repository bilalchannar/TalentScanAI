import re
import jwt
import json
import os
import smtplib
import hashlib
from collections import Counter
from datetime import datetime, timedelta, timezone
from os import environ, urandom, makedirs
from functools import wraps
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_cors import CORS
from bson import ObjectId
from bson import json_util
from bson.errors import InvalidId
from uuid import uuid4
from pymongo import MongoClient
from flask import Flask, request, jsonify, send_from_directory, g
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import email_templates

# Load .env file if it exists (for local development)
load_dotenv()

################################################################################
# ------------------------------ Initialization ------------------------------ #
################################################################################

app = Flask(__name__)

cors_origins_env = environ.get("CORS_ALLOWED_ORIGINS", "")
if cors_origins_env:
    allowed_cors_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
else:
    allowed_cors_origins = [
        "http://127.0.0.1:5000",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ]

CORS(app, resources={r"/api/*": {"origins": allowed_cors_origins}})

JWT_SECRET_KEY = environ.get("JWT_SECRET_KEY") or urandom(32).hex()
JWT_EXP_MINUTES = max(5, int(environ.get("JWT_EXP_MINUTES", "120")))
RESET_TOKEN_EXP_MINUTES = max(5, int(environ.get("RESET_TOKEN_EXP_MINUTES", "15")))
ALLOW_PUBLIC_RECRUITER_SIGNUP = environ.get("ALLOW_PUBLIC_RECRUITER_SIGNUP", "false").lower() == "true"
EXPOSE_RESET_TOKEN = environ.get("EXPOSE_RESET_TOKEN", "false").lower() == "true"
FLASK_DEBUG_ENABLED = environ.get("FLASK_DEBUG", "false").lower() == "true"
ALLOWED_ROLES = {"candidate", "recruiter", "admin", "super_admin"}

# Email config for password reset (Gmail SMTP)
EMAIL_USER = environ.get("EMAIL_USER", "")
EMAIL_PASS = environ.get("EMAIL_PASS", "")
CLIENT_URL = environ.get("CLIENT_URL", "http://localhost:5000")
SMTP_HOST = environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(environ.get("SMTP_PORT", "465"))
EMAIL_SEND_ENABLED = bool(EMAIL_USER and EMAIL_PASS)

def send_email(to_email, subject, html_content, reply_to=None):
    if not EMAIL_SEND_ENABLED:
        print(f"INFO: Email sending disabled. Would have sent email to {to_email} with subject: {subject}")
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        if reply_to:
            msg.add_header('reply-to', reply_to)
            
        msg.attach(MIMEText(html_content, 'html'))
        
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
                smtp.login(EMAIL_USER, EMAIL_PASS)
                smtp.sendmail(EMAIL_USER, to_email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
                smtp.starttls()
                smtp.login(EMAIL_USER, EMAIL_PASS)
                smtp.sendmail(EMAIL_USER, to_email, msg.as_string())
        print(f"SUCCESS: Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}: {e}")
        return False

if not environ.get("JWT_SECRET_KEY"):
    print("WARNING: JWT_SECRET_KEY is not set. Tokens will be invalidated on server restart.")
if not EMAIL_SEND_ENABLED:
    print("INFO: EMAIL_USER/EMAIL_PASS not set. Password reset emails will not be sent. Set EXPOSE_RESET_TOKEN=true to see tokens in the API response during development.")

RESUMES_UPLOAD_FOLDER = 'static/resumes'
makedirs(RESUMES_UPLOAD_FOLDER, exist_ok=True)

db_name = environ.get("MONGO_DATABASE_NAME", "TalentScanAI")
db_url = environ.get("MONGO_CONNECTION_URL", "mongodb://127.0.0.1:27017")

db = MongoClient(db_url)[db_name]

def create_notification(user_email, title, message, notif_type):
    try:
        notification = {
            "user_email": user_email,
            "title": title,
            "message": message,
            "type": notif_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        db['notifications'].insert_one(notification)
        print(f"SUCCESS: Notification '{title}' created for {user_email}")
        return True
    except Exception as e:
        print(f"ERROR: Failed to create notification for {user_email}: {e}")
        return False

GLOBAL_TECH_KEYWORDS = {
    'python', 'javascript', 'svelte', 'react', 'node', 'flask', 'flutter', 'dart', 
    'mongodb', 'sql', 'firebase', 'docker', 'git', 'github', 'nlp', 'ai', 'ml', 
    'mern', 'mean', 'aws', 'azure', 'java', 'c++', 'c#', 'php', 'wordpress', 'seo', 'figma',
    'html', 'css', 'tailwind', 'bootstrap', 'vue', 'angular', 'express', 'mysql', 'postgresql',
    'redis', 'kubernetes', 'jenkins', 'tableau', 'power bi', 'excel', 'pandas', 'numpy',
    'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'spark', 'hadoop', 'rust', 'go', 'ruby'
}

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"ERROR: {e}")
    if FLASK_DEBUG_ENABLED:
        return response(500, str(e))
    return response(500, "Internal server error")

users_collection = db['users']
resumes_collection = db['resumes']
tokens_collection = db['reset_tokens']
jobs_collection = db['jobs']
applications_collection = db['applications']
audit_logs_collection = db['audit_logs']
rate_limits_collection = db['rate_limits']

def log_audit_action(user_id, action, target_type=None, target_id=None, metadata=None, email=None):
    try:
        user_id_str = str(user_id) if user_id else None
        if user_id and not email:
            u = users_collection.find_one({"_id": ObjectId(user_id)})
            if u:
                email = u.get("email")
        log_entry = {
            "user_id": user_id_str,
            "email": email,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc)
        }
        audit_logs_collection.insert_one(log_entry)
        print(f"AUDIT LOG: {action} by {email or 'anonymous'} (target: {target_type} {target_id})")
    except Exception as e:
        print(f"ERROR: Failed to write audit log: {e}")

def check_rate_limit(key, limit, period_seconds):
    try:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=period_seconds)
        rate_limits_collection.delete_many({"key": key, "timestamp": {"$lt": window_start}})
        count = rate_limits_collection.count_documents({"key": key})
        if count >= limit:
            oldest = rate_limits_collection.find_one({"key": key}, sort=[("timestamp", 1)])
            if oldest:
                time_elapsed = (now - oldest["timestamp"]).total_seconds()
                retry_after = int(max(1, period_seconds - time_elapsed))
            else:
                retry_after = period_seconds
            return False, count, retry_after
        rate_limits_collection.insert_one({"key": key, "timestamp": now})
        return True, count + 1, 0
    except Exception as e:
        print(f"ERROR: Rate limit check error: {e}")
        return True, 1, 0

def get_jaccard_similarity(text1, text2):
    try:
        words1 = set(re.findall(r'\w+', text1.lower()))
        words2 = set(re.findall(r'\w+', text2.lower()))
        if not words1 or not words2:
            return 0.0
        return len(words1.intersection(words2)) / len(words1.union(words2))
    except:
        return 0.0

def detect_duplicates(resume_text, owner_email):
    warnings = []
    email_matches = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    if email_matches:
        extracted_email = email_matches[0].lower()
        dup_by_email = resumes_collection.find_one({
            "owner_email": {"$ne": owner_email},
            "$or": [
                {"owner_email": extracted_email},
                {"text": {"$regex": re.escape(extracted_email), "$options": "i"}}
            ]
        })
        if dup_by_email:
            warnings.append(f"Potential Duplicate: Email '{extracted_email}' found in resume is registered under another account ({dup_by_email['owner_email']}).")

    phone_matches = re.findall(r'\+?\d[\d -]{7,15}\d', resume_text)
    valid_phones = [p.strip() for p in phone_matches if len(p.replace("-", "").replace(" ", "").replace("+", "")) >= 10]
    if valid_phones:
        extracted_phone = valid_phones[0]
        phone_digits = re.sub(r'\D', '', extracted_phone)
        if len(phone_digits) >= 10:
            other_resumes = resumes_collection.find({"owner_email": {"$ne": owner_email}})
            for other in other_resumes:
                other_text = other.get("text", "")
                other_phone_matches = re.findall(r'\+?\d[\d -]{7,15}\d', other_text)
                for op in other_phone_matches:
                    op_digits = re.sub(r'\D', '', op)
                    if op_digits == phone_digits:
                        warnings.append(f"Potential Duplicate: Phone number '{extracted_phone}' matches another candidate's profile ({other['owner_email']}).")
                        break
                if warnings:
                    break

    other_resumes = list(resumes_collection.find({"owner_email": {"$ne": owner_email}}))
    for other in other_resumes:
        other_text = other.get("text", "")
        if other_text:
            sim = get_jaccard_similarity(resume_text, other_text)
            if sim > 0.80:
                warnings.append(f"Potential Duplicate: High resume content similarity ({int(sim*100)}%) with another candidate ({other['owner_email']}).")
                break
    return warnings

def detect_inconsistencies(resume_text, skills):
    inconsistencies = []
    text_lower = resume_text.lower()
    for skill in skills:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        matches = re.findall(pattern, text_lower)
        if len(matches) == 1:
            inconsistencies.append(f"Potential Inconsistency: Skill '{skill}' is listed in the resume but has no supporting context or project descriptions.")

    years = [int(y) for y in re.findall(r'\b(19\d{2}|20\d{2})\b', resume_text)]
    has_present = "present" in text_lower or "current" in text_lower
    if len(years) < 2:
        inconsistencies.append("Potential Inconsistency: Missing or very few employment dates/years detected, making experience duration difficult to verify.")

    word_count = len(resume_text.split())
    if word_count < 150:
        inconsistencies.append("Potential Inconsistency: Resume is unusually brief (under 150 words), suggesting generic or incomplete content.")
    elif len(skills) < 3:
        inconsistencies.append("Potential Inconsistency: Resume lists very few technical skills, which may indicate highly generic content.")

    if years:
        min_year = min(years)
        max_year = 2026 if has_present else max(years)
        span = max_year - min_year
        claimed_matches = re.findall(r'\b(\d+)\+?\s*(?:years|yrs)\b', text_lower)
        for m in claimed_matches:
            claimed_val = int(m)
            if claimed_val > 2 and claimed_val > span + 2:
                inconsistencies.append(f"Potential Inconsistency: Resume claims {claimed_val}+ years of experience, but the timeline span of dates listed is only {span} years.")
                break
    return inconsistencies

def response(code, message, data=None):
    # Ensure data is JSON serializable (handle MongoDB ObjectIds and Datetimes)
    if data is not None:
        # json_util.dumps creates {"$date": ...} objects
        # We want to flatten these or ensure they are ISO strings
        data_json = json_util.dumps(data)
        data = json.loads(data_json)
        
        # Helper to recursively fix $date and $oid
        def flatten_mongo(obj):
            if isinstance(obj, list):
                return [flatten_mongo(item) for item in obj]
            if isinstance(obj, dict):
                if "$date" in obj:
                    # Handle both numeric and string formats from json_util
                    val = obj["$date"]
                    if isinstance(val, dict) and "$numberLong" in val:
                        return datetime.fromtimestamp(int(val["$numberLong"])/1000).isoformat()
                    return val if isinstance(val, str) else datetime.fromtimestamp(val/1000).isoformat()
                if "$oid" in obj:
                    return obj["$oid"]
                return {k: flatten_mongo(v) for k, v in obj.items()}
            return obj
            
        data = flatten_mongo(data)
        
    return jsonify({ "data": data, "message": message, "success": (code >= 200 and code <= 299) }), code

def get_bearer_token():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith("Bearer "):
        token_from_query = request.args.get('token', '').strip()
        return token_from_query if token_from_query else None
    return auth_header.split(" ", 1)[1].strip()

def get_authenticated_user(required_roles=None):
    token = get_bearer_token()
    if not token:
        return None, response(401, "Authorization token required")

    try:
        decoded_token = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, response(401, "Token has expired")
    except jwt.InvalidTokenError:
        return None, response(401, "Invalid token")

    email = decoded_token.get('email')
    if not email:
        return None, response(401, "Invalid token payload")

    user = users_collection.find_one({"email": email})
    if not user:
        return None, response(401, "User not found")

    user_status = user.get("status", "active")
    if user_status == "blocked":
        return None, response(403, "Your account has been blocked. Please contact support.")

    user_role = user.get("role", "candidate")
    if required_roles and user_role not in required_roles:
        return None, response(403, "Access denied")

    return user, None

def auth_required(required_roles=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user, auth_error = get_authenticated_user(required_roles)
            if auth_error:
                return auth_error

            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

################################################################################
# ---------------------------  Auth Related Routes --------------------------- #
################################################################################

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return response(400, "Invalid or empty JSON payload")

    email = data.get("email", "").strip().lower()
    password = data.get("password")
    selected_role = str(data.get("role", "")).strip().lower()

    if not email or not password:
        return response(400, "Fields 'email' and 'password' are required")

    # Rate limiting: 5 attempts per 5 minutes (300 seconds) by IP and by Email
    ip = request.remote_addr
    allowed_ip, count_ip, retry_ip = check_rate_limit(f"login:ip:{ip}", limit=5, period_seconds=300)
    if not allowed_ip:
        return response(429, f"Too many login attempts. Please try again in {retry_ip} seconds.")

    allowed_email, count_email, retry_email = check_rate_limit(f"login:email:{email}", limit=5, period_seconds=300)
    if not allowed_email:
        return response(429, f"Too many login attempts for this email. Please try again in {retry_email} seconds.")

    if selected_role and selected_role not in ALLOWED_ROLES:
        return response(400, f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")

    # Fetch user from the database
    user = users_collection.find_one({ "email": email })

    if not user or not check_password_hash(user["password"], password):
        return response(400, "Invalid email or password")

    user_status = user.get("status", "active")
    if user_status == "blocked":
        return response(403, "Your account has been blocked. Please contact support.")
    elif user_status == "pending":
        return response(403, "Your account is pending activation.")

    user_role = user.get("role", "candidate")
    if selected_role and selected_role != user_role:
        return response(403, f"Role mismatch: this account is registered as {user_role}")

    now_utc = datetime.now(timezone.utc)

    # Generate JWT token with role and expiration claims
    token_payload = {
        "email": email,
        "role": user_role,
        "iat": now_utc,
        "exp": now_utc + timedelta(minutes=JWT_EXP_MINUTES)
    }
    token = jwt.encode(token_payload, JWT_SECRET_KEY, algorithm="HS256")

    # Audit log successful login
    log_audit_action(user_id=user["_id"], action="login", target_type="user", target_id=str(user["_id"]), metadata={"email": email, "ip": ip})

    # Return the token, email, and role to the client
    return response(200, "Login successful", { 
        "token": token, 
        "role": user_role,
        "name": user.get("name"),
        "email": email
    })

# ---------------------------------------------------------------------------- #
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data:
        return response(400, "Invalid or empty JSON payload")

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = str(data.get('role', 'candidate')).strip().lower()

    if not name:
        return response(400, "Field 'name' is required")
    if not email:
        return response(400, "Field 'email' is required")
    if not password:
        return response(400, "Field 'password' is required")
    if role not in ALLOWED_ROLES:
        return response(400, f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")
    if role == "recruiter" and not ALLOW_PUBLIC_RECRUITER_SIGNUP:
        return response(403, "Recruiter signup is disabled. Contact an administrator")

    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return response(400, "Invalid email format")

    password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if not re.match(password_regex, password):
        return response(400, "Password must be at least 8 characters long, including one uppercase, one lowercase, one number, and one special character")

    # Make sure another user with the same email does not exist
    if users_collection.find_one({ "email": email }):
        return response(400, "Another user with the same email already exists")

    # Add new user to database with hashed password
    users_collection.insert_one({
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": role,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    })

    return response(201, "User registered successfully")

# ---------------------------------------------------------------------------- #

@app.route("/api/auth/forgot", methods=["POST"])
def forgot():
    data = request.get_json()

    if not data:
        return response(400, "Request body must be in JSON")

    email = data.get('email', '').strip().lower()

    if not email:
        return response(400, "Email field is required")

    # Rate limiting: 3 attempts per 15 minutes (900 seconds) by IP and Email
    ip = request.remote_addr
    allowed_ip, count_ip, retry_ip = check_rate_limit(f"forgot:ip:{ip}", limit=3, period_seconds=900)
    if not allowed_ip:
        return response(429, f"Too many password reset requests. Please try again in {retry_ip} seconds.")

    allowed_email, count_email, retry_email = check_rate_limit(f"forgot:email:{email}", limit=3, period_seconds=900)
    if not allowed_email:
        return response(429, f"Too many password reset requests for this email. Please try again in {retry_email} seconds.")

    user = users_collection.find_one({ "email": email })
    # Always return the same message to avoid revealing which emails are registered
    generic_message = "If an account with that email exists, a password reset link has been sent."
    
    # Audit log the request
    log_audit_action(
        user_id=user["_id"] if user else None,
        action="password reset requested",
        target_type="user",
        target_id=str(user["_id"]) if user else None,
        metadata={"email": email, "ip": ip, "user_exists": bool(user)}
    )

    if not user:
        return response(200, generic_message)

    # Generate a unique reset token and store only the SHA-256 hash in database
    reset_token = str(uuid4())
    hashed_token = hashlib.sha256(reset_token.encode()).hexdigest()
    
    now_utc = datetime.now(timezone.utc)
    tokens_collection.delete_many({ "email": email })
    tokens_collection.insert_one({
        "email": email,
        "token_hash": hashed_token,
        "created_at": now_utc,
        "expires_at": now_utc + timedelta(minutes=RESET_TOKEN_EXP_MINUTES)
    })

    # Send reset email via central send_email utility if configured
    email_sent = False
    if EMAIL_SEND_ENABLED:
        reset_link = f"{CLIENT_URL}/#/auth/reset?token={reset_token}"
        html_body = email_templates.get_password_reset_email(user.get('name', 'there'), reset_link, CLIENT_URL)
        email_sent = send_email(email, "TalentScanAI - Password Reset Request", html_body)

    # In dev mode, expose the token in the response for testing
    if EXPOSE_RESET_TOKEN:
        return response(200, generic_message, { "reset_token": reset_token, "email_sent": email_sent })
    return response(200, generic_message)

# ---------------------------------------------------------------------------- #
@app.route("/api/auth/reset", methods=["POST"])
def reset():
    data = request.get_json()

    if not data:
        return response(400, "Request body must be in JSON")

    reset_token = data.get('reset_token')
    new_password = data.get('new_password')

    if not reset_token:
        return response(400, "Field 'reset_token' is required")
    if not new_password:
        return response(400, "Field 'new_password' is required")

    # Validate password strength
    password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if not re.match(password_regex, new_password):
        return response(400, "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character")

    # Hash the incoming token to match it against database token_hash
    hashed_token = hashlib.sha256(reset_token.encode()).hexdigest()
    token_entry = tokens_collection.find_one({ "token_hash": hashed_token })
    
    if not token_entry:
        return response(400, "Reset token is invalid or expired")

    expires_at = token_entry.get("expires_at")
    # Handle aware/naive comparison safely
    if expires_at:
        # standard python datetime naive replacement
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        exp = expires_at.replace(tzinfo=None)
        if exp < now:
            tokens_collection.delete_one({"_id": token_entry["_id"]})
            return response(400, "Reset token is invalid or expired")

    email = token_entry['email']

    user = users_collection.find_one({"email": email})
    if not user:
        tokens_collection.delete_one({"_id": token_entry["_id"]})
        return response(400, "Reset token is invalid or expired")

    # Update the user's password (hashed)
    users_collection.update_one({ "email": email }, {
        "$set": { "password": generate_password_hash(new_password) }
    })

    # Delete reset token as it has been used (prevents reused tokens)
    tokens_collection.delete_one({"_id": token_entry["_id"]})

    # Audit log successful password reset
    log_audit_action(user_id=user["_id"], action="password changed", target_type="user", target_id=str(user["_id"]), metadata={"method": "reset_token"})

    return response(200, "Password reset successful")

# ---------------------------------------------------------------------------- #
@app.route("/api/auth/change", methods=["POST"])
@auth_required()
def change_password():
    data = request.get_json()

    if not data:
        return response(400, "Request body must be JSON")

    user = g.current_user
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    # Validate input
    if not current_password or not new_password or not confirm_password:
        return response(400, "Current password, new password, and confirm password are required")
    if new_password != confirm_password:
        return response(400, "New passwords do not match")

    # Validate password strength
    password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if not re.match(password_regex, new_password):
        return response(400, "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character")

    # Check if the current password is correct (compare against hashed password)
    if not check_password_hash(user['password'], current_password):
        return response(401, "Current password is incorrect")

    # Update the user's password in the database (store hashed)
    users_collection.update_one({"email": user["email"]}, {"$set": {"password": generate_password_hash(new_password)}})

    # Audit log successful password change
    log_audit_action(user_id=user["_id"], action="password changed", target_type="user", target_id=str(user["_id"]), metadata={"method": "change_endpoint"})

    return response(200, "Password updated successfully")

@app.route('/api/auth/update_profile', methods=['POST'])
@auth_required()
def update_profile():
    data = request.get_json()
    if not data:
        return response(400, "Request body must be JSON")

    new_name = data.get('name', '').strip()
    new_email = data.get('email', '').strip()
    new_phone = data.get('phone', '').strip()
    new_linkedin = data.get('linkedin', '').strip()
    new_portfolio = data.get('portfolio', '').strip()

    if not new_name or not new_email:
        return response(400, "Name and email are required")

    # Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, new_email):
        return response(400, "Invalid email format")

    current_email = g.current_user.get("email")

    # If email is being changed, check it's not already taken
    if new_email != current_email:
        existing = users_collection.find_one({"email": new_email})
        if existing:
            return response(400, "That email address is already in use by another account")
            
        # Update references in other collections
        db['resumes'].update_many({"owner_email": current_email}, {"$set": {"owner_email": new_email}})
        db['applications'].update_many({"candidate_email": current_email}, {"$set": {"candidate_email": new_email}})

    email_changed = (new_email != current_email)

    users_collection.update_one(
        {"email": current_email},
        {"$set": {
            "name": new_name, 
            "email": new_email,
            "phone": new_phone,
            "linkedin": new_linkedin,
            "portfolio": new_portfolio
        }}
    )
    
    # Trigger notifications
    if email_changed:
        create_notification(
            user_email=new_email,
            title="Profile Security Alert",
            message=f"Your profile email address was updated from {current_email} to {new_email}.",
            notif_type="profile_updated"
        )
        
        # Send security emails to both old and new addresses
        msg = f"Your TalentScanAI account email address has been changed from {current_email} to {new_email}."
        old_email_html = email_templates.get_support_email(new_name, msg, CLIENT_URL)
        send_email(current_email, "TalentScanAI - Profile Update Security Alert", old_email_html)
        
        new_email_html = email_templates.get_support_email(new_name, msg, CLIENT_URL)
        send_email(new_email, "TalentScanAI - Profile Update Security Alert", new_email_html)
        
    return response(200, "Profile updated successfully")

@app.route('/api/support/ticket', methods=['POST'])
@auth_required()
def create_ticket():
    current_user = g.current_user
    ip = request.remote_addr
    email = current_user.get("email")

    # Rate limiting: 5 tickets per 10 minutes (600 seconds) by IP and by Email
    allowed_ip, count_ip, retry_ip = check_rate_limit(f"support:ip:{ip}", limit=5, period_seconds=600)
    if not allowed_ip:
        return response(429, f"Too many support requests. Please try again in {retry_ip} seconds.")

    allowed_email, count_email, retry_email = check_rate_limit(f"support:email:{email}", limit=5, period_seconds=600)
    if not allowed_email:
        return response(429, f"Too many support requests for this account. Please try again in {retry_email} seconds.")

    data = request.get_json()
    if not data:
        return response(400, "Request body must be JSON")

    subject = data.get('subject', 'General Inquiry').strip()
    message = data.get('message', '').strip()

    if not message:
        return response(400, "Message is required")

    user_email = current_user.get('email')
    user_name = current_user.get('name')

    # Save ticket to database
    db['tickets'].insert_one({
        "email": user_email,
        "name": user_name,
        "subject": subject,
        "message": message,
        "status": "open",
        "created_at": datetime.now(timezone.utc)
    })
    print(f"SUPPORT TICKET saved from {user_email}: {subject}")

    # Send notification email to admin/EMAIL_USER if configured
    email_sent = False
    if EMAIL_SEND_ENABLED:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[TalentScanAI Support] - {subject}"
            msg['From'] = EMAIL_USER
            msg['To'] = EMAIL_USER  # Sent to admin email
            msg.add_header('reply-to', user_email)

            message_html = message.replace('\n', '<br>')
            html_body = f"""
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f8fafc;">
                <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                    <h1 style="color: #4f46e5; font-size: 24px; margin: 0 0 8px 0;">TalentScanAI Support</h1>
                    <p style="color: #64748b; margin: 0 0 32px 0;">New Support Ticket Received</p>
                    
                    <h3 style="color: #1e293b; margin: 0 0 8px 0;">Sender Info:</h3>
                    <p style="color: #374151; margin: 0 0 16px 0; line-height: 1.6;">
                        <strong>Name:</strong> {user_name}<br>
                        <strong>Email:</strong> {user_email}
                    </p>
                    
                    <h3 style="color: #1e293b; margin: 0 0 8px 0;">Ticket Info:</h3>
                    <p style="color: #374151; margin: 0 0 24px 0; line-height: 1.6;">
                        <strong>Subject:</strong> {subject}<br>
                        <strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                    </p>
                    
                    <h3 style="color: #1e293b; margin: 0 0 8px 0;">Message:</h3>
                    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; color: #334155; line-height: 1.6; font-style: italic;">
                        {message_html}
                    </div>
                </div>
            </div>
            """

            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(EMAIL_USER, EMAIL_PASS)
                smtp.sendmail(EMAIL_USER, EMAIL_USER, msg.as_string())

            email_sent = True
            print(f"Support notification email sent to: {EMAIL_USER}")
        except Exception as e:
            print(f"Failed to send support notification email: {e}")

    return response(201, "Support ticket created successfully", {"email_sent": email_sent})

################################################################################
# --------------------------  Resume Related Routes -------------------------- #
################################################################################

@app.route('/api/resumes/get_all', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def get_all_resumes():
    resumes = list(resumes_collection.find())
    for resume in resumes:
        resume['_id'] = str(resume['_id'])
    return response(200, "Resumes fetched", resumes)

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/total_count', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def get_total_resume_count():
    total_count = resumes_collection.count_documents({})
    return response(200, "Total resume count fetched", total_count)

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/delete_by_id/<resume_id>', methods=['DELETE'])
@auth_required()
def delete_resume_by_id(resume_id):
    try:
        resume_object_id = ObjectId(resume_id)
    except InvalidId:
        return response(400, "Invalid resume id")

    resume = resumes_collection.find_one({"_id": resume_object_id})
    if not resume:
        return response(404, "Resume not found")

    current_user = g.current_user
    current_role = current_user.get("role", "candidate")
    if current_role != "recruiter" and resume.get("owner_email") != current_user.get("email"):
        return response(403, "You can only delete your own resume")

    was_active = resume.get("is_active", False)
    owner_email = resume.get("owner_email")

    resumes_collection.delete_one({"_id": resume_object_id})

    # Delete physical file from disk
    file_path = resume.get("path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as ex:
            print(f"DEBUG: Failed to delete old file {file_path}: {ex}")

    # If deleted resume was active, promote another remaining one to active
    if was_active:
        another = resumes_collection.find_one({"owner_email": owner_email})
        if another:
            resumes_collection.update_one({"_id": another["_id"]}, {"$set": {"is_active": True}})

    return response(200, "Resume deleted successfully")

# ---------------------------------------------------------------------------- #


# ---------------------------------------------------------------------------- #

def extract_text_from_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error extracting text: {e}")
        return ""

def extract_name(text, filename):
    """Attempt to extract name from text or fallback to filename."""
    # Names are usually in the first 2-3 lines
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if lines:
        # Take the first line, but clean it up (limit to 3-4 words)
        first_line = lines[0]
        if len(first_line.split()) <= 4:
            return first_line
    
    # Fallback to filename if text extraction is messy
    # Remove extension and clean underscores
    clean_name = filename.replace('.pdf', '').replace('_', ' ')
    # If it has a UUID prefix, remove it (UUIDs are 36 chars + 1 for underscore)
    if len(clean_name) > 37 and '-' in clean_name:
        clean_name = clean_name[37:]
    return clean_name.title()

def extract_skills(text):
    """Simple skill extraction from text."""
    found = []
    text_lower = text.lower()
    for skill in GLOBAL_TECH_KEYWORDS:
        if skill in text_lower:
            found.append(skill.title())
    return found

@app.route('/api/resumes/view/<filename>')
@auth_required()
def view_resume(filename):
    resume = resumes_collection.find_one({"filename": filename})
    if not resume:
        return response(404, "Resume not found")

    current_user = g.current_user
    current_role = current_user.get("role", "candidate")
    if current_role != "recruiter" and resume.get("owner_email") != current_user.get("email"):
        return response(403, "You can only view your own resume")

    return send_from_directory(RESUMES_UPLOAD_FOLDER, filename)

@app.route('/api/resumes/upload', methods=['POST'])
@auth_required()
def upload_resume():
    current_user = g.current_user
    ip = request.remote_addr
    email = current_user.get("email")

    # Rate limiting: 10 uploads per 10 minutes (600 seconds) by IP and by Email
    allowed_ip, count_ip, retry_ip = check_rate_limit(f"upload:ip:{ip}", limit=10, period_seconds=600)
    if not allowed_ip:
        return response(429, f"Too many resume uploads. Please try again in {retry_ip} seconds.")

    allowed_email, count_email, retry_email = check_rate_limit(f"upload:email:{email}", limit=10, period_seconds=600)
    if not allowed_email:
        return response(429, f"Too many resume uploads for this account. Please try again in {retry_email} seconds.")

    if 'file' not in request.files:
        return response(400, "No file part")
    
    file = request.files['file']
    owner_email = current_user.get("email")

    if current_user.get("role") in {"recruiter", "admin", "super_admin"}:
        requested_owner_email = request.form.get('owner_email', '').strip()
        if requested_owner_email:
            owner_email = requested_owner_email
    
    if file.filename == '':
        return response(400, "No selected file")
    
    # 1. Enforce strict case-insensitive .pdf check
    if not file.filename.lower().endswith('.pdf'):
        return response(400, "Invalid file format. Only PDFs are allowed.")

    # 2. Enforce 5MB size limit validation
    try:
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
    except Exception as e:
        return response(400, f"Failed to check file size: {str(e)}")

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    if file_size > MAX_FILE_SIZE:
        return response(400, "File size exceeds the maximum limit of 5MB")
    
    original_filename = secure_filename(file.filename)
    if not original_filename:
        original_filename = f"resume_{uuid4().hex[:8]}.pdf"
        
    unique_filename = f"{uuid4()}_{original_filename}"
    file_path = os.path.join(RESUMES_UPLOAD_FOLDER, unique_filename)
    
    # 3. Clean up duplicates (same owner_email + same original_filename)
    try:
        existing_resumes = list(resumes_collection.find({
            "owner_email": owner_email,
            "original_filename": original_filename
        }))
        for existing in existing_resumes:
            old_path = existing.get("path")
            if old_path and os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as ex:
                    print(f"DEBUG: Failed to delete old file {old_path}: {ex}")
            resumes_collection.delete_one({"_id": existing["_id"]})
    except Exception as db_err:
        print(f"DEBUG: Error checking duplicates: {db_err}")

    # Save current file
    try:
        file.save(file_path)
    except Exception as e:
        return response(500, f"Failed to save upload: {str(e)}")
    
    # Extract text
    text = extract_text_from_pdf(file_path)
    
    # 4. Enforce non-empty text check
    if not text or not text.strip():
        try:
            os.remove(file_path)
        except:
            pass
        return response(400, "Failed to extract readable text from PDF. The file might be scanned, image-only, or protected. Please upload a text-based PDF.")
    
    # AUTO EXTRACT NAME (Fallback if no owner name)
    candidate_name = extract_name(text, original_filename)
    
    # Extract skills
    skills = extract_skills(text)
    
    # Run duplicate and inconsistency detection
    dup_warnings = detect_duplicates(text, owner_email)
    inconsistencies = detect_inconsistencies(text, skills)
    
    # Check count of existing resumes to set is_active
    existing_count = resumes_collection.count_documents({"owner_email": owner_email})
    is_active = True if existing_count == 0 else False

    # Save to DB
    resume_data = {
        "name": candidate_name,
        "owner_email": owner_email,  # Link to account
        "uploaded_by": current_user.get("email"),
        "filename": unique_filename,
        "original_filename": original_filename,
        "path": file_path,
        "text": text,
        "skills": skills,
        "is_active": is_active,
        "uploaded_at": datetime.now(timezone.utc),
        "duplicate_warnings": dup_warnings,
        "potential_inconsistencies": inconsistencies
    }
    result = resumes_collection.insert_one(resume_data)
    
    # Audit log resume upload
    log_audit_action(
        user_id=current_user["_id"],
        action="resume uploaded",
        target_type="resume",
        target_id=str(result.inserted_id),
        metadata={"original_filename": original_filename, "owner_email": owner_email}
    )
    
    # Trigger notification
    create_notification(
        user_email=owner_email,
        title="Resume Parsed Successfully",
        message=f"Your resume '{original_filename}' has been uploaded and analyzed. {len(skills)} skills detected.",
        notif_type="resume_parsed"
    )
    
    return response(201, "Resume uploaded and processed successfully", {"name": candidate_name, "skills": skills})

@app.route('/api/resumes/list', methods=['GET'])
@auth_required()
def list_resumes():
    current_user = g.current_user
    current_role = current_user.get("role", "candidate")

    query = {}
    if current_role == "recruiter":
        owner_email = request.args.get('owner_email')
        if owner_email:
            query["owner_email"] = owner_email
    else:
        query["owner_email"] = current_user.get("email")

    resumes = list(resumes_collection.find(query))
        
    for idx, r in enumerate(resumes):
        r['_id'] = str(r['_id'])
        if 'is_active' not in r:
            # For backwards compatibility, default the first one to active
            r['is_active'] = True if idx == 0 else False
    return response(200, "Resumes fetched", resumes)
# ---------------------------------------------------------------------------- #

def clean_text(text):
    """Normalize text: lowercase, remove punctuation, and strip extra whitespace."""
    if not text:
        return ""
    text = text.lower()
    # Remove punctuation and special characters
    text = re.sub(r'[^\w\s]', ' ', text)
    # Remove extra whitespace
    text = " ".join(text.split())
    return text

SKILL_LEARNING_PATHS = {
    "Python": {
        "why": "Python is a core language for backend services, data analysis, and AI/ML systems.",
        "path": "Start with 'Python for Everybody' on Coursera, learn basic syntax, and build simple Command Line (CLI) applications. Then progress to Flask or FastAPI frameworks."
    },
    "Javascript": {
        "why": "JavaScript is the engine of modern web applications, essential for interactive frontends.",
        "path": "Complete Javascript Info (javascript.info), practice DOM manipulation, and study async programming (Promises & async/await). Follow up by learning a frontend framework like React or Svelte."
    },
    "Svelte": {
        "why": "Svelte is an ultra-fast modern frontend framework that compiles to clean vanilla JavaScript without a virtual DOM.",
        "path": "Follow the official interactive tutorial on svelte.dev. Build a responsive dashboard project and learn to manage state using Svelte stores."
    },
    "React": {
        "why": "React is the most popular frontend library globally, widely used in corporate and startup environments.",
        "path": "Learn core concepts: JSX, State, Props, Hooks (useState, useEffect) from react.dev. Build a portfolio dashboard utilizing state management."
    },
    "Node": {
        "why": "Node.js allows running JavaScript on the server, facilitating full-stack JS development.",
        "path": "Take a Node.js basics course, learn Express.js for routing, and build a REST API connecting to MongoDB or SQL."
    },
    "Flask": {
        "why": "Flask is a lightweight Python microframework excellent for building modular APIs and service micro-layers.",
        "path": "Read Flask's official quickstart guide, build a JSON-returning REST API, and integrate database access via PyMongo or SQLAlchemy."
    },
    "Docker": {
        "why": "Docker guarantees consistent application runtime across development, staging, and production servers.",
        "path": "Understand container virtualization, write basic Dockerfiles, compile custom images, and run multi-service builds via Docker Compose."
    },
    "Mongodb": {
        "why": "MongoDB is a highly scalable, flexible NoSQL document database, ideal for JSON-based data pipelines.",
        "path": "Study MongoDB University's basic courses. Practice CRUD operations, indexing, and aggregations using MongoDB Compass or command line."
    },
    "Sql": {
        "why": "SQL is the industry standard query language for structured relational databases, vital for secure data transactions.",
        "path": "Learn relational model basics (tables, keys). Practice joins, groups, subqueries, and database normalization on LeetCode Database problems."
    },
    "Firebase": {
        "why": "Firebase is an all-in-one backend-as-a-service (BaaS) providing real-time data stores, auth, and hosting out of the box.",
        "path": "Implement Firebase Auth in a frontend app. Study Firestore database structures, and configure real-time listener hooks."
    },
    "Git": {
        "why": "Git is the absolute industry-standard for codebase version control and development collaboration.",
        "path": "Learn essential terminal actions (clone, status, add, commit, push, pull). Practice branch merging and conflict resolution on GitHub."
    },
    "Github": {
        "why": "GitHub hosting is the standard for team collaboration, pull request workflows, and automated CI/CD actions.",
        "path": "Create repositories, publish branches, manage pull requests, and explore automated checks using GitHub Actions."
    },
    "Nlp": {
        "why": "Natural Language Processing (NLP) is critical for parsing human languages, analyzing resume texts, and search relevance.",
        "path": "Study NLP foundations (tokenization, tf-idf, embeddings). Complete assignments in NLTK or SpaCy using Python."
    },
    "Ai": {
        "why": "Artificial Intelligence matching drives modern automated recruiting systems and resume screening.",
        "path": "Learn basic machine learning theory, supervised/unsupervised training, and how to utilize OpenAI or HuggingFace endpoints."
    },
    "Ml": {
        "why": "Machine Learning enables prediction and scoring mechanisms based on patterns in data.",
        "path": "Take Andrew Ng's Machine Learning specialization, practice regression/classification with Scikit-Learn in Jupyter notebooks."
    }
}

def analyze_match(resume_text, job_description, resume_skills, candidate_name="Candidate"):
    cleaned_jd = clean_text(job_description)
    cleaned_resume = clean_text(resume_text)
    
    # 1. Similarity score
    raw_score = 0.0
    try:
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([cleaned_jd, cleaned_resume])
        raw_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception as e:
        print(f"DEBUG: Vectorizer error: {e}")
        
    if raw_score > 0.3:
        match_score = 85 + (raw_score * 15)
    elif raw_score > 0.1:
        match_score = 60 + (raw_score * 100)
    else:
        match_score = raw_score * 500
    match_score = round(min(99.9, match_score), 2)
    
    # 2. Keywords
    matched_skills = []
    missing_skills = []
    for skill in GLOBAL_TECH_KEYWORDS:
        if skill in cleaned_jd:
            if skill in cleaned_resume:
                matched_skills.append(skill.title())
            else:
                missing_skills.append(skill.title())
                
    # 3. ATS Checker
    text_lower = resume_text.lower()
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text))
    has_phone = bool(re.search(r'\+?\d[\d -]{7,15}\d', resume_text))
    has_link = "linkedin.com" in text_lower or "github.com" in text_lower or "http" in text_lower
    
    contact_points = 0
    if has_email: contact_points += 5
    if has_phone: contact_points += 5
    if has_link: contact_points += 5
    
    has_skills = any(h in text_lower for h in ["skills", "technologies", "core competencies", "technical proficiency"])
    has_edu = any(h in text_lower for h in ["education", "academic", "university", "college", "degree"])
    has_exp = any(h in text_lower for h in ["experience", "employment", "work history", "professional path", "career"])
    
    section_points = 0
    if has_skills: section_points += 15
    if has_edu: section_points += 15
    if has_exp: section_points += 15
    
    word_count = len(resume_text.split())
    format_points = 0
    if 150 <= word_count <= 2500:
        format_points = 15
    elif 80 <= word_count < 150 or 2500 < word_count <= 4000:
        format_points = 10
    else:
        format_points = 5
        
    keyword_points = 0
    jd_required_count = len(matched_skills) + len(missing_skills)
    if jd_required_count > 0:
        keyword_points = int((len(matched_skills) / jd_required_count) * 25)
    else:
        keyword_points = 25
        
    ats_score = contact_points + section_points + format_points + keyword_points
    ats_score = min(100, max(0, ats_score))
    
    weak_sections = []
    if not has_skills: weak_sections.append("Skills section header is missing or non-standard.")
    if not has_edu: weak_sections.append("Education section header is missing or non-standard.")
    if not has_exp: weak_sections.append("Experience/Work History section header is missing or non-standard.")
    if not has_email or not has_phone: weak_sections.append("Contact details are incomplete (missing email or phone).")
    
    suggested_skills = []
    res_skills_lower = [s.lower() for s in resume_skills]
    if "python" in res_skills_lower and "flask" not in res_skills_lower:
        suggested_skills.append("Flask (Python Backend API)")
    if "javascript" in res_skills_lower and "react" not in res_skills_lower and "svelte" not in res_skills_lower:
        suggested_skills.append("React or Svelte (Frontend UI)")
    if "react" in res_skills_lower and "node" not in res_skills_lower:
        suggested_skills.append("Node.js (Backend JS Integration)")
    if "flask" in res_skills_lower and "docker" not in res_skills_lower:
        suggested_skills.append("Docker (API Containerization)")
        
    suggested_wording = "To improve readability, start bullet points with active verbs like 'Led', 'Optimized', or 'Designed' instead of passive phrasing."
    ats_tips = [
        "Avoid multi-column tables or complex graphical layout templates as they disrupt parser ordering.",
        "Ensure standard fonts like Arial or Calibri are used, and font sizes range between 10pt and 12pt.",
        "Submit documents in text-based PDF formats, avoiding image-only scans."
    ]
    
    skill_gaps = []
    for skill in missing_skills:
        path_info = SKILL_LEARNING_PATHS.get(skill, {
            "why": f"Required technical core skill listed in the job description.",
            "path": f"Read the official {skill} guides, build a simple CLI or API playground, and push your repository to GitHub."
        })
        skill_gaps.append({
            "skill": skill,
            "why": path_info["why"],
            "path": path_info["path"]
        })
        
    summary_parts = []
    summary_parts.append(f"Demonstrates technical alignment with {len(matched_skills)} key requirements, showing strengths in {', '.join(matched_skills[:3])}.")
    if missing_skills:
        summary_parts.append(f"However, key skill gaps are present in {', '.join(missing_skills[:3])}.")
    if has_exp:
        summary_parts.append("Work history follows standard formatting guidelines.")
    else:
        summary_parts.append("Work experience section contains non-standard keywords or headers.")
    candidate_summary = " ".join(summary_parts)
    
    if match_score >= 85:
        hiring_recommendation = "Strong Match"
    elif match_score >= 70:
        hiring_recommendation = "Good Match"
    elif match_score >= 50:
        hiring_recommendation = "Average Match"
    elif match_score >= 35:
        hiring_recommendation = "Weak Match"
    else:
        hiring_recommendation = "Not Recommended"
        
    experience_signals = []
    for line in resume_text.split('\n'):
        line_clean = line.strip()
        if re.search(r'\b(senior|lead|manager|director|head|architect)\b', line_clean, re.I):
            experience_signals.append(f"Leadership role detected: '{line_clean[:60]}'")
        if re.search(r'\b(\d+)\+?\s*years?\b', line_clean, re.I):
            experience_signals.append(f"Duration marker: '{line_clean[:60]}'")
            
    return {
        "score": match_score,
        "ats_score": ats_score,
        "ats_breakdown": {
            "contact_info": contact_points,
            "sections": section_points,
            "formatting": format_points,
            "keywords": keyword_points
        },
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": {
            "weak_sections": weak_sections,
            "suggested_skills": suggested_skills,
            "suggested_wording": suggested_wording,
            "ats_tips": ats_tips
        },
        "skill_gaps": skill_gaps,
        "summary": candidate_summary,
        "hiring_recommendation": hiring_recommendation,
        "experience_signals": experience_signals[:5]
    }

@app.route('/api/resumes/rank', methods=['POST'])
@auth_required()
def rank_resumes():
    data = request.get_json() or {}
    job_description = data.get('job_description')

    if not job_description:
        return response(400, "Job description is required")

    current_user = g.current_user
    current_role = current_user.get("role", "candidate")
    query = {}
    if current_role != "recruiter":
        query["owner_email"] = current_user.get("email")

    resumes = list(resumes_collection.find(query))
    if not resumes:
        return response(200, "No resumes to rank", [])

    ranked_results = []
    for r in resumes:
        analysis = analyze_match(
            resume_text=r.get('text', ''),
            job_description=job_description,
            resume_skills=r.get('skills', []),
            candidate_name=r.get('name', 'Unknown')
        )
        
        # Build recommendations array to match the legacy frontend expectation
        recommendations = []
        if analysis["missing_skills"]:
            recommendations.append(f"Focus on learning: {', '.join(analysis['missing_skills'][:3])}")
        if analysis["score"] < 50:
            recommendations.append("The resume lacks several core technical keywords mentioned in the JD.")
        else:
            recommendations.append("Great technical foundation. Consider highlighting specific projects using these tools.")

        ranked_results.append({
            "id": str(r['_id']),
            "name": r.get('name', 'Unknown'),
            "score": analysis["score"],
            "ats_score": analysis["ats_score"],
            "ats_breakdown": analysis["ats_breakdown"],
            "filename": r.get('filename', 'Unknown'),
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "recommendations": recommendations,
            "suggestions": analysis["suggestions"],
            "skill_gaps": analysis["skill_gaps"],
            "summary": analysis["summary"],
            "hiring_recommendation": analysis["hiring_recommendation"],
            "experience_signals": analysis["experience_signals"]
        })

    ranked_results.sort(key=lambda x: x['score'], reverse=True)
    return response(200, "Resumes ranked successfully", ranked_results)

@app.route('/api/stats', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def get_stats():
    resumes = list(resumes_collection.find())
    total_resumes = len(resumes)
    
    # Active Jobs count
    total_jobs = jobs_collection.count_documents({})
    active_jobs = jobs_collection.count_documents({"status": "Active"})
    
    # Total Applications count
    total_apps = applications_collection.count_documents({})
    pending_apps = applications_collection.count_documents({"status": "pending"})
    
    # Applications submitted today (aware datetimes)
    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    apps_today = applications_collection.count_documents({"applied_at": {"$gte": start_of_today}})
    
    # Calculate top skills
    all_skills = []
    for r in resumes:
        all_skills.extend(r.get('skills', []))
    
    skill_counts = Counter(all_skills).most_common(5)
    top_skill = skill_counts[0][0] if skill_counts else "None"
    
    # Calculate average match score
    all_apps = list(applications_collection.find())
    avg_match_score = 0
    if all_apps:
        avg_match_score = round(sum(a.get("score", 0) for a in all_apps) / len(all_apps), 1)
        
    # Get Database size stats
    try:
        db_stats = db.command("dbstats")
        db_size = db_stats.get("dataSize", 0)
    except:
        db_size = 1572864  # 1.5 MB fallback
        
    if db_size >= 1024 * 1024:
        db_size_formatted = f"{round(db_size / (1024 * 1024), 2)} MB"
    else:
        db_size_formatted = f"{round(db_size / 1024, 2)} KB"

    # Applications grouped by status
    status_counts = {}
    for s_name in ["pending", "shortlisted", "interview scheduled", "accepted", "rejected", "hired"]:
        status_counts[s_name] = applications_collection.count_documents({"status": s_name})
        
    # Match score distribution
    weak_count = applications_collection.count_documents({"score": {"$lt": 50}})
    good_count = applications_collection.count_documents({"score": {"$gte": 50, "$lt": 80}})
    strong_count = applications_collection.count_documents({"score": {"$gte": 80}})
    score_dist = {
        "weak": weak_count,
        "good": good_count,
        "strong": strong_count
    }

    # Recent activity
    def sort_key(resume):
        dt = resume.get('uploaded_at')
        if dt is None:
            return 0
        if hasattr(dt, 'timestamp'):
            return dt.timestamp()
        return 0

    recent_uploads = []
    sorted_resumes = sorted(resumes, key=sort_key, reverse=True)
    for r in sorted_resumes[:5]:
        uploaded = r.get('uploaded_at')
        if uploaded and isinstance(uploaded, datetime):
            date_str = uploaded.strftime("%Y-%m-%d")
        else:
            date_str = "Recently"
        recent_uploads.append({
            "name": r.get('name', 'Anonymous'),
            "date": date_str
        })

    stats_data = {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_apps,
        "pending_applications": pending_apps,
        "applications_today": apps_today,
        "average_match_score": avg_match_score,
        "top_detected_skill": top_skill,
        "db_size": db_size_formatted,
        "applications_by_status": status_counts,
        "match_score_distribution": score_dist,
        "top_skills": [{"skill": s, "count": c} for s, c in skill_counts],
        "recent_activity": recent_uploads,
        "total_skills_found": len(set(all_skills))
    }
    
    return response(200, "Stats fetched successfully", stats_data)

# ################################################################################
# # ---------------------------  Job Related Routes --------------------------- #
# ################################################################################

@app.route('/api/jobs/create', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def create_job():
    data = request.get_json()
    if not data:
        return response(400, "Invalid JSON")
    
    title = data.get('title')
    company = data.get('company')
    description = data.get('description')
    location = data.get('location', 'Remote')
    status = data.get('status', 'Active')
    
    if not title or not description:
        return response(400, "Title and description are required")
    
    if status not in {"Draft", "Active", "Paused", "Closed"}:
        status = "Active"
    
    job_data = {
        "title": title,
        "company": company or "TalentScan Partner",
        "description": description,
        "location": location,
        "status": status,
        "posted_by": g.current_user.get("email"),
        "created_at": datetime.now(timezone.utc)
    }
    
    result = jobs_collection.insert_one(job_data)
    
    # Audit log job creation
    log_audit_action(
        user_id=g.current_user["_id"],
        action="job created",
        target_type="job",
        target_id=str(result.inserted_id),
        metadata={"title": title, "company": company}
    )
    
    # Trigger notifications for recommended job match
    try:
        job_id_str = str(result.inserted_id)
        active_resumes = list(resumes_collection.find({"is_active": True}))
        job_desc_lower = description.lower()
        
        for resume in active_resumes:
            cand_email = resume.get("owner_email")
            resume_skills = resume.get("skills", [])
            
            # Intersection of skills
            matched = [s for s in resume_skills if s.lower() in job_desc_lower]
            
            if len(matched) >= 2:
                create_notification(
                    user_email=cand_email,
                    title="New Recommended Job Match",
                    message=f"A new job '{title}' at '{company or 'TalentScan Partner'}' matches your active profile skills (e.g. {', '.join(matched[:2])}).",
                    notif_type="new_recommendation"
                )
    except Exception as e_match:
        print(f"ERROR: Failed triggering recommended job notifications: {e_match}")
        
    return response(201, "Job posted successfully", {"id": str(result.inserted_id)})

@app.route('/api/jobs/status', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def update_job_status():
    data = request.get_json() or {}
    job_id = data.get('job_id')
    status = data.get('status')
    
    if not job_id or not status:
        return response(400, "job_id and status are required")
    
    if status not in {"Draft", "Active", "Paused", "Closed"}:
        return response(400, "Status must be Draft, Active, Paused, or Closed")
        
    try:
        job_oid = ObjectId(job_id)
    except:
        return response(400, "Invalid Job ID format")
        
    result = jobs_collection.update_one(
        {"_id": job_oid},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        return response(404, "Job not found")
        
    # Audit log job status update
    log_audit_action(
        user_id=g.current_user["_id"],
        action="job status changed",
        target_type="job",
        target_id=job_id,
        metadata={"status": status}
    )
        
    return response(200, f"Job status updated to {status} successfully")

@app.route('/api/jobs/list', methods=['GET'])
def list_jobs():
    jobs = list(jobs_collection.find().sort("created_at", -1))
    for j in jobs:
        j['_id'] = str(j['_id'])
        if 'status' not in j:
            j['status'] = 'Active' # Backwards compatibility
    return response(200, "Jobs fetched", jobs)

@app.route('/api/jobs/apply', methods=['POST'])
@auth_required(required_roles={"candidate"})
def apply_to_job():
    data = request.get_json()
    job_id = data.get('job_id')
    resume_id = data.get('resume_id')
    
    if not job_id or not resume_id:
        return response(400, "Job ID and Resume ID are required")
    
    try:
        job_oid = ObjectId(job_id)
        resume_oid = ObjectId(resume_id)
    except:
        return response(400, "Invalid ID format")
    
    job = jobs_collection.find_one({"_id": job_oid})
    if not job:
        return response(404, "Job not found")
        
    # Prevent candidates from applying to paused or closed or draft jobs
    job_status = job.get("status", "Active")
    if job_status != "Active":
        return response(400, f"This job is currently not accepting applications. Status: {job_status}")
        
    resume = resumes_collection.find_one({"_id": resume_oid, "owner_email": g.current_user.get("email")})
    if not resume:
        return response(404, "Resume not found or access denied")
    
    # Check if already applied
    existing = applications_collection.find_one({
        "job_id": str(job_oid),
        "candidate_email": g.current_user.get("email")
    })
    if existing:
        return response(400, "You have already applied for this job")
    
    # Run dynamic on-the-fly match analysis to pre-populate application details
    match_analysis = analyze_match(
        resume_text=resume.get('text', ''),
        job_description=job.get('description', ''),
        resume_skills=resume.get('skills', []),
        candidate_name=g.current_user.get('name', 'Candidate')
    )
    
    application = {
        "job_id": str(job_oid),
        "job_title": job.get("title"),
        "candidate_name": g.current_user.get("name"),
        "candidate_email": g.current_user.get("email"),
        "resume_id": str(resume_oid),
        "resume_name": resume.get("original_filename"),
        "status": "pending",
        "score": match_analysis["score"],
        "match_analysis": match_analysis,
        "recruiter_rating": None,
        "recruiter_notes": "",
        "interview_schedule": None,
        "applied_at": datetime.now(timezone.utc)
    }
    
    applications_collection.insert_one(application)
    
    # Trigger Notifications & Email
    cand_name = g.current_user.get("name", "Candidate")
    cand_email = g.current_user.get("email")
    job_title = job.get("title", "Position")
    company = job.get("company", "TalentScan Partner")
    
    create_notification(
        user_email=cand_email,
        title="Application Submitted",
        message=f"You have successfully applied for the position of {job_title} at {company}.",
        notif_type="application_submitted"
    )
    
    applied_html = email_templates.get_applied_email(cand_name, job_title, company, CLIENT_URL)
    send_email(cand_email, f"Application Received: {job_title}", applied_html)
    
    rec_email = job.get("posted_by")
    if rec_email:
        create_notification(
            user_email=rec_email,
            title="New Application Received",
            message=f"A new candidate {cand_name} has applied for the {job_title} position.",
            notif_type="application_submitted"
        )
        
    return response(201, "Application submitted successfully")

@app.route('/api/jobs/my_applications', methods=['GET'])
@auth_required(required_roles={"candidate"})
def my_applications():
    apps = list(applications_collection.find({"candidate_email": g.current_user.get("email")}))
    for a in apps:
        a['_id'] = str(a['_id'])
    return response(200, "Applications fetched", apps)

@app.route('/api/jobs/recruiter_applications', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def recruiter_applications():
    blind_mode = request.args.get('blind', '').lower() == 'true'
    
    apps = list(applications_collection.find().sort("applied_at", -1))
    for idx, a in enumerate(apps):
        a['_id'] = str(a['_id'])
        # Dynamic fallback for legacy application documents
        if 'score' not in a and 'match_analysis' in a:
            a['score'] = a['match_analysis'].get('score', 0)
        elif 'score' not in a:
            a['score'] = 0
            
        if 'recruiter_rating' not in a:
            a['recruiter_rating'] = None
        if 'recruiter_notes' not in a:
            a['recruiter_notes'] = ""
        if 'interview_schedule' not in a:
            a['interview_schedule'] = None
        
        # Attach integrity data from resume
        resume_id = a.get("resume_id")
        if resume_id:
            try:
                resume = resumes_collection.find_one({"_id": ObjectId(resume_id)})
                if resume:
                    a['duplicate_warnings'] = resume.get("duplicate_warnings", [])
                    a['potential_inconsistencies'] = resume.get("potential_inconsistencies", [])
                else:
                    a['duplicate_warnings'] = []
                    a['potential_inconsistencies'] = []
            except:
                a['duplicate_warnings'] = []
                a['potential_inconsistencies'] = []
        else:
            a['duplicate_warnings'] = []
            a['potential_inconsistencies'] = []
        
        # Blind screening: mask personal identifiers
        if blind_mode:
            a['candidate_name'] = f"Candidate {idx + 1:04d}"
            a['candidate_email'] = f"candidate_{idx + 1:04d}@hidden.com"
            if 'match_analysis' in a and isinstance(a['match_analysis'], dict):
                a['match_analysis'].pop('candidate_name', None)
            
    return response(200, "Applications fetched", apps)

@app.route('/api/jobs/application_status', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def update_application_status():
    data = request.get_json() or {}
    app_id = data.get('application_id')
    status = data.get('status')
    
    if not app_id:
        return response(400, "application_id is required")
        
    allowed_statuses = {"pending", "shortlisted", "interview scheduled", "accepted", "rejected", "hired"}
    if not status or status.lower() not in allowed_statuses:
        return response(400, f"status must be one of: {', '.join(allowed_statuses)}")
        
    try:
        app_oid = ObjectId(app_id)
    except InvalidId:
        return response(400, "Invalid application ID format")
        
    app_record = applications_collection.find_one({"_id": app_oid})
    if not app_record:
        return response(404, "Application not found")
        
    applications_collection.update_one(
        {"_id": app_oid},
        {"$set": {"status": status.lower()}}
    )
    
    # Audit log application status change
    log_audit_action(
        user_id=g.current_user["_id"],
        action="application status changed",
        target_type="application",
        target_id=app_id,
        metadata={"status": status.lower(), "candidate_email": app_record.get("candidate_email"), "job_title": app_record.get("job_title")}
    )
    
    # Trigger notifications
    status_lower = status.lower()
    cand_email = app_record.get("candidate_email")
    cand_name = app_record.get("candidate_name", "Candidate")
    job_title = app_record.get("job_title", "Position")
    job_id = app_record.get("job_id")
    
    try:
        job_record = db['jobs'].find_one({"_id": ObjectId(job_id)}) or {}
    except:
        job_record = {}
    company = job_record.get("company", "TalentScan Partner")

    if status_lower == "accepted":
        create_notification(
            user_email=cand_email,
            title="Application Accepted",
            message=f"Congratulations! Your application for the {job_title} position at {company} has been accepted.",
            notif_type="application_accepted"
        )
        html_body = email_templates.get_accept_email(cand_name, job_title, company, CLIENT_URL)
        send_email(cand_email, f"Application Accepted: {job_title}", html_body)
        
    elif status_lower == "rejected":
        create_notification(
            user_email=cand_email,
            title="Application Update",
            message=f"Thank you for your interest. Unfortunately, your application for the {job_title} position at {company} was not selected.",
            notif_type="application_rejected"
        )
        html_body = email_templates.get_reject_email(cand_name, job_title, company, CLIENT_URL)
        send_email(cand_email, f"Application Update: {job_title}", html_body)
        
    elif status_lower == "shortlisted":
        create_notification(
            user_email=cand_email,
            title="Application Shortlisted",
            message=f"Great news! You have been shortlisted for the {job_title} position at {company}.",
            notif_type="shortlisted"
        )
        
    elif status_lower == "interview scheduled":
        create_notification(
            user_email=cand_email,
            title="Interview Scheduled",
            message=f"An interview has been scheduled for the {job_title} position at {company}.",
            notif_type="interview_scheduled"
        )
    
    return response(200, f"Application status updated to {status} successfully")

@app.route('/api/jobs/application_review', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def update_application_review():
    data = request.get_json() or {}
    app_id = data.get('application_id')
    rating = data.get('rating')
    notes = data.get('notes')
    
    if not app_id:
        return response(400, "application_id is required")
        
    try:
        app_oid = ObjectId(app_id)
    except:
        return response(400, "Invalid application ID format")
        
    update_fields = {}
    if rating is not None:
        if rating == "":
            update_fields["recruiter_rating"] = None
        else:
            try:
                rating_int = int(rating)
                if rating_int < 1 or rating_int > 5:
                    return response(400, "Rating must be between 1 and 5")
                update_fields["recruiter_rating"] = rating_int
            except ValueError:
                return response(400, "Rating must be an integer")
                
    if notes is not None:
        update_fields["recruiter_notes"] = notes
        
    if not update_fields:
        return response(400, "Nothing to update")
        
    applications_collection.update_one(
        {"_id": app_oid},
        {"$set": update_fields}
    )
    return response(200, "Review details updated successfully")

@app.route('/api/jobs/bulk_application_status', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def bulk_update_application_status():
    data = request.get_json() or {}
    app_ids = data.get('application_ids', [])
    status = data.get('status')
    
    if not app_ids:
        return response(400, "application_ids list is required")
        
    allowed_statuses = {"pending", "shortlisted", "interview scheduled", "accepted", "rejected", "hired"}
    if not status or status.lower() not in allowed_statuses:
        return response(400, f"status must be one of: {', '.join(allowed_statuses)}")
        
    oids = []
    for app_id in app_ids:
        try:
            oids.append(ObjectId(app_id))
        except:
            continue
            
    if not oids:
        return response(400, "No valid application IDs found")
        
    applications_collection.update_many(
        {"_id": {"$in": oids}},
        {"$set": {"status": status.lower()}}
    )
    
    # Trigger notifications & log audits
    try:
        apps = list(applications_collection.find({"_id": {"$in": oids}}))
        status_lower = status.lower()
        for app_record in apps:
            cand_email = app_record.get("candidate_email")
            cand_name = app_record.get("candidate_name", "Candidate")
            job_title = app_record.get("job_title", "Position")
            job_id = app_record.get("job_id")
            
            # Write audit log for this application update
            log_audit_action(
                user_id=g.current_user["_id"],
                action="application status changed",
                target_type="application",
                target_id=str(app_record["_id"]),
                metadata={"status": status_lower, "candidate_email": cand_email, "job_title": job_title}
            )
            
            try:
                job_record = db['jobs'].find_one({"_id": ObjectId(job_id)}) or {}
            except:
                job_record = {}
            company = job_record.get("company", "TalentScan Partner")
            
            if status_lower == "accepted":
                create_notification(
                    user_email=cand_email,
                    title="Application Accepted",
                    message=f"Congratulations! Your application for the {job_title} position at {company} has been accepted.",
                    notif_type="application_accepted"
                )
                html_body = email_templates.get_accept_email(cand_name, job_title, company, CLIENT_URL)
                send_email(cand_email, f"Application Accepted: {job_title}", html_body)
                
            elif status_lower == "rejected":
                create_notification(
                    user_email=cand_email,
                    title="Application Update",
                    message=f"Thank you for your interest. Unfortunately, your application for the {job_title} position at {company} was not selected.",
                    notif_type="application_rejected"
                )
                html_body = email_templates.get_reject_email(cand_name, job_title, company, CLIENT_URL)
                send_email(cand_email, f"Application Update: {job_title}", html_body)
                
            elif status_lower == "shortlisted":
                create_notification(
                    user_email=cand_email,
                    title="Application Shortlisted",
                    message=f"Great news! You have been shortlisted for the {job_title} position at {company}.",
                    notif_type="shortlisted"
                )
                
            elif status_lower == "interview scheduled":
                create_notification(
                    user_email=cand_email,
                    title="Interview Scheduled",
                    message=f"An interview has been scheduled for the {job_title} position at {company}.",
                    notif_type="interview_scheduled"
                )
    except Exception as notif_err:
        print(f"ERROR: Failed triggering bulk update notifications: {notif_err}")
        
    return response(200, f"Successfully updated {len(oids)} applications to '{status}'")

@app.route('/api/jobs/schedule_interview', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def schedule_interview():
    data = request.get_json() or {}
    app_id = data.get('application_id')
    date = data.get('date')
    time = data.get('time')
    meeting_type = data.get('meeting_type')
    meeting_link = data.get('meeting_link', '')
    notes = data.get('notes', '')
    
    if not app_id or not date or not time or not meeting_type:
        return response(400, "application_id, date, time, and meeting_type are required")
        
    try:
        app_oid = ObjectId(app_id)
    except:
        return response(400, "Invalid application ID format")
        
    app_record = applications_collection.find_one({"_id": app_oid})
    if not app_record:
        return response(404, "Application not found")
        
    schedule = {
        "date": date,
        "time": time,
        "meeting_type": meeting_type,
        "meeting_link": meeting_link,
        "notes": notes
    }
    
    applications_collection.update_one(
        {"_id": app_oid},
        {"$set": {
            "status": "interview scheduled",
            "interview_schedule": schedule
        }}
    )
    
    # Trigger Notifications & Email
    candidate_email = app_record.get("candidate_email")
    cand_name = app_record.get("candidate_name", "Candidate")
    job_title = app_record.get("job_title", "Position")
    job_id = app_record.get("job_id")
    
    try:
        job_record = db['jobs'].find_one({"_id": ObjectId(job_id)}) or {}
    except:
        job_record = {}
    company = job_record.get("company", "TalentScan Partner")
    
    create_notification(
        user_email=candidate_email,
        title="Interview Scheduled",
        message=f"An interview has been scheduled for the {job_title} position at {company} on {date} at {time} ({meeting_type}).",
        notif_type="interview_scheduled"
    )
    
    if candidate_email:
        email_body = email_templates.get_interview_email(
            cand_name=cand_name,
            job_title=job_title,
            company=company,
            date=date,
            time=time,
            meeting_type=meeting_type,
            meeting_link=meeting_link,
            notes=notes,
            client_url=CLIENT_URL
        )
        send_email(candidate_email, f"Interview Invitation: {job_title}", email_body)
        
    return response(200, "Interview scheduled and notification email sent")

@app.route('/api/resumes/interview_questions', methods=['POST'])
@auth_required()
def generate_interview_questions():
    data = request.get_json() or {}
    job_description = data.get('job_description', '')
    resume_id = data.get('resume_id')
    
    if not job_description or not resume_id:
        return response(400, "job_description and resume_id are required")
        
    try:
        res_oid = ObjectId(resume_id)
    except:
        return response(400, "Invalid resume ID format")
        
    resume = resumes_collection.find_one({"_id": res_oid})
    if not resume:
        return response(404, "Resume not found")
        
    analysis = analyze_match(
        resume_text=resume.get('text', ''),
        job_description=job_description,
        resume_skills=resume.get('skills', [])
    )
    
    matched = analysis["matched_skills"]
    missing = analysis["missing_skills"]
    
    questions = []
    
    # HR Questions
    questions.append({
        "category": "HR / Behavioral",
        "question": "Can you describe a challenging project you worked on recently? What went well and what would you do differently?",
        "level": "Medium",
        "rationale": "Assesses project management, self-reflection, and problem-solving."
    })
    questions.append({
        "category": "HR / Behavioral",
        "question": "How do you keep your technical skills sharp? Tell me about a new technology you learned recently and why.",
        "level": "Easy",
        "rationale": "Measures curiosity, learning drive, and initiative."
    })
    
    # Technical Questions database
    tech_questions_map = {
        "Python": [
            {"level": "Easy", "question": "What is the difference between a list and a tuple in Python?", "rationale": "Checks memory mutability understanding."},
            {"level": "Medium", "question": "How does memory management work in Python? Explain garbage collection.", "rationale": "Verifies runtime mechanics."}
        ],
        "Javascript": [
            {"level": "Easy", "question": "What is the difference between let, const, and var?", "rationale": "Checks understanding of block-level scope."},
            {"level": "Medium", "question": "Explain event delegation and event bubbling in JavaScript.", "rationale": "Verifies browser event rendering knowledge."}
        ],
        "React": [
            {"level": "Medium", "question": "What is the Virtual DOM and how does React's reconciliation work?", "rationale": "Checks React rendering speed knowledge."},
            {"level": "Hard", "question": "How would you optimize a React app suffering from unnecessary rendering pipelines?", "rationale": "Tests hook and key optimizations."}
        ],
        "Svelte": [
            {"level": "Medium", "question": "How does Svelte achieve reactivity without a Virtual DOM?", "rationale": "Checks compiler-level reactivity knowledge."},
            {"level": "Hard", "question": "Explain Svelte stores and how you would manage state in a complex application.", "rationale": "Tests store subscriptions."}
        ],
        "Docker": [
            {"level": "Medium", "question": "What is the difference between a Docker container and an image?", "rationale": "Tests containerization understanding."},
            {"level": "Hard", "question": "Explain how you would optimize a multi-stage Docker build to reduce image size and layer count.", "rationale": "Tests container optimization."}
        ],
        "Mongodb": [
            {"level": "Medium", "question": "When would you choose MongoDB over a SQL database?", "rationale": "Checks relational vs non-relational database selection."},
            {"level": "Hard", "question": "Explain indexes in MongoDB and how they affect query performance.", "rationale": "Verifies query tuning capabilities."}
        ],
        "Flask": [
            {"level": "Medium", "question": "How do you handle authentication sessions or JWTs in a Flask API?", "rationale": "Checks middleware authentication pattern."},
            {"level": "Medium", "question": "Explain routing and blueprints in a Flask application.", "rationale": "Tests application routing structure."}
        ],
        "Sql": [
            {"level": "Easy", "question": "What is the difference between INNER JOIN and LEFT JOIN?", "rationale": "Checks relational join understanding."},
            {"level": "Medium", "question": "Explain database indexes and when they might slow down write operations.", "rationale": "Checks write trade-offs."}
        ]
    }
    
    matched_pulled = 0
    for skill in matched:
        if skill in tech_questions_map:
            for q in tech_questions_map[skill]:
                questions.append({
                    "category": f"Technical ({skill})",
                    "question": q["question"],
                    "level": q["level"],
                    "rationale": q["rationale"]
                })
                matched_pulled += 1
            if matched_pulled >= 4:
                break
                
    if matched_pulled == 0:
        questions.append({
            "category": "Technical",
            "question": "Walk me through the system architecture of the most complex application you have built. How did you design database schema and routing?",
            "level": "Hard",
            "rationale": "Assesses systems architecture design."
        })
        
    weak_pulled = 0
    for skill in missing:
        questions.append({
            "category": f"Skill Gap ({skill})",
            "question": f"The job description mentions {skill} as a core requirement, which seems to be missing from your direct work history. Can you tell me about your theoretical understanding of {skill} or how you would approach ramp-up?",
            "level": "Medium",
            "rationale": f"Tests adaptability and basic knowledge of {skill}."
        })
        weak_pulled += 1
        if weak_pulled >= 2:
            break
            
    return response(200, "Interview questions generated successfully", questions)

@app.route('/api/export/ranking', methods=['POST'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def export_ranking():
    import io
    import csv
    from flask import make_response
    
    data = request.get_json() or {}
    results = data.get('results', [])
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Rank", "Name", "Match Score (%)", "ATS Score (%)", "Filename", "Matched Skills", "Missing Skills", "Hiring Recommendation"])
    
    for idx, r in enumerate(results):
        matched_str = ", ".join(r.get("matched_skills", []))
        missing_str = ", ".join(r.get("missing_skills", []))
        writer.writerow([
            idx + 1,
            r.get("name", "Unknown"),
            r.get("score", 0),
            r.get("ats_score", 0),
            r.get("filename", "Unknown"),
            matched_str,
            missing_str,
            r.get("hiring_recommendation", "N/A")
        ])
        
    response_csv = make_response(output.getvalue())
    response_csv.headers["Content-Disposition"] = "attachment; filename=candidate_ranking.csv"
    response_csv.headers["Content-type"] = "text/csv"
    return response_csv

@app.route('/api/export/applications', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def export_applications():
    import io
    import csv
    from flask import make_response
    
    apps = list(applications_collection.find().sort("applied_at", -1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Job Title", "Candidate Name", "Candidate Email", "Applied Date", "Status", "Match Score (%)", "Rating (1-5)", "Recruiter Notes"])
    
    for a in apps:
        score = a.get("score", 0)
        if not score and "match_analysis" in a:
            score = a["match_analysis"].get("score", 0)
            
        rating = a.get("recruiter_rating", "")
        notes = a.get("recruiter_notes", "")
        applied_at = a.get("applied_at")
        applied_str = applied_at.strftime("%Y-%m-%d") if isinstance(applied_at, datetime) else str(applied_at)
        
        writer.writerow([
            a.get("job_title", "Unknown"),
            a.get("candidate_name", "Unknown"),
            a.get("candidate_email", "Unknown"),
            applied_str,
            a.get("status", "pending"),
            score,
            rating,
            notes
        ])
        
    response_csv = make_response(output.getvalue())
    response_csv.headers["Content-Disposition"] = "attachment; filename=applications_list.csv"
    response_csv.headers["Content-type"] = "text/csv"
    return response_csv

# ---------------------------------------------------------------------------- #
@app.route('/api/resumes/set_active', methods=['POST'])
@auth_required()
def set_active_resume():
    data = request.get_json() or {}
    resume_id = data.get('resume_id')
    
    if not resume_id:
        return response(400, "resume_id is required")
        
    try:
        res_oid = ObjectId(resume_id)
    except:
        return response(400, "Invalid resume ID format")
        
    owner_email = g.current_user.get("email")
    resume = resumes_collection.find_one({"_id": res_oid, "owner_email": owner_email})
    if not resume:
        return response(404, "Resume not found or access denied")
        
    # Mark all resumes for this owner inactive first
    resumes_collection.update_many({"owner_email": owner_email}, {"$set": {"is_active": False}})
    # Set selected active
    resumes_collection.update_one({"_id": res_oid}, {"$set": {"is_active": True}})
    
    return response(200, "Active resume updated successfully")

@app.route('/api/candidate/profile_status', methods=['GET'])
@auth_required()
def get_profile_status():
    user = g.current_user
    email = user.get("email")
    
    db_user = users_collection.find_one({"email": email}) or {}
    
    # Active resume lookup
    active_res = resumes_collection.find_one({"owner_email": email, "is_active": True})
    if not active_res:
        active_res = resumes_collection.find_one({"owner_email": email})
        
    has_resume = bool(active_res)
    has_name = bool(db_user.get("name"))
    has_email = bool(db_user.get("email"))
    has_phone = bool(db_user.get("phone") or (active_res and re.search(r'\+?\d[\d -]{7,15}\d', active_res.get("text", ""))))
    
    res_text = active_res.get("text", "").lower() if active_res else ""
    
    has_skills = bool(active_res and active_res.get("skills"))
    has_education = any(k in res_text for k in ["education", "academic", "university", "college", "degree", "bsc", "msc", "phd"])
    has_experience = any(k in res_text for k in ["experience", "employment", "work history", "job", "career"])
    has_linkedin = bool(db_user.get("linkedin") or "linkedin.com" in res_text)
    
    checklist = {
        "resume": has_resume,
        "name": has_name,
        "email": has_email,
        "phone": has_phone,
        "skills": has_skills,
        "education": has_education,
        "experience": has_experience,
        "linkedin": has_linkedin
    }
    
    total_points = 0
    if has_resume: total_points += 25
    if has_name: total_points += 15
    if has_email: total_points += 15
    if has_phone: total_points += 10
    if has_skills: total_points += 15
    if has_education: total_points += 10
    if has_experience: total_points += 10
    
    return response(200, "Profile status fetched", {
        "score": total_points,
        "checklist": checklist,
        "phone": db_user.get("phone", ""),
        "linkedin": db_user.get("linkedin", ""),
        "portfolio": db_user.get("portfolio", "")
    })

@app.route('/api/candidate/recommendations', methods=['GET'])
@auth_required(required_roles={"candidate"})
def get_job_recommendations():
    email = g.current_user.get("email")
    active_res = resumes_collection.find_one({"owner_email": email, "is_active": True})
    if not active_res:
        active_res = resumes_collection.find_one({"owner_email": email})
        
    if not active_res:
        return response(200, "Upload a resume to see recommendations", [])
        
    jobs = list(jobs_collection.find())
    recommendations = []
    
    for job in jobs:
        if job.get("status", "Active") in {"Draft", "Closed"}:
            continue
            
        analysis = analyze_match(
            resume_text=active_res.get("text", ""),
            job_description=job.get("description", ""),
            resume_skills=active_res.get("skills", []),
            candidate_name=g.current_user.get("name", "Candidate")
        )
        
        score = analysis["score"]
        matched = analysis["matched_skills"]
        missing = analysis["missing_skills"]
        
        if score >= 80:
            reason = f"Excellent match! Your resume contains {len(matched)} matching skill keywords (e.g. {', '.join(matched[:3])})."
        elif score >= 50:
            reason = f"Good potential. Matches key requirements like {', '.join(matched[:3])}. Try adding references to {', '.join(missing[:2])} to increase fit."
        else:
            reason = f"General match. Requires skills like {', '.join(missing[:3])}. Study these areas to increase your alignment."
            
        recommendations.append({
            "job_id": str(job["_id"]),
            "title": job.get("title"),
            "company": job.get("company"),
            "location": job.get("location"),
            "score": score,
            "reason": reason,
            "matched_skills": matched,
            "missing_skills": missing
        })
        
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return response(200, "Recommendations fetched", recommendations[:5])

@app.route('/api/candidate/generate_cover_letter', methods=['POST'])
@auth_required(required_roles={"candidate"})
def generate_cover_letter():
    data = request.get_json() or {}
    job_desc = data.get('job_description', '')
    tone = data.get('tone', 'Professional')
    
    if not job_desc:
        return response(400, "job_description is required")
        
    email = g.current_user.get("email")
    db_user = users_collection.find_one({"email": email}) or {}
    
    active_res = resumes_collection.find_one({"owner_email": email, "is_active": True})
    if not active_res:
        active_res = resumes_collection.find_one({"owner_email": email})
        
    if not active_res:
        return response(400, "Please upload a resume first to generate a cover letter.")
        
    analysis = analyze_match(
        resume_text=active_res.get("text", ""),
        job_description=job_desc,
        resume_skills=active_res.get("skills", []),
        candidate_name=db_user.get("name", "Candidate")
    )
    
    matched = analysis["matched_skills"]
    
    cand_name = db_user.get("name", "Candidate Name")
    cand_email = db_user.get("email", "email@address.com")
    cand_phone = db_user.get("phone", "")
    
    contact_str = f"Email: {cand_email}"
    if cand_phone:
        contact_str += f" | Phone: {cand_phone}"
        
    skills_str = ", ".join(matched[:4]) if matched else "software engineering methodologies"
    
    if tone == 'Enthusiastic':
        body = f"I was absolutely thrilled to find the open position. Your commitment to high-impact software solutions is exactly the kind of environment I thrive in! With solid experience in {skills_str}, I am excited to bring my energy and technical skillset to your team."
        signoff = "Best regards and looking forward to connecting,"
    elif tone == 'Creative':
        body = f"Every software engineering challenge is a puzzle waiting to be solved with elegant architecture. Over my career, I've used tools like {skills_str} to craft robust APIs and scale data pipelines. I am eager to apply my creative problem-solving skill to your projects."
        signoff = "Warmly,"
    elif tone == 'Simple':
        body = f"I am writing to apply for the open position. I have a background in software development and practical experience using {skills_str}. I am seeking a role where I can contribute to backend APIs and support your development cycles."
        signoff = "Regards,"
    else: # Professional
        body = f"I am writing to express my interest in the open position. With a background in software development and practical experience implementing solutions using {skills_str}, I am confident in my ability to contribute value to your development team from day one."
        signoff = "Sincerely,"
        
    letter = f"""{cand_name}
{contact_str}

Dear Hiring Manager,

{body}

Throughout my technical path, I have focused on writing clean, reusable code, participating in team code reviews, and configuring automated CI/CD checks to ensure system stability. My matched capabilities in {skills_str} align well with the technical focus of this opportunity.

Thank you for your time and consideration. I would appreciate the chance to discuss how my technical skills and experience can help your team achieve its goals.

{signoff}

{cand_name}"""
    return response(200, "Cover letter generated", {"cover_letter": letter})

@app.route('/api/jobs/withdraw_application', methods=['POST'])
@auth_required(required_roles={"candidate"})
def withdraw_application():
    data = request.get_json() or {}
    app_id = data.get('application_id')
    
    if not app_id:
        return response(400, "application_id is required")
        
    try:
        app_oid = ObjectId(app_id)
    except:
        return response(400, "Invalid application ID format")
        
    email = g.current_user.get("email")
    app_record = applications_collection.find_one({"_id": app_oid, "candidate_email": email})
    if not app_record:
        return response(404, "Application not found or access denied")
        
    if app_record.get("status") != "pending":
        return response(400, "Only pending applications can be withdrawn.")
        
    applications_collection.delete_one({"_id": app_oid})
    return response(200, "Application withdrawn successfully")

# ---------------------------------------------------------------------------- #
# NOTIFICATION API ENDPOINTS
# ---------------------------------------------------------------------------- #

@app.route('/api/notifications', methods=['GET'])
@auth_required()
def get_notifications():
    email = g.current_user.get("email")
    try:
        notifs = list(db['notifications'].find({"user_email": email}).sort("created_at", -1))
        for n in notifs:
            n['_id'] = str(n['_id'])
        return response(200, "Notifications fetched", notifs)
    except Exception as e:
        return response(500, f"Failed to fetch notifications: {e}")

@app.route('/api/notifications/unread_count', methods=['GET'])
@auth_required()
def get_unread_notifications_count():
    email = g.current_user.get("email")
    try:
        count = db['notifications'].count_documents({"user_email": email, "is_read": False})
        return response(200, "Unread count fetched", {"unread_count": count})
    except Exception as e:
        return response(500, f"Failed to fetch unread count: {e}")

@app.route('/api/notifications/mark_read', methods=['POST'])
@auth_required()
def mark_notification_read():
    data = request.get_json() or {}
    notif_id = data.get("notification_id")
    if not notif_id:
        return response(400, "notification_id is required")
    
    try:
        notif_oid = ObjectId(notif_id)
    except:
        return response(400, "Invalid notification ID format")
        
    email = g.current_user.get("email")
    notif = db['notifications'].find_one({"_id": notif_oid, "user_email": email})
    if not notif:
        return response(404, "Notification not found or access denied")
        
    db['notifications'].update_one({"_id": notif_oid}, {"$set": {"is_read": True}})
    return response(200, "Notification marked as read")

@app.route('/api/notifications/mark_all_read', methods=['POST'])
@auth_required()
def mark_all_notifications_read():
    email = g.current_user.get("email")
    try:
        db['notifications'].update_many({"user_email": email, "is_read": False}, {"$set": {"is_read": True}})
        return response(200, "All notifications marked as read")
    except Exception as e:
        return response(500, f"Failed to mark all notifications as read: {e}")

# ---------------------------------------------------------------------------- #

################################################################################
# ---------------------------  Admin Panel Routes ---------------------------- #
################################################################################

@app.route('/api/admin/users', methods=['GET'])
@auth_required(required_roles={"admin", "super_admin"})
def admin_list_users():
    """List all users for admin management panel."""
    search = request.args.get('search', '').strip().lower()
    
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"role": {"$regex": search, "$options": "i"}}
        ]
    
    users = list(users_collection.find(query).sort("created_at", -1))
    result = []
    for u in users:
        result.append({
            "_id": str(u["_id"]),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "candidate"),
            "status": u.get("status", "active"),
            "created_at": u.get("created_at")
        })
    
    return response(200, "Users fetched", result)

@app.route('/api/admin/users/update', methods=['POST'])
@auth_required(required_roles={"admin", "super_admin"})
def admin_update_user():
    """Update a user's role or status. Hierarchy enforced."""
    data = request.get_json() or {}
    target_user_id = data.get("user_id")
    new_role = data.get("role")
    new_status = data.get("status")
    
    if not target_user_id:
        return response(400, "user_id is required")
    
    try:
        target_oid = ObjectId(target_user_id)
    except:
        return response(400, "Invalid user ID format")
    
    target_user = users_collection.find_one({"_id": target_oid})
    if not target_user:
        return response(404, "User not found")
    
    current_user = g.current_user
    current_role = current_user.get("role", "admin")
    target_role = target_user.get("role", "candidate")
    
    # Hierarchy enforcement: only super_admin can modify admin/super_admin users
    if target_role in {"admin", "super_admin"} and current_role != "super_admin":
        return response(403, "Only super admins can modify admin or super admin accounts")
    
    # Cannot modify yourself (prevents accidental self-demotion)
    if str(current_user["_id"]) == target_user_id:
        return response(400, "You cannot modify your own account from the admin panel")
    
    update_fields = {}
    audit_metadata = {"target_email": target_user.get("email")}
    
    if new_role:
        allowed_target_roles = {"candidate", "recruiter", "admin", "super_admin"}
        if new_role not in allowed_target_roles:
            return response(400, f"Role must be one of: {', '.join(sorted(allowed_target_roles))}")
        # Only super_admin can promote to admin/super_admin
        if new_role in {"admin", "super_admin"} and current_role != "super_admin":
            return response(403, "Only super admins can assign admin or super admin roles")
        update_fields["role"] = new_role
        audit_metadata["new_role"] = new_role
        audit_metadata["old_role"] = target_role
    
    if new_status:
        allowed_statuses = {"active", "blocked", "pending"}
        if new_status not in allowed_statuses:
            return response(400, f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        update_fields["status"] = new_status
        audit_metadata["new_status"] = new_status
        audit_metadata["old_status"] = target_user.get("status", "active")
    
    if not update_fields:
        return response(400, "No changes specified. Provide 'role' or 'status'.")
    
    users_collection.update_one({"_id": target_oid}, {"$set": update_fields})
    
    # Determine audit action
    actions = []
    if "role" in update_fields:
        actions.append("user role changed")
    if "status" in update_fields:
        if new_status == "blocked":
            actions.append("user blocked")
        elif new_status == "active" and target_user.get("status") == "blocked":
            actions.append("user unblocked")
        else:
            actions.append("user status changed")
    
    for action in actions:
        log_audit_action(
            user_id=current_user["_id"],
            action=action,
            target_type="user",
            target_id=target_user_id,
            metadata=audit_metadata
        )
    
    return response(200, "User updated successfully")

@app.route('/api/admin/audit_logs', methods=['GET'])
@auth_required(required_roles={"admin", "super_admin"})
def admin_get_audit_logs():
    """Query audit logs with optional filters."""
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 50)), 100)
    search = request.args.get('search', '').strip()
    action_filter = request.args.get('action', '').strip()
    
    query = {}
    conditions = []
    
    if search:
        conditions.append({
            "$or": [
                {"email": {"$regex": search, "$options": "i"}},
                {"action": {"$regex": search, "$options": "i"}},
                {"target_type": {"$regex": search, "$options": "i"}}
            ]
        })
    
    if action_filter:
        conditions.append({"action": {"$regex": action_filter, "$options": "i"}})
    
    if conditions:
        query = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    
    skip = (page - 1) * limit
    total = audit_logs_collection.count_documents(query)
    logs = list(audit_logs_collection.find(query).sort("timestamp", -1).skip(skip).limit(limit))
    
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return response(200, "Audit logs fetched", {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit)
    })

################################################################################
# ---------------------------  Activity Feed Routes -------------------------- #
################################################################################

@app.route('/api/activity', methods=['GET'])
@auth_required()
def get_activity_feed():
    """Get recent activity feed from audit logs."""
    user = g.current_user
    role = user.get("role", "candidate")
    email = user.get("email")
    limit = min(int(request.args.get('limit', 20)), 50)
    
    if role in {"admin", "super_admin"}:
        # Admins see all activity
        relevant_actions = [
            "login", "resume uploaded", "job created", "job status changed",
            "application status changed", "password changed",
            "password reset requested", "user blocked", "user unblocked",
            "user role changed", "user status changed"
        ]
        query = {"action": {"$in": relevant_actions}}
    else:
        # Recruiters and Candidates see only their own activity
        query = {"email": email}
    
    logs = list(audit_logs_collection.find(query).sort("timestamp", -1).limit(limit))
    
    activity = []
    for log in logs:
        meta = log.get("metadata", {})
        
        # Build human-readable description
        action = log.get("action", "Unknown action")
        actor = log.get("email", "System")
        target_type = log.get("target_type", "")
        
        if action == "login":
            desc = f"{actor} logged in"
        elif action == "resume uploaded":
            fname = meta.get("original_filename", "resume")
            desc = f"{actor} uploaded resume '{fname}'"
        elif action == "job created":
            title = meta.get("title", "Untitled")
            desc = f"{actor} posted job '{title}'"
        elif action == "job status changed":
            status = meta.get("status", "")
            desc = f"{actor} changed job status to '{status}'"
        elif action == "application status changed":
            status = meta.get("status", "")
            cand = meta.get("candidate_email", "candidate")
            job = meta.get("job_title", "position")
            desc = f"{actor} set {cand}'s application for '{job}' to '{status}'"
        elif action == "password changed":
            desc = f"{actor} changed their password"
        elif action == "password reset requested":
            desc = f"Password reset requested for {meta.get('email', 'account')}"
        elif action == "user blocked":
            desc = f"{actor} blocked user {meta.get('target_email', '')}"
        elif action == "user unblocked":
            desc = f"{actor} unblocked user {meta.get('target_email', '')}"
        elif action == "user role changed":
            desc = f"{actor} changed role of {meta.get('target_email', '')} to {meta.get('new_role', '')}"
        else:
            desc = f"{actor}: {action}"
        
        ts = log.get("timestamp")
        if isinstance(ts, datetime):
            time_str = ts.strftime("%Y-%m-%d %H:%M")
        else:
            time_str = str(ts) if ts else "Unknown"
        
        activity.append({
            "action": action,
            "description": desc,
            "timestamp": time_str,
            "actor": actor,
            "target_type": target_type
        })
    
    return response(200, "Activity feed fetched", activity)

################################################################################
# ---------------------------  Global Search Routes -------------------------- #
################################################################################

@app.route('/api/search', methods=['GET'])
@auth_required()
def global_search():
    """Global search across candidates, jobs, and applications."""
    q = request.args.get('q', '').strip()
    if not q or len(q) < 2:
        return response(400, "Search query must be at least 2 characters")
    
    user = g.current_user
    role = user.get("role", "candidate")
    email = user.get("email")
    results = {"candidates": [], "jobs": [], "applications": []}
    
    regex_q = {"$regex": q, "$options": "i"}
    
    if role in {"recruiter", "admin", "super_admin"}:
        # Search candidates (resumes)
        candidate_query = {"$or": [
            {"name": regex_q},
            {"owner_email": regex_q},
            {"skills": regex_q}
        ]}
        candidates = list(resumes_collection.find(candidate_query).limit(10))
        for c in candidates:
            results["candidates"].append({
                "_id": str(c["_id"]),
                "name": c.get("name", "Unknown"),
                "email": c.get("owner_email", ""),
                "skills": c.get("skills", [])[:5],
                "filename": c.get("original_filename", "")
            })
        
        # Search jobs
        job_query = {"$or": [
            {"title": regex_q},
            {"company": regex_q},
            {"location": regex_q},
            {"description": regex_q}
        ]}
        jobs = list(jobs_collection.find(job_query).limit(10))
        for j in jobs:
            results["jobs"].append({
                "_id": str(j["_id"]),
                "title": j.get("title", ""),
                "company": j.get("company", ""),
                "status": j.get("status", "Active"),
                "location": j.get("location", "")
            })
        
        # Search applications
        app_query = {"$or": [
            {"candidate_name": regex_q},
            {"candidate_email": regex_q},
            {"job_title": regex_q},
            {"status": regex_q}
        ]}
        apps = list(applications_collection.find(app_query).limit(10))
        for a in apps:
            results["applications"].append({
                "_id": str(a["_id"]),
                "candidate_name": a.get("candidate_name", ""),
                "job_title": a.get("job_title", ""),
                "status": a.get("status", "pending"),
                "score": a.get("score", 0)
            })
    else:
        # Candidate: search only jobs and own applications
        job_query = {"$or": [
            {"title": regex_q},
            {"company": regex_q},
            {"location": regex_q}
        ], "status": "Active"}
        jobs = list(jobs_collection.find(job_query).limit(10))
        for j in jobs:
            results["jobs"].append({
                "_id": str(j["_id"]),
                "title": j.get("title", ""),
                "company": j.get("company", ""),
                "status": j.get("status", "Active"),
                "location": j.get("location", "")
            })
        
        app_query = {
            "candidate_email": email,
            "$or": [
                {"job_title": regex_q},
                {"status": regex_q}
            ]
        }
        apps = list(applications_collection.find(app_query).limit(10))
        for a in apps:
            results["applications"].append({
                "_id": str(a["_id"]),
                "job_title": a.get("job_title", ""),
                "status": a.get("status", "pending"),
                "score": a.get("score", 0)
            })
    
    return response(200, "Search results", results)

################################################################################
# ---------------------------  Export Routes (New) --------------------------- #
################################################################################

@app.route('/api/export/candidates', methods=['GET'])
@auth_required(required_roles={"recruiter", "admin", "super_admin"})
def export_candidates():
    """Export all candidates (resumes) as CSV."""
    import io
    import csv
    from flask import make_response
    
    resumes = list(resumes_collection.find().sort("uploaded_at", -1))
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Name", "Email", "Skills", "Active", "Filename", "Upload Date", "Duplicate Warnings", "Inconsistencies"])
    
    for r in resumes:
        skills_str = ", ".join(r.get("skills", []))
        uploaded = r.get("uploaded_at")
        date_str = uploaded.strftime("%Y-%m-%d") if isinstance(uploaded, datetime) else str(uploaded)
        dup_count = len(r.get("duplicate_warnings", []))
        inc_count = len(r.get("potential_inconsistencies", []))
        
        writer.writerow([
            r.get("name", "Unknown"),
            r.get("owner_email", "Unknown"),
            skills_str,
            "Yes" if r.get("is_active") else "No",
            r.get("original_filename", "Unknown"),
            date_str,
            dup_count,
            inc_count
        ])
    
    response_csv = make_response(output.getvalue())
    response_csv.headers["Content-Disposition"] = "attachment; filename=candidates_list.csv"
    response_csv.headers["Content-type"] = "text/csv"
    return response_csv

# ---------------------------------------------------------------------------- #
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000, debug=FLASK_DEBUG_ENABLED)
