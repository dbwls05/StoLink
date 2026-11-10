// 검색 결과 카드 랜더링 (영화 + 드라마·TV + 웹툰 + 인물)
// - 영화      : TMDB search/movie
// - 드라마·TV : TMDB search/tv
// - 웹툰      : 만화규장각 제목 검색 (키가 없거나 실패하면 웹툰만 0건, 나머지는 그대로 나옴)
// - 배우      : TMDB search/person (Acting) → actor.html?id=
// - 작가      : 웹툰 작가는 만화규장각 작가 검색 → writer.html?writer=
//               TMDB 작가·감독(Writing · Directing) → writer.html?person=
// - 필터 칩   : 전체 / 영화 / 드라마·TV / 웹툰 / 배우 / 작가·감독 (각 개수 표시, 칩의 data-kind 로 구분)
// - 정렬 칩   : 관련도순 / 최신순 / 평점순 (인물은 날짜·평점이 없어서 최신순·평점순에서는 뒤로)
import * as tmdb from "../api/tmdb.js";

// kmas.js 가 옛날 버전이거나 없어도 페이지 전체가 멈추지 않게 따로 불러옴
const kmas = await import("../api/kmas.js").catch(() => ({}));

const IMG = "https://image.tmdb.org/t/p/w500";

// 장르 번호 → 이름 (영화·드라마 공통, 카드에 최대 2개 표시)
const genreMap = new Map();
async function loadGenres() {
  const lists = await Promise.all([
    tmdb.getGenreList("movie"),
    tmdb.getGenreList("tv"),
  ]).catch(() => []);
  lists.flat().forEach((g) => genreMap.set(g.id, g.name));
}
const genreText = (ids = []) =>
  ids
    .slice(0, 2)
    .map((id) => genreMap.get(id))
    .filter(Boolean)
    .join(", ");

const param = new URLSearchParams(location.search);
const query = (param.get("q") || "").trim();

// HTML 에 넣을 글자 안전하게 바꾸기
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// 공백·기호 빼고 비교 ("미생 1" → "미생1")
const compact = (s) =>
  String(s || "")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();

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
    genre: genreText(m.genre_ids),
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
    genre: genreText(t.genre_ids),
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
const firstName = (s) =>
  String(s || "")
    .split(/[,/·&]|\s+/)
    .map((n) => n.trim())
    .filter(Boolean)[0] || "";

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
    platform:
      w.platforms.length > 1
        ? `${w.platforms[0]} 외 ${w.platforms.length - 1}`
        : w.platforms[0] || "",
  }));
}

/* ─────────────────────────────
   1-2. 인물 (배우 · 감독 · 작가)
   { type: "actor" | "writer", role, id, title(이름), poster(프로필), works(대표작), href, rank }
   - type 은 필터 칩(data-kind)과 같은 값: 배우 → "actor", 작가·감독 · 웹툰 작가 → "writer"
───────────────────────────── */

// TMDB 직업 → 화면 글자. 이 셋만 보여줌 (촬영·음악 등 다른 스태프는 제외)
const PERSON_ROLE = { Acting: "배우", Directing: "감독", Writing: "작가" };

// 이름이 정확히 같은지 ("조석" 은 "조석호" 와 다른 사람)
const hasName = (item, name) =>
  `${item.sntncWritrNm || ""} ${item.pictrWritrNm || ""}`
    .split(/[\s,·/()]+/)
    .includes(name);

function fromPerson(p, i) {
  const role = PERSON_ROLE[p.known_for_department];
  return {
    type: role === "배우" ? "actor" : "writer",
    role,
    id: p.id,
    title: p.name,
    date: "",
    score: null,
    poster: p.profile_path ? IMG + p.profile_path : "",
    works: (p.known_for || []).map((w) => w.title || w.name).filter(Boolean).slice(0, 3),
    href: role === "배우" ? `actor.html?id=${p.id}` : `writer.html?person=${p.id}`,
    rank: i,
  };
}

