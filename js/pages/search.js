// 임시 화면용 더미 카드 렌더링 (API 연동 시 교체)
const list = document.getElementById("result-list");

list.innerHTML = [1, 2, 3, 4, 5]
  .map(
    () => `
    <li class="result-card">
      <a href="work.html">
        <div class="poster">
          <button type="button" class="bookmark" aria-label="저장">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><path d="M2 1.5h8v11L6 9.5l-4 3z"/></svg>
          </button>
          <span class="platform">넷플릭스</span>
        </div>
        <div class="card-info">
          <p class="meta">년도 · 유형 · 장르</p>
          <h3>컨텐츠 제목</h3>
          <p class="desc">컨텐츠 설명(줄거리)</p>
          <p class="score">0.0</p>
        </div>
      </a>
    </li>`,
  )
  .join("");
