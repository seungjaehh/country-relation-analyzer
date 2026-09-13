const pairSelect = document.getElementById("pairSelect");
const analyzeButton = document.getElementById("analyzeButton");
const resultSection = document.getElementById("resultSection");
const errorBanner = document.getElementById("errorBanner");
const emptyState = document.getElementById("emptyState");

const chartInstances = {};

const relationColors = {
    cooperation: "#1e7e4e",
    neutral: "#2764a6",
    conflict: "#b3432e",
};

const frameColors = {
    security: "#2764a6",
    economy: "#1e7e4e",
    diplomacy: "#6f5fa8",
    human_rights: "#b3432e",
    history: "#d5672f",
    context: "#667085",
    unknown: "#98a2b3",
};

const leaderProfiles = {
    "South Korea": {
        label: "대한민국",
        image: "static/images/leaders/south-korea.jpg",
        initials: "KR",
    },
    "United States": {
        label: "미국",
        image: "static/images/leaders/united-states.jpg",
        initials: "US",
    },
    China: {
        label: "중국",
        image: "static/images/leaders/china.jpg",
        initials: "CN",
    },
    Japan: {
        label: "일본",
        image: "static/images/leaders/japan.jpg",
        initials: "JP",
    },
};

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function renderLeaderProfile(side, country) {
    const profile = leaderProfiles[country] || {
        label: country,
        image: "",
        initials: country.slice(0, 2).toUpperCase(),
    };
    const portrait = document.getElementById(`country${side}Portrait`);
    const image = document.getElementById(`country${side}Image`);

    setText(`country${side}Label`, profile.label);
    setText(`country${side}Fallback`, profile.initials);
    portrait.classList.add("is-missing");
    image.alt = `${profile.label} 정상 이미지`;
    image.onload = () => portrait.classList.remove("is-missing");
    image.onerror = () => portrait.classList.add("is-missing");

    if (profile.image) {
        image.src = profile.image;
    } else {
        image.removeAttribute("src");
    }
}

function formatScore(value) {
    return Number(value || 0).toFixed(2);
}

function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove("hidden");
}

function clearError() {
    errorBanner.textContent = "";
    errorBanner.classList.add("hidden");
}

function selectedPairPayload() {
    const [countryA, countryB] = pairSelect.value.split("||");
    return {
        country_a: countryA,
        country_b: countryB,
    };
}

function destroyCharts() {
    Object.values(chartInstances).forEach((chart) => chart.destroy());
    Object.keys(chartInstances).forEach((key) => delete chartInstances[key]);
}

function badgeClass(type) {
    if (type === "cooperation") {
        return "badge badge-cooperation";
    }
    if (type === "conflict") {
        return "badge badge-conflict";
    }
    return "badge badge-neutral";
}

function renderCountList(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (!items.length) {
        const empty = document.createElement("span");
        empty.className = "chip";
        empty.textContent = "없음";
        container.appendChild(empty);
        return;
    }

    items.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = `chip ${item.name ? `chip-${item.name}` : ""}`;
        chip.textContent = `${item.label} ${item.count}건`;

        const ratio = document.createElement("small");
        ratio.textContent = `${item.ratio}%`;
        chip.appendChild(ratio);
        container.appendChild(chip);
    });
}

function renderKeywordList(items) {
    const container = document.getElementById("keywordList");
    container.innerHTML = "";

    if (!items.length) {
        const empty = document.createElement("span");
        empty.className = "keyword-pill";
        empty.textContent = "탐지 키워드 없음";
        container.appendChild(empty);
        return;
    }

    items.forEach((item) => {
        const pill = document.createElement("span");
        pill.className = `keyword-pill keyword-${item.relation_type}`;
        pill.textContent = item.keyword;

        const meta = document.createElement("small");
        meta.textContent = `${item.count}회`;
        pill.appendChild(meta);
        container.appendChild(pill);
    });
}

