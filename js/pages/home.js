// 임시 화면용 더미 카드 렌더링 (API 연동 시 교체)
function cardTemplate(rank) {
  return `
    <li class="card-item">
      ${rank ? `<span class="rank-num">${rank}</span>` : ""}
      <a href="/pages/work.html" class="card">
        <div class="poster">
          <button type="button" class="bookmark" aria-label="저장">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><path d="M2 1.5h8v11L6 9.5l-4 3z"/></svg>
          </button>
          <span class="rating">★ 4.5</span>
        </div>
        <div class="card-info">
          <p class="meta">년도 · 유형 · 장르</p>
          <h3>컨텐츠 제목</h3>
        </div>
      </a>
    </li>`;
}

function renderRow(id, withRank) {
  const el = document.getElementById(id);
  el.innerHTML = [1, 2, 3, 4, 5]
    .map((n) => cardTemplate(withRank ? n : null))
    .join("");
}

renderRow("ranking-list", true);
renderRow("movie-list", false);
renderRow("drama-list", false);
