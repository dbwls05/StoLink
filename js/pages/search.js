// 검색 결과 카드 랜더링
// 검색 결과 카드 랜더링 + 필터칩 / 정렬
import { getPopularMovie, searchMovie, searchTv, getGenreList } from "../api/tmdb.js"
import { MOCK_ITEMS } from "../data/mockWebtoons.js"

const param = new URLSearchParams(location.search)
const query = (param.get("q") || "").trim()

// 영화 / 드라마 / 웹툰을 같은 모양으로 맞춤
const [movieRes, tvRes] = query
  ? await Promise.all([searchMovie(query), searchTv(query)])
  : [await getPopularMovie(), []]

const [movieGenres, tvGenres] = await Promise.all([
  getGenreList("movie"),
  getGenreList("tv"),
])
const genreMap = new Map([...movieGenres, ...tvGenres].map((g) => [g.id, g.name]))
const genreText = (ids = []) =>
  ids.slice(0, 2).map((id) => genreMap.get(id)).filter(Boolean).join(", ")

const webtoonRes = query
  ? MOCK_ITEMS.filter(
      (w) =>
        w.title.includes(query) ||
        (w.sntncWritrNm || "").includes(query) ||
        (w.pictrWritrNm || "").includes(query),
    )
  : []

const items = [
  ...(movieRes || []).map((m, i) => ({
    kind: "movie",
    order: i,
    id: m.id,
    title: m.title,
    date: m.release_date || "",
    overview: m.overview,
    genre: genreText(m.genre_ids),
    score: m.vote_average || 0,
    poster: m.poster_path,
    href: `detail.html?id=${m.id}`,
    label: "영화",
  })),
  ...(tvRes || []).map((t, i) => ({
    kind: "tv",
    order: i,
    id: t.id,
    title: t.name,
    date: t.first_air_date || "",
    overview: t.overview,
    genre: genreText(t.genre_ids),
    score: t.vote_average || 0,
    poster: t.poster_path,
    href: `detail.html?${new URLSearchParams({ type: "tv", id: t.id })}`,
    label: "드라마·TV",
  })),
  ...webtoonRes.map((w, i) => ({
    kind: "webtoon",
    order: i,
    title: w.title,
    date: "",
    overview: "",
    genre: w.mainGenreCdNm || "",
    score: 0,
    poster: null,
    img: w.imageDownloadUrl,
    href: `detail.html?${new URLSearchParams({ type: "webtoon", title: w.title, writer: w.sntncWritrNm })}`,
    label: "웹툰",
  })),
]

let currentKind = "all"
let currentSort = "relevance"

const SORTS = {
  relevance: { label: "관련도순", fn: (a, b) => a.order - b.order },
  latest: { label: "최신순", fn: (a, b) => b.date.localeCompare(a.date) },
  rating: { label: "평점순", fn: (a, b) => b.score - a.score },
}

document.getElementById("keyword").textContent = query || "인기영화"
document.querySelector(".search-bar input").value = query

function updateCounts() {
  const count = { all: items.length, movie: 0, tv: 0, webtoon: 0 }
  items.forEach((it) => count[it.kind]++)
  document.querySelectorAll(".chip[data-kind]").forEach((chip) => {
    chip.querySelector("span").textContent = count[chip.dataset.kind]
  })
}

function renderResult() {
  const list = document.getElementById("result-list")
  const shown = items
    .filter((it) => currentKind === "all" || it.kind === currentKind)
    .sort(SORTS[currentSort].fn)

  document.getElementById("total").textContent = shown.length

  if (!shown.length) {
    list.innerHTML = '<li class="empty">검색 결과가 없습니다.</li>'
    return
  }

  list.innerHTML = shown
    .map((it) => {
      const img = it.poster
        ? `https://image.tmdb.org/t/p/w500${it.poster}`
        : it.img
      return `
    <li class="result-card">
      <a href="${it.href}">
        <div class="poster">
          ${img ? `<img src="${img}" alt="${it.title} 포스터">` : ""}
          <span class="type-badge">${it.label}</span>
        </div>
        <div class="card-text">
          <h3>${it.title}</h3>
          <p class="meta">${[it.date.slice(0, 4), it.genre].filter(Boolean).join(" · ") || "-"}</p>
          <p class="score">${it.score ? it.score.toFixed(1) : "-"}</p>
        </div>
      </a>
    </li>`
    })
    .join("")
}

// 필터칩
document.querySelector(".filter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip[data-kind]")
  if (!chip) return
  currentKind = chip.dataset.kind
  document
    .querySelectorAll(".chip[data-kind]")
    .forEach((c) => c.classList.toggle("active", c === chip))
  renderResult()
})

// 정렬 드롭다운
const sortBtn = document.getElementById("sort-btn")
const sortMenu = document.getElementById("sort-menu")
sortBtn.addEventListener("click", (e) => {
  e.stopPropagation()
  sortMenu.hidden = !sortMenu.hidden
})
sortMenu.addEventListener("click", (e) => {
  const opt = e.target.closest("[data-sort]")
  if (!opt) return
  currentSort = opt.dataset.sort
  sortBtn.firstChild.textContent = SORTS[currentSort].label + " "
  sortMenu
    .querySelectorAll("[data-sort]")
    .forEach((o) => o.classList.toggle("selected", o === opt))
  sortMenu.hidden = true
  renderResult()
})
document.addEventListener("click", () => (sortMenu.hidden = true))

updateCounts()
renderResult()

document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault() // 브라우저가 해당 이벤트에 대해 기본적으로 수행하는 동작을 취소(막는) 메서드
    location.href = "search.html"
  }
})
