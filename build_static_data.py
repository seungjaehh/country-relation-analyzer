import json
from pathlib import Path

from analyzer import COUNTRY_PAIRS, analyze_country_pair


OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "analysis_results.json"


def main():
    pairs = [
        {
            "country_a": country_a,
            "country_b": country_b,
            "label": f"{country_a} - {country_b}",
        }
        for country_a, country_b in COUNTRY_PAIRS
    ]
    results = {
        f"{country_a}||{country_b}": analyze_country_pair(country_a, country_b)
        for country_a, country_b in COUNTRY_PAIRS
    }

    OUTPUT_PATH.write_text(
        json.dumps({"pairs": pairs, "results": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