// 검색어와 이름이 똑같은 웹툰 작가 → 카드 한 장 (대표작은 웹툰 제목 3개)
// - 연재 플랫폼이 있는 기록(= 웹툰)이 하나도 없으면 웹툰 작가로 보지 않음 (학습만화 · 책만 있는 같은 이름 제외)
function webtoonWriterCard(items) {
  const own = items.filter(
    (item) => hasName(item, query) && item.pltfomCdNm && !BRAND_WEBTOON.test(item.outline || ""),
  );
  if (own.length === 0) return null;
  const titles = [...new Set(own.map((item) => (item.prdctNm || item.title || "").replace(/\s*\d+\s*$/, "")).filter(Boolean))];
  return {
    type: "writer",
    role: "웹툰 작가",
    id: null,
    title: query,
    date: "",
    score: null,
    poster: "",
    works: titles.slice(0, 3),
    href: `writer.html?writer=${encodeURIComponent(query)}`,
    rank: 0,
  };
}

async function loadPeople() {
  const [people, writerItems] = await Promise.all([
    (tmdb.searchPerson ? tmdb.searchPerson(query) : Promise.resolve([]))
      .then((r) => r || [])
      .catch(() => []),
    (kmas.searchWebtoonsByWriter
      ? kmas.searchWebtoonsByWriter(query)
      : Promise.resolve([])
    ).catch(() => []), // 인증키가 없으면 에러 → 웹툰 작가만 빠짐
  ]);

  let persons = people
    .filter((p) => PERSON_ROLE[p.known_for_department] && !p.adult)
    .slice(0, 12)
    .map(fromPerson);

  const sameName = (role) => persons.find((p) => p.role === role && compact(p.title) === compact(query));
  const writer = webtoonWriterCard(writerItems);

  // 같은 이름의 감독이 TMDB 에 있으면 감독 카드만 (작가 탭에 같이 나옴) (예: 봉준호 - 영화 '괴물' 만화판에 이름이 있어도 감독)
  if (writer && !sameName("감독")) {
    // TMDB 에 같은 이름의 작가가 있으면 그 사진만 빌려 쓰고 카드는 웹툰 작가 하나로 (예: 윤태호, 조석)
    const same = sameName("작가");
    if (same) {
      writer.poster = same.poster;
      persons = persons.filter((p) => p !== same);
    }
    persons = [writer, ...persons];
  }
  return persons;
}

// 홈 "유형별로 둘러보기" → search.html?type=movie|drama|tv|webtoon
const BROWSE = {
  movie: { label: "영화", filter: "movie" },
  drama: { label: "드라마", filter: "tv", genres: "18" },
  tv: { label: "TV 프로그램", filter: "tv", genres: "10764|10767|99" },
  webtoon: { label: "웹툰", filter: "webtoon" },
};
const browseType = BROWSE[param.get("type")] ? param.get("type") : "";
// 웹툰은 목록 API 가 없어서 대표작 제목으로 검색해 보여줌
const WEBTOON_SEEDS = ["미생", "이태원 클라쓰", "유미의 세포들", "스위트홈", "지금 우리 학교는", "나 혼자만 레벨업"];

async function loadBrowse() {
  if (browseType === "movie") return ((await tmdb.discoverKoreanMovie()) || []).map(fromMovie);
  if (browseType === "webtoon") {
    const lists = await Promise.all(
      WEBTOON_SEEDS.map((q) => (kmas.searchByTitle ? kmas.searchByTitle(q) : []).catch(() => [])),
    );
    return groupWebtoons(lists.flat()).filter((w) =>
      WEBTOON_SEEDS.some((q) => compact(w.title).includes(compact(q))),
    );
  }
  const tvs = (await tmdb.discoverTv(BROWSE[browseType].genres)) || [];
  return tvs.map(fromTv);
}

