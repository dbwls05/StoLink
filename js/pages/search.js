// 임시 화면용 더미 카드 렌더링 (API 연동 시 교체)
import { getPopularMovie } from "../api/tmdb.js"
const movies = (await getPopularMovie()) || [];

function renderResult(movies) {
  const list = document.getElementById("result-list");

  list.innerHTML = movies
    .map(
      (movie) => `
    <li class="result-card">
      <a href="work.html">
        <div class="poster">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
          <button type="button" class="bookmark" aria-label="저장">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><path d="M2 1.5h8v11L6 9.5l-4 3z"/></svg>
          </button>
          <span class="platform">넷플릭스</span>
        </div>
        <div class="card-info">
          <p class="meta">${movie.release_date.slice(0, 4)} · 영화</p>
          <h3>${movie.title}</h3>
          <p class="desc">${movie.overview || "줄거리 정보가 없습니다."}</p>
          <p class="score">${movie.vote_average.toFixed(1)}</p>
        </div>
      </a>
    </li>`,
    )
    .join("");
}

renderResult(movies)