function chartOptions(horizontal = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? "y" : "x",
        plugins: {
            legend: {
                labels: {
                    boxWidth: 14,
                    color: "#344054",
                },
            },
        },
        scales: horizontal
            ? {
                  x: {
                      beginAtZero: true,
                      ticks: { precision: 0 },
                  },
                  y: {
                      ticks: { color: "#344054" },
                  },
              }
            : {
                  y: {
                      beginAtZero: true,
                      ticks: { color: "#344054" },
                  },
                  x: {
                      ticks: { color: "#344054" },
                  },
              },
    };
}

function renderCharts(data) {
    destroyCharts();

    const summary = data.summary;
    const scoreContext = document.getElementById("scoreChart");
    chartInstances.score = new Chart(scoreContext, {
        type: "bar",
        data: {
            labels: ["past", "recent"],
            datasets: [
                {
                    label: "평균 article_score",
                    data: [summary.past_average_score, summary.recent_average_score],
                    backgroundColor: ["#2764a6", "#1e7e4e"],
                    borderRadius: 6,
                },
            ],
        },
        options: chartOptions(),
    });

    const frameContext = document.getElementById("frameChart");
    chartInstances.frame = new Chart(frameContext, {
        type: "bar",
        data: {
            labels: data.frame_counts.map((item) => item.label),
            datasets: [
                {
                    label: "기사 수",
                    data: data.frame_counts.map((item) => item.count),
                    backgroundColor: data.frame_counts.map((item) => frameColors[item.name] || "#667085"),
                    borderRadius: 6,
                },
            ],
        },
        options: chartOptions(),
    });

    const relationContext = document.getElementById("relationChart");
    chartInstances.relation = new Chart(relationContext, {
        type: "doughnut",
        data: {
            labels: data.relation_counts.map((item) => `${item.label} ${item.ratio}%`),
            datasets: [
                {
                    label: "기사 비율",
                    data: data.relation_counts.map((item) => item.count),
                    backgroundColor: data.relation_counts.map((item) => relationColors[item.name]),
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        boxWidth: 14,
                        color: "#344054",
                    },
                },
            },
        },
    });

    const keywordContext = document.getElementById("keywordChart");
    chartInstances.keyword = new Chart(keywordContext, {
        type: "bar",
        data: {
            labels: data.top_keywords.map((item) => item.keyword),
            datasets: [
                {
                    label: "탐지 횟수",
                    data: data.top_keywords.map((item) => item.count),
                    backgroundColor: data.top_keywords.map((item) => relationColors[item.relation_type] || "#667085"),
                    borderRadius: 6,
                },
            ],
        },
        options: chartOptions(true),
    });
}

function keywordText(article) {
    if (!article.detected_keywords || !article.detected_keywords.length) {
        return "-";
    }
    return article.detected_keywords.join(", ");
}

function appendCell(row, value, className = "") {
    const cell = document.createElement("td");
    if (className) {
        cell.className = className;
    }
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
}

function normalizeArticleUrl(rawUrl) {
    const trimmedUrl = String(rawUrl || "").trim();
    if (!trimmedUrl) {
        return "";
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
            return parsedUrl.href;
        }
    } catch (error) {
        return "";
    }

    return "";
}

function handleInvalidArticleLink(event) {
    event.preventDefault();
    showError("기사 URL이 올바르지 않습니다.");
}

function shouldOpenArticleInSameTab() {
    return navigator.userAgent.toLowerCase().includes("windows");
}

function configureArticleLink(link, rawUrl, text) {
    const url = normalizeArticleUrl(rawUrl);

    link.href = url || "#";
    link.textContent = text;
    link.target = shouldOpenArticleInSameTab() ? "_self" : "_blank";

    if (link.target === "_blank") {
        link.rel = "noopener noreferrer";
    }

    if (!url) {
        link.classList.add("disabled-link");
        link.setAttribute("aria-disabled", "true");
        link.title = "기사 URL이 올바르지 않습니다.";
        link.addEventListener("click", handleInvalidArticleLink);
        return;
    }

    link.dataset.articleUrl = url;
}

