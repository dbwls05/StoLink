// 검색 결과 카드 랜더링
import { getPopularMovie, searchMovie } from "../api/tmdb.js"

const param = new URLSearchParams(location.search)
const query = (param.get("q") || "").trim()

const movies = query ? (await searchMovie(query)) || [] : (await getPopularMovie()) || [];

document.getElementById("keyword").textContent = query || "인기영화"
document.getElementById("total").textContent = movies.length;
document.querySelector(".search-bar input").value = query

function renderResult(movies) {
  const list = document.getElementById("result-list");

  list.innerHTML = movies
    .map(
      (movie) => `
    <li class="result-card">
      <a href="detail.html?id=${movie.id}">
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
          <button type="button" class="more-btn">더보기</button>
          <p class="score">${movie.vote_average.toFixed(1)}</p>
        </div>
      </a>
    </li>`,
    )
    .join("");
}

renderResult(movies)

document.getElementById("result-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".more-btn")
  if (!btn) return;
  e.preventDefault() // 링크 이동 막기
  const desc = btn.previousElementSibling;
  const open = desc.classList.toggle("expanded")
  btn.textContent = open ? "접기" : "더보기"
})

document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault() // 브라우저가 해당 이벤트에 대해 기본적으로 수행하는 동작을 취소(막는) 메서드
    location.href = "search.html"
  }
})
