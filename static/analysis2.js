const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const RSS2JSON_ENDPOINT = "https://api.rss2json.com/v1/api.json";
const MAX_ARTICLES = 250;
const PAGE_SIZE = 20;
const CACHE_TTL_MS = 10 * 60 * 1000;

const countries = [
    { value: "South Korea", label: "대한민국", group: "동아시아", terms: ["South Korea", "South Korean", "Seoul"] },
    { value: "China", label: "중국", group: "동아시아", terms: ["China", "Chinese", "Beijing"] },
    { value: "Japan", label: "일본", group: "동아시아", terms: ["Japan", "Japanese", "Tokyo"] },
    { value: "North Korea", label: "북한", group: "동아시아", terms: ["North Korea", "North Korean", "Pyongyang"] },
    { value: "Taiwan", label: "대만", group: "동아시아", terms: ["Taiwan", "Taiwanese", "Taipei"] },
    { value: "United States", label: "미국", group: "북미", terms: ["United States", "U.S.", "American"] },
    { value: "Canada", label: "캐나다", group: "북미", terms: ["Canada", "Canadian", "Ottawa"] },
    { value: "Mexico", label: "멕시코", group: "북미", terms: ["Mexico", "Mexican", "Mexico City"] },
    { value: "Brazil", label: "브라질", group: "남미", terms: ["Brazil", "Brazilian", "Brasilia"] },
    { value: "Argentina", label: "아르헨티나", group: "남미", terms: ["Argentina", "Argentine", "Argentinian"] },
    { value: "United Kingdom", label: "영국", group: "유럽", terms: ["United Kingdom", "Britain", "British"] },
    { value: "France", label: "프랑스", group: "유럽", terms: ["France", "French", "Paris"] },
    { value: "Germany", label: "독일", group: "유럽", terms: ["Germany", "German", "Berlin"] },
    { value: "Italy", label: "이탈리아", group: "유럽", terms: ["Italy", "Italian", "Rome"] },
    { value: "Spain", label: "스페인", group: "유럽", terms: ["Spain", "Spanish", "Madrid"] },
    { value: "Netherlands", label: "네덜란드", group: "유럽", terms: ["Netherlands", "Dutch", "The Hague"] },
    { value: "Poland", label: "폴란드", group: "유럽", terms: ["Poland", "Polish", "Warsaw"] },
    { value: "Ukraine", label: "우크라이나", group: "유럽", terms: ["Ukraine", "Ukrainian", "Kyiv"] },
    { value: "Russia", label: "러시아", group: "유럽·유라시아", terms: ["Russia", "Russian", "Moscow"] },
    { value: "Türkiye", label: "튀르키예", group: "유럽·유라시아", terms: ["Turkey", "Türkiye", "Turkish"] },
    { value: "India", label: "인도", group: "남아시아", terms: ["India", "Indian", "New Delhi"] },
    { value: "Pakistan", label: "파키스탄", group: "남아시아", terms: ["Pakistan", "Pakistani", "Islamabad"] },
    { value: "Australia", label: "호주", group: "오세아니아", terms: ["Australia", "Australian", "Canberra"] },
    { value: "Indonesia", label: "인도네시아", group: "동남아시아", terms: ["Indonesia", "Indonesian", "Jakarta"] },
    { value: "Vietnam", label: "베트남", group: "동남아시아", terms: ["Vietnam", "Vietnamese", "Hanoi"] },
    { value: "Philippines", label: "필리핀", group: "동남아시아", terms: ["Philippines", "Filipino", "Manila"] },
    { value: "Singapore", label: "싱가포르", group: "동남아시아", terms: ["Singapore", "Singaporean"] },
    { value: "Malaysia", label: "말레이시아", group: "동남아시아", terms: ["Malaysia", "Malaysian", "Kuala Lumpur"] },
    { value: "Iran", label: "이란", group: "중동", terms: ["Iran", "Iranian", "Tehran"] },
    { value: "Israel", label: "이스라엘", group: "중동", terms: ["Israel", "Israeli", "Jerusalem"] },
    { value: "Saudi Arabia", label: "사우디아라비아", group: "중동", terms: ["Saudi Arabia", "Saudi", "Riyadh"] },
    { value: "United Arab Emirates", label: "아랍에미리트", group: "중동", terms: ["United Arab Emirates", "UAE", "Emirati"] },
    { value: "Qatar", label: "카타르", group: "중동", terms: ["Qatar", "Qatari", "Doha"] },
    { value: "Egypt", label: "이집트", group: "아프리카", terms: ["Egypt", "Egyptian", "Cairo"] },
    { value: "South Africa", label: "남아프리카공화국", group: "아프리카", terms: ["South Africa", "South African", "Pretoria"] },
];

