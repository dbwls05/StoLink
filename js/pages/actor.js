// =========================================================
// actor.js - 배우 상세 페이지
//
// 주소: actor.html?id=TMDB인물번호
//
// [프로필]
//   직업     : TMDB known_for_department (Acting → 배우)
//   출생     : birthday + place_of_birth  ("1970년 7월 12일 · 서울")
//   데뷔     : TMDB 에 '데뷔' 항목이 따로 없어서 → 출연작 중 가장 빠른 작품 ("1991 · 작품명")
//   출연작   : 출연(cast) 기록의 영화 + 드라마 수 (예능·토크쇼, 본인 출연은 제외)
//
// [대표 출연작] 최대 4개
//   TMDB 투표 수(인지도)가 많은 순 → 포스터 / 영화·드라마 / 제목 / 개봉·방영일 / "OO 역"
//
// [전체 필모그래피]
//   전체 / 영화 / 드라마 탭 → 한 줄에 한 작품 (최신순): 연도 · 작품명 · "OO 역" · 영화/드라마
//   '웹툰 원작' 뱃지 : TMDB 키워드에 "based on webcomic or webtoon" / "based on manhwa" 가 있으면
//                      (작품마다 키워드를 따로 불러와서 목록이 먼저 뜨고 뱃지는 조금 뒤에 붙음)
//   드라마 연도는 TMDB 의 '첫 방영일' 기준 (배우가 나중 시즌에만 나와도 첫 방영 연도)
//   날짜가 아직 없는 작품(공개 예정)은 맨 위, 연도 자리에 '예정'
// =========================================================

import { getPersonDetail, getPersonCredits } from "../api/tmdb.js";
import { TMDB_API_KEY } from "../../config.js";

const IMG = "https://image.tmdb.org/t/p";

// TMDB 활동 분야 → 직업 이름
const JOB_KO = {
  Acting: "배우",
  Directing: "감독",
  Writing: "작가",
  Production: "제작자",
};

// 출연작에서 뺄 드라마 장르: 토크쇼(10767), 뉴스(10763), 예능·리얼리티(10764)
const EXCLUDED_TV_GENRES = [10767, 10763, 10764];

const el = {
  info: document.getElementById("actor-info"),
  image: document.getElementById("actor-image"),
  job: document.getElementById("actor-job"),
  name: document.getElementById("actor-name"),
  birth: document.getElementById("actor-birth"),
  debut: document.getElementById("actor-debut"),
  count: document.getElementById("actor-count"),
  source: document.getElementById("actor-source"),
  films: document.getElementById("film-list"),
  tabs: document.getElementById("film-tabs"),
  years: document.getElementById("year-list"),
  back: document.getElementById("back-link"),
};

/* ---------------------------------------------------------
   도우미
--------------------------------------------------------- */

// API 글자를 HTML 에 넣기 전에 특수문자 바꾸기
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

// "1970-07-12" → "1970년 7월 12일"
function koreanDate(date) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return m ? `${y}년 ${Number(m)}월 ${Number(d)}일` : `${y}년`;
}

// "2015-11-19" → "2015.11.19"
function dotDate(date) {
  return date ? date.replaceAll("-", ".") : "";
}

// TMDB 이름은 "Lee Byung-hun" 처럼 영문일 때가 많아서, 다른 이름 목록에서 한글 이름을 우선
function koreanName(person) {
  if (/[가-힣]/.test(person.name)) return person.name;
  return (person.also_known_as || []).find((n) => /[가-힣]/.test(n)) || person.name;
}

// 기본 프로필 이미지 (회색 사람 모양)
function showDefaultImage() {
  el.image.classList.add("is-default");
  el.image.innerHTML = `
    <svg viewBox="0 0 100 100" aria-label="기본 프로필 이미지" role="img">
      <circle cx="50" cy="38" r="15" />
      <path d="M22 78c0-15 12.5-24 28-24s28 9 28 24z" />
    </svg>`;
}

