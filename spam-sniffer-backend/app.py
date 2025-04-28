'''from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np

# Load model and vectorizer
with open("spam_classifier.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open("tfidf_vectorizer.pkl", "rb") as vec_file:
    vectorizer = pickle.load(vec_file)

app = Flask(__name__)

# Enable CORS for all origins or specific origin
CORS(app)  # Allows all origins
# If you want to restrict to specific origins, use:
# CORS(app, origins=["http://localhost:3000"])

@app.before_request
def log_request_info():
    """ Log the accessed path before each request. """
    print(f"Accessed Path: {request.path}")

@app.route("/check_spam", methods=["POST"])
def check_spam():
    data = request.get_json()
    text = data.get("text", "")

    # Vectorize the email content
    vectorized_text = vectorizer.transform([text])

    # Predict using the loaded model
    prediction = model.predict(vectorized_text)[0]
    proba = model.predict_proba(vectorized_text)[0][1]

    # Rule-based override
    text_lower = text.lower()
    if "lottery" in text_lower:
        description = "Lottery scam"
        prediction = 1  # Force is_spam = True
    elif "free" in text_lower:
        description = "Free offer spam"
        prediction = 1
    elif "urgent" in text_lower:
        description = "Urgent phishing email"
        prediction = 1
    else:
        description = "General spam" if prediction else "Likely safe"

    return jsonify({
        "is_spam": bool(prediction),
        "spam_score": round(float(proba), 3),
        "description": description
    })

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)'''
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer

# Load model and vectorizer
with open("spam_classifier.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open("tfidf_vectorizer.pkl", "rb") as vec_file:
    vectorizer = pickle.load(vec_file)

app = Flask(__name__)

# Enable CORS
CORS(app)

@app.before_request
def log_request_info():
    """ Log the accessed path before each request. """
    print(f"Accessed Path: {request.path}")

def generate_summary(text, sentence_count=2):
    """ Generate a short summary using TextRank algorithm """
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary = summarizer(parser.document, sentence_count)
    summarized_text = " ".join(str(sentence) for sentence in summary)
    return summarized_text

@app.route("/check_spam", methods=["POST"])
def check_spam():
    data = request.get_json()
    text = data.get("text", "")

    # Vectorize the email content
    vectorized_text = vectorizer.transform([text])

    # Predict using the loaded model
    prediction = model.predict(vectorized_text)[0]
    proba = model.predict_proba(vectorized_text)[0][1]

    # Generate a summary of the email
    summary = generate_summary(text)

    description = "Likely spam" if prediction else "Likely safe"

    return jsonify({
        "is_spam": bool(prediction),
        "spam_score": round(float(proba), 3),
        "description": description,
        "summary": summary
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
