import traceback
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from analyzer import COUNTRY_PAIRS, analyze_country_pair


app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


@app.context_processor
def inject_static_version():
    def static_version(filename):
        static_path = Path(app.static_folder) / filename
        if static_path.exists():
            return int(static_path.stat().st_mtime)
        return 0

    return {"static_version": static_version}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/pairs")
def get_pairs():
    pairs = [
        {
            "country_a": country_a,
            "country_b": country_b,
            "label": f"{country_a} - {country_b}",
        }
        for country_a, country_b in COUNTRY_PAIRS
    ]
    return jsonify({"pairs": pairs})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        payload = request.get_json(silent=True) or {}
        country_a = payload.get("country_a", "").strip()
        country_b = payload.get("country_b", "").strip()

        if not country_a or not country_b:
            return jsonify({"error": "country_a와 country_b를 모두 입력해주세요."}), 400

        result = analyze_country_pair(country_a, country_b)
        return jsonify(result)
    except Exception:
        traceback.print_exc()
        return (
            jsonify(
                {
                    "error": "분석 중 오류가 발생했습니다. 터미널 traceback을 확인해주세요.",
                }
            ),
            500,
        )


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    traceback.print_exc()
    return (
        jsonify(
            {
                "error": "서버 오류가 발생했습니다. 터미널 traceback을 확인해주세요.",
            }
        ),
        500,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
