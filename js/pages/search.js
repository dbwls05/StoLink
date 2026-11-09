// 검색 결과 카드 랜더링 (영화 + 드라마·TV + 웹툰)
// - 영화      : TMDB search/movie
// - 드라마·TV : TMDB search/tv
// - 웹툰      : 만화규장각 제목 검색 (키가 없거나 실패하면 웹툰만 0건, 나머지는 그대로 나옴)
// - 필터 칩   : 전체 / 영화 / 드라마·TV / 웹툰 (각 개수 표시)
// - 정렬 칩   : 누를 때마다 관련도순 → 최신순 → 평점순
// - 플랫폼 뱃지: 영화·드라마는 TMDB 한국 OTT 정보, 웹툰은 연재 플랫폼 (없으면 숨김)
import * as tmdb from "../api/tmdb.js";

// kmas.js 가 옛날 버전이거나 없어도 페이지 전체가 멈추지 않게 따로 불러옴
const kmas = await import("../api/kmas.js").catch(() => ({}));

const IMG = "https://image.tmdb.org/t/p/w500";

const param = new URLSearchParams(location.search);
const query = (param.get("q") || "").trim();

// HTML 에 넣을 글자 안전하게 바꾸기
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 공백·기호 빼고 비교 ("미생 1" → "미생1")
const compact = (s) => String(s || "").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

// 검색어와 제목이 얼마나 맞는지 (2: 똑같음, 1: 검색어로 시작, 0: 그 외)
function exactness(title) {
  const t = compact(title);
  const q = compact(query);
  if (!q) return 0;
  if (t === q) return 2;
  if (t.startsWith(q)) return 1;
  return 0;
}

/* ─────────────────────────────
   1. 데이터 가져오기 → 같은 모양으로 맞추기
   { type, id, title, year, date, poster, desc, score, platform, href, rank, exact }
───────────────────────────── */

function fromMovie(m, i) {
  return {
    type: "movie",
    id: m.id,
    title: m.title,
    date: m.release_date || "",
    poster: m.poster_path ? IMG + m.poster_path : "",
    desc: m.overview,
    score: m.vote_average || 0,
    platform: "",
    href: `detail.html?type=movie&id=${m.id}`,
    rank: i,
  };
}

function fromTv(t, i) {
  return {
    type: "tv",
    id: t.id,
    title: t.name,
    date: t.first_air_date || "",
    poster: t.poster_path ? IMG + t.poster_path : "",
    desc: t.overview,
    score: t.vote_average || 0,
    platform: "",
    href: `detail.html?type=tv&id=${t.id}`,
    rank: i,
  };
}

// 만화규장각 이미지 주소 (프록시를 거치면 127.0.0.1 주소로 와서 원래 주소로 바꿈)
function kmasImageUrl(url) {
  if (!url) return "";
  try {
    const { pathname, search } = new URL(url, "https://www.kmas.or.kr");
    return `https://www.kmas.or.kr${pathname}${search}`;
  } catch {
    return "";
  }
}

const BRAND_WEBTOON = /브랜드\s*웹툰|본\s*(콘텐츠|컨텐츠)는/;
const firstName = (s) => String(s || "").split(/[,/·&]|\s+/).map((n) => n.trim()).filter(Boolean)[0] || "";