const relationTerms = {
    cooperation: [
        ["security cooperation", 3], ["trade agreement", 3], ["joint statement", 3], ["joint action", 3],
        ["cooperation", 2], ["cooperate", 2], ["agreed to", 2], ["agreement", 2], ["signed a deal", 3],
        ["partnership", 2], ["alliance", 2], ["military aid", 2], ["intelligence sharing", 3],
        ["investment pact", 2], ["boost ties", 2],
        ["협력 강화", 3], ["안보 협력", 3], ["무역 협정", 3], ["공동 성명", 3], ["공동 대응", 3],
        ["협력", 2], ["합의", 2], ["협정", 2], ["관계 개선", 2], ["관계 정상화", 2], ["군사 지원", 2], ["정보 공유", 3],
    ],
    conflict: [
        ["military strike", 3], ["airstrike", 3], ["sanctions", 3], ["sanctioned", 3], ["retaliation", 3],
        ["invasion", 3], ["attacked", 3], ["attack", 2], ["clash", 2], ["threat", 2], ["threatened", 2],
        ["tariff", 2], ["trade war", 3], ["dispute", 2], ["tensions", 2], ["condemn", 2], ["condemned", 2],
        ["missile test", 2], ["export controls", 2], ["restrictions", 2], ["expel", 2], ["diplomatic row", 2], ["protest", 1],
        ["공습", 3], ["군사 공격", 3], ["제재", 3], ["보복", 3], ["침공", 3], ["공격", 2],
        ["충돌", 2], ["위협", 2], ["관세", 2], ["무역 전쟁", 3], ["분쟁", 2], ["긴장", 2],
        ["규탄", 2], ["수출 통제", 2], ["제한 조치", 2], ["미사일 시험", 2], ["갈등", 2], ["항의", 1],
    ],
};

const behaviorTerms = {
    "대화·협상": ["talks", "negotiation", "negotiations", "dialogue", "meeting", "summit", "envoy", "mediator", "협상", "대화", "회담", "정상회담", "특사", "중재"],
    "경제·교류": ["trade", "investment", "invest", "exports", "export", "imports", "import", "business ties", "economic ties", "supply chain", "무역", "투자", "수출", "수입", "경제 협력", "공급망"],
    "안보 협력": ["security cooperation", "military aid", "intelligence sharing", "joint defense", "alliance", "안보 협력", "군사 지원", "정보 공유", "공동 방위", "동맹"],
    "공동 행동·지원": ["joint action", "coordinated", "assistance", "humanitarian aid", "provided aid", "공동 대응", "공조", "지원", "원조", "구호"],
    "경쟁·전략 대립": ["competition", "compete", "competing", "rivalry", "strategic rival", "influence", "arms race", "경쟁", "패권", "세력 확대", "전략 경쟁", "군비 경쟁"],
    "압박·제재": ["sanction", "sanctions", "tariff", "export control", "restriction", "restrictions", "ban", "pressure", "threat", "제재", "관세", "수출 통제", "제한", "압박", "위협"],
    "공식 입장·외교 발언": ["statement", "announced", "urged", "warned", "rejected", "criticized", "condemned", "denied", "accused", "said", "says", "성명", "발표", "촉구", "경고", "거부", "비판", "규탄", "부인", "비난"],
    "안보·군사 활동": ["military", "defense", "defence", "exercise", "drill", "troops", "weapons", "air defense", "military aid", "군사", "국방", "훈련", "병력", "무기", "방공", "군사 지원"],
    "무력 충돌·위기": ["attack", "strike", "airstrike", "missile", "invasion", "clash", "deploy", "deployed", "deployment", "war", "공격", "공습", "미사일", "침공", "충돌", "파병", "전쟁"],
    "긴장 완화·해결": ["ceasefire", "cease-fire", "truce", "withdraw", "withdrawal", "prisoner exchange", "peace deal", "de-escalation", "휴전", "철수", "포로 교환", "평화 합의", "긴장 완화", "무력 충돌 중단"],
    "인도주의·민간 영향": ["humanitarian", "civilian", "refugee", "evacuation", "humanitarian aid", "인도주의", "민간인", "난민", "대피", "구호"],
};

const eventStageTerms = {
    "검토·제안·예고": ["plan", "plans", "consider", "considers", "considering", "propose", "proposed", "proposal", "review", "weigh", "weighs", "threaten", "threatened", "예정", "검토", "제안", "추진", "위협", "가능성"],
    "합의·서명·발표": ["agreed", "agreement", "signed", "signing", "announced", "approved", "deal", "합의", "협정", "서명", "발표", "승인", "타결"],
    "시행·발생": ["imposed", "implemented", "launched", "carried out", "deployed", "attacked", "struck", "began", "발효", "시행", "실시", "공격", "배치", "발사", "시작"],
    "주장·의혹·보도": ["alleged", "alleges", "claimed", "claims", "reportedly", "according to", "accused", "주장", "의혹", "혐의", "보도에 따르면", "발표에 따르면"],
    "진행·지속 중": ["ongoing", "continues", "continue", "continued", "currently", "remains", "진행 중", "계속", "현재 진행", "지속"],
    "중단·철회·취소": ["withdrew", "withdrawal", "suspended", "halted", "cancelled", "canceled", "reversed", "철회", "중단", "취소", "번복"],
};

