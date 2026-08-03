from collections import Counter, defaultdict
from pathlib import Path
import re

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
NEWS_PATH = DATA_DIR / "news_relations.csv"
RULES_PATH = DATA_DIR / "keyword_rules.csv"

COUNTRY_PAIRS = [
    ("South Korea", "United States"),
    ("South Korea", "China"),
    ("South Korea", "Japan"),
    ("United States", "China"),
    ("United States", "Japan"),
    ("China", "Japan"),
]

FRAME_LABELS = {
    "security": "안보",
    "economy": "경제",
    "diplomacy": "외교",
    "human_rights": "인권",
    "history": "역사",
    "context": "맥락",
    "unknown": "미분류",
}

RELATION_LABELS = {
    "cooperation": "협력",
    "neutral": "중립",
    "conflict": "갈등",
}


def load_news():
    return pd.read_csv(NEWS_PATH, dtype=str).fillna("")


def load_rules():
    rules = pd.read_csv(RULES_PATH, dtype=str).fillna("")
    rules["score_weight"] = pd.to_numeric(rules["score_weight"], errors="coerce").fillna(0).astype(int)
    rules["keyword_length"] = rules["keyword"].str.len()
    return rules.sort_values(["keyword_length", "score_weight"], ascending=[False, False]).reset_index(drop=True)


def _spans_overlap(left, right):
    return left[0] < right[1] and right[0] < left[1]


def _first_available_span(text_lower, keyword_lower, occupied_spans):
    for match in re.finditer(re.escape(keyword_lower), text_lower):
        span = match.span()
        if not any(_spans_overlap(span, occupied) for occupied in occupied_spans):
            return span
    return None


def detect_keywords(text, rules):
    text_lower = text.lower()
    occupied_spans = []
    detected = []

    for rule in rules.to_dict("records"):
        keyword = rule["keyword"].strip()
        if not keyword:
            continue

        span = _first_available_span(text_lower, keyword.lower(), occupied_spans)
        if span is None:
            continue

        occupied_spans.append(span)
        detected.append(
            {
                "keyword": keyword,
                "frame": rule["frame"],
                "frame_label": FRAME_LABELS.get(rule["frame"], rule["frame"]),
                "relation_type": rule["relation_type"],
                "relation_label": RELATION_LABELS.get(rule["relation_type"], rule["relation_type"]),
                "polarity": rule["polarity"],
                "score_weight": int(rule["score_weight"]),
                "description": rule["description"],
            }
        )

    return detected


def _judge_relation_type(relation_score):
    if relation_score >= 2:
        return "cooperation"
    if relation_score <= -2:
        return "conflict"
    return "neutral"


def _tone_score(relation_type):
    if relation_type == "cooperation":
        return 1
    if relation_type == "conflict":
        return -1
    return 0


def _intensity_score(relation_score):
    absolute_score = abs(relation_score)
    if absolute_score >= 5:
        return 3
    if absolute_score >= 2:
        return 2
    return 1


def _main_frame(detected_keywords):
    if not detected_keywords:
        return "unknown"

    frame_scores = defaultdict(int)
    for keyword in detected_keywords:
        frame_scores[keyword["frame"]] += int(keyword["score_weight"])

    highest_score = max(frame_scores.values())
    if highest_score == 0:
        return "context"

    sorted_frames = sorted(frame_scores.items(), key=lambda item: (-item[1], item[0]))
    return sorted_frames[0][0]


def analyze_article(article, rules):
    analysis_text = f"{article.get('title', '')} {article.get('summary', '')}"
    detected_keywords = detect_keywords(analysis_text, rules)

    cooperation_score = sum(
        keyword["score_weight"]
        for keyword in detected_keywords
        if keyword["relation_type"] == "cooperation"
    )
    conflict_score = sum(
        keyword["score_weight"]
        for keyword in detected_keywords
        if keyword["relation_type"] == "conflict"
    )
    relation_score = cooperation_score - conflict_score
    relation_type = _judge_relation_type(relation_score)
    tone_score = _tone_score(relation_type)
    intensity_score = _intensity_score(relation_score)
    article_score = tone_score * intensity_score
    main_frame = _main_frame(detected_keywords)

    return {
        **article,
        "detected_keywords": [keyword["keyword"] for keyword in detected_keywords],
        "detected_keyword_details": detected_keywords,
        "cooperation_score": cooperation_score,
        "conflict_score": conflict_score,
        "relation_score": relation_score,
        "relation_type": relation_type,
        "relation_label": RELATION_LABELS[relation_type],
        "tone_score": tone_score,
        "intensity_score": intensity_score,
        "article_score": article_score,
        "main_frame": main_frame,
        "main_frame_label": FRAME_LABELS.get(main_frame, main_frame),
    }


def _average(scores):
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)


def _count_items(items, labels=None, required_keys=None):
    counter = Counter(items)
    total = sum(counter.values())
    keys = required_keys or list(counter.keys())

    if required_keys is None:
        keys = sorted(keys, key=lambda key: (-counter[key], key))

    result = []
    for key in keys:
        count = counter.get(key, 0)
        ratio = round((count / total) * 100, 1) if total else 0
        result.append(
            {
                "name": key,
                "label": labels.get(key, key) if labels else key,
                "count": count,
                "ratio": ratio,
            }
        )
    return result


def _top_keywords(articles):
    counter = Counter()
    metadata = {}
    for article in articles:
        for keyword in article["detected_keyword_details"]:
            name = keyword["keyword"]
            counter[name] += 1
            metadata.setdefault(name, keyword)

    top_items = sorted(counter.items(), key=lambda item: (-item[1], item[0]))[:10]
    return [
        {
            "keyword": keyword,
            "count": count,
            "frame": metadata[keyword]["frame"],
            "frame_label": metadata[keyword]["frame_label"],
            "relation_type": metadata[keyword]["relation_type"],
            "relation_label": metadata[keyword]["relation_label"],
            "score_weight": metadata[keyword]["score_weight"],
        }
        for keyword, count in top_items
    ]


