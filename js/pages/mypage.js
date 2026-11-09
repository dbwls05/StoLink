import { getCurrentUser, signOut } from "../supabase/auth.js";
import { loadLibrary, getLibrary, detailUrl } from "../common/library.js";

const STATUS_TEXT = { want: "보고싶음", watching: "보는중", done: "시청함" };
const TV_SHOW_GENRES = ["예능", "리얼리티", "토크", "다큐멘터리", "뉴스"];

// 저장한 작품을 4가지 유형으로 나눔
function categoryOf(item) {
  if (item.type === "movie") return "영화";
  if (item.type === "webtoon") return "웹툰";
  const isShow = (item.genres || []).some((g) => TV_SHOW_GENRES.includes(g));
  return isShow ? "TV 프로그램" : "드라마";
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function renderLibrary() {
  const items = getLibrary();
  const count = (status) => items.filter((i) => i.status === status).length;

  const stats = {
    total: items.length,
    want: count("want"),
    watching: count("watching"),
    done: count("done"),
  };
  Object.entries(stats).forEach(([key, value]) => {
    document.querySelector(`[data-stat="${key}"]`).textContent = value;
  });

  // 유형별 막대
  const counts = { 드라마: 0, 영화: 0, 웹툰: 0, "TV 프로그램": 0 };
  items.forEach((i) => counts[categoryOf(i)]++);
  const max = Math.max(1, ...Object.values(counts));
  document.querySelector(".usage-list").innerHTML = Object.entries(counts)
    .map(
      ([name, n]) => `
      <li class="usage-row">
        <span>${name}</span>
        <div class="usage-bar"><div class="usage-fill" style="width:${(n / max) * 100}%"></div></div>
        <span class="usage-count">${n}</span>
      </li>`,
    )
    .join("");

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  document.querySelector(".usage-note").innerHTML = items.length
    ? `유형별 저장 개수 · 가장 많이 저장한 장르는 <strong>${top[0]}</strong>예요.`
    : "아직 저장한 콘텐츠가 없어요.";

  // 최근 저장 5개
  const recent = document.querySelector(".recent-list");
  if (!items.length) {
    recent.innerHTML = '<p class="empty">저장한 콘텐츠가 없어요.</p>';
    return;
  }
  const latest = items.slice(0, 5);
  recent.innerHTML = latest
    .map(
      (i) => `
      <a class="recent-card" href="${detailUrl(i)}">
        <div class="recent-poster">
          ${i.poster ? `<img src="${i.poster}" alt="" />` : ""}
          <span class="recent-badge">${STATUS_TEXT[i.status] || ""}</span>
        </div>
        <p class="recent-name"></p>
        <p class="recent-sub">${categoryOf(i)} · ${formatDate(i.updatedAt || i.savedAt)}</p>
      </a>`,
    )
    .join("");
  // 제목은 textContent 로 넣어서 HTML 이 섞이지 않게 함
  recent
    .querySelectorAll(".recent-name")
    .forEach((el, idx) => (el.textContent = latest[idx].title));
}

async function init() {
  const user = await getCurrentUser();

  if (!user) {
    location.href = "./login.html";
    return;
  }

  const nickname = user.user_metadata.full_name || user.email.split("@")[0];
  document.querySelector(".nickname").textContent = nickname;
  document.querySelector(".email").textContent = user.email;

  const profileImage = document.querySelector(".profile-image");
  const avatarUrl = user.user_metadata.avatar_url;

  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = "프로필 사진";
    profileImage.appendChild(img);
  } else {
    profileImage.textContent = nickname.charAt(0);
  }

  if (user.app_metadata?.provider === "google") {
    const badge = document.querySelector(".provider-badge");
    badge.textContent = "Google 계정으로 로그인됨";
    badge.hidden = false;
  }

  await loadLibrary(); // 서버에서 내 보관함 가져오기
  renderLibrary();

  // 로그아웃
  const logoutButton = document.querySelector(".logout-button");

  logoutButton.addEventListener("click", async () => {
    await signOut();
    location.href = "../index.html";
  });
}

init();
