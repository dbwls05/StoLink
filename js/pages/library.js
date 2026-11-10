// =========================================================
// library.js (pages) - 내 보관함 화면
//
// - 작품 상세에서 저장한 작품을 js/common/library.js 에서 꺼내 목록으로 보여줌
// - 상태 탭  : 전체 / 보고싶음 / 보는 중 / 다 봤음 (각 개수)
// - 도구     : 보관함 안 검색(제목·작가) / 유형 / 장르 / 정렬
// - 한 줄    : 표지 · 제목 · 종류 · 연도 · 장르 · 저장한 날짜 · 상태 바꾸기 · 삭제
// - 웹툰은 만화규장각에 연도 정보가 없어서 연도를 빼고 보여줌
// - 보관함은 Supabase(saved_contents 테이블)에 있어서
//   페이지가 열릴 때 loadLibrary() 로 한 번 가져온 뒤 그림 (로그인 필요)
// - 상태 변경 · 삭제도 서버에 저장되므로 await 로 기다림
// =========================================================
import { getCurrentUser } from "../supabase/auth.js";
import {
  loadLibrary,
  getLibrary,
  updateStatus,
  removeItem,
  detailUrl,
  onLibraryChange,
  STATUS_LIST,
  STATUS_LABEL,
} from "../common/library.js";

const TYPE_LABEL = { movie: "영화", tv: "드라마", webtoon: "웹툰" };

const el = {
  total: document.getElementById("library-total"),
  tabs: document.getElementById("status-tabs"),
  search: document.getElementById("library-search"),
  type: document.getElementById("filter-type"),
  genre: document.getElementById("filter-genre"),
  sort: document.getElementById("sort"),
  list: document.getElementById("library-list"),
};

// 지금 고른 조건
const state = { status: "all", query: "", type: "all", genre: "all", sort: "saved-new" };

// HTML 에 넣을 글자 안전하게 바꾸기
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// "2026-11-07T..." → "11.07"
function savedDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------------------------------------------------------
   1. 탭 숫자 · 장르 목록
--------------------------------------------------------- */
function renderTabs(items) {
  el.total.textContent = `${items.length}개 저장됨`;
  el.tabs.querySelectorAll(".status-tab").forEach((tab) => {
    const status = tab.dataset.status;
    const count = status === "all" ? items.length : items.filter((i) => i.status === status).length;
    tab.querySelector("span").textContent = count;
    tab.classList.toggle("is-active", status === state.status);
  });
}

// 장르 선택 상자: 저장한 작품들에 있는 장르만 (가나다순)
function renderGenreOptions(items) {
  const genres = [...new Set(items.flatMap((i) => i.genres || []))].sort((a, b) => a.localeCompare(b, "ko"));
  if (state.genre !== "all" && !genres.includes(state.genre)) state.genre = "all"; // 고른 장르의 작품을 다 지운 경우
  el.genre.innerHTML =
    `<option value="all">전체</option>` +
    genres.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  el.genre.value = state.genre;
}

/* ---------------------------------------------------------
   2. 조건에 맞게 거르고 정렬
--------------------------------------------------------- */
function filterAndSort(items) {
  const q = state.query.trim().toLowerCase();

  const shown = items.filter((item) =>
    (state.status === "all" || item.status === state.status) &&
    (state.type === "all" || item.type === state.type) &&
    (state.genre === "all" || (item.genres || []).includes(state.genre)) &&
    (!q || `${item.title} ${item.writer || ""}`.toLowerCase().includes(q)),
  );

  const byDate = (a, b) => (a.savedAt || "").localeCompare(b.savedAt || "");
  const sorters = {
    "saved-new": (a, b) => byDate(b, a),
    "saved-old": byDate,
    title: (a, b) => a.title.localeCompare(b.title, "ko"),
    year: (a, b) => (b.year || "0").localeCompare(a.year || "0") || byDate(b, a), // 연도 없는 웹툰은 맨 뒤
  };
  return shown.sort(sorters[state.sort] || sorters["saved-new"]);
}