/* ---------------------------------------------------------
   출연작 정리
   - 출연(cast) 기록만 사용 (이 페이지는 '배우' 페이지)
   - 같은 작품이 여러 번 나오면(여러 배역 등) 한 번만
   - 결과: [{ id, media, title, date, poster, votes, role }]
--------------------------------------------------------- */
function actingWorks(cast = []) {
  const works = new Map();

  cast.forEach((c) => {
    const media = c.media_type;
    if (media !== "movie" && media !== "tv") return;
    if (c.adult) return;
    if (media === "tv" && (c.genre_ids || []).some((g) => EXCLUDED_TV_GENRES.includes(g))) return;
    if (/^(self|himself|herself|본인)/i.test(c.character || "")) return; // 본인 출연(시상식·다큐 등) 제외

    const key = `${media}-${c.id}`;
    if (works.has(key)) return;

    works.set(key, {
      id: c.id,
      media,
      title: c.title || c.name,
      date: c.release_date || c.first_air_date || "",
      poster: c.poster_path ? `${IMG}/w342${c.poster_path}` : "",
      votes: c.vote_count || 0,
      role: c.character || "",
      episodes: c.episode_count || 0, // 드라마: 출연 회차 수
    });
  });

  return [...works.values()];
}

/* ---------------------------------------------------------
   화면 그리기
--------------------------------------------------------- */
function renderProfile(person, works) {
  const name = koreanName(person);
  document.title = `StoLink - ${name}`;

  // 사진
  if (person.profile_path) {
    el.image.innerHTML = `<img src="${IMG}/w300${person.profile_path}" alt="${esc(name)} 사진">`;
    el.image.querySelector("img").onerror = showDefaultImage;
  } else {
    showDefaultImage();
  }

  el.job.textContent = JOB_KO[person.known_for_department] || "배우";
  el.name.textContent = name;

  // 출생: "1970년 7월 12일 · Seoul, South Korea"
  el.birth.textContent = [koreanDate(person.birthday), person.place_of_birth].filter(Boolean).join(" · ") || "-";

  // 데뷔: 날짜가 있는 출연작 중 가장 빠른 작품
  const first = works
    .filter((w) => w.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  el.debut.textContent = first ? `${first.date.slice(0, 4)} · ${first.title}` : "-";

  // 출연작 수: "영화 23편 · 드라마 12편"
  const movies = works.filter((w) => w.media === "movie").length;
  const tvs = works.length - movies;
  el.count.textContent = works.length
    ? [movies && `영화 ${movies}편`, tvs && `드라마 ${tvs}편`].filter(Boolean).join(" · ")
    : "-";

  el.source.innerHTML =
    `정보 출처: <a href="https://www.themoviedb.org/person/${person.id}" target="_blank" rel="noopener">TMDB</a> · 데뷔는 TMDB 첫 출연작 기준`;

  el.info.classList.remove("is-loading");
}

// 대표 출연작 최대 4개 (투표 수 많은 순)
function renderFilmography(works) {
  const top = [...works].sort((a, b) => b.votes - a.votes).slice(0, 4);

  if (top.length === 0) {
    el.films.innerHTML = `<p class="film-empty">출연작 정보가 없어요.</p>`;
    return;
  }

  el.films.innerHTML = top.map((w) => {
    const kind = w.media === "movie" ? "영화" : "드라마";
    const when = w.date ? `${dotDate(w.date)} ${w.media === "movie" ? "개봉" : "방영"}` : "";
    return `
      <a class="work-card" href="detail.html?type=${w.media}&id=${w.id}">
        <div class="work-poster">
          ${w.poster ? `<img src="${esc(w.poster)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="poster-empty">${esc(w.title)}</span>`}
          <span class="work-type is-${w.media}">${kind}</span>
        </div>
        <p class="work-title">${esc(w.title)}</p>
        ${when ? `<p class="work-date">${when}</p>` : ""}
        ${w.role ? `<p class="work-role">${esc(w.role)} 역</p>` : ""}
      </a>`;
  }).join("");
}

/* ---------------------------------------------------------
   전체 필모그래피
   - filter: "all" | "movie" | "tv"
--------------------------------------------------------- */
let allWorks = [];
let currentFilter = "all";

// 탭 선택 표시
function renderTabs() {
  el.tabs.querySelectorAll(".film-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.filter === currentFilter);
  });
}

function renderAllFilmography() {
  const works = currentFilter === "all" ? allWorks : allWorks.filter((w) => w.media === currentFilter);

  if (works.length === 0) {
    el.years.innerHTML = `<li class="film-empty">출연작 정보가 없어요.</li>`;
    return;
  }

  // 공개 예정(날짜 없음) → 최신 → 오래된 순
  const sorted = [...works].sort((a, b) => (b.date || "9999").localeCompare(a.date || "9999"));

  el.years.innerHTML = sorted.map((w) => {
    const kind = w.media === "movie" ? "영화" : "드라마";
    const key = `${w.media}:${w.id}`;
    const isWebtoon = webtoonCache.get(key) === true;
    return `
      <li>
        <a class="film-row" href="detail.html?type=${w.media}&id=${w.id}">
          <span class="film-year">${w.date ? w.date.slice(0, 4) : "예정"}</span>
          <span class="film-name">${esc(w.title)}</span>
          <span class="film-role">${w.role ? `${esc(w.role)} 역` : ""}</span>
          <span class="film-badges" data-key="${key}">
            <span class="badge">${kind}</span>
            ${isWebtoon ? WEBTOON_BADGE : ""}
          </span>
        </a>
      </li>`;
  }).join("");

  markWebtoonOriginals(sorted);
}

/* ---------------------------------------------------------
   '웹툰 원작' 뱃지
   - TMDB 키워드: 영화 /movie/{id}/keywords → keywords[], 드라마 /tv/{id}/keywords → results[]
   - 한 번 확인한 작품은 기억해 둬서 탭을 바꿔도 다시 안 부름
   - 작품이 많아도 한꺼번에 몰리지 않게 6개씩 나눠서 요청
--------------------------------------------------------- */
const WEBTOON_BADGE = `<span class="badge is-webtoon">웹툰 원작</span>`;
const WEBTOON_KEYWORD = /webcomic|webtoon|manhwa/i;
const webtoonCache = new Map(); // "tv:89959" → true / false

async function isWebtoonOriginal(media, id) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${media}/${id}/keywords?api_key=${TMDB_API_KEY}`);
    if (!res.ok) return false;
    const data = await res.json();
    return (data.keywords || data.results || []).some((k) => WEBTOON_KEYWORD.test(k.name));
  } catch {
    return false;
  }
}

async function markWebtoonOriginals(works) {
  const todo = works.filter((w) => !webtoonCache.has(`${w.media}:${w.id}`));

  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (w) => {
      const key = `${w.media}:${w.id}`;
      const yes = await isWebtoonOriginal(w.media, w.id);
      webtoonCache.set(key, yes);
      if (!yes) return;
      // 지금 화면에 있는 줄에 뱃지 붙이기
      const cell = el.years.querySelector(`.film-badges[data-key="${key}"]`);
      if (cell && !cell.querySelector(".is-webtoon")) cell.insertAdjacentHTML("beforeend", WEBTOON_BADGE);
    }));
  }
}

