// js/supabase/auth.js
import { supabase } from "./supabase.js";

// 회원가입
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

// 로그인
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 현재 로그인된 유저 확인
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// 구글 로그인
async function googleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html",
    },
  });

  if (error) {
    console.error("구글 로그인 실패:", error.message);
    alert("로그인에 실패하였습니다. 다시 시도해주세요.");
  }
}
window.googleLogin = googleLogin;
