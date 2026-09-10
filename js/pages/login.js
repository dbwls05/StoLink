import { signIn } from "../supabase/auth.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");
const submitBtn = form.querySelector(".btn-login");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const email = form.email.value.trim();
  const password = form.password.value;

  submitBtn.disabled = true;
  const { error } = await signIn(email, password);
  submitBtn.disabled = false;

  if (error) {
    errorEl.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    return;
  }

  location.href = "../index.html";
});
