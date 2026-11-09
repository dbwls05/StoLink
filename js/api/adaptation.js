// =========================================================
// adaptation.js - 웹툰 제목 → 실사화(영화/드라마) 찾기 (TMDB)
//
// 1) 직접 지정 목록(MANUAL)에 있으면 그 TMDB 작품을 사용
//    - 「문유」 → 중국 영화 「Moon Man(独行月球)」처럼 제목이 완전히 달라서
//      제목 검색으로는 찾을 수 없는 경우를 위해
// 2) 없으면 웹툰 제목으로 영화 + 드라마를 검색해서 아래 조건으로 고름
//    ① 한국 작품 (original_language === "ko")
//    ② 제목이 같거나, "파인: 촌뜨기들" 처럼 '웹툰 제목 + : 부제' 형태
//    → 영화 1개, 드라마 1개까지 (각각 투표 수가 가장 많은 것)
//
// 결과: [{ media: "movie" | "tv", id, title, poster }, ...]  (없으면 빈 배열)
// =========================================================

import { searchMovie, searchTv, getMovieDetail, getTvDetail } from "./tmdb.js";

const POSTER_URL = "https://image.tmdb.org/t/p/w342";

// ▼ 제목만으로 찾을 수 없는 실사화를 직접 연결 (웹툰 제목: [{ media, TMDB 번호 }])
//   TMDB 번호는 themoviedb.org 작품 주소 끝의 숫자 (예: /movie/801803)
const MANUAL = {
  문유: [{ media: "movie", id: 801803 }], // Moon Man (独行月球, 2022 중국 영화)
};

// 제목 비교용: 띄어쓰기·기호 제거
function titleKey(title) {
  return (title || "").replace(/[\s:·\-_,.!?'"「」『』()[\]<>]/g, "").toLowerCase();
}

function isSameTitle(webtoonTitle, screenTitle) {
  if (titleKey(webtoonTitle) === titleKey(screenTitle)) return true;

  // "파인: 촌뜨기들" 처럼 웹툰 제목 바로 뒤에 ':' 로 부제가 붙은 경우
  const plain = (screenTitle || "").replace(/\s/g, "");
  return plain.startsWith(webtoonTitle.replace(/\s/g, "") + ":");
}

// TMDB 결과 하나 → 화면에서 쓰는 모양
function toAdaptation(item, media) {
  return {
    media, // "movie" 또는 "tv"
    id: item.id,
    title: media === "movie" ? item.title : item.name,
    poster: item.poster_path ? POSTER_URL + item.poster_path : "",
  };
}

// 1) 직접 지정된 작품 가져오기
async function fromManual(list) {
  const results = await Promise.all(
    list.map(({ media, id }) => (media === "movie" ? getMovieDetail(id) : getTvDetail(id)))
  );
  return results
    .map((item, i) => (item ? toAdaptation(item, list[i].media) : null))
    .filter(Boolean);
}

// 2) 제목으로 검색해서 고르기
function pickBest(results, webtoonTitle, media) {
  const matched = (results || []).filter(
    (item) =>
      item.original_language === "ko" &&
      isSameTitle(webtoonTitle, media === "movie" ? item.title : item.name)
  );
  if (matched.length === 0) return null;

  matched.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  return toAdaptation(matched[0], media);
}

export async function findAdaptations(webtoonTitle) {
  if (MANUAL[webtoonTitle]) {
    return fromManual(MANUAL[webtoonTitle]);
  }

  const [movies, tvs] = await Promise.all([searchMovie(webtoonTitle), searchTv(webtoonTitle)]);

  return [pickBest(movies, webtoonTitle, "movie"), pickBest(tvs, webtoonTitle, "tv")].filter(Boolean);
}