const issueTerms = {
    "안보·군사": ["military", "defense", "defence", "security", "missile", "nuclear", "navy", "troops", "안보", "군사", "미사일", "핵", "병력"],
    "경제·무역": ["trade", "tariff", "investment", "supply chain", "export", "import", "sanction", "경제", "무역", "관세", "투자", "공급망", "수출", "수입", "제재"],
    "외교·정상회담": ["diplomacy", "diplomatic", "summit", "minister", "president", "ambassador", "talks", "negotiation", "외교", "정상회담", "장관", "대통령", "회담", "협상"],
    "영토·해양": ["border", "territory", "island", "sea", "strait", "territorial", "airspace", "영토", "국경", "해양", "섬", "해협", "영공"],
    "기술·에너지": ["technology", "chip", "semiconductor", "energy", "climate", "artificial intelligence", "기술", "반도체", "에너지", "기후", "인공지능"],
    "인권·역사": ["human rights", "forced labor", "history", "rights", "refugee", "인권", "강제동원", "역사", "과거사", "난민"],
    "보건·환경·재난": ["health", "pandemic", "climate", "environment", "disaster", "보건", "감염병", "환경", "기후", "재난"],
};

const countryASelect = document.getElementById("countryA");
const countryBSelect = document.getElementById("countryB");
const periodSelect = document.getElementById("periodSelect");
const analyzeButton = document.getElementById("analyzeButton");
const statusPanel = document.getElementById("statusPanel");
const resultSection = document.getElementById("resultSection");
const articleList = document.getElementById("articleList");
const loadMoreButton = document.getElementById("loadMoreButton");

let currentArticles = [];
let visibleArticleCount = 0;

function populateCountrySelect(select, selectedValue) {
    select.replaceChildren();
    const groups = [...new Set(countries.map((country) => country.group))];
    groups.forEach((group) => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group;
        countries.filter((country) => country.group === group).forEach((country) => {
            const option = document.createElement("option");
            option.value = country.value;
            option.textContent = country.label;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    });
    select.value = selectedValue;
}

function setStatus(title, message, mode = "") {
    document.getElementById("statusTitle").textContent = title;
    document.getElementById("statusMessage").textContent = message;
    statusPanel.classList.toggle("is-error", mode === "error");
    statusPanel.classList.toggle("is-loading", mode === "loading");
    statusPanel.classList.toggle("hidden", mode === "ready");
}

function countryFor(value) {
    return countries.find((country) => country.value === value);
}

function makeQueryGroup(country) {
    return `(${country.terms.map((term) => `"${term}"`).join(" OR ")})`;
}

function buildRequestUrl(countryA, countryB, period) {
    const params = new URLSearchParams({
        query: `${makeQueryGroup(countryA)} AND ${makeQueryGroup(countryB)}`,
        mode: "artlist",
        maxrecords: String(MAX_ARTICLES),
        timespan: period,
        sort: "datedesc",
        format: "json",
    });
    return `${GDELT_ENDPOINT}?${params.toString()}`;
}

function cacheKey(countryA, countryB, period) {
    const [first, second] = canonicalPair(countryA, countryB);
    return `relation-analysis-2:v3:${first.value}|${second.value}|${period}`;
}

function canonicalPair(countryA, countryB) {
    return [countryA, countryB].sort((a, b) => a.value.localeCompare(b.value, "en"));
}

function getCached(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value && Date.now() - value.savedAt < CACHE_TTL_MS && Array.isArray(value.articles)) {
            value.articles = value.articles.map((article) => ({ ...article, date: parseDate(article.date) }));
            return value;
        }
    } catch (_) { /* Storage can be unavailable in private browsing. */ }
    return null;
}

function saveCached(key, articles, provider) {
    const serializable = articles.map((article) => ({ ...article, date: article.date?.toISOString() || null }));
    try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), provider, articles: serializable })); }
    catch (_) { /* The live result remains usable without local storage. */ }
}

