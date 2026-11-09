// =========================================================
// detail.js - 작품 상세 페이지
//
// 주소의 type 값에 따라 같은 화면(detail.html)을 다르게 채움
//   detail.html?id=123              → 영화 (type 이 없으면 영화: 검색 페이지에서 오는 기존 링크)
//   detail.html?type=movie&id=123   → 영화
//   detail.html?type=tv&id=61459    → 드라마
//   detail.html?type=webtoon&title=미생&writer=윤태호 → 웹툰 (만화규장각)
//
// [원작 정보] (영화·드라마 공통)
// - TMDB 제작진에 원작자(웹툰·소설 원작)가 있거나, 직접 연결해 둔 작품이면 '원작 있음'
// - 만화규장각에서 원작 웹툰을 찾아 표지 / 작품명 / 작가 / 연재 플랫폼 표시
// - 카드를 누르면 원작 웹툰 상세(detail.html?type=webtoon&title=작품명&writer=작가)로 이동
// - 원작이 없으면 원작 정보 섹션을 숨김
// =========================================================

// 파일을 통째로(* as) 불러옴 → 예전 버전 파일이라 함수 하나가 없어도 페이지 전체가 멈추지 않음
import * as tmdb from "../api/tmdb.js";
import * as kmas from "../api/kmas.js";
import * as adaptation from "../api/adaptation.js";

// 내 보관함 공통 모듈 (없어도 페이지가 멈추지 않게 '있으면 쓰는' 방식)
const library = await import("../common/library.js").catch(() => {
  console.warn("js/common/library.js 가 없어서 보관함 저장을 쓸 수 없어요.");
  return null;
});

const IMG = "https://image.tmdb.org/t/p";
const params = new URLSearchParams(location.search);
const type = params.get("type") || "movie";
const id = params.get("id");

/* ---------------------------------------------------------
   공통 도우미
--------------------------------------------------------- */

// API 글자를 HTML 에 넣기 전에 특수문자 바꾸기
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

// 이름 목록 → "가, 나" (없으면 "-")
function joinNames(list) {
  return list.length ? list.join(", ") : "-";
}

// "2014-10-17" → "2014.10.17"
function formatDate(date) {
  return date ? date.replaceAll("-", ".") : "";
}

// info-list 의 항목 이름(dt) 바꾸기 - 예: 영화 "개봉" → 드라마 "방영"
// dd 의 id 로 찾아서 바로 앞의 dt 글자를 바꿈
function setLabel(ddId, label) {
  const dt = document.getElementById(ddId)?.previousElementSibling;
  if (dt) dt.textContent = label;
}

// 출연진 카드 그리기 (영화·드라마 공통)
// people: [{ id, name, profile_path, character }]
function renderCast(people) {
  document.getElementById("cast-list").innerHTML = people.length
    ? people.map((a) => `
    <li class="cast-card">
      <a href="actor.html?id=${a.id}">
        <div class="cast-photo">
          ${a.profile_path ? `<img src="${IMG}/w185${a.profile_path}" alt="${esc(a.name)}">` : ""}
        </div>
        <p class="cast-name">${esc(a.name)}</p>
        <p class="cast-role">${a.character ? `${esc(a.character)} 역` : "출연"}</p>
      </a>
    </li>`).join("")
    : `<li class="cast-empty">출연진 정보가 없습니다.</li>`;
}

/* ---------------------------------------------------------
   제작진 프로필 (영화·드라마 공통)
   - detail.html 의 <ul id="crew-list"> 에 출연진과 같은 모양의 카드로 표시
   - 감독 → 각본 → 원작 → 제작 → 촬영 → 음악 → 편집 순서로 최대 8명
   - 한 사람이 여러 일을 했으면 한 카드에 "감독 · 각본" 처럼 합침
   - 클릭: 원작자 → 작가 상세(웹툰 작가 모드, 한글 이름)
           그 밖의 제작진 → 작가 상세(영화·드라마 모드, TMDB 번호)
--------------------------------------------------------- */

// [TMDB 직무, 화면에 쓸 이름] - 위에 있을수록 먼저 보여줌
const CREW_JOBS = [
  ["Director", "감독"],
  ["Screenplay", "각본"],
  ["Writer", "각본"],
  ["Teleplay", "각본"],
  ["Comic Book", "원작"],
  ["Graphic Novel", "원작"],
  ["Novel", "원작"],
  ["Original Story", "원작"],
  ["Producer", "제작"],
  ["Director of Photography", "촬영"],
  ["Original Music Composer", "음악"],
  ["Editor", "편집"],
];
const CREW_ORDER = CREW_JOBS.map(([job]) => job);

// 제작진 한 명의 직무 목록 (영화: job 하나 / 드라마: jobs 배열)
function jobsOf(member) {
  return member.jobs ? member.jobs.map((j) => j.job) : [member.job];
}

// 화면에 보여줄 제작진 고르기 → [{ id, name, profile_path, roles: ["감독", "각본"], isOriginal }]
function pickCrew(crew, max = 8) {
  const people = new Map();

  crew.forEach((member) => {
    jobsOf(member).forEach((job) => {
      const rank = CREW_ORDER.indexOf(job);
      if (rank === -1) return; // 목록에 없는 직무(조명, 의상 등)는 제외

      if (!people.has(member.id)) {
        people.set(member.id, { ...member, roles: [], rank, isOriginal: false });
      }
      const person = people.get(member.id);
      const label = CREW_JOBS[rank][1];
      if (!person.roles.includes(label)) person.roles.push(label);
      person.rank = Math.min(person.rank, rank); // 가장 중요한 직무 기준으로 순서
      if (label === "원작") person.isOriginal = true;
    });
  });

  return [...people.values()].sort((a, b) => a.rank - b.rank).slice(0, max);
}

async function renderCrew(crew) {
  const list = document.getElementById("crew-list");
  if (!list) return; // detail.html 에 제작진 영역이 없으면 건너뜀

  const people = pickCrew(crew);
  if (people.length === 0) {
    list.innerHTML = `<li class="cast-empty">제작진 정보가 없습니다.</li>`;
    return;
  }

  // 원작자는 한글 이름으로 표시·이동 ("Yoon Tae-ho" → "윤태호")
  await Promise.all(
    people.filter((p) => p.isOriginal).map(async (p) => (p.koreanName = await koreanNameOf(p)))
  );

  list.innerHTML = people.map((p) => {
    const name = p.koreanName || p.name;
    const href = p.isOriginal
      ? `writer.html?${new URLSearchParams({ writer: name })}` // 원작자 → 웹툰 작가 페이지
      : `writer.html?person=${p.id}`;                         // 감독 등 → 영화·드라마 제작진 페이지
    return `
    <li class="cast-card">
      <a href="${href}">
        <div class="cast-photo">
          ${p.profile_path ? `<img src="${IMG}/w185${p.profile_path}" alt="${esc(name)}">` : ""}
        </div>
        <p class="cast-name">${esc(name)}</p>
        <p class="cast-role">${p.roles.join(" · ")}</p>
      </a>
    </li>`;
  }).join("");
}

