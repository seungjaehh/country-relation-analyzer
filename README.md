# 국제 뉴스 기반 국가 관계 분석 프로그램

한국, 미국, 중국, 일본 4개국의 주요 국가쌍을 국제 뉴스 제목과 요약으로 분석하는 Flask 웹앱입니다. `news_relations.csv`에는 기사 기본 정보만 저장하고, `keyword_rules.csv`의 키워드 규칙을 이용해 `analyzer.py`가 관계 유형, 점수, 주요 프레임을 자동으로 계산합니다.

## 국제 관계 분석 2

기존 분석은 그대로 유지하고, 국가를 직접 선택하는 최신 뉴스 분석 화면을 `analysis2.html`에 추가했습니다. 분석 방법과 해석상 한계는 `analysis2-methodology.html`에서 확인할 수 있습니다.

- 대한민국, 미국, 중국, 일본을 포함한 35개 국가 중 서로 다른 두 국가를 선택합니다.
- GDELT DOC 2.0에서 최근 7일·30일·90일의 동시 언급 기사를 최신순으로 최대 250건 요청합니다. 실제 결과 수는 검색과 색인 상황에 따라 더 적을 수 있습니다.
- GDELT가 차단되거나 응답하지 않으면 Google News RSS의 영어·한국어 검색으로 보완합니다. 두 피드의 합계는 최대 30건이며 실제 건수는 피드 반환량에 따라 달라집니다.
- 기사 제목에 드러난 협력·갈등 표현과 의제를 규칙 기반으로 분류하고, 원문 기사·매체·언어를 함께 표시합니다.
- 국가쌍 입력 순서는 정규화하여 순서를 바꿔도 같은 검색과 캐시 결과를 사용합니다.
- 최근 검색 결과는 같은 브라우저에서 10분 동안 캐시해 반복 요청을 줄입니다.
- GitHub Pages에서도 동작하도록 브라우저에서 공개 API를 호출하며 API 키가 필요하지 않습니다.

분석 2는 제목 기반 뉴스 프레임 집계입니다. 현 버전은 국가별 현지 언론과 서구 국제 언론의 표본 비율을 보장하지 않으며, 기사 전체 맥락이나 실제 외교 관계를 판정하지 않습니다. 출처를 국가 A 현지, 국가 B 현지, 미국·유럽 국제 언론으로 나누어 비교하는 방향을 분석 원리 페이지에 제안했으며 아직 구현하지 않았습니다. 기사 수는 기간과 제공처의 색인 범위에 따라 달라질 수 있습니다. 두 제공처 모두 응답하지 않으면 잠시 후 재시도해야 합니다.

## 파일 구조

```text
country-relation-analyzer/
├─ app.py
├─ analysis2.html
├─ analysis2-methodology.html
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
