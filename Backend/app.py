import re
import jwt
import json
import os
from datetime import datetime, timedelta
from os import environ, urandom, makedirs
from functools import wraps
from flask_cors import CORS
from bson import ObjectId
from bson import json_util
from bson.errors import InvalidId
from uuid import uuid4
from pymongo import MongoClient
from flask import Flask, request, jsonify, send_from_directory, g
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import PyPDF2
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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
ALLOWED_ROLES = {"candidate", "recruiter"}

if not environ.get("JWT_SECRET_KEY"):
    print("WARNING: JWT_SECRET_KEY is not set. Tokens will be invalidated on server restart.")

RESUMES_UPLOAD_FOLDER = 'static/resumes'
makedirs(RESUMES_UPLOAD_FOLDER, exist_ok=True)

db_name = environ.get("MONGO_DATABASE_NAME", "TalentScanAI")
db_url = environ.get("MONGO_CONNECTION_URL", "mongodb://127.0.0.1:27017")

db = MongoClient(db_url)[db_name]

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

    email = data.get("email")
    password = data.get("password")
    selected_role = str(data.get("role", "")).strip().lower()

    if not email or not password:
        return response(400, "Fields 'email' and 'password' are required")
    if selected_role and selected_role not in ALLOWED_ROLES:
        return response(400, f"Role must be one of: {', '.join(sorted(ALLOWED_ROLES))}")

    # Fetch user from the database
    user = users_collection.find_one({ "email": email })

    if not user or not check_password_hash(user["password"], password):
        return response(400, "Invalid email or password")

    user_role = user.get("role", "candidate")
    if selected_role and selected_role != user_role:
        return response(403, f"Role mismatch: this account is registered as {user_role}")

    now_utc = datetime.utcnow()

    # Generate JWT token with role and expiration claims
    token_payload = {
        "email": email,
        "role": user_role,
        "iat": now_utc,
        "exp": now_utc + timedelta(minutes=JWT_EXP_MINUTES)
    }
    token = jwt.encode(token_payload, JWT_SECRET_KEY, algorithm="HS256")

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
        "created_at": datetime.utcnow()
    })

    return response(201, "User registered successfully")

# ---------------------------------------------------------------------------- #

# TODO: check
@app.route("/api/auth/forgot", methods=["POST"])
def forgot():
    data = request.get_json()

    if not data:
        return response(400, "Request body must be in JSON")

    email = data.get('email')

    if not email:
        return response(400, "Email field is required")

    user = users_collection.find_one({ "email": email })
    generic_message = "If the account exists, a reset token has been generated"
    if not user:
        return response(200, generic_message)

    # Generate a unique reset token
    reset_token = str(uuid4())
    now_utc = datetime.utcnow()
    tokens_collection.delete_many({ "email": email })
    tokens_collection.insert_one({
        "email": email,
        "token": reset_token,
        "created_at": now_utc,
        "expires_at": now_utc + timedelta(minutes=RESET_TOKEN_EXP_MINUTES)
    })

    # TODO: send token via email
    if EXPOSE_RESET_TOKEN:
        return response(200, generic_message, { "reset_token": reset_token })
    return response(200, generic_message)

# ---------------------------------------------------------------------------- #
# TODO: check
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

    # Check if the token exists and get the email
    token_entry = tokens_collection.find_one({ "token": reset_token })
    if not token_entry:
        return response(400, "Reset token is invalid or expired")

    expires_at = token_entry.get("expires_at")
    if expires_at and expires_at < datetime.utcnow():
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

    # Delete reset token as it has been used
    tokens_collection.delete_one({"_id": token_entry["_id"]})

    return response(200, "Password reset successful")

# ---------------------------------------------------------------------------- #
@app.route("/api/auth/change", methods=["POST"])
def change_password():
    data = request.get_json()

    # Ensure data exists in request
    if not data:
        return response(400, "Request body must be JSON")

    user, auth_error = get_authenticated_user()
    if auth_error:
        return auth_error

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

    return response(200, "Password updated successfully")

@app.route('/api/auth/update_profile', methods=['POST'])
@auth_required()
def update_profile():
    data = request.get_json()
    new_name = data.get('name')
    new_email = data.get('email')
    
    if not new_name or not new_email:
        return response(400, "Name and email are required")
        
    users_collection.update_one(
        {"email": g.current_user.get("email")},
        {"$set": {"name": new_name, "email": new_email}}
    )
    return response(200, "Profile updated successfully")