/* ---------------------------------------------------------
   내 보관함 저장 (영화·드라마·웹툰 공통)
   - 오른쪽 '내 보관함' 상자의 상태 선택 + 저장 버튼
   - 저장 내용은 js/common/library.js 가 localStorage 에 보관 → library.html 에서 읽음
   - 버튼 동작
       저장 안 됨 → [♡ 보관함에 저장]  누르면 선택한 상태로 저장
       저장 됨   → [♥ 보관함에 저장됨] 누르면 보관함에서 빼기
   - 저장된 작품은 상태를 바꾸면 바로 보관함에도 반영
--------------------------------------------------------- */

const HEART = (filled) => `
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
       style="vertical-align:-2px; margin-right:6px;"
       fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/>
  </svg>`;

// work: { type, id, title, writer, poster, year, genres, href }
function setupSaveBox(work) {
  const box = document.querySelector(".save-box");
  const select = document.getElementById("status");
  const button = box?.querySelector(".save-btn");
  const note = box?.querySelector(".save-note");
  if (!box || !select || !button) return;

  // 보관함 모듈이 없으면 버튼을 막아 둠
  if (!library) {
    button.disabled = true;
    button.textContent = "보관함을 쓸 수 없어요";
    return;
  }

  const key = library.makeKey(work);
  const defaultNote = note?.innerHTML || "";

  // 웹툰은 '시청'이 아니라 '감상'
  const label = box.querySelector('label[for="status"]');
  if (label) label.textContent = work.type === "webtoon" ? "감상 상태" : "시청 상태";

  // 상태 선택 상자 다시 만들기: 보고싶음 / 보는 중 / 다 봄 (값은 want / watching / done)
  select.innerHTML = library.STATUS_LIST
    .map((code) => `<option value="${code}">${library.STATUS_LABEL[code]}</option>`)
    .join("");

  // 안내 글자를 잠깐 바꿨다가 원래대로
  let noteTimer;
  const flash = (message) => {
    if (!note) return;
    note.textContent = message;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (note.innerHTML = defaultNote), 2500);
  };

  // 저장 여부에 맞게 버튼 모양 바꾸기
  const refresh = () => {
    const saved = library.getItem(key);
    if (saved) select.value = saved.status;
    button.innerHTML = saved ? `${HEART(true)}보관함에 저장됨` : `${HEART(false)}보관함에 저장`;
    button.setAttribute("aria-pressed", String(!!saved));
    button.title = saved ? "한 번 더 누르면 보관함에서 빠져요" : "";
  };

  button.addEventListener("click", () => {
    if (library.getItem(key)) {
      library.removeItem(key);
      flash("보관함에서 뺐어요.");
    } else {
      const saved = library.saveItem(work, select.value);
      flash(saved ? `'${library.STATUS_LABEL[select.value]}'(으)로 보관함에 저장했어요.` : "저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    }
    refresh();
  });

  // 저장된 작품이면 상태를 바꿀 때 바로 반영
  select.addEventListener("change", () => {
    if (library.getItem(key)) {
      library.updateStatus(key, select.value);
      flash(`상태를 '${library.STATUS_LABEL[select.value]}'(으)로 바꿨어요.`);
    }
  });

  refresh();
}

/* ---------------------------------------------------------
   볼 수 있는 곳 (영화·드라마만 - 웹툰은 제공되는 API 가 없어서 만들지 않음)
   - TMDB watch/providers (한국 기준, JustWatch 제공)
   - 구독 / 무료 / 광고 / 대여 / 구매 를 서비스별로 묶어서 표시
   - 누르면 TMDB 의 '볼 수 있는 곳' 페이지로 이동 (서비스별 바로가기 주소는 API 에 없음)
   - 정보가 없으면 영역을 만들지 않음
--------------------------------------------------------- */

// [TMDB 항목 이름, 화면 글자] - 위에 있을수록 먼저
const PROVIDER_TYPES = [
  ["flatrate", "구독"],
  ["free", "무료"],
  ["ads", "광고 포함 무료"],
  ["rent", "대여"],
  ["buy", "구매"],
];

// TMDB 서비스 이름(영어) → 한국에서 쓰는 이름 (목록에 없으면 영어 그대로)
const PROVIDER_KO = {
  Netflix: "넷플릭스",
  "Netflix Standard with Ads": "넷플릭스",
  "Netflix basic with Ads": "넷플릭스",
  TVING: "티빙",
  wavve: "웨이브",
  "Coupang Play": "쿠팡플레이",
  "Disney Plus": "디즈니+",
  Watcha: "왓챠",
  "Apple TV": "Apple TV",
  "Apple TV Plus": "Apple TV+",
  "Google Play Movies": "구글 플레이",
  "Naver Store": "네이버 시리즈온",
  "Amazon Prime Video": "프라임 비디오",
  "Tencent Video": "텐센트 비디오",
  Laftel: "라프텔",
};
const providerName = (name) => PROVIDER_KO[name] || name;

async function renderProviders(media, tmdbId) {
  const box = document.querySelector(".save-box");
  if (!box) return;

  const data = media === "movie"
    ? await tmdb.getWatchProviders?.(tmdbId)
    : await tmdb.getTvWatchProviders?.(tmdbId);
  if (!data) return;

  // 서비스별로 묶기: 티빙 → ["구독"], 웨이브 → ["구독", "대여"]
  // - 이름을 한국어로 바꾼 뒤 그 이름으로 묶음
  //   → "Netflix" 와 "Netflix Standard with Ads"(광고형 요금제)가 '넷플릭스' 한 줄로 합쳐짐
  const providers = new Map();
  PROVIDER_TYPES.forEach(([field, label]) => {
    (data[field] || []).forEach((p) => {
      const name = providerName(p.provider_name);
      if (!providers.has(name)) providers.set(name, { ...p, provider_name: name, types: [] });
      const saved = providers.get(name);
      if (!saved.types.includes(label)) saved.types.push(label);
    });
  });
  if (providers.size === 0) return;

  const list = [...providers.values()].slice(0, 6); // 너무 길어지지 않게 6개까지

  box.insertAdjacentHTML("beforeend", `
    <div class="provider-section">
      <h3 class="provider-title">볼 수 있는 곳</h3>
      <ul class="provider-list">
        ${list.map((p) => `
          <li>
            <a class="provider-item" href="${esc(data.link || "#")}" target="_blank" rel="noopener">
              <span class="provider-logo">
                ${p.logo_path ? `<img src="${IMG}/w92${p.logo_path}" alt="">` : esc(p.provider_name.slice(0, 1))}
              </span>
              <span class="provider-text">
                <strong>${esc(p.provider_name)}</strong>
                <small>${p.types.join(" · ")}</small>
              </span>
              <span class="provider-arrow" aria-hidden="true">↗</span>
            </a>
          </li>`).join("")}
      </ul>
      <p class="provider-source">TMDB · JustWatch 제공 · 한국 기준</p>
    </div>`);
}

/* ---------------------------------------------------------
   이어서 탐색하기 (영화·드라마 공통)
   - 이 작품의 배우(주연) / 원작 작가 / 감독 각각의 '다른 작품' 3개씩
   - 작품마다 포스터 + 제목 + "영화 · 범죄, 드라마" (종류 · 장르)
   - 작품 클릭 → 그 작품 상세 / 사람 이름 클릭 → 작가 상세
--------------------------------------------------------- */

// 이어서 탐색하기 영역도 처음엔 숨김 (HTML 에 적힌 예시가 잠깐 보이지 않게)
const exploreSection = document.querySelector(".explore-section");
if (exploreSection) exploreSection.style.display = "none";

// 다른 작품 목록에서 뺄 드라마 장르: 토크쇼, 뉴스, 예능·리얼리티
const EXCLUDED_TV_GENRES = [10767, 10763, 10764];

// TMDB 드라마 장르 중 한국어 번역이 없어 영어로 오는 것들 → 한국어
const GENRE_KO = {
  "Action & Adventure": "액션·모험",
  "Sci-Fi & Fantasy": "SF·판타지",
  "War & Politics": "전쟁·정치",
  Kids: "키즈",
  News: "뉴스",
  Reality: "리얼리티",
  Soap: "연속극",
  Talk: "토크",
};

// 장르 번호 → 이름 (한 번만 불러와서 저장)
let genreNames = null;
async function loadGenreNames() {
  if (genreNames) return genreNames;
  const [movieGenres, tvGenres] = await Promise.all([
    tmdb.getGenreList?.("movie") || [],
    tmdb.getGenreList?.("tv") || [],
  ]);
  genreNames = new Map(
    [...(movieGenres || []), ...(tvGenres || [])].map((g) => [g.id, GENRE_KO[g.name] || g.name])
  );
  return genreNames;
}

// 한 사람의 '다른 작품' 3개 (TMDB 투표 수 = 인지도 높은 순)
// current: 지금 보고 있는 작품 { media, id } → 목록에서 뺌
async function otherWorksOf(personId, current) {
  const credits = await tmdb.getPersonCredits(personId);
  if (!credits) return [];

  const works = new Map(); // 같은 작품이 출연·제작으로 두 번 나올 수 있어서 하나만
  [...(credits.cast || []), ...(credits.crew || [])].forEach((c) => {
    const media = c.media_type;
    if (media !== "movie" && media !== "tv") return;
    if (c.adult) return;
    if (media === current.media && String(c.id) === String(current.id)) return; // 지금 작품 제외
    if (media === "tv" && (c.genre_ids || []).some((g) => EXCLUDED_TV_GENRES.includes(g))) return;
    if (/^(self|himself|herself|본인)/i.test(c.character || "")) return; // 본인 출연 제외
    works.set(`${media}-${c.id}`, c);
  });

  return [...works.values()]
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 3);
}

