// Netlify 빌드 때 환경변수로 config.js 를 만든다.
// (config.js 는 .gitignore 라서 저장소에 없음)
// 실행: node build-config.js
const fs = require("fs");

const KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TMDB_API_KEY", "KMAS_API_KEY"];
const missing = KEYS.filter((k) => !process.env[k]);

if (missing.length) {
  // 내 컴퓨터에서 실수로 실행해도 기존 config.js 를 덮어쓰지 않음
  if (fs.existsSync("config.js") && !process.env.NETLIFY) {
    console.log("환경변수가 없어 기존 config.js 를 그대로 둡니다.");
    process.exit(0);
  }
  console.error("누락된 환경변수:", missing.join(", "));
  process.exit(1);
}

const out = KEYS.map(
  (k) => `export const ${k} = ${JSON.stringify(process.env[k])};`,
).join("\n");
fs.writeFileSync("config.js", out + "\n");
console.log("config.js 생성 완료");
