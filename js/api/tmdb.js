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

export async function getWatchProviders(movieId) {
  const url = `${BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;

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