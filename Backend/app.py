import re
import jwt

from os import environ
from os import urandom
from os import makedirs

from flask_cors import CORS
from bson import ObjectId
from bson import json_util
from uuid import uuid4
from pymongo import MongoClient
from flask import Flask, request, jsonify

################################################################################
# ------------------------------ Initialization ------------------------------ #
################################################################################

app = Flask(__name__)
CORS(app)
JWT_SECRET_KEY = urandom(32).hex()

RESUMES_UPLOAD_FOLDER = 'static/resumes'
makedirs(RESUMES_UPLOAD_FOLDER, exist_ok=True)

assert environ.get("MONGO_DATABASE_NAME")
assert environ.get("MONGO_CONNECTION_URL")

db = MongoClient(environ["MONGO_CONNECTION_URL"])[environ["MONGO_DATABASE_NAME"]]

users_collection = db['users']
resumes_collection = db['resumes']
tokens_collection = db['reset_tokens']

def response(code, message, data=None):
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

    if not user or user["password"] != password:
        return response(400, "Invalid email or password")

    # Generate JWT token
    token = jwt.encode({ "email": email }, JWT_SECRET_KEY, algorithm="HS256")

    # Return the token to the client
    return response(200, "Login successful", { "token": token })

# ---------------------------------------------------------------------------- #

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if not data:
        return response(400, "Invalid or empty JSON payload")

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

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

    # Add new user to database
    users_collection.insert_one({
        "name": name,
        "email": email,
        "password": password
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

    return response(200, "Password reset token generated")

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

    # Update the user's password
    users_collection.update_one({ "email": email }, {
        "$set": { "password": new_password }
    })

    # Delete reset token as it has been used
    tokens_collection.delete_one({ "token": reset_token })

    return response(200, "Password reset successful")

# ---------------------------------------------------------------------------- #
# TODO: check
@app.route("/api/auth/change", methods=["POST"])
def change_password():
    data = request.get_json()

    # Ensure data exists in request
    if not data:
        return response(400, "Request body must be JSON")

    # Extract JWT token and new password details
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

    # Validate password strength (same as previous password pattern)
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

    # Check if the current password is correct
    if user['password'] != current_password:  # In production, compare hashed passwords
        return response(401, "Current password is incorrect")

    # Update the user's password in the database
    users_collection.update_one({"email": email}, {"$set": {"password": new_password}})

    return response(200, "Password updated successfully")

################################################################################
# --------------------------  Resume Related Routes -------------------------- #
################################################################################

@app.route('/api/resumes/get_all', methods=['GET'])
def get_all_resumes():
    resumes = list(resumes_collection.find())
    return jsonify({ "data": resumes }), 200

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/total_count', methods=['GET'])
def get_total_resume_count():
    return jsonify({ "data": resumes_collection.count_documents({}) }), 200

# ---------------------------------------------------------------------------- #

@app.route('/api/resumes/delete_by_id/<resume_id>', methods=['DELETE'])
def delete_resume_by_id(resume_id):
    try:
        resumes_collection.delete_one({ "_id": ObjectId(resume_id) })
        return response(200, "Resume deleted successfully")
    except Exception as e:
        return response(400, f"Invalid resume ID: {str(e)}")

# ---------------------------------------------------------------------------- #

    
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000, debug=True)