// 박스 하나 그리기
function exploreBoxHtml({ role, name, person, href, works, genres }) {
  const photo = person.profile_path
    ? `<img src="${IMG}/w185${person.profile_path}" alt="" style="display:block; width:100%; height:100%; object-fit:cover;">`
    : "";

  const items = works.map((w) => {
    const media = w.media_type;
    const workTitle = w.title || w.name;
    // "영화 · 범죄, 드라마" (장르는 앞 2개까지)
    const genreText = (w.genre_ids || []).map((g) => genres.get(g)).filter(Boolean).slice(0, 2).join(", ");
    const meta = [media === "movie" ? "영화" : "드라마", genreText].filter(Boolean).join(" · ");

    return `
      <li>
        <a href="detail.html?type=${media}&id=${w.id}" style="color:inherit; text-decoration:none;">
          <div class="work-thumb" style="overflow:hidden;">
            ${w.poster_path ? `<img src="${IMG}/w342${w.poster_path}" alt="" style="display:block; width:100%; height:100%; object-fit:cover;">` : ""}
          </div>
          <p>${esc(workTitle)}</p>
          <small style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(meta)}</small>
        </a>
      </li>`;
  }).join("");

  return `
    <div class="explore-box">
      <a class="explore-who" href="${href}" style="color:inherit; text-decoration:none;">
        <span class="mini-photo" style="overflow:hidden;">${photo}</span>
        <span><small>${role}</small><strong>${esc(name)}의 다른 작품</strong></span>
      </a>
      <ul class="explore-works">${items}</ul>
    </div>`;
}

// cast : 출연진 배열 / crew : 제작진 배열 (영화·드라마 모양 모두 가능)
async function renderExplore({ media, cast, crew }) {
  if (!exploreSection) return;
  const grid = exploreSection.querySelector(".explore-grid");
  if (!grid) return;

  // 1) 누구의 다른 작품을 보여줄지 (박스 3개)
  //    - 원작 작가가 있으면 : 주연 배우 1명 + 원작 작가 + 감독
  //    - 원작 작가가 없으면 : 주연 배우 2명 + 감독
  const author = crew.find((c) => jobsOf(c).some((job) => ORIGINAL_JOBS.includes(job)));
  const director = crew.find((c) => jobsOf(c).includes("Director"));
  const actor = (person) => ({ role: "배우", person, isAuthor: false });

  const primary = author
    ? [actor(cast[0]), { role: "원작 작가", person: author, isAuthor: true }]
    : [actor(cast[0]), actor(cast[1])];
  primary.push({ role: "감독", person: director, isAuthor: false });

  // 위 사람 중에 다른 작품이 없는 사람이 있으면 → 그다음 배우들로 채움 (박스 3개 유지)
  const backups = cast.slice(author ? 1 : 2, 6).map(actor);

  const seen = new Set(); // 같은 사람이 두 번 나오지 않게 (예: 감독 = 원작자)
  const isNew = ({ person }) => person && !seen.has(person.id) && seen.add(person.id);
  const targets = primary.filter(isNew);
  const spares = backups.filter(isNew);

  if (targets.length === 0 && spares.length === 0) return;

  // 한 사람의 박스 정보 (한글 이름 + 다른 작품)
  const loadBox = async (t) => ({
    ...t,
    name: await koreanNameOf(t.person),
    works: await otherWorksOf(t.person.id, { media, id }),
  });

  // 2) 장르 이름 + 각 사람의 다른 작품을 동시에 불러옴
  const [genres, ...results] = await Promise.all([loadGenreNames(), ...targets.map(loadBox)]);

  // 3) 다른 작품이 있는 사람만 박스로, 3개가 안 되면 다음 배우로 채움
  const boxes = results.filter((r) => r.works.length > 0);
  for (const spare of spares) {
    if (boxes.length >= 3) break;
    const box = await loadBox(spare);
    if (box.works.length > 0) boxes.push(box);
  }
  if (boxes.length === 0) return; // 아무도 없으면 섹션 숨긴 채로

  grid.innerHTML = boxes.map((r) => exploreBoxHtml({
    ...r,
    genres,
    // 원작 작가 → 웹툰 작가 페이지 / 배우·감독 → 영화·드라마 제작진 페이지
    // 원작 작가 → 웹툰 작가 페이지 / 배우 → 배우 상세 / 감독 → 영화·드라마 제작진 페이지
    href: r.isAuthor
      ? `writer.html?${new URLSearchParams({ writer: r.name })}`
      : r.role === "배우"
        ? `actor.html?id=${r.person.id}`
        : `writer.html?person=${r.person.id}`,
  })).join("");

  exploreSection.style.display = "";
}

