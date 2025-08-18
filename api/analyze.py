# api/analyze.py
from flask import Flask, request, jsonify
from lib.analysis import run_analysis

# Vercel loads this WSGI app automatically for the /api/analyze function
app = Flask(__name__)

@app.post("/analyze")
def analyze():
    try:
        payload = request.get_json(silent=True) or {}
        symbols = payload.get("symbols", [])
        start   = payload.get("start")
        end     = payload.get("end")

        # keep same validation semantics/messages as your original app.py
        if not isinstance(symbols, list) or not (1 <= len(symbols) <= 4):
            return jsonify({"error": "Provide between 1–4 symbols"}), 400
        if not start or not end:
            return jsonify({"error": "start and end required"}), 400

        out = run_analysis(symbols, start, end)
        return jsonify(out)
    except ValueError as ve:
        # run_analysis raises ValueError for "No SPY data", "No data for {sym}", etc.
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        # visible in Vercel Logs
        print("Analyze error:", repr(e))
        return jsonify({"error": "Internal server error"}), 500

# Optional simple health check
@app.get("/health")
def health():
    return jsonify({"ok": True})
