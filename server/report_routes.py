# server/report_routes.py
from flask import Blueprint, request, jsonify
from db import db  # your MongoDB instance
import spacy
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from transformers import pipeline

report_bp = Blueprint("report", __name__)
nlp = spacy.load("en_core_web_sm")
sbert = SentenceTransformer('all-MiniLM-L6-v2')
summarizer = pipeline("summarization")

@report_bp.route("/upload", methods=["POST"])
def upload_file():
    file = request.files['file']
    text = file.read().decode("utf-8")
    db.reports.insert_one({"text": text})
    return {"status": "saved"}

@report_bp.route("/report/latest", methods=["GET"])
def latest_report():
    report = db.reports.find().sort("_id", -1).limit(1)[0]
    sentences = [sent.text for sent in nlp(report["text"]).sents]
    embeddings = sbert.encode(sentences)
    kmeans = KMeans(n_clusters=4).fit(embeddings)
    labels = kmeans.labels_

    clusters = {}
    for i, label in enumerate(labels):
        tag = f"Theme {label}"
        clusters.setdefault(tag, []).append(sentences[i])

    pie_data = [{"label": tag, "value": len(s)} for tag, s in clusters.items()]
    top_cluster = max(clusters.items(), key=lambda kv: len(kv[1]))[1]
    top_insight = summarizer(" ".join(top_cluster[:5]), max_length=60, min_length=20)[0]['summary_text']

    return jsonify({
        "pie_data": pie_data,
        "insights": clusters,
        "top_insight": top_insight
    })
