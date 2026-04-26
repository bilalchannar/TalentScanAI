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
        return jsonify({ "error": "Request body must be in JSON" }), 400

    email = data.get('email')

    if not email:
        return jsonify({ "error": "Email field is required" }), 400

    user = users_collection.find_one({ "email": email })
    if not user:
        return jsonify({"error": "No such user found"}), 400

    # Generate a unique reset token
    reset_token = str(uuid4())
    tokens_collection.insert_one({ "email": email, "token": reset_token })

    # TODO: send token via email

    return jsonify({ "message": "Password reset token generated" }), 200

# ---------------------------------------------------------------------------- #
# TODO: check
@app.route("/api/auth/reset", methods=["POST"])
def reset():
    data = request.get_json()

    if not data:
        return jsonify({ "error": "Request body must be in JSON" }), 400

    reset_token = data.get('reset_token')
    new_password = data.get('new_password')

    if not reset_token:
        return jsonify({ "error": "Field 'reset_token' is required" }), 400
    if not new_password:
        return jsonify({ "error": "Field 'new_password' is required" }), 400

    # Validate password strength
    password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if not re.match(password_regex, new_password):
        return jsonify({
            "error": "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character"
        }), 400

    # Check if the token exists and get the email
    token_entry = tokens_collection.find_one({ "token": reset_token })
    if not token_entry:
        return jsonify({ "error": "Reset token provided is invalid" }), 400

    email = token_entry['email']

    # Update the user's password
    users_collection.update_one({ "email": email }, {
        "$set": { "password": new_password }
    })

    # Delete reset token as it has been used
    tokens_collection.delete_one({ "token": reset_token })

    return jsonify({ "message": "Password reset successful" }), 200

# ---------------------------------------------------------------------------- #
# TODO: check
@app.route("/api/auth/change", methods=["POST"])
def change_password():
    data = request.get_json()

    # Ensure data exists in request
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Extract JWT token and new password details
    token = request.headers.get('Authorization')
    if not token or not token.startswith("Bearer "):
        return jsonify({"error": "Authorization token required"}), 401
    token = token.split(" ")[1]  # Remove 'Bearer ' prefix

    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    # Validate input
    if not current_password or not new_password or not confirm_password:
        return jsonify({"error": "Current password, new password, and confirm password are required"}), 400
    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match"}), 400

    # Validate password strength (same as previous password pattern)
    password_regex = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    if not re.match(password_regex, new_password):
        return jsonify({
            "error": "Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character"
        }), 400

    try:
        # Decode the JWT token to get the email
        decoded_token = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        email = decoded_token['email']
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    # Fetch the user from the database using the decoded email
    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check if the current password is correct
    if user['password'] != current_password:  # In production, compare hashed passwords
        return jsonify({"error": "Current password is incorrect"}), 401

    # Update the user's password in the database
    users_collection.update_one({"email": email}, {"$set": {"password": new_password}})

    return jsonify({"message": "Password updated successfully"}), 200

################################################################################
# --------------------------  Resume Related Routes -------------------------- #
################################################################################

@app.route('/api/resumes/get_all', methods=['GET'])
def get_all_resumes():
    return json_util.dumps({ "data": resumes_collection.find() }), 200

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

    
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000, debug=True)