function renderArticleTable(articles) {
    const tbody = document.getElementById("articleRows");
    tbody.innerHTML = "";
    setText("tableCount", `${articles.length}건`);

    articles.forEach((article) => {
        const row = document.createElement("tr");
        appendCell(row, article.period);
        appendCell(row, article.date);
        appendCell(row, article.source);

        const titleCell = document.createElement("td");
        titleCell.className = "title-cell";
        const titleLink = document.createElement("a");
        configureArticleLink(titleLink, article.url, article.title);
        titleCell.appendChild(titleLink);
        row.appendChild(titleCell);

        appendCell(row, article.main_frame_label);

        const relationCell = document.createElement("td");
        const relationBadge = document.createElement("span");
        relationBadge.className = badgeClass(article.relation_type);
        relationBadge.textContent = article.relation_label;
        relationCell.appendChild(relationBadge);
        row.appendChild(relationCell);

        appendCell(row, article.relation_score);
        appendCell(row, article.article_score);
        appendCell(row, keywordText(article), "keyword-cell");
        appendCell(row, article.summary, "summary-cell");

        const linkCell = document.createElement("td");
        const sourceLink = document.createElement("a");
        sourceLink.className = "link-button";
        configureArticleLink(sourceLink, article.url, "원문 보기");
        linkCell.appendChild(sourceLink);
        row.appendChild(linkCell);

        tbody.appendChild(row);
    });
}

function renderAnalysis(data) {
    destroyCharts();

    if (!data.has_data) {
        resultSection.classList.add("hidden");
        emptyState.textContent = data.message || "해당 국가쌍의 데이터가 없습니다";
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");
    resultSection.classList.remove("hidden");

    const summary = data.summary;
    setText("selectedPair", data.selected_pair.label);
    renderLeaderProfile("A", data.selected_pair.country_a);
    renderLeaderProfile("B", data.selected_pair.country_b);
    setText("changeDirection", summary.change_direction_label);
    setText("interpretationText", summary.interpretation);
    setText("totalArticles", summary.total_articles);
    setText("pastCount", summary.past_count);
    setText("recentCount", summary.recent_count);
    setText("pastAverage", formatScore(summary.past_average_score));
    setText("recentAverage", formatScore(summary.recent_average_score));
    setText("changeValue", formatScore(summary.change));
    setText("evidenceText", summary.evidence_sentence);

    const finalBadge = document.getElementById("finalRelationBadge");
    finalBadge.className = badgeClass(summary.final_relation_type);
    finalBadge.textContent = summary.final_relation_label;

    const frameBadge = document.getElementById("dominantFrameBadge");
    frameBadge.className = "badge badge-neutral";
    frameBadge.textContent = `주요 프레임: ${summary.dominant_frame_label}`;

    renderCountList("frameCountsList", data.frame_counts);
    renderCountList("relationCountsList", data.relation_counts);
    renderKeywordList(data.top_keywords);
    renderArticleTable(data.articles);
    renderCharts(data);
}

let analysisDatabase = null;

async function loadPairs() {
    const response = await fetch("data/analysis_results.json");
    if (!response.ok) {
        throw new Error("국가쌍 목록을 불러오지 못했습니다.");
    }

    const data = await response.json();
    analysisDatabase = data;
    pairSelect.innerHTML = "";

    data.pairs.forEach((pair) => {
        const option = document.createElement("option");
        option.value = `${pair.country_a}||${pair.country_b}`;
        option.textContent = pair.label;
        pairSelect.appendChild(option);
    });
}

async function analyzeSelectedPair() {
    clearError();
    analyzeButton.disabled = true;
    analyzeButton.textContent = "분석 중";

    try {
        if (!analysisDatabase) {
            throw new Error("분석 데이터를 불러오지 못했습니다.");
        }

        const pair = selectedPairPayload();
        const data = analysisDatabase.results[`${pair.country_a}||${pair.country_b}`];
        if (!data) {
            throw new Error("해당 국가쌍의 데이터가 없습니다");
        }

        renderAnalysis(data);
    } catch (error) {
        showError(error.message);
    } finally {
        analyzeButton.disabled = false;
        analyzeButton.textContent = "분석";
    }
}

analyzeButton.addEventListener("click", analyzeSelectedPair);

loadPairs()
    .then(analyzeSelectedPair)
    .catch((error) => showError(error.message));

