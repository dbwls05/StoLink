import { TMDB_API_KEY } from "../../config.js";
const BASE_URL = "https://api.themoviedb.org/3";

export async function getPopularMovie() {
  const url = `${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=ko-KR&page=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }

    const data = await response.json();
    // console.log(data)
    return data.results;
  } catch (error) {
    console.log("TMDB API 호출 에러", error);
  }
}

// 볼 수 있는 곳 (OTT) - TMDB 가 JustWatch 데이터로 제공
// media : "movie"(기본) 또는 "tv" → 기존처럼 getWatchProviders(영화번호) 로 쓰면 영화
// 결과(한국 기준) 예:
//   { link: "https://www.themoviedb.org/movie/293413/watch?locale=KR",  ← 작품별 시청 정보 페이지 1개
//     flatrate: [{ provider_name, logo_path, display_priority }, ...],  ← 구독
//     rent: [...], buy: [...], free: [...], ads: [...] }               ← 대여 / 구매 / 무료 / 광고 포함 무료
// 한국에서 볼 수 있는 곳이 없으면 undefined
export async function getWatchProviders(movieId, media = "movie") {
  const url = `${BASE_URL}/${media}/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.results?.KR; // 한국 기준 제공처만
  } catch (error) {
    console.log("OTT 정보 호출 에러", error);
  }
}

export async function getMoviesByProvider(providerId) {
  const url = `${BASE_URL}/discover/movie?providers&api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=KR&language=ko-KR`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }

    const data = await response.json();
    // console.log(data)
    return data.results;
  } catch (error) {
    console.log("TMDB API 호출 에러", error);
  }
}

export async function searchMovie(query) {
  const url = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.results;
  } catch (e) {
    console.log("검색 에러", e);
  }
}

export async function getMovieDetail(id) {
    const url = `${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=ko-KR&append_to_response=credits`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Http 통신 오류 ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.log("TMDB 상세 에러", e);
    }
}

export async function getPersonCredits(personId) {
    const url = `${BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}&language=ko-KR`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Http 통신 오류 ${response.status}`);
        return await response.json();
    } catch (error) {
        console.log("TMDB 인물 작품 에러", error);
    }
}

// ▼▼▼ 작가 페이지용으로 추가 ▼▼▼

// 드라마(TV) 제목으로 검색 - searchMovie 와 같은 형식, 주소만 /search/tv
// 드라마 결과는 영화와 이름이 다름: title → name, release_date → first_air_date
export async function searchTv(query) {
  const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.results;
  } catch (e) {
    console.log("드라마 검색 에러", e);
  }
}

// 드라마 상세 (getMovieDetail 의 드라마 버전) - 실사화를 직접 지정할 때 사용
export async function getTvDetail(id) {
  const url = `${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=ko-KR`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.log("TMDB 드라마 상세 에러", e);
  }
}

// 드라마 상세 + 출연진·제작진 (detail.html 의 드라마 화면용)
// - aggregate_credits : 모든 시즌·회차를 합친 출연진/제작진
//   (credits 는 '마지막 시즌'만 담고 있어서 드라마에는 aggregate_credits 가 정확함)
//   · cast[i].roles[0].character : 배역 이름
//   · crew[i].jobs[0].job        : 직무 (Director, Writer, Comic Book ...)
export async function getTvDetailWithCredits(id) {
  const url = `${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=ko-KR&append_to_response=aggregate_credits`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.log("TMDB 드라마 상세 에러", e);
  }
}

// 드라마를 볼 수 있는 곳 (getWatchProviders 의 드라마 버전, 한국 기준)
// 결과 예: { link: "https://www.themoviedb.org/tv/61678/watch?locale=KR",
//           flatrate: [{ provider_name: "티빙", logo_path: "/..png" }],  ← 구독
//           rent: [...], buy: [...], ads: [...], free: [...] }        ← 대여 / 구매 / 광고 / 무료
// 정보 출처: JustWatch (화면에 출처 표시 필요)
export async function getTvWatchProviders(tvId) {
  const url = `${BASE_URL}/tv/${tvId}/watch/providers?api_key=${TMDB_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.results?.KR; // 한국 기준 제공처만
  } catch (error) {
    console.log("드라마 OTT 정보 호출 에러", error);
  }
}

// 장르 목록 (장르 번호 → 이름) - 영화와 드라마는 장르 목록이 따로 있음
// media : "movie" 또는 "tv"
// 결과 예: [{ id: 80, name: "범죄" }, { id: 18, name: "드라마" }, ...]
export async function getGenreList(media = "movie") {
  const url = `${BASE_URL}/genre/${media}/list?api_key=${TMDB_API_KEY}&language=ko-KR`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.genres;
  } catch (e) {
    console.log("TMDB 장르 목록 에러", e);
    return [];
  }
}

// 인물 이름으로 검색 (작가, 감독, 배우 모두)
// 결과 예: [{ id, name, profile_path, known_for_department, known_for: [...] }, ...]
// ※ name 은 "Yoon Tae-ho" 처럼 영문일 수 있음 → 한글 이름 확인은 getPersonDetail 의 also_known_as 로
export async function searchPerson(query) {
  const url = `${BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 통신 오류 ${response.status}`);
    }
    const data = await response.json();
    return data.results;
  } catch (e) {
    console.log("인물 검색 에러", e);
  }
}

// 인물 상세 정보 (소개글, 생일, 출생지, 다른 이름 목록)
// language : "ko-KR"(기본) 또는 "en-US" — 한국어 소개가 비어 있을 때 영어로 다시 요청하는 용도
// 결과 예: { id, name, biography, birthday, place_of_birth, profile_path,
//            known_for_department, also_known_as: ["윤태호", "Yoon Tae-ho", ...] }
export async function getPersonDetail(personId, language = "ko-KR") {
  const url = `${BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&language=${language}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Http 통신 오류 ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.log("TMDB 인물 상세 에러", e);
  }
}