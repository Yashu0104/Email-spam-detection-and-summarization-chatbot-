from flask import Flask, request, jsonify
import pickle
import numpy as np

# Load model and vectorizer
with open("spam_classifier.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open("tfidf_vectorizer.pkl", "rb") as vec_file:
    vectorizer = pickle.load(vec_file)

app = Flask(__name__)

@app.route("/check_spam", methods=["POST"])
def check_spam():
    data = request.get_json()
    text = data.get("text", "")

    # Vectorize the email content
    vectorized_text = vectorizer.transform([text])

    # Predict using the loaded model
    prediction = model.predict(vectorized_text)[0]
    proba = model.predict_proba(vectorized_text)[0][1]

    # Simple spam type description logic (can be improved)
    if "lottery" in text.lower():
        description = "Lottery scam"
    elif "free" in text.lower():
        description = "Free offer spam"
    elif "urgent" in text.lower():
        description = "Urgent phishing email"
    else:
        description = "General spam"

    return jsonify({
        "is_spam": bool(prediction),
        "spam_score": round(float(proba), 3),
        "description": description
    })

if __name__ == "__main__":
    app.run(debug=True)
