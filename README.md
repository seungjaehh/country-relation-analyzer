# 국제 뉴스 기반 국가 관계 분석 프로그램

한국, 미국, 중국, 일본 4개국의 주요 국가쌍을 국제 뉴스 제목과 요약으로 분석하는 Flask 웹앱입니다. `news_relations.csv`에는 기사 기본 정보만 저장하고, `keyword_rules.csv`의 키워드 규칙을 이용해 `analyzer.py`가 관계 유형, 점수, 주요 프레임을 자동으로 계산합니다.

## 파일 구조

```text
country-relation-analyzer/
├─ app.py
├─ analyzer.py
├─ data/
│  ├─ news_relations.csv
│  └─ keyword_rules.csv
├─ templates/
│  └─ index.html
├─ static/
│  ├─ style.css
│  └─ script.js
├─ requirements.txt
└─ README.md
```

## news_relations.csv 컬럼

- `id`: 기사 고유 번호
- `period`: 시기 구분, `past` 또는 `recent`
- `date`: 기사 날짜
- `source`: 언론사
- `source_type`: 자료 유형
- `title`: 기사 제목
- `url`: 원문 링크
- `country_a`, `country_b`: 기사에서 분석할 국가쌍
- `summary`: 키워드 탐지가 가능하도록 정리한 요약

이 파일에는 사람이 판단한 `relation_type`, `tone_score`, `intensity_score`, `main_frame`을 저장하지 않습니다.

## keyword_rules.csv 컬럼

- `keyword`: 탐지할 키워드
- `frame`: `security`, `economy`, `diplomacy`, `human_rights`, `history`, `context`
- `relation_type`: `cooperation`, `neutral`, `conflict`, `context`
- `polarity`: `positive`, `neutral`, `negative`, `context`
- `score_weight`: 관계 점수 계산에 사용하는 가중치
- `description`: 키워드 의미 설명

## 키워드 기반 자동 분석 알고리즘

1. 기사별 `title`과 `summary`를 합쳐 분석 텍스트를 만듭니다.
2. `keyword_rules.csv`의 키워드를 대소문자 구분 없이 탐지합니다.
3. 긴 키워드를 먼저 탐지해 `security cooperation` 안의 짧은 키워드가 중복 계산되지 않게 합니다.
4. `context` 키워드는 탐지 결과에는 표시하지만 관계 점수에는 반영하지 않습니다.
5. 탐지된 키워드가 없으면 `relation_type`은 `neutral`, `main_frame`은 `unknown`으로 처리합니다.

## 점수 계산 방식

- `cooperation_score`: 협력 키워드 가중치 합계
- `conflict_score`: 갈등 키워드 가중치 합계
- `relation_score = cooperation_score - conflict_score`
- 기사별 관계 유형:
  - `relation_score >= 2`: cooperation
  - `-2 < relation_score < 2`: neutral
  - `relation_score <= -2`: conflict
- `tone_score`: cooperation은 `1`, neutral은 `0`, conflict는 `-1`
- `intensity_score`: `abs(relation_score) >= 5`는 `3`, `>= 2`는 `2`, 그 외는 `1`
- `article_score = tone_score * intensity_score`
- 국가쌍의 `past_average_score`와 `recent_average_score`는 각 시기 기사들의 `article_score` 평균입니다.
- `change = recent_average_score - past_average_score`

## 실행 방법

```bash
cd country-relation-analyzer
pip install -r requirements.txt
python app.py
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:5050
```

## ngrok 접속 방법

Flask 서버가 실행 중인 상태에서 새 터미널을 열고 실행합니다.

```bash
ngrok http 5050
```

ngrok이 보여주는 `https://...ngrok-free.app` 주소를 다른 기기나 발표용 브라우저에서 열면 됩니다.

## API 테스트

```bash
curl -X POST http://127.0.0.1:5050/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"country_a":"South Korea","country_b":"United States"}'
```

## 향후 데이터 확장

`data/news_relations.csv`에 같은 컬럼 구조로 행을 추가하면 별도 코드 수정 없이 자동으로 분석에 반영됩니다. 발표용으로 기사 수를 60개 이상으로 늘릴 때도 `period`, `country_a`, `country_b`, `title`, `summary`를 유지하면 됩니다.

## 한계점

- 본 프로그램은 교육용 분석 도구입니다.
- 제한된 뉴스 표본을 사용하므로 실제 국가 관계 전체를 단정할 수 없습니다.
- 기사 전문이 아니라 제목과 요약을 중심으로 분석하므로 문맥을 완전히 반영하지 못할 수 있습니다.
- 키워드 기반 분석은 기준이 명확하고 자동화하기 쉽지만, 반어적 표현이나 복잡한 외교적 맥락을 놓칠 수 있습니다.
- 기사 선정 기준과 키워드 규칙표에 따라 결과가 달라질 수 있습니다.

## 발표용 설명 문장

“본 프로그램은 한국, 미국, 중국, 일본 4개국의 주요 국가쌍을 대상으로 신뢰도 높은 국제 뉴스 데이터를 CSV로 정리한 뒤, 별도의 키워드 기준표를 이용해 기사 제목과 요약에서 관계 신호를 탐지한다. 프로그램은 협력 키워드와 갈등 키워드의 가중치를 비교하여 기사별 관계 점수를 계산하고, 과거 시기와 최근 시기의 평균 점수를 비교해 국가 간 관계가 협력 방향으로 변화했는지, 갈등 방향으로 변화했는지 분석한다.”
