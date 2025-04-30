from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
from dotenv import load_dotenv  # type: ignore
from flask import Flask, jsonify, request
from flask_cors import CORS  # Import CORS
from pymongo import MongoClient
import jwt
import bcrypt
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()

# ---- Config ----
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_EXPIRY = int(os.getenv("JWT_EXPIRY", 24))  # in hours
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_SCOPES = os.getenv("GOOGLE_SCOPES", "https://www.googleapis.com/auth/gmail.modify")

# ---- App Setup ----
app = Flask(__name__)

# Apply CORS to all routes (globally) with preflight handling
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# ---- Mongo Setup ----
mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/spam_sniffer")
client = MongoClient(mongo_uri)
db = client.spam_sniffer
users = db.users  # ✅ this defines the MongoDB collection

# ---- Helper: Token Validation ----
def validate_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ---- Handle Preflight OPTIONS Requests ----
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response
    return None

# ---- API: Initiate Google OAuth Flow ----
@app.route("/api/google-auth-url", methods=["GET"])
def google_auth_url():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        return jsonify({"error": "Missing Google OAuth credentials in environment variables"}), 500

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }

    try:
        flow = Flow.from_client_config(client_config, scopes=[GOOGLE_SCOPES])
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        auth_url, _ = flow.authorization_url(prompt='consent')
        return jsonify({"authUrl": auth_url})

    except Exception as e:
        return jsonify({"error": f"Error creating OAuth flow: {str(e)}"}), 500

# ---- API: Handle OAuth Callback ----
@app.route("/api/oauth2callback", methods=["GET"])
def oauth2callback():
    try:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
            return jsonify({"error": "Missing Google OAuth credentials in environment variables"}), 500

        client_config = {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        }

        flow = Flow.from_client_config(client_config, scopes=[GOOGLE_SCOPES])
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        authorization_response = request.url
        flow.fetch_token(authorization_response=authorization_response)

        credentials = flow.credentials
        service = build("gmail", "v1", credentials=credentials)

        profile = service.users().getProfile(userId="me").execute()
        email = profile["emailAddress"]

        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        payload = validate_token(token)

        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401

        users.update_one({"email": payload["email"]}, {"$addToSet": {"gmails": email}})
        return jsonify({"message": "Gmail account linked successfully", "email": email})

    except Exception as e:
        return jsonify({"error": f"OAuth callback error: {str(e)}"}), 500

# ---- API: Login ----
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        user = users.find_one({"username": username})
        if not user:
            return jsonify({"error": "User not found"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({"error": "Incorrect password"}), 401

        payload = {
            "email": user["email"],
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return jsonify({"message": "Login successful", "token": token, "email": user["email"]})
    except Exception as e:
        return jsonify({"error": f"Login error: {str(e)}"}), 500

# ---- API: Register ----
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        if users.find_one({"username": username}):
            return jsonify({"error": "Username already exists"}), 400

        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        users.insert_one({
            "username": username,
            "email": email,
            "password": hashed_pw,
            "gmails": []
        })

        return jsonify({"message": "User registered successfully"})
    except Exception as e:
        return jsonify({"error": f"Registration error: {str(e)}"}), 500

# ---- Run ----
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
