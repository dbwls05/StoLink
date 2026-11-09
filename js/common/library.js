// =========================================================
// library.js - 내 보관함 저장소 (작품 상세 · 내 보관함 페이지 공통)
//
// ■ 저장 위치
//   브라우저 localStorage 의 "stolink-library" 칸에 JSON 배열로 저장
//   (로그인·서버가 생기면 이 파일 안의 load/save 두 함수만 서버 요청으로 바꾸면 됨)
//
// ■ 저장되는 작품 한 개의 모양
//   {
//     key:      "movie:293413" | "tv:61678" | "webtoon:미생|윤태호",  ← 작품마다 하나뿐인 이름표
//     type:     "movie" | "tv" | "webtoon",
//     id:       293413 (TMDB 번호, 웹툰은 null),
//     title:    "내부자들",
//     writer:   "윤태호" (웹툰만),
//     poster:   "https://image.tmdb.org/t/p/w342/....jpg" (표지/포스터 주소),
//     year:     "2015" (영화·드라마 공개 연도, 웹툰은 ""),
//     sub:      "2015 · 영화" (목록에 작게 보여줄 한 줄 - 없으면 자동으로 만듦),
//     href:     "detail.html?type=movie&id=293413" (작품 상세 주소),
//     genres:   ["범죄", "드라마"],
//     status:   "want" | "watching" | "done",
//     savedAt:  "2026-11-10T03:00:00.000Z" (처음 저장한 시각),
//     updatedAt:"2026-11-10T03:05:00.000Z" (마지막으로 바꾼 시각)
//   }
//
// ■ library.html 에서 쓰는 법 (예시)
//   import { getLibrary, STATUS, statusLabel, detailUrl, removeItem, updateStatus } from "../js/common/library.js";
//   const items = getLibrary();                       // 최근에 바꾼 순서
//   const watching = getLibrary({ status: "watching" }); // 상태별
//   items.forEach((item) => {
//     // item.poster, item.title, statusLabel(item) 로 카드 그리기
//     // 카드 링크: detailUrl(item)
//   });
// =========================================================

const STORAGE_KEY = "stolink-library";

// 상태 값 → 화면 글자 (영화·드라마 / 웹툰)
export const STATUS = {
  want: { screen: "보고싶음", webtoon: "읽고싶음" },
  watching: { screen: "보는 중", webtoon: "읽는 중" },
  done: { screen: "다 봤음", webtoon: "다 읽음" },
};
export const STATUS_ORDER = ["want", "watching", "done"];

// 작품 상세의 상태 선택 상자에서 쓰는 목록 / 글자 (detail.js 가 사용)
export const STATUS_LIST = STATUS_ORDER;
export const STATUS_LABEL = { want: "보고싶음", watching: "보는 중", done: "다 봤음" };

// 작품의 상태를 화면 글자로: statusLabel(item) → "보고싶음" / "읽는 중"
export function statusLabel(item, status = item.status) {
  const labels = STATUS[status] || STATUS.want;
  return item.type === "webtoon" ? labels.webtoon : labels.screen;
}

// 작품마다 하나뿐인 이름표 만들기
// - 영화·드라마: "movie:293413" / "tv:61678"
// - 웹툰: TMDB 번호가 없어서 "webtoon:제목|작가"
export function makeKey({ type, id, title, writer }) {
  return type === "webtoon" ? `webtoon:${title}|${writer || ""}` : `${type}:${id}`;
}

// 작품 상세 주소 (보관함 카드를 눌렀을 때 이동할 곳)
export function detailUrl(item) {
  if (item.href) return item.href;
  if (item.type === "webtoon") {
    return `detail.html?${new URLSearchParams({ type: "webtoon", title: item.title, writer: item.writer || "" })}`;
  }
  return `detail.html?type=${item.type}&id=${item.id}`;
}

/* ---------------------------------------------------------
   저장소 읽기 / 쓰기 (서버로 바꿀 때는 이 두 함수만 수정)
--------------------------------------------------------- */
function load() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return []; // 저장된 값이 깨져 있거나 localStorage 를 쓸 수 없는 경우
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (error) {
    console.warn("보관함 저장 실패:", error);
    return false;
  }
}

/* ---------------------------------------------------------
   보관함 기능
--------------------------------------------------------- */

// 보관함 전체 (최근에 바꾼 작품부터). status 를 주면 그 상태만
export function getLibrary({ status, type } = {}) {
  return load()
    .filter((item) => (!status || item.status === status) && (!type || item.type === type))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

// 작품 하나 찾기 (없으면 null)
export function getItem(key) {
  return load().find((item) => item.key === key) || null;
}

export function isSaved(key) {
  return getItem(key) !== null;
}

// 저장 (이미 있으면 정보와 상태를 새로 덮어씀) → 저장된 작품 반환
export function saveItem(work, status = "want") {
  const list = load();
  const key = work.key || makeKey(work);
  const now = new Date().toISOString();
  const old = list.find((item) => item.key === key);

  const item = {
    key,
    type: work.type,
    id: work.id ?? null,
    title: work.title,
    writer: work.writer || "",
    poster: work.poster || "",
    year: work.year || "",
    // 목록용 한 줄: "2015 · 영화" / "웹툰 · 윤태호"
    sub: work.sub ||
      (work.type === "webtoon"
        ? ["웹툰", work.writer].filter(Boolean).join(" · ")
        : [work.year, work.type === "movie" ? "영화" : "드라마"].filter(Boolean).join(" · ")),
    href: work.href || "",
    genres: work.genres || [],
    status: STATUS[status] ? status : "want",
    savedAt: old?.savedAt || now,
    updatedAt: now,
  };

  save([...list.filter((i) => i.key !== key), item]);
  notify();
  return item;
}

// 상태만 바꾸기 (보관함에 있는 작품만)
export function updateStatus(key, status) {
  const list = load();
  const item = list.find((i) => i.key === key);
  if (!item || !STATUS[status]) return null;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  save(list);
  notify();
  return item;
}

// 보관함에서 빼기
export function removeItem(key) {
  save(load().filter((item) => item.key !== key));
  notify();
}

/* ---------------------------------------------------------
   변경 알림
   - 같은 페이지 안에서 바뀌면 "library-change" 이벤트
   - 다른 탭에서 바뀌면 브라우저의 "storage" 이벤트
   → library.html 에서 onLibraryChange(다시그리기함수) 로 목록 자동 갱신 가능
--------------------------------------------------------- */
function notify() {
  window.dispatchEvent(new CustomEvent("library-change"));
}

export function onLibraryChange(callback) {
  window.addEventListener("library-change", callback);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) callback();
  });
}