@app.route('/api/support/ticket', methods=['POST'])
@auth_required()
def create_ticket():
    data = request.get_json()
    subject = data.get('subject')
    message = data.get('message')
    
    if not message:
        return response(400, "Message is required")
        
    # In a real app, we'd save this to a tickets collection
    # For now, we'll just log it
    print(f"SUPPORT TICKET from {g.current_user.get('email')}: {subject} - {message}")
    
    return response(201, "Support ticket created successfully")

################################################################################
# --------------------------  Resume Related Routes -------------------------- #
################################################################################

@app.route('/api/resumes/get_all', methods=['GET'])
@auth_required(required_roles={"recruiter"})
def get_all_resumes():
    resumes = list(resumes_collection.find())
    for resume in resumes:
        resume['_id'] = str(resume['_id'])
    return response(200, "Resumes fetched", resumes)

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/total_count', methods=['GET'])
@auth_required(required_roles={"recruiter"})
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

    resumes_collection.delete_one({"_id": resume_object_id})
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
    if 'file' not in request.files:
        return response(400, "No file part")
    
    current_user = g.current_user
    file = request.files['file']
    owner_email = current_user.get("email")

    if current_user.get("role") == "recruiter":
        requested_owner_email = request.form.get('owner_email', '').strip()
        if requested_owner_email:
            owner_email = requested_owner_email
    
    if file.filename == '':
        return response(400, "No selected file")
    
    if file and file.filename.lower().endswith('.pdf'):
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid4()}_{original_filename}"
        file_path = os.path.join(RESUMES_UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Extract text
        text = extract_text_from_pdf(file_path)
        
        # AUTO EXTRACT NAME (Fallback if no owner name)
        candidate_name = extract_name(text, original_filename)
        
        # Extract skills
        skills = extract_skills(text)
        
        # Save to DB
        resume_data = {
            "name": candidate_name,
            "owner_email": owner_email, # Link to account
            "uploaded_by": current_user.get("email"),
            "filename": unique_filename,
            "original_filename": original_filename,
            "path": file_path,
            "text": text,
            "skills": skills,
            "uploaded_at": datetime.utcnow()
        }
        resumes_collection.insert_one(resume_data)
        
        return response(201, "Resume uploaded and processed successfully", {"name": candidate_name, "skills": skills})
    
    return response(400, "Invalid file format. Only PDFs are allowed.")

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
        
    for r in resumes:
        r['_id'] = str(r['_id'])
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

    # Clean the Job Description
    cleaned_jd = clean_text(job_description)
    
    # Clean all resume texts
    resume_texts = [clean_text(r.get('text', '')) for r in resumes]
    
    print(f"DEBUG: Ranking {len(resumes)} resumes against JD. JD length: {len(cleaned_jd)}")
    
    # Combine JD and resumes for vectorization
    all_texts = [cleaned_jd] + resume_texts
    
    try:
        # 1. Vectorize
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        feature_names = vectorizer.get_feature_names_out()
        
        # 2. Calculate Similarity
        jd_vector = tfidf_matrix[0:1]
        resume_vectors = tfidf_matrix[1:]
        cosine_sim = cosine_similarity(jd_vector, resume_vectors)
        
        ranked_results = []
        for i, score in enumerate(cosine_sim[0]):
            raw_score = float(score)
            
            # 3. Identify Missing Skills & Recommendations
            resume_text_clean = resume_texts[i]
            missing_skills = []
            matched_skills = []
            for skill in GLOBAL_TECH_KEYWORDS:
                if skill in cleaned_jd:
                    if skill in resume_text_clean:
                        matched_skills.append(skill.title())
                    else:
                        missing_skills.append(skill.title())
            
            # 5. Generate Dynamic Recommendations
            recommendations = []
            if missing_skills:
                recommendations.append(f"Focus on learning: {', '.join(missing_skills[:3])}")
            if raw_score < 0.2:
                recommendations.append("The resume lacks several core technical keywords mentioned in the JD.")
            else:
                recommendations.append("Great technical foundation. Consider highlighting specific projects using these tools.")

            # Robust Industry Scaling
            if raw_score > 0.3:
                final_score = 85 + (raw_score * 15)
            elif raw_score > 0.1:
                final_score = 60 + (raw_score * 100)
            else:
                final_score = raw_score * 500

            ranked_results.append({
                "id": str(resumes[i]['_id']),
                "name": resumes[i].get('name', 'Unknown'),
                "score": round(min(99.9, final_score), 2),
                "filename": resumes[i].get('filename', 'Unknown'),
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "recommendations": recommendations,
                "summary": f"Candidate matches {len(matched_skills)} key requirements but lacks {len(missing_skills)} others."
            })

        ranked_results.sort(key=lambda x: x['score'], reverse=True)
        return response(200, "Resumes ranked successfully", ranked_results)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"RANKING ERROR: {error_trace}")
        return response(500, f"Internal error during ranking: {str(e)}")

