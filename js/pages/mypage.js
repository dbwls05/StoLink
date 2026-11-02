import { getCurrentUser, signOut } from "../supabase/auth.js";

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
    profileImage.classList.add("placeholder-img");
  }

  // 로그아웃
  const logoutButton = document.querySelector(".logout-button");

  logoutButton.addEventListener("click", async () => {
    await signOut();
    location.href = "../index.html";
  });
}

init();