async function loadResults() {
  await loadGenres();
  if (!query && browseType) return loadBrowse();
  // 검색어가 없으면 예전처럼 인기 영화
  if (!query) {
    const movies = (await tmdb.getPopularMovie()) || [];
    return movies.map(fromMovie);
  }

  const [movies, tvs, webtoonItems, persons] = await Promise.all([
    tmdb
      .searchMovie(query)
      .then((r) => r || [])
      .catch(() => []),
    (tmdb.searchTv ? tmdb.searchTv(query) : Promise.resolve([]))
      .then((r) => r || [])
      .catch(() => []),
    (kmas.searchByTitle
      ? kmas.searchByTitle(query)
      : Promise.resolve([])
    ).catch(() => []),
    loadPeople().catch(() => []),
  ]);

  const webtoons = groupWebtoons(webtoonItems)
    // 만화규장각 제목 검색은 글자가 섞여 있기만 해도 나와서("미생" → "음란한 취미생활") 검색어가 제목에 들어간 것만
    .filter((w) => compact(w.title).includes(compact(query)))
    .slice(0, 20);

  return [...movies.map(fromMovie), ...tvs.map(fromTv), ...webtoons, ...persons].map(
    (r) => ({ ...r, exact: exactness(r.title) }),
  );
}

/* ─────────────────────────────
   2. 필터 · 정렬
───────────────────────────── */

const SORTS = [
  { key: "relevance", label: "관련도순" },
  { key: "latest", label: "최신순" },
  { key: "score", label: "평점순" },
];

let currentFilter = "all"; // 칩의 data-kind 값: all | movie | tv | webtoon | writer | actor
let currentSort = 0;

// 유형별 둘러보기: 처음 12개, 더보기를 누를 때마다 6개씩 더
const isBrowse = !query && !!browseType;
const FIRST_COUNT = 12;
const MORE_STEP = 6;
let visibleCount = FIRST_COUNT;

function sortResults(list) {
  const sort = SORTS[currentSort].key;
  return [...list].sort((a, b) => {
    if (sort === "latest") return (b.date || "").localeCompare(a.date || "");
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
    // 관련도순: 제목(이름)이 똑같은 것 → 검색어로 시작 → 나머지, 같으면 각 검색 결과 순서대로 섞기
    return (b.exact || 0) - (a.exact || 0) || a.rank - b.rank;
  });
}

/* ─────────────────────────────
   3. 그리기
───────────────────────────── */

const TYPE_LABEL = { movie: "영화", tv: "드라마·TV", webtoon: "웹툰" };

// 프로필 사진이 없는 인물 자리 (회색 사람 모양)
const PERSON_SILHOUETTE = `
  <svg viewBox="0 0 100 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="100" height="150" fill="#e2e8f0"/>
    <circle cx="50" cy="58" r="20" fill="#cbd5e1"/>
    <path d="M14 132c4-26 18-40 36-40s32 14 36 40z" fill="#cbd5e1"/>
  </svg>`;

function personCardHtml(r) {
  const photo = r.poster
    ? `<img src="${esc(r.poster)}" alt="${esc(r.title)} 사진" onerror="this.remove()">`
    : PERSON_SILHOUETTE;
  const works = r.works.length ? `대표작 ${r.works.join(", ")}` : "대표작 정보 없음";

  return `
    <li class="result-card is-person">
      <a href="${esc(r.href)}">
        <div class="poster">
          ${photo}
          <span class="type-badge">${esc(r.role)}</span>
        </div>
        <div class="card-text">
          <h3>${esc(r.title)}</h3>
          <p class="meta">${esc(works)}</p>
        </div>
      </a>
    </li>`;
}