/* ---------------------------------------------------------
   3. 목록 그리기
--------------------------------------------------------- */
function rowHtml(item) {
  // 장르: 작품 종류와 같은 이름은 빼기 (드라마 작품의 '드라마' 장르가 "드라마 · 2020 · 드라마" 로 겹치지 않게)
  const genres = (item.genres || []).filter((g) => g !== TYPE_LABEL[item.type]);
  const meta = [TYPE_LABEL[item.type], item.type === "webtoon" ? item.writer : item.year, genres.slice(0, 2).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const options = STATUS_LIST.map(
    (s) => `<option value="${s}" ${s === item.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`,
  ).join("");

  return `
    <li class="library-item" data-key="${esc(item.key)}">
      <a class="item-poster" href="${esc(detailUrl(item))}">
        ${item.poster ? `<img src="${esc(item.poster)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      </a>
      <div class="item-info">
        <a class="item-title" href="${esc(detailUrl(item))}">${esc(item.title)}</a>
        <p class="item-meta">${esc(meta)}</p>
      </div>
      <span class="item-date">${savedDate(item.savedAt)} 저장</span>
      <label class="item-status">상태
        <select class="status-select" aria-label="${esc(item.title)} 상태">${options}</select>
      </label>
      <button type="button" class="item-delete" aria-label="${esc(item.title)} 삭제">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h1.5v-8H10zm3.5 0v8H15v-8h-1.5z"/></svg>
      </button>
    </li>`;
}

function render() {
  const items = getLibrary();
  renderTabs(items);
  renderGenreOptions(items);

  if (items.length === 0) {
    el.list.innerHTML = `
      <li class="library-empty">
        아직 저장한 작품이 없어요.<br>작품 상세에서 <b>보관함에 저장</b>을 눌러 담아 보세요.
        <a href="search.html">작품 찾으러 가기</a>
      </li>`;
    return;
  }

  const shown = filterAndSort(items);
  el.list.innerHTML = shown.length
    ? shown.map(rowHtml).join("")
    : `<li class="library-empty">조건에 맞는 작품이 없어요.</li>`;
}

/* ---------------------------------------------------------
   4. 이벤트
--------------------------------------------------------- */

// 상태 탭
el.tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".status-tab");
  if (!tab) return;
  state.status = tab.dataset.status;
  render();
});

// 검색 · 유형 · 장르 · 정렬
el.search.addEventListener("input", () => {
  state.query = el.search.value;
  render();
});
el.type.addEventListener("change", () => {
  state.type = el.type.value;
  render();
});
el.genre.addEventListener("change", () => {
  state.genre = el.genre.value;
  render();
});
el.sort.addEventListener("change", () => {
  state.sort = el.sort.value;
  render();
});

// 상태 바꾸기 (보관함 안에서 바로) - 서버 저장이 끝나면 library-change → render()
el.list.addEventListener("change", async (event) => {
  const select = event.target.closest(".status-select");
  if (!select) return;
  select.disabled = true;
  const saved = await updateStatus(select.closest(".library-item").dataset.key, select.value);
  if (!saved) {
    alert("상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
    render(); // 원래 상태로 되돌려 그리기
  }
});

// 삭제
el.list.addEventListener("click", async (event) => {
  const button = event.target.closest(".item-delete");
  if (!button) return;
  const row = button.closest(".library-item");
  const title = row.querySelector(".item-title").textContent;
  if (!confirm(`'${title}'을(를) 보관함에서 삭제할까요?`)) return;

  button.disabled = true;
  const ok = await removeItem(row.dataset.key); // 성공하면 library-change → render()
  if (!ok) {
    button.disabled = false;
    alert("삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
});

// 보관함이 바뀌면 다시 그리기
onLibraryChange(render);

/* ---------------------------------------------------------
   5. 시작: 로그인 확인 → 서버에서 보관함 가져오기 → 그리기
--------------------------------------------------------- */
async function init() {
  el.list.innerHTML = `<li class="library-empty">보관함을 불러오는 중...</li>`;

  const user = await getCurrentUser();
  if (!user) {
    el.list.innerHTML = `
      <li class="library-empty">
        로그인하면 내 보관함을 볼 수 있어요.
        <a href="login.html">로그인하러 가기</a>
      </li>`;
    return;
  }

  await loadLibrary();
  render();
}

init();