function parseDate(rawDate) {
    const raw = String(rawDate || "");
    if (/^\d{14}$/.test(raw)) {
        return new Date(Date.UTC(
            Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)),
            Number(raw.slice(8, 10)), Number(raw.slice(10, 12)), Number(raw.slice(12, 14)),
        ));
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeArticle(raw, index) {
    const url = safeArticleUrl(raw.url);
    let domain = String(raw.domain || "").trim();
    if (!domain && url) domain = new URL(url).hostname.replace(/^www\./, "");
    const title = String(raw.title || "제목 없음").trim();
    const excerpt = plainText(raw.description || raw.summary || "").slice(0, 700);
    return {
        id: url || `${title}-${index}`,
        title,
        excerpt,
        analysisText: [title, excerpt].filter(Boolean).join(" "),
        url,
        domain: domain || "출처 미상",
        date: parseDate(raw.seendate),
        language: String(raw.language || "미상"),
        sourceCountry: String(raw.sourcecountry || ""),
    };
}

function plainText(value) {
    return new DOMParser().parseFromString(String(value || ""), "text/html").body.textContent.replace(/\s+/g, " ").trim();
}

function safeArticleUrl(value) {
    try {
        const url = new URL(String(value || ""));
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
}

function findMatches(text, terms) {
    const matches = terms.filter(([term]) => matchesTerm(text, term));
    return matches.filter(([term]) => !matches.some(([longerTerm]) =>
        longerTerm.length > term.length && matchesTerm(longerTerm, term)));
}

function containsAny(text, terms) {
    return terms.some((term) => matchesTerm(text, term));
}

function matchesTerm(text, term) {
    const normalizedText = String(text || "").toLocaleLowerCase();
    const normalizedTerm = term.toLocaleLowerCase();
    if (/^[a-z0-9][a-z0-9\s'-]*$/i.test(term)) {
        const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
        return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(normalizedText);
    }
    return normalizedText.includes(normalizedTerm);
}

function classifyArticle(article) {
    const analysisText = article.analysisText || article.title;
    const cooperation = findMatches(analysisText, relationTerms.cooperation);
    const conflict = findMatches(analysisText, relationTerms.conflict);
    const cooperationScore = cooperation.reduce((sum, [, weight]) => sum + weight, 0);
    const conflictScore = conflict.reduce((sum, [, weight]) => sum + weight, 0);
    let relation = "no_signal";
    if (cooperationScore > 0 && conflictScore > 0) relation = "mixed";
    else if (cooperationScore >= 2) relation = "cooperation";
    else if (conflictScore >= 2) relation = "conflict";

    const matchedIssues = Object.entries(issueTerms)
        .filter(([, terms]) => containsAny(analysisText, terms))
        .map(([label]) => label);
    const behaviorMatches = Object.entries(behaviorTerms)
        .map(([label, terms]) => [label, terms.filter((term) => containsAny(analysisText, [term]))])
        .filter(([, matches]) => matches.length);
    const eventStageLabels = Object.entries(eventStageTerms)
        .filter(([, terms]) => containsAny(analysisText, terms))
        .map(([label]) => label);

    return {
        ...article,
        relation,
        cooperationScore,
        conflictScore,
        relationEvidence: [
            ...cooperation.map(([term, weight]) => `협력 +${weight}: ${term}`),
            ...conflict.map(([term, weight]) => `갈등 +${weight}: ${term}`),
        ],
        behaviorLabels: behaviorMatches.map(([label]) => label),
        behaviorEvidence: behaviorMatches.flatMap(([label, matches]) => matches.map((term) => `${label}: ${term}`)),
        eventStageLabels,
        issueLabels: matchedIssues.length ? matchedIssues : ["기타·미분류"],
    };
}

async function fetchArticles(countryA, countryB, period) {
    const [queryCountryA, queryCountryB] = canonicalPair(countryA, countryB);
    const key = cacheKey(queryCountryA, queryCountryB, period);
    const cached = getCached(key);
    if (cached) return { articles: cached.articles.map(classifyArticle), cached: true, savedAt: cached.savedAt, provider: cached.provider || "저장 결과" };

    let gdeltError;
    try {
        const response = await fetch(buildRequestUrl(queryCountryA, queryCountryB, period), {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(6000),
        });
        if (response.status === 429) throw new Error("GDELT가 잠시 요청을 제한했습니다.");
        if (!response.ok) throw new Error(`GDELT 응답 오류 (HTTP ${response.status}).`);
        const data = await response.json();
        if (data.error) throw new Error(`뉴스 검색 오류: ${data.error}`);
        const rawArticles = Array.isArray(data.articles) ? data.articles : [];
        const unique = new Map();
        rawArticles.forEach((raw, index) => {
            const article = normalizeArticle(raw, index);
            const keyValue = article.url || article.title.toLocaleLowerCase();
            if (article.title && !unique.has(keyValue)) unique.set(keyValue, article);
        });
        const articles = [...unique.values()].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
        if (articles.length) {
            saveCached(key, articles, "GDELT DOC 2.0");
            return { articles: articles.map(classifyArticle), cached: false, savedAt: Date.now(), provider: "GDELT DOC 2.0" };
        }
        gdeltError = new Error("GDELT 검색 결과가 없습니다.");
    } catch (error) {
        gdeltError = error.name === "TimeoutError"
            ? new Error("GDELT 응답 시간이 초과됐습니다.")
            : error instanceof TypeError
                ? new Error("GDELT 연결이 차단되었거나 교차 출처 요청이 실패했습니다.")
                : error;
    }
    try {
        const backupArticles = await fetchGoogleNews(queryCountryA, queryCountryB, period);
        saveCached(key, backupArticles, "Google News RSS");
        return {
            articles: backupArticles.map(classifyArticle),
            cached: false,
            savedAt: Date.now(),
            provider: "Google News RSS (GDELT 대체)",
            fallbackReason: gdeltError.message,
        };
    } catch (fallbackError) {
        throw new Error(`최신 뉴스 검색 실패 — GDELT: ${gdeltError.message} Google News: ${fallbackError.message}`);
    }
}

function periodDays(period) {
    return { "1week": 7, "1month": 30, "3months": 90 }[period] || 30;
}

function makeGoogleNewsUrl(countryA, countryB, period, korean = false) {
    const days = periodDays(period);
    const terms = korean
        ? `"${countryA.label}" "${countryB.label}" when:${days}d`
        : `"${countryA.value}" "${countryB.value}" when:${days}d`;
    const locale = korean
        ? { hl: "ko-KR", gl: "KR", ceid: "KR:ko" }
        : { hl: "en-US", gl: "US", ceid: "US:en" };
    const feed = new URL("https://news.google.com/rss/search");
    feed.searchParams.set("q", terms);
    Object.entries(locale).forEach(([name, value]) => feed.searchParams.set(name, value));
    return feed.toString();
}

async function fetchGoogleNewsFeed(countryA, countryB, period, korean) {
    const params = new URLSearchParams({ rss_url: makeGoogleNewsUrl(countryA, countryB, period, korean) });
    const response = await fetch(`${RSS2JSON_ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Google News RSS 변환 오류 (HTTP ${response.status}).`);
    const data = await response.json();
    if (data.status !== "ok") throw new Error(data.message || "Google News RSS 피드를 읽을 수 없습니다.");
    return (Array.isArray(data.items) ? data.items : []).map((item, index) => {
        const rawTitle = String(item.title || "").trim();
        const sourceMatch = rawTitle.match(/\s[-–]\s([^\-–]+)$/);
        const title = sourceMatch ? rawTitle.slice(0, sourceMatch.index).trim() : rawTitle;
        return normalizeArticle({
            title,
            description: item.description || item.content || "",
            url: item.link,
            seendate: item.pubDate,
            domain: sourceMatch ? sourceMatch[1].trim() : item.author || "Google News",
            language: korean ? "Korean" : "English",
        }, index);
    });
}

async function fetchGoogleNews(countryA, countryB, period) {
    const responses = await Promise.allSettled([
        fetchGoogleNewsFeed(countryA, countryB, period, false),
        fetchGoogleNewsFeed(countryA, countryB, period, true),
    ]);
    const successfulFeeds = responses.filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (!successfulFeeds.length) {
        throw new Error(responses.map((result) => result.reason?.message || "RSS 요청 실패").join("; "));
    }
    const unique = new Map();
    successfulFeeds.flat().forEach((article) => {
        const articleKey = article.url || article.title.toLocaleLowerCase();
        if (article.title && !unique.has(articleKey)) unique.set(articleKey, article);
    });
    return [...unique.values()].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 30);
}

function percent(value, total) {
    return total ? Math.round((value / total) * 100) : 0;
}

function formatDate(date, options = {}) {
    if (!date) return "날짜 미상";
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...options }).format(date);
}