// 탭 누르기
el.tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".film-tab");
  if (!tab) return;
  currentFilter = tab.dataset.filter;
  renderTabs();
  renderAllFilmography();
});

function renderError(message) {
  showDefaultImage();
  el.job.textContent = "안내";
  el.name.textContent = message;
  el.info.classList.remove("is-loading");
  el.films.innerHTML = `<p class="film-empty">표시할 출연작이 없어요.</p>`;
  el.years.innerHTML = `<li class="film-empty">표시할 출연작이 없어요.</li>`;
}

/* ---------------------------------------------------------
   사용자 동작
--------------------------------------------------------- */
// '이전 페이지로' → 뒤로 가기 (방문 기록이 없으면 원래 링크인 검색 페이지로)
el.back.addEventListener("click", (event) => {
  if (history.length > 1) {
    event.preventDefault();
    history.back();
  }
});

/* ---------------------------------------------------------
   시작
--------------------------------------------------------- */
async function init() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return renderError("배우 정보가 없어요");

  const [person, credits] = await Promise.all([getPersonDetail(id), getPersonCredits(id)]);
  if (!person) return renderError("배우 정보를 불러오지 못했어요");

  const works = actingWorks(credits?.cast);
  renderProfile(person, works);
  renderFilmography(works);

  allWorks = works;
  renderTabs();
  renderAllFilmography();
}

init();