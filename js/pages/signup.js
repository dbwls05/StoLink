import { signUp } from "../supabase/auth.js";

const form = document.getElementById("signup-form");
const errorEl = document.getElementById("signup-error");
const submitBtn = form.querySelector(".btn-login");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const email = form.email.value.trim();
  const password = form.password.value;
  const passwordCheck = form.elements["password-check"].value;

  if (password !== passwordCheck) {
    errorEl.textContent = "비밀번호가 일치하지 않습니다.";
    return;
  }

  submitBtn.disabled = true;
  const { data, error } = await signUp(email, password);
  submitBtn.disabled = false;

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  if (data?.session) {
    location.href = "../index.html";
    return;
  }

  alert("가입 확인 메일을 보냈어요. 이메일을 확인한 뒤 로그인해주세요.");
  location.href = "./login.html";
});