function summarize(articles) {
    const counts = { cooperation: 0, conflict: 0, mixed: 0, no_signal: 0 };
    const topics = new Map();
    const behaviors = new Map();
    const stages = new Map();
    const sources = new Set();
    const languages = new Set();
    articles.forEach((article) => {
        counts[article.relation] += 1;
        sources.add(article.domain);
        if (article.language !== "미상") languages.add(article.language);
        article.issueLabels.forEach((label) => topics.set(label, (topics.get(label) || 0) + 1));
        article.behaviorLabels.forEach((label) => behaviors.set(label, (behaviors.get(label) || 0) + 1));
        article.eventStageLabels.forEach((label) => stages.set(label, (stages.get(label) || 0) + 1));
    });
    const score = articles.length ? Math.round(((counts.cooperation - counts.conflict) / articles.length) * 100) : 0;
    const signalCoverage = percent(counts.cooperation + counts.conflict + counts.mixed, articles.length);
    const relation = articles.length < 5
        ? "insufficient"
        : signalCoverage < 25
            ? "limited"
            : score >= 12 ? "cooperation" : score <= -12 ? "conflict" : "mixed";
    return {
        counts,
        topics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
        behaviors: [...behaviors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        stages: [...stages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
        sourceCount: sources.size,
        languageCount: languages.size,
        signalCoverage,
        score,
        relation,
    };
}

function setWidth(id, value) {
    document.getElementById(id).style.width = `${value}%`;
}

function renderDistribution(summary, total) {
    const items = [
        { key: "conflict", label: "갈등 신호", color: "var(--red)" },
        { key: "mixed", label: "복합 신호", color: "var(--amber)" },
        { key: "no_signal", label: "신호 미발견", color: "#aeb3aa" },
        { key: "cooperation", label: "협력 신호", color: "var(--green)" },
    ];
    document.getElementById("distributionList").replaceChildren(...items.map((item) => {
        const row = document.createElement("div");
        row.className = "distribution-row";
        const label = document.createElement("span");
        label.textContent = item.label;
        const track = document.createElement("div");
        track.className = "distribution-track";
        const fill = document.createElement("i");
        fill.style.width = `${percent(summary.counts[item.key], total)}%`;
        fill.style.background = item.color;
        track.appendChild(fill);
        const count = document.createElement("strong");
        count.textContent = `${summary.counts[item.key]}건 · ${percent(summary.counts[item.key], total)}%`;
        row.append(label, track, count);
        return row;
    }));
}

function renderBehaviors(summary) {
    const list = document.getElementById("behaviorList");
    list.replaceChildren();
    document.getElementById("behaviorTotal").textContent = `${summary.behaviors.length}개 유형`;
    if (!summary.behaviors.length) {
        const empty = document.createElement("p");
        empty.className = "empty-articles";
        empty.textContent = "관계 행동 키워드가 확인되지 않았습니다.";
        list.appendChild(empty);
        return;
    }
    const max = summary.behaviors[0][1];
    summary.behaviors.forEach(([label, count]) => {
        const row = document.createElement("div");
        row.className = "topic-row";
        const name = document.createElement("span");
        name.textContent = label;
        const track = document.createElement("div");
        track.className = "topic-track";
        const fill = document.createElement("i");
        fill.style.width = `${Math.max(4, Math.round((count / max) * 100))}%`;
        track.appendChild(fill);
        const amount = document.createElement("b");
        amount.textContent = `${count}건`;
        row.append(name, track, amount);
        list.appendChild(row);
    });
}

function renderEventStages(summary) {
    const list = document.getElementById("eventStageList");
    list.replaceChildren();
    document.getElementById("eventStageTotal").textContent = `${summary.stages.length}개 단계`;
    if (!summary.stages.length) {
        const empty = document.createElement("p");
        empty.className = "empty-articles";
        empty.textContent = "사건 단계 표현이 확인되지 않았습니다.";
        list.appendChild(empty);
        return;
    }
    const max = summary.stages[0][1];
    summary.stages.forEach(([label, count]) => {
        const row = document.createElement("div");
        row.className = "topic-row";
        const name = document.createElement("span");
        name.textContent = label;
        const track = document.createElement("div");
        track.className = "topic-track";
        const fill = document.createElement("i");
        fill.style.width = `${Math.max(4, Math.round((count / max) * 100))}%`;
        track.appendChild(fill);
        const amount = document.createElement("b");
        amount.textContent = `${count}건`;
        row.append(name, track, amount);
        list.appendChild(row);
    });
}

function renderTopics(summary) {
    const list = document.getElementById("topicList");
    list.replaceChildren();
    document.getElementById("topicTotal").textContent = `${summary.topics.length}개 분류`;
    if (!summary.topics.length) {
        const empty = document.createElement("p");
        empty.className = "empty-articles";
        empty.textContent = "분류할 의제가 없습니다.";
        list.appendChild(empty);
        return;
    }
    const max = summary.topics[0][1];
    summary.topics.forEach(([label, count]) => {
        const row = document.createElement("div");
        row.className = "topic-row";
        const name = document.createElement("span");
        name.textContent = label;
        const track = document.createElement("div");
        track.className = "topic-track";
        const fill = document.createElement("i");
        fill.style.width = `${Math.max(4, Math.round((count / max) * 100))}%`;
        track.appendChild(fill);
        const amount = document.createElement("b");
        amount.textContent = `${count}건`;
        row.append(name, track, amount);
        list.appendChild(row);
    });
}

function labelRelation(relation) {
    if (relation === "cooperation") return "협력 신호";
    if (relation === "conflict") return "갈등 신호";
    if (relation === "mixed") return "복합 신호";
    return "관계 신호 미발견";
}

function renderArticles(articles, append = false) {
    if (!append) {
        articleList.replaceChildren();
        visibleArticleCount = 0;
    }
    const nextArticles = articles.slice(visibleArticleCount, visibleArticleCount + PAGE_SIZE);
    nextArticles.forEach((article) => {
        const item = document.createElement("article");
        item.className = "article-item";
        const date = document.createElement("time");
        date.className = "article-date";
        if (article.date) date.dateTime = article.date.toISOString();
        date.textContent = formatDate(article.date, { year: "numeric", month: "short", day: "numeric" });
        const main = document.createElement("div");
        main.className = "article-main";
        const meta = document.createElement("div");
        meta.className = "article-meta";
        const source = document.createElement("span");
        source.textContent = article.domain;
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.textContent = "•";
        const language = document.createElement("span");
        language.textContent = article.language;
        meta.append(source, dot, language);
        const title = document.createElement(article.url ? "a" : "span");
        title.className = "article-title";
        title.textContent = article.title;
        if (article.url) {
            title.href = article.url;
            title.target = "_blank";
            title.rel = "noopener noreferrer";
        }
        const summary = document.createElement("p");
        summary.className = "article-summary";
        summary.textContent = [
            ...article.behaviorLabels,
            ...article.issueLabels,
            ...(article.eventStageLabels || []).map((label) => `단계·${label}`),
        ].join(" · ");
        const evidence = document.createElement("p");
        evidence.className = "article-evidence";
        const relationTermsFound = (article.relationEvidence || []).slice(0, 4);
        const behaviorTermsFound = (article.behaviorEvidence || []).slice(0, 4);
        const evidenceLines = [];
        if (relationTermsFound.length) {
            const label = article.relation === "no_signal" ? "관계 표현·점수 기준 미달" : "관계 신호 표현";
            evidenceLines.push(`${label}: ${relationTermsFound.join(" · ")}`);
        }
        if (behaviorTermsFound.length) evidenceLines.push(`행동 표현: ${behaviorTermsFound.join(" · ")}`);
        evidence.textContent = evidenceLines.length ? evidenceLines.join(" / ") : "등록된 관계·행동 키워드 미발견";
        main.append(meta, title, summary, evidence);
        const signal = document.createElement("span");
        signal.className = `article-signal ${article.relation}`;
        signal.textContent = labelRelation(article.relation);
        item.append(date, main, signal);
        articleList.appendChild(item);
    });
    visibleArticleCount += nextArticles.length;
    loadMoreButton.classList.toggle("hidden", visibleArticleCount >= articles.length);
    loadMoreButton.textContent = `기사 더 보기 (${articles.length - visibleArticleCount}건 남음)`;
    document.getElementById("newsListCount").textContent = `${articles.length}건`;
    if (!articles.length) {
        const empty = document.createElement("p");
        empty.className = "empty-articles";
        empty.textContent = "선택한 기간에 두 국가가 함께 언급된 기사를 찾지 못했습니다. 기간을 늘려 다시 검색해보세요.";
        articleList.appendChild(empty);
    }
}

function renderResult(articles, countryA, countryB, period, cached, savedAt, provider, fallbackReason) {
    currentArticles = articles;
    const summary = summarize(articles);
    const pairTitle = `${countryA.label} — ${countryB.label}`;
    document.getElementById("pairTitle").textContent = pairTitle;
    document.getElementById("updatedAt").textContent = `${formatDate(new Date(savedAt), { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${provider}${cached ? " · 저장" : ""}`;
    document.getElementById("articleCount").textContent = articles.length.toLocaleString("ko-KR");
    document.getElementById("sourceCount").textContent = summary.sourceCount.toLocaleString("ko-KR");
    document.getElementById("languageCount").textContent = summary.languageCount.toLocaleString("ko-KR");
    document.getElementById("signalCoverage").textContent = `${summary.signalCoverage}%`;
    document.getElementById("cooperationCount").textContent = summary.counts.cooperation.toLocaleString("ko-KR");
    document.getElementById("conflictCount").textContent = summary.counts.conflict.toLocaleString("ko-KR");
    document.getElementById("mixedCount").textContent = summary.counts.mixed.toLocaleString("ko-KR");
    document.getElementById("noSignalCount").textContent = summary.counts.no_signal.toLocaleString("ko-KR");
    const total = articles.length || 1;
    setWidth("conflictMeter", percent(summary.counts.conflict, total));
    setWidth("mixedMeter", percent(summary.counts.mixed, total));
    setWidth("noSignalMeter", percent(summary.counts.no_signal, total));
    setWidth("cooperationMeter", percent(summary.counts.cooperation, total));

    const badge = document.getElementById("signalBadge");
    badge.className = `signal-badge ${summary.relation}`;
    badge.textContent = {
        cooperation: "협력 신호 우세",
        conflict: "갈등 신호 우세",
        mixed: "복합 신호",
        limited: "명시적 신호 제한적",
        insufficient: "표본 부족",
    }[summary.relation];
    document.getElementById("relationSummary").textContent = articles.length
        ? `검색 기사 ${articles.length}건: 협력 ${summary.counts.cooperation} · 갈등 ${summary.counts.conflict} · 복합 ${summary.counts.mixed} · 신호 미발견 ${summary.counts.no_signal}. 분류 가능 비율 ${summary.signalCoverage}%. ${summary.relation === "limited" || summary.relation === "insufficient" ? "명시적 신호가 적어 우세 판정을 보류합니다." : `방향 지수 ${summary.score > 0 ? "+" : ""}${summary.score} (표본 기준).`}`
        : "검색 결과가 없습니다. 기간을 늘리거나 다른 국가쌍을 선택해보세요.";

    const sampleBadge = document.getElementById("sampleBadge");
    let sampleLabel = "적은 표본";
    if (articles.length >= 80) sampleLabel = "표본량 많음";
    else if (articles.length >= 25) sampleLabel = "표본량 보통";
    else if (articles.length >= 10) sampleLabel = "표본량 제한적";
    sampleBadge.textContent = sampleLabel;
    document.getElementById("sampleNote").textContent = articles.length >= MAX_ARTICLES
        ? `검색 결과가 최대 ${MAX_ARTICLES}건에 도달했습니다. 최신 기사 ${MAX_ARTICLES}건을 표시합니다.`
        : provider.includes("Google News") && articles.length >= 20
            ? "GDELT 대신 Google News의 영어·한국어 RSS 결과를 표시합니다. 보조 검색은 최대 30건이며, 실제 건수는 각 피드의 반환량에 따라 달라집니다."
            : fallbackReason
                ? `Google News RSS 보조 검색 결과 ${articles.length}건입니다. 최대 30건까지 제공하며 실제 건수는 피드 반환량에 따라 달라집니다. GDELT 전환 사유: ${fallbackReason}`
                : "표본 수는 검색 기간과 뉴스 제공처의 수집 범위에 따라 달라집니다.";

    renderBehaviors(summary);
    renderEventStages(summary);
    renderTopics(summary);
    renderDistribution(summary, articles.length);
    renderArticles(articles);
    resultSection.classList.remove("hidden");
    const sourceNote = fallbackReason ? ` GDELT 대신 보조 뉴스 검색을 사용했습니다.` : "";
    setStatus("최신 뉴스 검색이 완료됐습니다", `${pairTitle} · ${periodLabel(period)} · ${provider} 기사 제목의 관계 신호를 집계했습니다.${sourceNote}`, "ready");
}

function periodLabel(period) {
    return { "1week": "최근 7일", "1month": "최근 30일", "3months": "최근 90일" }[period] || period;
}

async function analyzeSelectedPair() {
    const countryA = countryFor(countryASelect.value);
    const countryB = countryFor(countryBSelect.value);
    if (!countryA || !countryB) return;
    if (countryA.value === countryB.value) {
        setStatus("서로 다른 두 나라를 선택해주세요", "같은 국가는 한 쌍으로 분석할 수 없습니다.", "error");
        return;
    }

    analyzeButton.disabled = true;
    analyzeButton.querySelector("span").textContent = "뉴스 검색 중…";
    setStatus("최신 국제 뉴스를 검색하고 있습니다", `${countryA.label}과 ${countryB.label}이 함께 언급된 기사를 최대 ${MAX_ARTICLES}건까지 요청합니다. 실제 결과 수는 뉴스 제공처의 수집량과 검색 조건에 따라 달라집니다.`, "loading");
    try {
        const result = await fetchArticles(countryA, countryB, periodSelect.value);
        renderResult(result.articles, countryA, countryB, periodSelect.value, result.cached, result.savedAt, result.provider, result.fallbackReason);
    } catch (error) {
        resultSection.classList.add("hidden");
        setStatus("최신 뉴스 검색을 완료하지 못했습니다", error.message, "error");
    } finally {
        analyzeButton.disabled = false;
        analyzeButton.querySelector("span").textContent = "최신 뉴스 분석";
    }
}

function clearStaleResult() {
    resultSection.classList.add("hidden");
    const countryA = countryFor(countryASelect.value);
    const countryB = countryFor(countryBSelect.value);
    if (countryA && countryB && countryA.value !== countryB.value) {
        setStatus("분석 조건이 변경됐습니다", "새로 선택한 두 나라와 기간으로 최신 뉴스 분석을 실행해주세요.", "idle");
    }
}

populateCountrySelect(countryASelect, "South Korea");
populateCountrySelect(countryBSelect, "United States");
analyzeButton.addEventListener("click", analyzeSelectedPair);
countryASelect.addEventListener("change", clearStaleResult);
countryBSelect.addEventListener("change", clearStaleResult);
periodSelect.addEventListener("change", clearStaleResult);
loadMoreButton.addEventListener("click", () => renderArticles(currentArticles, true));
