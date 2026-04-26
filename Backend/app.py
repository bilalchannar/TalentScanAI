import re
import jwt
import json
import os
from datetime import datetime
from os import environ, urandom, makedirs
from flask_cors import CORS
from bson import ObjectId
from bson import json_util
from uuid import uuid4
from pymongo import MongoClient
from flask import Flask, request, jsonify, send_from_directory
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
CORS(app)
JWT_SECRET_KEY = urandom(32).hex()

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
    return response(500, str(e))

users_collection = db['users']
resumes_collection = db['resumes']
tokens_collection = db['reset_tokens']

def response(code, message, data=None):
    # Ensure data is JSON serializable (handle MongoDB ObjectIds)
    if data is not None:
        data = json.loads(json_util.dumps(data))
    return jsonify({ "data": data, "message": message, "success": (code >= 200 and code <= 299) }), code

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

    if not email or not password:
        return response(400, "Fields 'email' and 'password' are required")

    # Fetch user from the database
    user = users_collection.find_one({ "email": email })

    if not user or not check_password_hash(user["password"], password):
        return response(400, "Invalid email or password")

    # Generate JWT token
    token = jwt.encode({ "email": email }, JWT_SECRET_KEY, algorithm="HS256")

    # Return the token, email, and role to the client
    return response(200, "Login successful", { 
        "token": token, 
        "role": user.get("role", "candidate"),
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
    role = data.get('role', 'candidate') # Default to candidate

    if not name:
        return response(400, "Field 'name' is required")
    if not email:
        return response(400, "Field 'email' is required")
    if not password:
        return response(400, "Field 'password' is required")

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
    if not user:
        return response(400, "No such user found")

    # Generate a unique reset token
    reset_token = str(uuid4())
    tokens_collection.insert_one({ "email": email, "token": reset_token })

    # TODO: send token via email

    return response(200, "Password reset token generated", { "reset_token": reset_token })

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
        return response(400, "Reset token provided is invalid")

    email = token_entry['email']

    # Update the user's password (hashed)
    users_collection.update_one({ "email": email }, {
        "$set": { "password": generate_password_hash(new_password) }
    })

    # Delete reset token as it has been used
    tokens_collection.delete_one({ "token": reset_token })

    return response(200, "Password reset successful")

# ---------------------------------------------------------------------------- #
@app.route("/api/auth/change", methods=["POST"])
def change_password():
    data = request.get_json()

    # Ensure data exists in request
    if not data:
        return response(400, "Request body must be JSON")

    # Extract JWT token from Authorization header
    token = request.headers.get('Authorization')
    if not token or not token.startswith("Bearer "):
        return response(401, "Authorization token required")
    token = token.split(" ")[1]  # Remove 'Bearer ' prefix

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

    try:
        # Decode the JWT token to get the email
        decoded_token = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        email = decoded_token['email']
    except jwt.ExpiredSignatureError:
        return response(401, "Token has expired")
    except jwt.InvalidTokenError:
        return response(401, "Invalid token")

    # Fetch the user from the database using the decoded email
    user = users_collection.find_one({"email": email})

    if not user:
        return response(404, "User not found")

    # Check if the current password is correct (compare against hashed password)
    if not check_password_hash(user['password'], current_password):
        return response(401, "Current password is incorrect")

    # Update the user's password in the database (store hashed)
    users_collection.update_one({"email": email}, {"$set": {"password": generate_password_hash(new_password)}})

    return response(200, "Password updated successfully")

################################################################################
# --------------------------  Resume Related Routes -------------------------- #
################################################################################

@app.route('/api/resumes/get_all', methods=['GET'])
def get_all_resumes():
    from flask import Response
    return Response(json_util.dumps({ "data": list(resumes_collection.find()) }), status=200, mimetype='application/json')

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/total_count', methods=['GET'])
def get_total_resume_count():
    return jsonify({ "data": resumes_collection.count_documents({}) }), 200

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/delete_by_id/<resume_id>', methods=['DELETE'])
def delete_resume_by_id(resume_id):
    resumes_collection.delete_one({ "_id": ObjectId(resume_id) })
    return jsonify({ "message": "Resume deleted successfully" }), 200

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
def view_resume(filename):
    return send_from_directory(RESUMES_UPLOAD_FOLDER, filename)

@app.route('/api/resumes/upload', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return response(400, "No file part")
    
    file = request.files['file']
    owner_email = request.form.get('owner_email', 'anonymous')
    
    if file.filename == '':
        return response(400, "No selected file")
    
    if file and file.filename.endswith('.pdf'):
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
def list_resumes():
    owner_email = request.args.get('owner_email')
    
    # If email provided, filter by it (Candidate mode)
    if owner_email:
        resumes = list(resumes_collection.find({"owner_email": owner_email}))
    else:
        # No email = Recruiter mode (See all)
        resumes = list(resumes_collection.find())
        
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
def rank_resumes():
    data = request.get_json()
    job_description = data.get('job_description')

    if not job_description:
        return response(400, "Job description is required")

    resumes = list(resumes_collection.find())
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
def get_stats():
    resumes = list(resumes_collection.find())
    total_resumes = len(resumes)
    
    # Calculate top skills
    all_skills = []
    for r in resumes:
        all_skills.extend(r.get('skills', []))
    
    from collections import Counter
    skill_counts = Counter(all_skills).most_common(5)
    
    # Recent activity (last 7 days - simplified for now)
    # We'll just return the count for the last 5 uploads
    recent_uploads = []
    sorted_resumes = sorted(resumes, key=lambda x: x.get('uploaded_at', datetime.min), reverse=True)
    for r in sorted_resumes[:5]:
        recent_uploads.append({
            "name": r.get('name'),
            "date": r.get('uploaded_at').strftime("%Y-%m-%d") if r.get('uploaded_at') else "Unknown"
        })

    stats_data = {
        "total_resumes": total_resumes,
        "top_skills": [{"skill": s, "count": c} for s, c in skill_counts],
        "recent_activity": recent_uploads,
        "total_skills_found": len(set(all_skills))
    }
    
    return response(200, "Stats fetched successfully", stats_data)

# ---------------------------------------------------------------------------- #
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000, debug=True)
