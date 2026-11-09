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