@app.route('/api/stats', methods=['GET'])
@auth_required(required_roles={"recruiter"})
def get_stats():
    resumes = list(resumes_collection.find())
    total_resumes = len(resumes)
    
    # Active Jobs count
    total_jobs = jobs_collection.count_documents({})
    
    # Total Applications count
    total_apps = applications_collection.count_documents({})
    
    # Calculate top skills
    all_skills = []
    for r in resumes:
        all_skills.extend(r.get('skills', []))
    
    from collections import Counter
    skill_counts = Counter(all_skills).most_common(5)
    
    # Recent activity
    recent_uploads = []
    sorted_resumes = sorted(resumes, key=lambda x: x.get('uploaded_at', datetime.min), reverse=True)
    for r in sorted_resumes[:5]:
        recent_uploads.append({
            "name": r.get('name', 'Anonymous'),
            "date": r.get('uploaded_at').strftime("%Y-%m-%d") if r.get('uploaded_at') and isinstance(r.get('uploaded_at'), datetime) else "Recently"
        })

    stats_data = {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "total_applications": total_apps,
        "top_skills": [{"skill": s, "count": c} for s, c in skill_counts],
        "recent_activity": recent_uploads,
        "total_skills_found": len(set(all_skills))
    }
    
    return response(200, "Stats fetched successfully", stats_data)

# ################################################################################
# # ---------------------------  Job Related Routes --------------------------- #
# ################################################################################

@app.route('/api/jobs/create', methods=['POST'])
@auth_required(required_roles={"recruiter"})
def create_job():
    data = request.get_json()
    if not data:
        return response(400, "Invalid JSON")
    
    title = data.get('title')
    company = data.get('company')
    description = data.get('description')
    location = data.get('location', 'Remote')
    
    if not title or not description:
        return response(400, "Title and description are required")
    
    job_data = {
        "title": title,
        "company": company or "TalentScan Partner",
        "description": description,
        "location": location,
        "posted_by": g.current_user.get("email"),
        "created_at": datetime.utcnow()
    }
    
    result = jobs_collection.insert_one(job_data)
    return response(201, "Job posted successfully", {"id": str(result.inserted_id)})

@app.route('/api/jobs/list', methods=['GET'])
def list_jobs():
    jobs = list(jobs_collection.find().sort("created_at", -1))
    for j in jobs:
        j['_id'] = str(j['_id'])
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
    
    application = {
        "job_id": str(job_oid),
        "job_title": job.get("title"),
        "candidate_name": g.current_user.get("name"),
        "candidate_email": g.current_user.get("email"),
        "resume_id": str(resume_oid),
        "resume_name": resume.get("original_filename"),
        "status": "pending",
        "applied_at": datetime.utcnow()
    }
    
    applications_collection.insert_one(application)
    return response(201, "Application submitted successfully")

@app.route('/api/jobs/my_applications', methods=['GET'])
@auth_required(required_roles={"candidate"})
def my_applications():
    apps = list(applications_collection.find({"candidate_email": g.current_user.get("email")}))
    for a in apps:
        a['_id'] = str(a['_id'])
    return response(200, "Applications fetched", apps)

@app.route('/api/jobs/recruiter_applications', methods=['GET'])
@auth_required(required_roles={"recruiter"})
def recruiter_applications():
    apps = list(applications_collection.find().sort("applied_at", -1))
    for a in apps:
        a['_id'] = str(a['_id'])
    return response(200, "Applications fetched", apps)

# ---------------------------------------------------------------------------- #
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000, debug=FLASK_DEBUG_ENABLED)