/* ---------------------------------------------------------
   원작 정보 (영화·드라마 공통)
--------------------------------------------------------- */

// 원작으로 보는 TMDB 직무 (웹툰·만화·소설 원작자)
const ORIGINAL_JOBS = ["Comic Book", "Graphic Novel", "Novel", "Original Story", "Original Concept", "Characters"];

// 원작 섹션은 처음엔 숨김 (HTML 에 적혀 있는 예시 '미생'이 잠깐 보이지 않게)
const originSection = document.querySelector(".origin-section");
if (originSection) originSection.style.display = "none";

// 만화규장각 표지 주소 정리
// - 프록시를 거치면 "https://127.0.0.1:5501/common/file/..." 처럼 와서 앞을 만화규장각 주소로 바꿈
function kmasImageUrl(url) {
  if (!url) return "";
  try {
    const { pathname, search } = new URL(url, "https://www.kmas.or.kr");
    return `https://www.kmas.or.kr${pathname}${search}`;
  } catch {
    return "";
  }
}

// 제목 비교: 띄어쓰기·기호 제거 후 같거나, 뒤에 권 번호만 붙은 경우 ("문유 3" = "문유")
function compact(text) {
  return (text || "").replace(/[\s:·\-_,.!?'"「」『』()[\]<>=]/g, "");
}
function isSameWork(itemTitle, title) {
  const a = compact(itemTitle);
  const b = compact(title);
  if (!a || !b || !a.startsWith(b)) return false;
  const rest = a.slice(b.length);
  return rest === "" || /^\d/.test(rest);
}

// 만화규장각 작가 칸에 이 이름이 정확히 있는지 ("조석" ≠ "조석호")
function hasName(item, name) {
  return `${item.sntncWritrNm || ""} ${item.pictrWritrNm || ""}`.split(/[\s,·/()]+/).includes(name);
}

// TMDB 원작자 이름 → 한글 이름 ("Yoon Tae-ho" → "윤태호")
async function koreanNameOf(person) {
  if (/[가-힣]/.test(person.name)) return person.name;
  const detail = await tmdb.getPersonDetail?.(person.id);
  return (detail?.also_known_as || []).find((n) => /[가-힣]/.test(n)) || person.name;
}

// 같은 작품으로 묶인 만화규장각 항목들 → 화면에 쓸 원작 정보
function toOriginal(matched, fallbackTitle, authorNames) {
  // 연재 플랫폼이 있는 항목 = 웹툰 기록 → 우선 사용 (없으면 단행본)
  const best = matched.find((item) => item.pltfomCdNm) || matched[0];
  const cover = best.imageDownloadUrl || matched.find((item) => item.imageDownloadUrl)?.imageDownloadUrl;
  const writer =
    authorNames.find((n) => hasName(best, n)) ||
    (best.sntncWritrNm || best.pictrWritrNm || "").split(/[\s,]+/)[0];

  return {
    title: best.prdctNm || fallbackTitle,
    writer,
    platform: matched.find((item) => item.pltfomCdNm)?.pltfomCdNm || "",
    image: kmasImageUrl(cover),
    label: best.pltfomCdNm ? "원작 웹툰" : "원작 만화",
  };
}

// 원작 찾기
// - crew : 영화는 credits.crew (job), 드라마는 aggregate_credits.crew (jobs 배열)
// - 결과 : { title, writer, platform, image, label } 또는 null(원작 없음)
async function findOriginal({ media, title, crew }) {
  // 1) TMDB 원작자
  const authors = crew.filter((c) =>
    ORIGINAL_JOBS.includes(c.job) || (c.jobs || []).some((j) => ORIGINAL_JOBS.includes(j.job))
  );
  const uniqueAuthors = [...new Map(authors.map((a) => [a.id, a])).values()].slice(0, 2);
  const authorNames = await Promise.all(uniqueAuthors.map(koreanNameOf));

  // 2) 직접 연결해 둔 원작 (예: Moon Man → 문유)
  const manualTitle = adaptation.findManualOriginal?.(media, id);

  // 원작자도 없고 직접 연결도 없으면 → 원작 없음
  if (authorNames.length === 0 && !manualTitle) return null;

  // 3) 제목으로 만화규장각 검색
  //    제목 후보: 직접 연결 제목 → 작품 제목 → 부제를 뗀 제목
  //    부제 구분 기호: ':' 와 '-' 모두 ("파인: 촌뜨기들" → "파인", "신과함께-죄와 벌" → "신과함께")
  const baseTitle = title.split(/\s*[:\-–—]\s*/)[0].trim();
  const titles = [...new Set([manualTitle, title, baseTitle].filter(Boolean))];

  for (const t of titles) {
    const items = kmas.searchByTitle ? await kmas.searchByTitle(t) : [];
    const matched = items.filter(
      (item) =>
        isSameWork(item.prdctNm || item.title, t) &&
        (authorNames.length === 0 || authorNames.some((n) => hasName(item, n)))
    );
    if (matched.length) return toOriginal(matched, t, authorNames);
  }

  // 4) 제목 검색으로 못 찾으면 → 원작자 이름으로 검색해서 그 작가의 작품 중에서 찾기
  //    - 제목 검색은 비슷한 다른 작품이 많이 섞여서 정작 원작이 빠질 수 있음
  //      (예: "신과함께" 검색 → "신과 함께 레벨업", "…당신과 함께" 가 먼저 나옴)
  //    - 영화 제목이 작품 제목으로 시작하면 같은 작품 ("신과함께-죄와 벌" ← "신과함께")
  //    - 여러 개면 가장 긴 제목 (더 정확히 맞는 작품)
  const movieKey = compact(manualTitle || title);
  for (const name of authorNames) {
    let items = [];
    try {
      items = kmas.searchWebtoonsByWriter ? await kmas.searchWebtoonsByWriter(name) : [];
    } catch (error) {
      console.warn("원작자 이름으로 만화규장각 검색 실패:", error.message);
    }

    const candidates = items.filter((item) => {
      const key = compact(item.prdctNm || item.title);
      return key && hasName(item, name) && movieKey.startsWith(key);
    });
    if (candidates.length === 0) continue;

    const longest = candidates
      .map((item) => item.prdctNm || item.title)
      .sort((a, b) => compact(b).length - compact(a).length)[0];
    const sameWork = candidates.filter((item) => (item.prdctNm || item.title) === longest);
    return toOriginal(sameWork, longest, authorNames);
  }

  // 만화규장각에 없으면 (소설 원작 등) TMDB 원작자 이름만 표시
  return {
    title: manualTitle || "",
    writer: authorNames[0],
    platform: "",
    image: "",
    label: "원작",
  };
}

// 원작 정보 카드 + 정보 목록의 '원작' 칸 채우기
async function renderOriginal({ media, title, crew }) {
  let original = null;
  try {
    original = await findOriginal({ media, title, crew });
  } catch (error) {
    console.warn("원작 정보를 찾지 못했어요:", error);
  }

  // 원작 없음 → 섹션 숨긴 채로 끝
  if (!original) return;

  // 정보 목록의 '원작' 칸: "윤태호 「미생」"
  document.getElementById("author").textContent =
    `${original.writer}${original.title ? ` 「${original.title}」` : ""}`;

  if (!originSection) return;
  const card = originSection.querySelector(".origin-card");

  // 카드 클릭 → 원작 웹툰 상세 (작가 페이지에서 웹툰을 누를 때와 같은 주소 형식)
  //   detail.html?type=webtoon&title=문유&writer=조석
  // 원작 제목을 못 찾은 경우(소설 원작 등)는 갈 곳이 없으므로 클릭되지 않게 함
  if (original.title) {
    card.href = `detail.html?${new URLSearchParams({ type: "webtoon", title: original.title, writer: original.writer })}`;
  } else {
    card.removeAttribute("href");
  }

  // 카드 오른쪽 안내 글자 ("작가 페이지로" → "원작 웹툰 보기")
  const linkText = card.querySelector(".origin-link");
  if (linkText) linkText.textContent = original.title ? "원작 웹툰 보기" : "";

  // 표지 (없거나 깨지면 회색 칸 그대로)
  // - detail.css 의 .origin-thumb 은 회색 칸 크기(56×80)만 정해져 있어서
  //   이미지가 원본 크기로 튀어나오지 않게 여기서 칸에 맞춰 자름
  const thumb = card.querySelector(".origin-thumb");
  thumb.style.overflow = "hidden"; // 칸 밖으로 나간 부분은 잘라냄
  thumb.innerHTML = original.image
    ? `<img src="${esc(original.image)}" alt="${esc(original.title)} 표지"
         style="display:block; width:100%; height:100%; object-fit:cover;"
         onerror="this.remove()">`
    : "";

  card.querySelector(".origin-label").textContent = original.label;
  card.querySelector(".origin-text strong").textContent = original.title || original.writer;

  // "윤태호 · 다음웹툰" (플랫폼이 없으면 작가 이름만)
  card.querySelector(".origin-text p").textContent =
    [original.writer, original.platform].filter(Boolean).join(" · ");

  originSection.style.display = "";
}

/* ---------------------------------------------------------
   영화 (기존 코드 그대로)
--------------------------------------------------------- */
async function renderMovie() {
  const movie = await tmdb.getMovieDetail(id);

  if (!movie) {
    document.getElementById("title").textContent = "작품 정보를 불러오지 못했습니다.";
    return;
  }

  // 포스터
  if (movie.poster_path) {
    document.getElementById("poster").innerHTML =
      `<img src="${IMG}/w500${movie.poster_path}" alt="${esc(movie.title)}">`;
  }

  // 제목, 연도·러닝타임, 줄거리
  const year = (movie.release_date || "").slice(0, 4);
  document.getElementById("title").textContent = movie.title;
  document.getElementById("sub").textContent = `${year} · ${movie.runtime}분`;
  document.getElementById("overview").textContent = movie.overview || "줄거리 정보가 없습니다.";
  document.title = `StoLink - ${movie.title}`;

  // 장르
  document.getElementById("genres").innerHTML = movie.genres.map((g) => `<li>${esc(g.name)}</li>`).join("");

  // 내 보관함 저장 + 볼 수 있는 곳
  setupSaveBox({
    type: "movie",
    id,
    title: movie.title,
    poster: movie.poster_path ? `${IMG}/w342${movie.poster_path}` : "",
    year,
    genres: movie.genres.map((g) => g.name),
    href: `detail.html?type=movie&id=${id}`,
  });
  renderProviders("movie", id);

  // 개봉일, 제작사, 감독
  document.getElementById("release").textContent = movie.release_date;
  document.getElementById("company").textContent = movie.production_companies.map((c) => c.name).join(", ");

  const director = movie.credits.crew.find((p) => p.job === "Director");
  document.getElementById("director").textContent = director ? director.name : "-";

  // 각본 (각본가가 여러 명이면 쉼표로)
  const writers = [...new Set(
    movie.credits.crew.filter((p) => ["Screenplay", "Writer"].includes(p.job)).map((p) => p.name)
  )];
  document.getElementById("writer").textContent = writers.length ? writers.join(", ") : "-";

  // 출연진 (앞 6명)
  renderCast(movie.credits.cast.slice(0, 6));

  // 제작진 (감독, 각본, 원작 ...)
  await renderCrew(movie.credits.crew);

  // 이어서 탐색하기 (주연 배우 / 원작 작가 / 감독의 다른 작품)
  await renderExplore({ media: "movie", cast: movie.credits.cast, crew: movie.credits.crew });

  // 원작 정보 (원작이 없으면 섹션 숨김)
  await renderOriginal({ media: "movie", title: movie.title, crew: movie.credits.crew });
}

/* ---------------------------------------------------------
   드라마
   TMDB 드라마 응답은 영화와 항목 이름이 다름
     title → name / release_date → first_air_date / runtime → episode_run_time(배열)
     + number_of_seasons(시즌 수), number_of_episodes(총 회차), networks(방송사),
       last_air_date(마지막 방영일), in_production(방영 중 여부), created_by(기획)
--------------------------------------------------------- */

// 제작진(aggregate_credits.crew)에서 특정 직무를 맡은 사람 이름 찾기
// - 드라마는 회차마다 연출·각본이 다를 수 있어서, 참여 회차가 많은 사람부터 최대 max 명
function crewNames(crew, jobs, max = 2) {
  return crew
    .map((person) => ({
      name: person.name,
      // 이 사람이 jobs 중 하나를 맡은 회차 수
      episodes: (person.jobs || [])
        .filter((j) => jobs.includes(j.job))
        .reduce((sum, j) => sum + (j.episode_count || 0), 0),
      hasJob: (person.jobs || []).some((j) => jobs.includes(j.job)),
    }))
    .filter((p) => p.hasJob)
    .sort((a, b) => b.episodes - a.episodes)
    .slice(0, max)
    .map((p) => p.name);
}

async function renderTv() {
  const tv = await tmdb.getTvDetailWithCredits?.(id);

  if (!tv) {
    document.getElementById("title").textContent = "작품 정보를 불러오지 못했습니다.";
    return;
  }

  const crew = tv.aggregate_credits?.crew || [];
  const cast = tv.aggregate_credits?.cast || [];

  // 배지 "영화" → "드라마"
  const badge = document.querySelector(".badges .badge");
  if (badge) badge.textContent = "드라마";

  // 포스터
  if (tv.poster_path) {
    document.getElementById("poster").innerHTML =
      `<img src="${IMG}/w500${tv.poster_path}" alt="${esc(tv.name)}">`;
  }

  // 제목, 줄거리
  document.getElementById("title").textContent = tv.name;
  document.getElementById("overview").textContent = tv.overview || "줄거리 정보가 없습니다.";
  document.title = `StoLink - ${tv.name}`;

  // 부제목: "2014 · 시즌 1 · 20부작 · 회당 70분"
  const year = (tv.first_air_date || "").slice(0, 4);
  const runtime = tv.episode_run_time?.[0];
  document.getElementById("sub").textContent = [
    year,
    tv.number_of_seasons > 1 ? `시즌 ${tv.number_of_seasons}` : "",
    tv.number_of_episodes ? `${tv.number_of_episodes}부작` : "",
    runtime ? `회당 ${runtime}분` : "",
  ].filter(Boolean).join(" · ");

  // 장르
  document.getElementById("genres").innerHTML = (tv.genres || []).map((g) => `<li>${esc(g.name)}</li>`).join("");

  // 내 보관함 저장 + 볼 수 있는 곳
  setupSaveBox({
    type: "tv",
    id,
    title: tv.name,
    poster: tv.poster_path ? `${IMG}/w342${tv.poster_path}` : "",
    year,
    genres: (tv.genres || []).map((g) => g.name),
    href: `detail.html?type=tv&id=${id}`,
  });
  renderProviders("tv", id);

  // 방영 기간: "2014.10.17 ~ 2014.12.20" / 아직 방영 중이면 "2025.07.16 ~ 방영 중"
  setLabel("release", "방영");
  const start = formatDate(tv.first_air_date);
  const end = tv.in_production ? "방영 중" : formatDate(tv.last_air_date);
  document.getElementById("release").textContent = start ? `${start} ~ ${end || ""}` : "-";

  // 방송사 (tvN, 넷플릭스 ...) - 영화의 '제작' 자리에 표시
  setLabel("company", "방송");
  document.getElementById("company").textContent = joinNames((tv.networks || []).map((n) => n.name));

  // 연출: 참여 회차가 많은 감독 → 없으면 기획(created_by)
  const directors = crewNames(crew, ["Director"]);
  document.getElementById("director").textContent =
    joinNames(directors.length ? directors : (tv.created_by || []).map((p) => p.name));

  // 각본
  document.getElementById("writer").textContent =
    joinNames(crewNames(crew, ["Screenplay", "Writer", "Teleplay", "Series Composition"]));

  // 원작 칸은 아래 renderOriginal 이 채움 (원작이 없으면 "-" 그대로)

  // 출연진 (앞 6명) - 드라마는 배역이 roles 배열 안에 있음
  renderCast(
    cast.slice(0, 6).map((a) => ({
      id: a.id,
      name: a.name,
      profile_path: a.profile_path,
      character: a.roles?.[0]?.character,
    }))
  );

  // 제작진 (감독, 각본, 원작 ...)
  await renderCrew(crew);

  // 이어서 탐색하기 (주연 배우 / 원작 작가 / 감독의 다른 작품)
  await renderExplore({ media: "tv", cast, crew });

  // 원작 정보 (원작이 없으면 섹션 숨김)
  await renderOriginal({ media: "tv", title: tv.name, crew });
}

/* ---------------------------------------------------------
   웹툰
   - 주소: detail.html?type=webtoon&title=미생&writer=윤태호
   - 만화규장각에서 제목으로 찾고, 작가 이름이 맞는 항목만 사용
     (같은 작품이 '웹툰 기록' 1개 + '단행본' 여러 권으로 나옴 → 웹툰 기록을 우선)
   - 영화 상세와 같은 칸을 웹툰에 맞게 사용
       정보 목록  : 연재 / 출판 / 글 / 그림 / 이용 등급
       출연진     → 작가 (글·그림)
       제작진     → 웹툰에는 없어서 숨김
       원작 정보  → 실사화 작품 (영화·드라마)
       이어서 탐색 → 작가의 다른 웹툰 + 실사화 작품 감독·주연 배우의 다른 작품
--------------------------------------------------------- */

// 작가 칸에서 이름이 아닌 말 (역할 표시)
const ROLE_WORDS = ["원작", "저", "글", "그림", "외", "작", "지음"];

// "조석, 범배" / "조석 원작" → ["조석", "범배"] / ["조석"]
function namesIn(text) {
  return (text || "")
    .split(/[\s,·/()]+/)
    .filter((name) => name && !ROLE_WORDS.includes(name) && !name.includes("편집부"));
}

// 줄거리 안의 HTML 태그(<b> 등) 제거
function plainText(text) {
  return (text || "").replace(/<[^>]+>/g, "").trim();
}

// 브랜드(광고) 웹툰인지 - 작가의 다른 웹툰 목록에서 뺌
function isBrandWebtoon(item) {
  return /브랜드\s*웹툰|본\s*(콘텐츠|컨텐츠)는/.test(item.outline || "");
}

// 만화규장각에서 이 웹툰의 항목들 찾기
async function findWebtoonItems(title, writer) {
  const sameWork = (item) =>
    isSameWork(item.prdctNm || item.title, title) && (!writer || hasName(item, writer));

  // 1) 제목으로 검색
  let items = kmas.searchByTitle ? await kmas.searchByTitle(title) : [];
  let matched = items.filter(sameWork);

  // 2) 못 찾으면 작가 이름으로 검색해서 그 안에서 찾기
  //    (제목 검색은 비슷한 다른 작품이 많이 섞여 정작 원작이 빠질 수 있음)
  if (matched.length === 0 && writer && kmas.searchWebtoonsByWriter) {
    try {
      items = await kmas.searchWebtoonsByWriter(writer);
    } catch {
      items = [];
    }
    matched = items.filter((item) => compact(item.prdctNm || item.title) === compact(title) && hasName(item, writer));
  }
  return matched;
}

// 작가 사진 찾기 (TMDB) - 이름이 정확히 같은 '작가' 분야 사람의 프로필 사진
async function writerPhoto(name) {
  const results = (await tmdb.searchPerson?.(name)) || [];
  const candidates = results.filter((p) => p.known_for_department === "Writing").slice(0, 3);
  for (const p of candidates) {
    const detail = await tmdb.getPersonDetail?.(p.id);
    if (detail && [detail.name, ...(detail.also_known_as || [])].includes(name)) {
      return detail.profile_path || "";
    }
  }
  return "";
}

// 작가의 다른 웹툰 3개 (만화규장각)
async function otherWebtoonsOf(name, currentTitle) {
  let items = [];
  try {
    items = kmas.searchWebtoonsByWriter ? await kmas.searchWebtoonsByWriter(name) : [];
  } catch {
    return [];
  }

  const works = new Map(); // 작품명 → { title, image, genre, hasPlatform }
  items.forEach((item) => {
    const workTitle = item.prdctNm || item.title;
    if (!workTitle || !hasName(item, name) || isBrandWebtoon(item)) return;
    if (compact(workTitle) === compact(currentTitle)) return; // 지금 작품 제외
    if (namesIn(`${item.sntncWritrNm} ${item.pictrWritrNm}`).some((n) => n !== name)) return; // 공동 작업 제외

    const key = compact(workTitle);
    const saved = works.get(key) || { title: workTitle, image: "", genre: "", hasPlatform: false };
    // 웹툰 기록(플랫폼 있음)의 표지·장르를 우선
    if (item.pltfomCdNm && !saved.hasPlatform) {
      saved.hasPlatform = true;
      saved.image = kmasImageUrl(item.imageDownloadUrl) || saved.image;
      saved.genre = item.mainGenreCdNm || saved.genre;
    } else {
      saved.image ||= kmasImageUrl(item.imageDownloadUrl);
      saved.genre ||= item.mainGenreCdNm || "";
    }
    works.set(key, saved);
  });

  // 웹툰으로 연재된 작품 + 표지가 있는 작품을 앞으로
  return [...works.values()]
    .sort((a, b) => (b.hasPlatform - a.hasPlatform) || (!!b.image - !!a.image))
    .slice(0, 3);
}

// '작가의 다른 웹툰' 박스
function webtoonBoxHtml({ name, photo, works }) {
  const items = works.map((w) => `
      <li>
        <a href="detail.html?${new URLSearchParams({ type: "webtoon", title: w.title, writer: name })}" style="color:inherit; text-decoration:none;">
          <div class="work-thumb" style="overflow:hidden;">
            ${w.image ? `<img src="${esc(w.image)}" alt="" style="display:block; width:100%; height:100%; object-fit:cover;" onerror="this.remove()">` : ""}
          </div>
          <p>${esc(w.title)}</p>
          <small style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(["웹툰", w.genre].filter(Boolean).join(" · "))}</small>
        </a>
      </li>`).join("");

  return `
    <div class="explore-box">
      <a class="explore-who" href="writer.html?${new URLSearchParams({ writer: name })}" style="color:inherit; text-decoration:none;">
        <span class="mini-photo" style="overflow:hidden;">${photo ? `<img src="${IMG}/w185${photo}" alt="" style="display:block; width:100%; height:100%; object-fit:cover;">` : ""}</span>
        <span><small>작가</small><strong>${esc(name)}의 다른 웹툰</strong></span>
      </a>
      <ul class="explore-works">${items}</ul>
    </div>`;
}

// 실사화 작품 카드들 (원작 정보 섹션을 '실사화 작품'으로 바꿔서 사용)
function renderAdaptations(adaptations) {
  if (!originSection || adaptations.length === 0) return; // 없으면 숨긴 채로

  originSection.querySelector("h2").textContent = "실사화 작품";
  const template = originSection.querySelector(".origin-card");

  // 카드 1개를 본으로 삼아 실사화 작품 수만큼 복사
  const cards = adaptations.map((a) => {
    const card = template.cloneNode(true);
    card.href = `detail.html?type=${a.media}&id=${a.id}`;

    const thumb = card.querySelector(".origin-thumb");
    thumb.style.overflow = "hidden";
    thumb.innerHTML = a.poster
      ? `<img src="${esc(a.poster)}" alt="" style="display:block; width:100%; height:100%; object-fit:cover;">`
      : "";

    card.querySelector(".origin-label").textContent = a.media === "movie" ? "영화" : "드라마";
    card.querySelector(".origin-text strong").textContent = a.title;
    card.querySelector(".origin-text p").textContent = a.media === "movie" ? "영화로 만들어진 작품" : "드라마로 만들어진 작품";
    const linkText = card.querySelector(".origin-link");
    if (linkText) linkText.textContent = "작품 보기";
    return card;
  });

  template.replaceWith(...cards);
  originSection.style.display = "";
}

async function renderWebtoon() {
  const title = (params.get("title") || "").trim();
  const writerParam = (params.get("writer") || "").trim();

  // 배지 "영화" → "웹툰", 웹툰에 없는 '제작진' 영역 숨김
  const badge = document.querySelector(".badges .badge");
  if (badge) badge.textContent = "웹툰";
  const crewSection = document.querySelector(".crew-section");
  if (crewSection) crewSection.style.display = "none";

  document.getElementById("title").textContent = title || "웹툰";
  document.title = `StoLink - ${title || "웹툰"}`;

  const matched = title ? await findWebtoonItems(title, writerParam) : [];
  if (matched.length === 0) {
    document.getElementById("overview").textContent = "만화규장각에서 작품 정보를 찾지 못했습니다.";
    const saveButton = document.querySelector(".save-btn");
    if (saveButton) saveButton.disabled = true; // 작품 정보가 없으면 저장할 수 없음
    document.getElementById("cast-list").innerHTML = `<li class="cast-empty">작가 정보가 없습니다.</li>`;
    return;
  }

  // 웹툰 기록(연재 플랫폼이 있는 항목)을 우선, 없으면 단행본
  const web = matched.find((item) => item.pltfomCdNm) || matched[0];
  const unique = (list) => [...new Set(list.filter(Boolean))];

  // ── 상단
  const cover = web.imageDownloadUrl || matched.find((item) => item.imageDownloadUrl)?.imageDownloadUrl;
  if (cover) {
    document.getElementById("poster").innerHTML =
      `<img src="${esc(kmasImageUrl(cover))}" alt="${esc(title)}" style="width:100%; height:100%; object-fit:cover;">`;
  }

  const workTitle = web.prdctNm || title;
  document.getElementById("title").textContent = workTitle;
  document.title = `StoLink - ${workTitle}`;

  const platforms = unique(matched.map((item) => item.pltfomCdNm));
  const finished = web.fnshYn === "Y" ? "완결" : web.fnshYn === "N" ? "연재 중" : "";
  const age = [web.ageGradCdNm, ...matched.map((item) => item.ageGradCdNm)].find((a) => a && a !== "확인필요") || "";

  // 부제목: "네이버웹툰 · 완결 · 15세 이상"
  document.getElementById("sub").textContent = [platforms[0], finished, age].filter(Boolean).join(" · ") || "웹툰";

  // 장르 (웹툰 기록의 장르 먼저)
  const genres = unique([web.mainGenreCdNm, ...matched.map((item) => item.mainGenreCdNm)]);
  document.getElementById("genres").innerHTML = genres.map((g) => `<li>${esc(g)}</li>`).join("");

  // 내 보관함 저장 (웹툰은 '볼 수 있는 곳' API 가 없어서 저장만)
  const saveWriter = writerParam || namesIn(web.sntncWritrNm || web.pictrWritrNm)[0] || "";
  setupSaveBox({
    type: "webtoon",
    title: workTitle,
    writer: saveWriter,
    poster: kmasImageUrl(cover),
    genres,
    href: `detail.html?${new URLSearchParams({ type: "webtoon", title: workTitle, writer: saveWriter })}`,
  });

  // 줄거리: 웹툰 기록 → 없으면 가장 긴 소개
  const outline = plainText(web.outline) ||
    matched.map((item) => plainText(item.outline)).sort((a, b) => b.length - a.length)[0];
  document.getElementById("overview").textContent = outline || "줄거리 정보가 없습니다.";

  // ── 정보 목록: 연재 / 출판 / 글 / 그림 / 이용 등급
  const textWriters = unique(namesIn(web.sntncWritrNm).concat(...matched.map((i) => namesIn(i.sntncWritrNm))));
  const drawWriters = unique(namesIn(web.pictrWritrNm).concat(...matched.map((i) => namesIn(i.pictrWritrNm))));

  setLabel("release", "연재");
  document.getElementById("release").textContent = joinNames(platforms);
  setLabel("company", "출판");
  document.getElementById("company").textContent = joinNames(unique(matched.map((item) => item.plscmpnIdNm)));
  setLabel("director", "글");
  document.getElementById("director").textContent = joinNames(textWriters.length ? textWriters : drawWriters);
  setLabel("writer", "그림");
  document.getElementById("writer").textContent = joinNames(drawWriters.length ? drawWriters : textWriters);
  setLabel("author", "이용 등급");
  document.getElementById("author").textContent = age || "-";

  // ── 출연진 → 작가 (글·그림이 같은 사람이면 한 카드에 "글 · 그림")
  const castTitle = document.querySelector(".cast-section h2");
  if (castTitle) castTitle.textContent = "작가";

  const writers = unique([...textWriters, ...drawWriters]).slice(0, 4).map((name) => ({
    name,
    roles: [textWriters.includes(name) && "글", drawWriters.includes(name) && "그림"].filter(Boolean),
  }));
  const photos = await Promise.all(writers.map((w) => writerPhoto(w.name)));

  document.getElementById("cast-list").innerHTML = writers.map((w, i) => `
    <li class="cast-card">
      <a href="writer.html?${new URLSearchParams({ writer: w.name })}">
        <div class="cast-photo">
          ${photos[i] ? `<img src="${IMG}/w185${photos[i]}" alt="${esc(w.name)}">` : ""}
        </div>
        <p class="cast-name">${esc(w.name)}</p>
        <p class="cast-role">${w.roles.join(" · ")}</p>
      </a>
    </li>`).join("") || `<li class="cast-empty">작가 정보가 없습니다.</li>`;

  // ── 원작 정보 → 실사화 작품 (adaptation.js: 작가 페이지와 같은 찾기 규칙)
  const adaptations = (await adaptation.findAdaptations?.(workTitle)) || [];
  renderAdaptations(adaptations);

  // ── 이어서 탐색하기
  //    작가의 다른 웹툰 (작가마다 1박스) + 실사화 작품의 감독·주연 배우 → 최대 3박스
  const grid = exploreSection?.querySelector(".explore-grid");
  if (!grid) return;

  const writerBoxes = await Promise.all(
    writers.slice(0, 2).map(async (w, i) => {
      const works = await otherWebtoonsOf(w.name, workTitle);
      return works.length ? webtoonBoxHtml({ name: w.name, photo: photos[i], works }) : "";
    })
  );
  const boxes = writerBoxes.filter(Boolean);

  // 실사화 작품이 있으면 그 작품의 감독·주연 배우의 다른 작품도
  if (boxes.length < 3 && adaptations[0]) {
    const a = adaptations[0];
    const detail = a.media === "movie" ? await tmdb.getMovieDetail(a.id) : await tmdb.getTvDetailWithCredits?.(a.id);
    const credits = a.media === "movie" ? detail?.credits : detail?.aggregate_credits;
    const people = [
      { role: "감독", person: (credits?.crew || []).find((c) => jobsOf(c).includes("Director")) },
      { role: "배우", person: (credits?.cast || [])[0] },
    ].filter((t) => t.person);

    const genres = await loadGenreNames();
    for (const t of people) {
      if (boxes.length >= 3) break;
      const works = await otherWorksOf(t.person.id, { media: a.media, id: a.id });
      if (works.length === 0) continue;
      boxes.push(exploreBoxHtml({
        role: `${a.media === "movie" ? "영화" : "드라마"} ${t.role}`,
        name: await koreanNameOf(t.person),
        person: t.person,
        href: t.role === "배우" ? `actor.html?id=${t.person.id}` : `writer.html?person=${t.person.id}`,
        works,
        genres,
      }));
    }
  }

  if (boxes.length === 0) return; // 아무것도 없으면 섹션 숨긴 채로
  grid.innerHTML = boxes.join("");
  exploreSection.style.display = "";
}

/* ---------------------------------------------------------
   시작
--------------------------------------------------------- */
if (type === "tv") {
  await renderTv();
} else if (type === "webtoon") {
  await renderWebtoon();
} else {
  await renderMovie();
}