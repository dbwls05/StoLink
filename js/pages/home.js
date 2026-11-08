// 임시 화면용 더미 카드 렌더링 (API 연동 시 교체)
function cardTemplate(rank, ott) {
  return `
    <li class="card-item">
      <a href="/pages/work.html" class="card">
        <div class="poster">
          <span class="type-badge">영화</span>
        </div>
        <div class="card-body">
          ${rank ? `<span class="rank-num">${rank}</span>` : ""}
          <div class="card-text">
            <h3>컨텐츠 제목</h3>
            <p class="meta">년도 · 장르</p>
            <span class="ott-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg>
              ${ott}
            </span>
          </div>
        </div>
      </a>
    </li>`;
}
function renderRow(id, withRank, count = 5, ott) {
  const el = document.getElementById(id);
  el.innerHTML = Array.from({ length: count }, (_, i) =>
    cardTemplate(withRank ? i + 1 : null, ott),
  ).join("");
}

renderRow("ranking-list", false, 10, "넷플릭스");

const ottCounts = { 넷플릭스: 4, "디즈니+": 3, 티빙: 3 };

function renderOtt(ott) {
  const el = document.getElementById("ott-list");
  const count = ottCounts[ott] || 4;
  el.innerHTML = Array.from({ length: count }, () =>
    cardTemplate(null, ott),
  ).join("");
}

document.querySelectorAll("#ott-tabs .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("#ott-tabs .tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderOtt(btn.dataset.ott);
  });
});

renderOtt("넷플릭스");