// 만화규장각은 같은 작품이 권수·플랫폼마다 따로 와서 '작품명 + 글작가' 로 하나로 묶음
function groupWebtoons(items) {
  const works = new Map();

  items.forEach((item) => {
    const title = (item.prdctNm || item.title || "").replace(/\s*\d+\s*$/, ""); // "미생 1" → "미생"
    if (!title) return;
    if (/19|성인/.test(item.ageGradCdNm || "")) return; // 성인 작품 제외
    if (BRAND_WEBTOON.test(item.outline || "")) return; // 광고(브랜드) 웹툰 제외

    const writer = firstName(item.sntncWritrNm) || firstName(item.pictrWritrNm);
    const key = compact(title) + "|" + writer;
    const saved = works.get(key) || {
      type: "webtoon",
      title,
      writer,
      date: "",
      poster: "",
      desc: "",
      score: null,
      genre: "",
      platforms: [],
      href: `detail.html?type=webtoon&title=${encodeURIComponent(title)}&writer=${encodeURIComponent(writer)}`,
      rank: works.size,
    };

    if (item.pltfomCdNm && !saved.platforms.includes(item.pltfomCdNm)) {
      saved.platforms.push(item.pltfomCdNm);
      // 웹툰 기록(플랫폼 있음)의 표지를 우선
      saved.poster = kmasImageUrl(item.imageDownloadUrl) || saved.poster;
    }
    saved.poster ||= kmasImageUrl(item.imageDownloadUrl);
    saved.desc ||= item.outline || "";
    saved.genre ||= item.mainGenreCdNm || "";
    works.set(key, saved);
  });

  return [...works.values()].map((w) => ({
    ...w,
    platform: w.platforms.length > 1 ? `${w.platforms[0]} 외 ${w.platforms.length - 1}` : w.platforms[0] || "",
  }));
}

async function loadResults() {
  // 검색어가 없으면 예전처럼 인기 영화
  if (!query) {
    const movies = (await tmdb.getPopularMovie()) || [];
    return movies.map(fromMovie);
  }

  const [movies, tvs, webtoonItems] = await Promise.all([
    tmdb.searchMovie(query).then((r) => r || []).catch(() => []),
    (tmdb.searchTv ? tmdb.searchTv(query) : Promise.resolve([])).then((r) => r || []).catch(() => []),
    (kmas.searchByTitle ? kmas.searchByTitle(query) : Promise.resolve([])).catch(() => []),
  ]);

  const webtoons = groupWebtoons(webtoonItems)
    // 만화규장각 제목 검색은 글자가 섞여 있기만 해도 나와서("미생" → "음란한 취미생활") 검색어가 제목에 들어간 것만
    .filter((w) => compact(w.title).includes(compact(query)))
    .slice(0, 20);

  return [...movies.map(fromMovie), ...tvs.map(fromTv), ...webtoons].map((r) => ({ ...r, exact: exactness(r.title) }));
}

/* ─────────────────────────────
   2. 필터 · 정렬
───────────────────────────── */

const FILTERS = ["all", "movie", "tv", "webtoon"]; // 칩 순서와 같음
const SORTS = [
  { key: "relevance", label: "관련도순" },
  { key: "latest", label: "최신순" },
  { key: "score", label: "평점순" },
];

let currentFilter = "all";
let currentSort = 0;

function sortResults(list) {
  const sort = SORTS[currentSort].key;
  return [...list].sort((a, b) => {
    if (sort === "latest") return (b.date || "").localeCompare(a.date || "");
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
    // 관련도순: 제목이 똑같은 것 → 검색어로 시작 → 나머지, 같으면 각 검색 결과 순서대로 섞기
    return (b.exact || 0) - (a.exact || 0) || a.rank - b.rank;
  });
}

/* ─────────────────────────────
   3. 그리기
───────────────────────────── */

const TYPE_LABEL = { movie: "영화", tv: "드라마", webtoon: "웹툰" };

function cardHtml(r) {
  const year = r.date ? r.date.slice(0, 4) : "";
  const meta = [year, TYPE_LABEL[r.type], r.type === "webtoon" ? r.writer : ""].filter(Boolean).join(" · ");
  const poster = r.poster
    ? `<img src="${esc(r.poster)}" alt="${esc(r.title)}" onerror="this.remove()">`
    : "";
  // 웹툰은 평점이 없어서 장르를 대신 보여줌
  const bottom = r.type === "webtoon"
    ? `<p class="score no-star">${esc(r.genre || "웹툰")}</p>`
    : `<p class="score">${Number(r.score || 0).toFixed(1)}</p>`;
  const key = r.type === "webtoon" ? "" : `${r.type}:${r.id}`;

  return `
    <li class="result-card">
      <a href="${esc(r.href)}">
        <div class="poster">
          ${poster}
          <button type="button" class="bookmark" aria-label="저장">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><path d="M2 1.5h8v11L6 9.5l-4 3z"/></svg>
          </button>
          <span class="platform" data-key="${key}" ${r.platform ? "" : "hidden"}>${esc(r.platform)}</span>
        </div>
        <div class="card-info">
          <p class="meta">${esc(meta)}</p>
          <h3>${esc(r.title)}</h3>
          <p class="desc">${esc(r.desc || "줄거리 정보가 없습니다.")}</p>
          <button type="button" class="more-btn">더보기</button>
          ${bottom}
        </div>
      </a>
    </li>`;
}

