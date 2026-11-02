// 로그인 상태면 헤더의 로그인/회원가입 버튼을 프로필 동그라미로 교체
import { supabase } from "../supabase/supabase.js";

const userMenu = document.querySelector(".user-menu");
const guestMenu = userMenu?.innerHTML;

function renderProfile(user) {
  const avatarUrl = user.user_metadata?.avatar_url; // 구글 로그인 시 프로필 사진
  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  userMenu.innerHTML = `
    <a href="/pages/mypage.html" class="profile-btn" aria-label="마이페이지">
      ${avatarUrl ? `<img src="${avatarUrl}" alt="" referrerpolicy="no-referrer" />` : initial}
    </a>`;
}

function renderHeader(session) {
  if (!userMenu) return;
  if (session?.user) {
    renderProfile(session.user);
  } else {
    userMenu.innerHTML = guestMenu;
  }
}

// 페이지 로드 시 + 로그인/로그아웃될 때마다 갱신
supabase.auth.onAuthStateChange((_event, session) => {
  renderHeader(session);
});
