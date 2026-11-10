import {
  getPopularMovie,
  getWatchProviders,
  getMoviesByProvider,
  getTvByProvider,
} from "../api/tmdb.js";

const GENRE_MAP = {
  28: "액션",
  12: "모험",
  16: "애니메이션",
  35: "코미디",
  80: "범죄",
  99: "다큐멘터리",
  18: "드라마",
  10751: "가족",
  14: "판타지",
  36: "역사",
  27: "공포",
  10402: "음악",
  9648: "미스터리",
  10749: "로맨스",
  878: "SF",
  10770: "TV 영화",
  53: "스릴러",
  10752: "전쟁",
  37: "서부",
};

// TMDB 영화 객체 1개를 카드가 쓰는 데이터 모양으로 변환
function toCardItem(item, rank) {
  const isTv = item.media_type === "tv"
  return {
    id: item.id,
    rank,
    type: isTv ? (item.genre_ids?.includes(16) ? "애니" : "드라마") : "영화",
    media: isTv ? "tv" : "movie",
    title: item.title || item.name,
    year: (item.release_date || item.first_air_date || "").slice(0, 4) || "-",
    genre: GENRE_MAP[item.genre_ids?.[0]] || "기타",
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null,
    ott: null, // OTT 정보는 아직 연동 안 함
  };
}

// 데이터 객체(item) 하나를 받아서 카드 HTML을 그려주는 순수 함수
function cardTemplate(item) {
  return `
    <li class="card-item">
      <a href="/pages/detail.html?type=${item.media}&id=${item.id}" class="card">
        <div class="poster">
          ${item.poster ? `<img src="${item.poster}" alt="${item.title} 포스터" />` : ""}
          <span class="type-badge">${item.type}</span>
          ${item.ott
      ? `<span class="ott-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg>
                  ${item.ott}
                </span>`
      : ""
    }
        </div>
        <div class="card-body">
          ${item.rank ? `<span class="rank-num">${item.rank}</span>` : ""}
          <div class="card-text">
            <h3>${item.title}</h3>
            <p class="meta">${item.year} · ${item.genre}</p>
          </div>
        </div>
      </a>
    </li>`;
}

function renderList(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(cardTemplate).join("");
}

// 지금 인기있는 콘텐츠
async function loadPopular() {
  const movies = await getPopularMovie();
  if (!movies) return;
  const picked = movies.slice(0, 10);

  const items = await Promise.all(
    picked.map(async (m, i) => {
      const providers = await getWatchProviders(m.id);
      const ott = providers?.flatrate?.[0]?.provider_name ?? null;
      return { ...toCardItem(m, null), ott };
    }),
  );

  renderList("ranking-list", items);
}

loadPopular();

const PROVIDER = {
  넷플릭스: 8,
  "디즈니+": 337,
  티빙: 1883,
};

async function renderOtt(ott) {
  const [movies, shows] = await Promise.all([
    getMoviesByProvider(PROVIDER[ott]),
    getTvByProvider(PROVIDER[ott]),
  ]);

  // 영화 3개 + 드라마 3개 (종류 꼬리표를 붙여둠)
  const picked = [
    ...(movies || []).slice(0, 3).map((m) => ({ ...m, media_type: "movie" })),
    ...(shows || []).slice(0, 3).map((t) => ({ ...t, media_type: "tv" })),
  ];
  if (picked.length === 0) return;

  const items = await Promise.all(
    picked.map(async (m) => {
      const providers = await getWatchProviders(m.id, m.media_type);
      const providerName = providers?.flatrate?.[0]?.provider_name ?? null;
      return { ...toCardItem(m, null), ott: providerName };
    }),
  );

  renderList("ott-list", items);
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