function cardHtml(r) {
  if (r.type === "actor" || r.type === "writer") return personCardHtml(r);

  const year = r.date ? r.date.slice(0, 4) : "";
  const meta = [year, r.genre].filter(Boolean).join(" · ") || "-";
  const poster = r.poster
    ? `<img src="${esc(r.poster)}" alt="${esc(r.title)} 포스터" onerror="this.remove()">`
    : "";
  // 웹툰은 평점 데이터가 없음
  const score = r.score ? Number(r.score).toFixed(1) : "-";

  return `
    <li class="result-card">
      <a href="${esc(r.href)}">
        <div class="poster">
          ${poster}
          <span class="type-badge">${TYPE_LABEL[r.type]}</span>
        </div>
        <div class="card-text">
          <h3>${esc(r.title)}</h3>
          <p class="meta">${esc(meta)}</p>
          <p class="score">${score}</p>
        </div>
      </a>
    </li>`;
}

function renderResult() {
  const list = document.getElementById("result-list");
  const shown = sortResults(
    currentFilter === "all"
      ? results
      : results.filter((r) => r.type === currentFilter),
  );

  // 둘러보기에서는 visibleCount 개만 보여주고, 남았으면 더보기 버튼 표시
  const visible = isBrowse ? shown.slice(0, visibleCount) : shown;
  list.innerHTML = visible.length
    ? visible.map(cardHtml).join("")
    : `<li class="result-empty">검색 결과가 없습니다.</li>`;
  document.getElementById("more-btn").hidden = visible.length >= shown.length;
}

// 칩 개수 · 선택 표시
function renderChips() {
  document.querySelectorAll(".filter .chip[data-kind]").forEach((chip) => {
    const kind = chip.dataset.kind;
    const count = kind === "all" ? results.length : results.filter((r) => r.type === kind).length;
    chip.querySelector("span").textContent = count;
    chip.classList.toggle("active", kind === currentFilter);
  });
  document.getElementById("sort-btn").innerHTML =
    `${SORTS[currentSort].label} <i class="caret"></i>`;
  document
    .querySelectorAll("#sort-menu li")
    .forEach((li, i) => li.classList.toggle("selected", i === currentSort));
}

/* ─────────────────────────────
   4. 시작
───────────────────────────── */

if (isBrowse) {
  // 제목 "인기 영화", 필터 칩 숨김(CSS), 정렬 첫 항목은 "인기순"
  currentFilter = BROWSE[browseType].filter;
  document.querySelector(".search-result").classList.add("browse");
  document.getElementById("result-title").textContent =
    `인기 ${BROWSE[browseType].label}`;
  SORTS[0].label = "인기순";
  document.querySelector('#sort-menu li[data-sort="relevance"]').textContent =
    "인기순";
} else {
  document.getElementById("keyword").textContent = query || "인기영화";
}
document.querySelector(".search-bar input").value = query;

// 불러오는 동안 로딩 표시 (웹툰은 여러 번 검색해서 오래 걸림)
document.getElementById("result-list").innerHTML =
  `<li class="result-loading"><i class="spinner"></i>불러오는 중...</li>`;

const results = await loadResults();
renderChips();
renderResult();

// 필터 칩
document.querySelector(".filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip[data-kind]");
  if (!chip) return;
  currentFilter = chip.dataset.kind;
  renderChips();
  renderResult();
});

// 더보기
document.getElementById("more-btn").addEventListener("click", () => {
  visibleCount += MORE_STEP;
  renderResult();
});

// 정렬 드롭다운
const sortMenu = document.getElementById("sort-menu");
document.getElementById("sort-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  sortMenu.hidden = !sortMenu.hidden;
});
sortMenu.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-sort]");
  if (!li) return;
  currentSort = SORTS.findIndex((o) => o.key === li.dataset.sort);
  visibleCount = FIRST_COUNT; // 정렬을 바꾸면 다시 처음 개수부터
  sortMenu.hidden = true;
  renderChips();
  renderResult();
});
document.addEventListener("click", () => (sortMenu.hidden = true));

document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault(); // 브라우저가 해당 이벤트에 대해 기본적으로 수행하는 동작을 취소(막는) 메서드
    location.href = "search.html";
  }
});