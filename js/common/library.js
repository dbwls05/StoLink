// =========================================================
// library.js - 내 보관함 저장소 (작품 상세 · 마이페이지 · 보관함 공통)
//
// ■ 저장 위치
//   Supabase 의 public.saved_contents 테이블 (로그인한 사용자별로 저장)
//
// ■ 테이블 칼럼 ↔ 화면에서 쓰는 작품(item) 값
//   content_type  → item.type      "movie" | "tv" | "webtoon"
//   external_id   → item.id        영화·드라마: TMDB 번호 / 웹툰: "제목|작가"
//   title         → item.title
//   poster_url    → item.poster
//   release_year  → item.year
//   status        → item.status    "want" | "watching" | "done"   (추가한 칼럼)
//   genres        → item.genres    ["범죄", "드라마"]              (추가한 칼럼)
//   created_at    → item.savedAt
//   updated_at    → item.updatedAt                                 (추가한 칼럼)
//   (key = "movie:293413" / "webtoon:미생|윤태호" 는 type + external_id 로 만든 이름표)
//
// ■ 사용 방법
//   1) 페이지가 열릴 때 한 번:  await loadLibrary();   ← 서버에서 내 보관함을 가져와 기억해 둠
//   2) 읽기(getLibrary, getItem, isSaved)는 기억해 둔 값을 바로 돌려줌 (await 필요 없음)
//   3) 쓰기(saveItem, updateStatus, removeItem)는 서버에 저장하므로 await 로 기다려야 함
// =========================================================

import { supabase } from "../supabase/supabase.js";

const TABLE = "saved_contents";

// 상태 값 → 화면 글자 (영화·드라마 / 웹툰)
export const STATUS = {
  want: { screen: "보고싶음", webtoon: "읽고싶음" },
  watching: { screen: "보는 중", webtoon: "읽는 중" },
  done: { screen: "다 봤음", webtoon: "다 읽음" },
};
export const STATUS_ORDER = ["want", "watching", "done"];

// 작품 상세의 상태 선택 상자에서 쓰는 목록 / 글자 (detail.js 가 사용)
export const STATUS_LIST = STATUS_ORDER;
export const STATUS_LABEL = {
  want: "보고싶음",
  watching: "보는 중",
  done: "다 봤음",
};

// 작품의 상태를 화면 글자로: statusLabel(item) → "보고싶음" / "읽는 중"
export function statusLabel(item, status = item.status) {
  const labels = STATUS[status] || STATUS.want;
  return item.type === "webtoon" ? labels.webtoon : labels.screen;
}

// 작품마다 하나뿐인 이름표 만들기
// - 영화·드라마: "movie:293413" / "tv:61678"
// - 웹툰: TMDB 번호가 없어서 "webtoon:제목|작가"
export function makeKey({ type, id, title, writer }) {
  return type === "webtoon"
    ? `webtoon:${title}|${writer || ""}`
    : `${type}:${id}`;
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
   서버(Supabase) ↔ 화면용 작품 모양 바꾸기
--------------------------------------------------------- */
function externalIdOf(work) {
  return work.type === "webtoon"
    ? `${work.title}|${work.writer || ""}`
    : String(work.id);
}

function makeSub({ type, writer, year }) {
  return type === "webtoon"
    ? ["웹툰", writer].filter(Boolean).join(" · ")
    : [year, type === "movie" ? "영화" : "드라마"].filter(Boolean).join(" · ");
}

// 테이블 한 줄 → 화면에서 쓰는 작품
function fromRow(row) {
  const isWebtoon = row.content_type === "webtoon";
  const writer = isWebtoon ? row.external_id.split("|")[1] || "" : "";
  const year = row.release_year ? String(row.release_year) : "";
  return {
    key: `${row.content_type}:${row.external_id}`,
    type: row.content_type,
    id: isWebtoon ? null : Number(row.external_id),
    title: row.title,
    writer,
    poster: row.poster_url || "",
    year,
    sub: makeSub({ type: row.content_type, writer, year }),
    href: "",
    genres: row.genres || [],
    status: row.status || "want",
    savedAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

/* ---------------------------------------------------------
   기억해 두는 곳 (서버에서 한 번 가져와서 여기에 보관)
--------------------------------------------------------- */
let cache = [];
let userId = null;

async function currentUserId() {
  if (userId) return userId;
  const { data } = await supabase.auth.getUser();
  userId = data?.user?.id || null;
  return userId;
}

// 서버에서 내 보관함 가져오기 (로그인 안 했으면 빈 목록)
export async function loadLibrary() {
  const uid = await currentUserId();
  if (!uid) {
    cache = [];
    return cache;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("보관함 불러오기 실패:", error.message);
    return cache;
  }
  cache = data.map(fromRow);
  return cache;
}

/* ---------------------------------------------------------
   보관함 기능
--------------------------------------------------------- */

// 보관함 전체 (최근에 바꾼 작품부터). status / type 을 주면 그것만
export function getLibrary({ status, type } = {}) {
  return cache
    .filter(
      (item) =>
        (!status || item.status === status) && (!type || item.type === type),
    )
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

// 작품 하나 찾기 (없으면 null)
export function getItem(key) {
  return cache.find((item) => item.key === key) || null;
}

export function isSaved(key) {
  return getItem(key) !== null;
}

// 저장 (이미 있으면 정보와 상태를 새로 덮어씀) → 저장된 작품 반환, 실패하면 null
export async function saveItem(work, status = "want") {
  const uid = await currentUserId();
  if (!uid) return null; // 로그인 필요

  const row = {
    user_id: uid,
    content_type: work.type,
    external_id: externalIdOf(work),
    title: work.title,
    poster_url: work.poster || null,
    release_year: parseInt(work.year, 10) || null,
    genres: work.genres || [],
    status: STATUS[status] ? status : "want",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: "user_id,content_type,external_id" })
    .select()
    .single();

  if (error) {
    console.error("보관함 저장 실패:", error.message);
    return null;
  }

  const item = fromRow(data);
  cache = [...cache.filter((i) => i.key !== item.key), item];
  notify();
  return item;
}

// 상태만 바꾸기 (보관함에 있는 작품만)
export async function updateStatus(key, status) {
  const item = getItem(key);
  const uid = await currentUserId();
  if (!item || !uid || !STATUS[status]) return null;

  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: updatedAt })
    .eq("user_id", uid)
    .eq("content_type", item.type)
    .eq("external_id", externalIdOf(item));

  if (error) {
    console.error("상태 변경 실패:", error.message);
    return null;
  }

  item.status = status;
  item.updatedAt = updatedAt;
  notify();
  return item;
}

// 보관함에서 빼기 → 성공하면 true
export async function removeItem(key) {
  const item = getItem(key);
  const uid = await currentUserId();
  if (!item || !uid) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", uid)
    .eq("content_type", item.type)
    .eq("external_id", externalIdOf(item));

  if (error) {
    console.error("보관함에서 빼기 실패:", error.message);
    return false;
  }

  cache = cache.filter((i) => i.key !== key);
  notify();
  return true;
}

/* ---------------------------------------------------------
   변경 알림 (같은 페이지 안에서 보관함이 바뀌면 "library-change" 이벤트)
--------------------------------------------------------- */
function notify() {
  window.dispatchEvent(new CustomEvent("library-change"));
}

export function onLibraryChange(callback) {
  window.addEventListener("library-change", callback);
}
