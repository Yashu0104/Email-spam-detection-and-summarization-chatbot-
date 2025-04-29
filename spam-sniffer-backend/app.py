import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import jwt
import bcrypt
from pymongo import MongoClient
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
from datetime import datetime, timedelta

# ---- Config ----
JWT_SECRET = "supersecret"
JWT_EXPIRY = 24  # in hours

# ---- App Setup ----
app = Flask(__name__)
CORS(app)

# ---- Mongo Setup ----
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/spam_sniffer")
client = MongoClient(mongo_uri)
db = client.spam_sniffer
users = db.users  # ✅ this defines the MongoDB collection

# ---- ML Model Load ----
with open("spam_classifier.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open("tfidf_vectorizer.pkl", "rb") as vec_file:
    vectorizer = pickle.load(vec_file)

# ---- Helper: Summarize Text ----
def generate_summary(text, sentence_count=2):
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary = summarizer(parser.document, sentence_count)
    return " ".join(str(s) for s in summary)

# ---- Middleware for Logging ----
@app.before_request
def log_request_info():
    print(f"[{datetime.now()}] Accessed Path: {request.path}")

# ---- API: Spam Check ----
@app.route("/check_spam", methods=["POST"])
def check_spam():
    try:
        data = request.get_json()
        text = data.get("text", "")
        vectorized_text = vectorizer.transform([text])
        prediction = model.predict(vectorized_text)[0]
        proba = model.predict_proba(vectorized_text)[0][1]
        summary = generate_summary(text)

        # Rule override
        if any(k in text.lower() for k in ["lottery", "free", "urgent"]):
            prediction = 1

        description = "Likely spam" if prediction else "Likely safe"
        return jsonify({
            "is_spam": bool(prediction),
            "spam_score": round(float(proba), 3),
            "description": description,
            "summary": summary
        })
    except Exception as e:
        return jsonify({"error": "Spam check failed", "details": str(e)}), 500

# ---- API: Sign Up ----
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    users.insert_one({"email": email, "password": hashed, "gmails": []})
    return jsonify({"message": "Signup successful"})

# ---- API: Login ----
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = users.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
    {"email": email, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY)},
    JWT_SECRET, algorithm="HS256"
    )

    # Ensure it's string
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({"message": "Login successful", "token": token})


# ---- API: Store Gmail Accounts ----
@app.route("/api/authenticated-emails", methods=["POST"])
def store_gmails():
    data = request.get_json()
    email = data.get("email")  # account email
    gmail = data.get("gmail")  # gmail to store

    users.update_one({"email": email}, {"$addToSet": {"gmails": gmail}})
    return jsonify({"message": "Gmail added successfully"})

@app.route("/api/user", methods=["GET"])
def get_user_info():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("email")
        user = users.find_one({"email": email}, {"password": 0})  # exclude password
        if user:
            user["_id"] = str(user["_id"])
            return jsonify(user)
        else:
            return jsonify({"error": "User not found"}), 404
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except Exception as e:
        return jsonify({"error": "Invalid token", "details": str(e)}), 401


# ---- API: Get Gmail Accounts ----
@app.route("/api/authenticated-emails", methods=["GET"])
def get_gmails():
    email = request.args.get("email")
    user = users.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.get("gmails", []))

# ---- Run ----
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