def _final_relation(recent_average_score):
    if recent_average_score >= 1.0:
        return "cooperation", "협력 중심 관계"
    if recent_average_score <= -1.0:
        return "conflict", "갈등 중심 관계"
    return "neutral", "혼합 또는 중립 관계"


def _change_direction(change):
    if change >= 1.0:
        return "cooperation", "과거보다 협력 방향으로 변화"
    if change <= -1.0:
        return "conflict", "과거보다 갈등 방향으로 변화"
    return "neutral", "큰 변화 없음 또는 혼합적 변화"


def _build_interpretation(pair_label, final_relation_label, change_label, past_average, recent_average, change):
    return (
        f"{pair_label}의 최근 평균 기사 점수는 {recent_average:.2f}로 {final_relation_label}로 해석된다. "
        f"과거 평균 {past_average:.2f}와 비교한 변화량은 {change:.2f}이며, 전체 변화 방향은 "
        f"{change_label}로 볼 수 있다. 이 결과는 기사 제목과 요약에 나타난 협력·갈등 키워드를 "
        f"규칙표의 가중치로 계산한 교육용 분석 결과이다."
    )


def _build_evidence_sentence(dominant_frame_label, relation_counts, top_keywords):
    relation_text = ", ".join(
        f"{item['label']} {item['count']}건" for item in relation_counts if item["count"] > 0
    )
    scoring_keywords = [
        item["keyword"] for item in top_keywords if item["relation_type"] != "context"
    ][:5]
    keyword_text = ", ".join(scoring_keywords) if scoring_keywords else "점수 반영 키워드 없음"
    return (
        f"주요 프레임은 {dominant_frame_label}이며, 기사 유형은 {relation_text}으로 분포한다. "
        f"분석에 자주 등장한 주요 점수 반영 키워드는 {keyword_text}이다. "
        f"context 키워드는 탐지 결과에는 표시하지만 관계 점수 계산에는 넣지 않았다."
    )


def analyze_country_pair(country_a, country_b):
    news = load_news()
    rules = load_rules()

    pair_mask = (
        ((news["country_a"] == country_a) & (news["country_b"] == country_b))
        | ((news["country_a"] == country_b) & (news["country_b"] == country_a))
    )
    pair_articles = news.loc[pair_mask].copy()
    pair_label = f"{country_a} - {country_b}"

    if pair_articles.empty:
        return {
            "selected_pair": {
                "country_a": country_a,
                "country_b": country_b,
                "label": pair_label,
            },
            "has_data": False,
            "message": "해당 국가쌍의 데이터가 없습니다",
            "articles": [],
            "summary": {
                "total_articles": 0,
                "past_count": 0,
                "recent_count": 0,
                "past_average_score": 0,
                "recent_average_score": 0,
                "change": 0,
            },
            "frame_counts": [],
            "relation_counts": _count_items([], RELATION_LABELS, ["cooperation", "neutral", "conflict"]),
            "top_keywords": [],
        }

    articles = [
        analyze_article(row.to_dict(), rules)
        for _, row in pair_articles.sort_values(["period", "date", "id"]).iterrows()
    ]

    past_scores = [article["article_score"] for article in articles if article["period"] == "past"]
    recent_scores = [article["article_score"] for article in articles if article["period"] == "recent"]
    past_average = _average(past_scores)
    recent_average = _average(recent_scores)
    change = round(recent_average - past_average, 2)

    frame_counts = _count_items(
        [article["main_frame"] for article in articles],
        FRAME_LABELS,
    )
    relation_counts = _count_items(
        [article["relation_type"] for article in articles],
        RELATION_LABELS,
        ["cooperation", "neutral", "conflict"],
    )
    top_keywords = _top_keywords(articles)

    dominant_frame = frame_counts[0]["name"] if frame_counts else "unknown"
    dominant_frame_label = FRAME_LABELS.get(dominant_frame, dominant_frame)
    final_relation_type, final_relation_label = _final_relation(recent_average)
    change_type, change_label = _change_direction(change)
    interpretation = _build_interpretation(
        pair_label,
        final_relation_label,
        change_label,
        past_average,
        recent_average,
        change,
    )
    evidence_sentence = _build_evidence_sentence(
        dominant_frame_label,
        relation_counts,
        top_keywords,
    )

    return {
        "selected_pair": {
            "country_a": country_a,
            "country_b": country_b,
            "label": pair_label,
        },
        "has_data": True,
        "message": "",
        "summary": {
            "total_articles": len(articles),
            "past_count": len(past_scores),
            "recent_count": len(recent_scores),
            "past_average_score": past_average,
            "recent_average_score": recent_average,
            "change": change,
            "dominant_frame": dominant_frame,
            "dominant_frame_label": dominant_frame_label,
            "final_relation_type": final_relation_type,
            "final_relation_label": final_relation_label,
            "change_direction_type": change_type,
            "change_direction_label": change_label,
            "interpretation": interpretation,
            "evidence_sentence": evidence_sentence,
        },
        "frame_counts": frame_counts,
        "relation_counts": relation_counts,
        "top_keywords": top_keywords,
        "articles": articles,
    }


if __name__ == "__main__":
    for first_country, second_country in COUNTRY_PAIRS:
        result = analyze_country_pair(first_country, second_country)
        summary = result["summary"]
        print(
            f"{first_country} - {second_country}: "
            f"{summary['total_articles']} articles, "
            f"recent={summary['recent_average_score']}, "
            f"change={summary['change']}"
        )