function renderResult() {
  const list = document.getElementById("result-list");
  const shown = sortResults(currentFilter === "all" ? results : results.filter((r) => r.type === currentFilter));

  list.innerHTML = shown.length
    ? shown.map(cardHtml).join("")
    : `<li class="result-empty">검색 결과가 없습니다.</li>`;

  fillPlatforms();
}

// 칩 개수 · 선택 표시
function renderChips() {
  const chips = document.querySelectorAll(".filter .chip:not(.sort)");
  const count = {
    all: results.length,
    movie: results.filter((r) => r.type === "movie").length,
    tv: results.filter((r) => r.type === "tv").length,
    webtoon: results.filter((r) => r.type === "webtoon").length,
  };
  chips.forEach((chip, i) => {
    chip.querySelector("span").textContent = count[FILTERS[i]];
    chip.classList.toggle("active", FILTERS[i] === currentFilter);
  });
  document.querySelector(".filter .chip.sort").innerHTML = `${SORTS[currentSort].label} <i class="caret"></i>`;
}

// 영화·드라마 OTT 뱃지 (TMDB 한국 정보, 정액제 → 무료 → 대여·구매 순으로 첫 번째)
const PROVIDER_KO = {
  Netflix: "넷플릭스",
  "Netflix Standard with Ads": "넷플릭스",
  "Netflix basic with Ads": "넷플릭스",
  TVING: "티빙",
  wavve: "웨이브",
  "Coupang Play": "쿠팡플레이",
  "Disney Plus": "디즈니+",
  Watcha: "왓챠",
  "Apple TV Plus": "Apple TV+",
  "Apple TV": "Apple TV",
  "Amazon Prime Video": "프라임 비디오",
  "Google Play Movies": "구글 플레이",
  "Naver Store": "네이버 시리즈온",
  "U+ Mobile TV": "U+모바일tv",
};
const providerCache = new Map(); // 정렬·필터를 바꿔도 다시 안 부르게

async function fillPlatforms() {
  const badges = [...document.querySelectorAll(".platform[data-key]:not([data-key=''])")];
  await Promise.all(
    badges.map(async (badge) => {
      const key = badge.dataset.key;
      if (!providerCache.has(key)) {
        const [media, id] = key.split(":");
        providerCache.set(key, tmdb.getWatchProviders(id, media).catch(() => null));
      }
      const kr = await providerCache.get(key);
      const first = [kr?.flatrate, kr?.free, kr?.ads, kr?.rent, kr?.buy].find((l) => l?.length)?.[0];
      if (first) {
        badge.textContent = PROVIDER_KO[first.provider_name] || first.provider_name;
        badge.hidden = false;
      }
    }),
  );
}

/* ─────────────────────────────
   4. 시작
───────────────────────────── */

document.getElementById("keyword").textContent = query || "인기영화";
document.querySelector(".search-bar input").value = query;

const results = await loadResults();
document.getElementById("total").textContent = results.length;
renderChips();
renderResult();

// 필터 칩 · 정렬 칩
document.querySelector(".filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  if (chip.classList.contains("sort")) {
    currentSort = (currentSort + 1) % SORTS.length;
  } else {
    const chips = [...document.querySelectorAll(".filter .chip:not(.sort)")];
    currentFilter = FILTERS[chips.indexOf(chip)];
  }
  renderChips();
  renderResult();
});

// 더보기 / 접기
document.getElementById("result-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".more-btn");
  if (!btn) return;
  e.preventDefault(); // 링크 이동 막기
  const desc = btn.previousElementSibling;
  const open = desc.classList.toggle("expanded");
  btn.textContent = open ? "접기" : "더보기";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault(); // 브라우저가 해당 이벤트에 대해 기본적으로 수행하는 동작을 취소(막는) 메서드
    location.href = "search.html";
  }
});