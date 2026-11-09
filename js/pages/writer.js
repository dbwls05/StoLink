// =========================================================
// writer.js - 작가 상세 페이지
//
// [프로필]
// 1. 주소의 ?writer=윤태호 에서 작가 이름을 읽음
// 2. TMDB 인물 검색(searchPerson) → 후보 중 '진짜 그 작가'를 찾음
//    - TMDB 검색 결과의 name 은 "Yoon Tae-ho" 처럼 영문인 경우가 많아서
//      상세 정보의 also_known_as(다른 이름 목록)에 "윤태호"가 있는지까지 확인
// 3. 찾은 작가의 사진(profile_path), 소개글(biography), 생일, 출생지를 화면에 넣음
//    - 한국어 소개가 없으면 영어 소개 → 그것도 없으면 안내 문구
//    - 사진이 없거나 TMDB 에 작가가 없으면 기본 이미지(회색 사각형 + 사람 모양)
//
// [대표 작품] (7번 이후)
// 1. 만화규장각에서 작가의 웹툰 목록 (실패하면 '준비 중' 배너 + 목업)
// 2. 웹툰마다 TMDB 에서 실사화(영화/드라마)를 찾음 (adaptation.js)
// 3. 실사화된 것만 카드로: [웹툰 표지 + 이름] → [포스터 + 이름]
//    - 웹툰 클릭 → detail.html?type=webtoon&title=작품명&writer=작가명
//    - 영화 클릭 → detail.html?type=movie&id=TMDB번호
//    - 드라마 클릭 → detail.html?type=tv&id=TMDB번호
//
// [전체 작품 목록] (6번)
// - 대표 작품과 같은 데이터로 표를 그림: 작품 / 연재 플랫폼 / 장르 / (연재 시작) / 실사화 정보
// - 작품 이름(썸네일 포함) 클릭 → 웹툰 detail, 실사화 배지 클릭 → 영화·드라마 detail
// - 필터: 전체 / 실사화된 작품
// =========================================================

import { searchPerson, getPersonDetail } from "../api/tmdb.js";
// kmas.js 는 통째로(* as kmas) 불러옴
// → kmas.js 가 예전 버전이라 함수 하나가 없어도 writer.js 전체가 멈추지 않음
import * as kmas from "../api/kmas.js";
import { findAdaptations } from "../api/adaptation.js";

// ---------------------------------------------------------
// 테스트용 데이터 파일 (없어도 페이지가 멈추지 않게 '있으면 쓰는' 방식으로 불러옴)
// - 맨 위 import 로 불러오면 파일이 하나만 없어도(404) writer.js 전체가 실행되지 않음
// - import() + catch : 파일이 없으면 빈 값으로 대신함
// ---------------------------------------------------------
const { SAMPLE_WRITERS = {} } = await import("../data/sampleWriters.js").catch(() => {
  console.warn("sampleWriters.js 없음 → 샘플 프로필 사용 안 함");
  return {};
});
const { searchMockByWriter = () => [] } = await import("../data/mockWebtoons.js").catch(() => {
  console.warn("mockWebtoons.js 없음 → 목업 데이터 사용 안 함");
  return {};
});

const IMG = "https://image.tmdb.org/t/p";

// TMDB 활동 분야(영어) → 배지 글자
const DEPARTMENT_KO = {
  Writing: "작가",
  Directing: "감독",
  Acting: "배우",
  Production: "제작자",
};

// 화면 요소
const el = {
  profile: document.getElementById("writer-profile"),
  photo: document.getElementById("writer-photo"),
  badge: document.getElementById("writer-badge"),
  name: document.getElementById("writer-name"),
  meta: document.getElementById("writer-meta"),
  bio: document.getElementById("writer-bio"),
  moreBtn: document.getElementById("more-btn"),
  source: document.getElementById("writer-source"),
  backLink: document.getElementById("back-link"),
  banner: document.getElementById("notice-banner"),
  repList: document.getElementById("rep-list"),
  worksHead: document.getElementById("works-head"),
  worksBody: document.getElementById("works-body"),
  filterButtons: document.querySelectorAll(".filter-btn"),
};

/* ---------------------------------------------------------
   1. 사진
--------------------------------------------------------- */

// 기본 이미지: 회색 사각형 안에 사람 모양(머리 원 + 어깨)
function showDefaultPhoto() {
  el.photo.classList.add("is-default");
  el.photo.innerHTML = `
    <svg viewBox="0 0 100 100" aria-label="기본 프로필 이미지" role="img">
      <circle cx="50" cy="38" r="15" />
      <path d="M22 78c0-15 12.5-24 28-24s28 9 28 24z" />
    </svg>`;
}

// 사진 넣기 (사진 주소가 깨지면 기본 이미지로)
function showPhoto(profilePath, name) {
  const img = document.createElement("img");
  img.src = `${IMG}/w300${profilePath}`;
  img.alt = `${name} 사진`;
  img.onerror = showDefaultPhoto;

  el.photo.classList.remove("is-default");
  el.photo.innerHTML = "";
  el.photo.append(img);
}

/* ---------------------------------------------------------
   2. TMDB 에서 '그 작가' 찾기
   - 검색 결과 후보를 순서대로 상세 조회해서
     이름이 같거나 also_known_as 에 한글 이름이 있으면 그 사람으로 확정
   - 같은 이름의 배우가 먼저 잡히지 않도록 Writing(작가) 분야를 먼저 확인
   - 상세 조회는 최대 5명까지만 (요청이 너무 많아지지 않게)
--------------------------------------------------------- */
async function findWriter(writerName) {
  const results = (await searchPerson(writerName)) || [];

  // Writing 분야를 앞으로 정렬 (나머지 순서는 TMDB 검색 순서 유지)
  const candidates = [...results]
    .sort((a, b) =>
      (b.known_for_department === "Writing") - (a.known_for_department === "Writing"))
    .slice(0, 5);

  for (const person of candidates) {
    const detail = await getPersonDetail(person.id, "ko-KR");
    if (!detail) continue;

    const names = [detail.name, ...(detail.also_known_as || [])];
    if (names.includes(writerName)) {
      return detail; // 찾음
    }
  }
  return null; // TMDB 에 이 작가가 없음
}

// 소개글: 한국어 → 없으면 영어
async function getBiography(person) {
  if (person.biography) return { text: person.biography, lang: "ko" };

  const english = await getPersonDetail(person.id, "en-US");
  if (english?.biography) return { text: english.biography, lang: "en" };

  return null;
}

/* ---------------------------------------------------------
   3. 화면 채우기
--------------------------------------------------------- */

// 생일 "1969-09-27" → "1969년 9월 27일" / "1983" 처럼 연도만 있으면 "1983년"
function formatDate(date) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  if (!m) return `${y}년`;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

// 생일·출생지 (있는 것만)
function renderMeta(person) {
  const rows = [
    ["출생", formatDate(person.birthday)],
    ["출생지", person.place_of_birth],
  ].filter(([, value]) => value);

  el.meta.innerHTML = rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

// 소개글 + 더보기 버튼
function renderBio(bio) {
  if (!bio) {
    el.bio.textContent = "아직 등록된 작가 소개가 없어요.";
    el.bio.classList.add("is-empty");
    return;
  }

  el.bio.textContent = bio.text;

  // 영어 소개일 때 앞에 작은 표시
  if (bio.lang === "en") {
    el.bio.insertAdjacentHTML("afterbegin", `<span class="bio-lang">영문 소개</span>`);
  }

  // 4줄을 넘는 경우에만 '더보기' 버튼 보이기
  // (scrollHeight = 전체 글 높이, clientHeight = 지금 보이는 높이)
  requestAnimationFrame(() => {
    el.moreBtn.hidden = el.bio.scrollHeight <= el.bio.clientHeight + 1;
  });
}

// '더보기' ↔ '접기' (search.js 의 더보기 방식과 동일)
el.moreBtn.addEventListener("click", () => {
  const open = el.bio.classList.toggle("expanded");
  el.moreBtn.textContent = open ? "접기" : "더보기";
});

// '이전 페이지로' → 뒤로 가기 (방문 기록이 없으면 원래 링크인 search.html 로)
el.backLink.addEventListener("click", (e) => {
  if (history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

/* ---------------------------------------------------------
   4. 프로필 불러오기
--------------------------------------------------------- */
async function loadProfile(writerName) {
  let person = await findWriter(writerName);
  let isSample = false;

  // TMDB 에 없으면 샘플 데이터에 있는지 확인 (예: 조석)
  if (!person && SAMPLE_WRITERS[writerName]) {
    person = SAMPLE_WRITERS[writerName];
    isSample = true;
  }

  if (!person) {
    // TMDB 에 없는 작가 → 기본 이미지 + 안내
    el.badge.textContent = "웹툰 작가";
    showDefaultPhoto();
    renderBio(null);
  } else {
    el.badge.textContent =
      person.known_for_department === "Writing"
        ? "웹툰 작가"
        : DEPARTMENT_KO[person.known_for_department] || "작가";

    if (person.profile_path) {
      showPhoto(person.profile_path, writerName);
    } else {
      showDefaultPhoto();
    }

    renderMeta(person);

    if (isSample) {
      // 샘플은 TMDB 요청 없이 바로 표시
      renderBio(person.biography ? { text: person.biography, lang: "ko" } : null);
      el.source.textContent = "샘플 데이터로 표시 중이에요.";
    } else {
      renderBio(await getBiography(person));
      el.source.innerHTML =
        `정보 출처: <a href="https://www.themoviedb.org/person/${person.id}" target="_blank" rel="noopener">TMDB</a>`;
    }
  }

  el.profile.classList.remove("is-loading");
}

/* =========================================================
   5. 대표 작품
========================================================= */

// API 글자를 HTML 에 넣기 전에 특수문자 바꾸기 (제목에 < > 가 있어도 화면이 안 깨지게)
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

// 실제 만화규장각 데이터를 쓰는 중인지 (목업이면 false → 표지 추가 검색을 하지 않음)
let usingRealKmas = true;

// 만화규장각에서 작가의 웹툰 목록 가져오기 (실패하면 '준비 중' 배너 + 목업)
async function loadWebtoonItems(writerName) {
  try {
    return await kmas.searchWebtoonsByWriter(writerName);
  } catch (error) {
    console.warn("만화규장각 API 사용 불가 → 목업 데이터 사용:", error.message);
    el.banner.hidden = false;
    usingRealKmas = false;
    return searchMockByWriter(writerName);
  }
}

// 만화규장각 이미지 주소 정리
// - 만화규장각은 '요청이 들어온 주소'를 기준으로 이미지 주소를 만들어 줌
//   → Live Server 프록시를 거치면 "https://127.0.0.1:5501/common/file/..." 처럼 내 컴퓨터 주소가 됨
//   → 주소의 뒷부분(/common/file/...?fileImageId=...)만 남기고 앞을 만화규장각 주소로 바꿈
// - "/common/file/..." 처럼 앞부분 없이 와도 같은 방식으로 처리됨
function kmasImageUrl(url) {
  if (!url) return "";
  try {
    const { pathname, search } = new URL(url, "https://www.kmas.or.kr");
    return `https://www.kmas.or.kr${pathname}${search}`;
  } catch {
    return "";
  }
}

// 제목 비교용: 띄어쓰기와 기호를 지움 ("마음의 소리 : 1권" → "마음의소리1권")
function compact(text) {
  return (text || "").replace(/[\s:·\-_,.!?'"「」『』()[\]<>]/g, "");
}

// 만화규장각 결과가 '같은 작품의 한 권'인지 확인
// - 웹툰·만화는 "마음의 소리 1", "마음의 소리 10권" 처럼 권 번호가 붙어서 나옴
// - 작품 제목과 완전히 같거나, 제목 바로 뒤에 숫자가 오면 같은 작품으로 봄
//   ✔ "마음의 소리", "마음의 소리 1", "마음의 소리10권", "마음의 소리 3: 부제"
//   ✘ "마음의 소리물" (제목 뒤에 숫자가 아닌 글자) / "미생" ≠ "미생물"
function isVolumeOf(item, workTitle) {
  const key = compact(workTitle);

  return [item.prdctNm, item.title].some((name) => {
    const text = compact(name);
    if (!text.startsWith(key)) return false;
    const rest = text.slice(key.length); // 제목 뒤에 남은 부분
    return rest === "" || /^\d/.test(rest);
  });
}

// 작품 하나의 표지 찾기
// - "제목" → (없으면) "제목 1" 순서로 검색
// - 같은 작가의 같은 작품(한 권)이고 표지가 있는 결과를 찾으면 그 자리에서 바로 return
async function findCover(workTitle, writerName) {
  const queries = [workTitle, `${workTitle} 1`];

  for (const query of queries) {
    // kmas.js 에 searchByTitle 이 없으면(예전 버전) 표지 추가 검색을 건너뜀
    if (!kmas.searchByTitle) {
      console.warn("kmas.js 에 searchByTitle 함수가 없어요. kmas.js 를 최신 파일로 바꿔 주세요.");
      return "";
    }
    const items = await kmas.searchByTitle(query);

    const found = items.find(
      (item) => item.imageDownloadUrl && isVolumeOf(item, workTitle) && hasWriter(item, writerName)
    );
    if (found) return kmasImageUrl(found.imageDownloadUrl); // 찾았으면 바로 끝
  }
  return ""; // 끝까지 못 찾음
}

// 표지가 없는 작품들의 표지 채우기
// - 요청이 몰리지 않게 5개씩 나눠서
async function fillMissingCovers(webtoons, writerName) {
  if (!usingRealKmas) return; // 목업 데이터일 때는 검색하지 않음

  const missing = webtoons.filter((w) => !w.image);
  for (let i = 0; i < missing.length; i += 5) {
    const group = missing.slice(i, i + 5);
    const covers = await Promise.all(group.map((w) => findCover(w.title, writerName)));
    group.forEach((webtoon, index) => (webtoon.image = covers[index]));
  }

  const stillMissing = webtoons.filter((w) => !w.image).map((w) => w.title);
  if (stillMissing.length) console.log("만화규장각에 표지가 없는 작품:", stillMissing);
}

// 작가 칸에 이 작가 이름이 '정확히' 들어 있는지 확인
// - 만화규장각 검색은 일부만 맞아도 나와서 "조석"으로 검색하면 "조석진" 작품이 섞일 수 있음
// - 작가 칸은 "김현주 원작", "조석, 홍길동" 처럼 다른 글자가 붙어 있어서
//   띄어쓰기·쉼표 등으로 나눈 뒤 이름과 똑같은 조각이 있는지 확인
function hasWriter(item, writerName) {
  const writers = `${item.sntncWritrNm || ""} ${item.pictrWritrNm || ""}`;
  return writers.split(/[\s,·/()]+/).includes(writerName);
}

// ---------------------------------------------------------
// 연재 시작 연도
// - 만화규장각 응답 항목(prdctNm, title, mainGenreCdNm, pltfomCdNm, fnshYn ...)에는
//   연재 시작일이 없어서 지금은 표에 '연재 시작' 칸을 만들지 않음
// - 나중에 실제 응답에서 날짜 항목을 찾으면 아래에 그 이름만 적으면 됨
//   예) const START_DATE_FIELD = "srlzBeginDe";  → 앞 4글자(연도)가 '연재 시작' 칸에 표시됨
// ---------------------------------------------------------
const START_DATE_FIELD = null;

function startYear(item) {
  if (!START_DATE_FIELD || !item[START_DATE_FIELD]) return "";
  return String(item[START_DATE_FIELD]).slice(0, 4);
}

// ---------------------------------------------------------
// 목록에서 뺄 작품 (true = 빼기 / false = 포함)
// - 브랜드 웹툰: 기업 홍보용 웹툰 (줄거리에 "브랜드 웹툰", "본 콘텐츠는 …" 이 적혀 있음)
//     예) 너 사용법, 이름을 불러주세요, 풋볼 데이브레이커, 청년창업 기프트카툰
// - 공동 작업: 작가 칸에 다른 사람 이름이 같이 있는 작품
//     예) 20주년 명작 극장(조석, 범배), 취업의소리(조석, 워니)
// ---------------------------------------------------------
const EXCLUDE_BRAND_WEBTOONS = true;
const EXCLUDE_COLLABORATIONS = true;

// 작가 칸에서 이름이 아닌 말(역할 표시)
const ROLE_WORDS = ["원작", "저", "글", "그림", "외", "작", "지음"];

function isBrandWebtoon(item) {
  return /브랜드\s*웹툰|본\s*(콘텐츠|컨텐츠)는/.test(item.outline || "");
}

// 작가 칸에 이 작가 말고 다른 사람이 있는지
// "조석, 범배" → 공동 작업 / "조석 원작", "조석 저" → 혼자 (역할 표시는 무시)
function isCollaboration(item, writerName) {
  const names = `${item.sntncWritrNm || ""} ${item.pictrWritrNm || ""}`
    .split(/[\s,·/()]+/)
    .filter((name) => name && !ROLE_WORDS.includes(name));
  return names.some((name) => name !== writerName);
}

// 같은 작품이 1권, 2권… 으로 여러 개 나오므로 작품명 기준으로 하나만 남김
// (표지·플랫폼·장르가 비어 있는 권이 먼저 오면 뒤에 오는 권의 값으로 채움)
function toWebtoons(items, writerName) {
  const map = new Map();
  const excluded = new Set(); // 확인용: 뺀 작품 이름

  items.forEach((item) => {
    if (!hasWriter(item, writerName)) return; // 다른 작가 작품 제외

    const name = item.prdctNm || item.title;
    if (EXCLUDE_BRAND_WEBTOONS && isBrandWebtoon(item)) return void excluded.add(`${name} (브랜드)`);
    if (EXCLUDE_COLLABORATIONS && isCollaboration(item, writerName)) return void excluded.add(`${name} (공동)`);

    const title = item.prdctNm || item.title; // 작품명 우선, 없으면 도서 제목
    if (!title) return;

    const key = title.replace(/\s/g, "");
    const saved = map.get(key);

    if (!saved) {
      map.set(key, {
        title,
        image: kmasImageUrl(item.imageDownloadUrl), // 표지 (만화규장각)
        platform: item.pltfomCdNm || "",   // 연재 플랫폼
        genre: item.mainGenreCdNm || "",   // 장르
        year: startYear(item),             // 연재 시작 연도 (지금은 항상 "")
      });
    } else if (item.pltfomCdNm && !saved.platform) {
      // 연재 플랫폼이 있는 항목 = '웹툰' 기록 (책 단행본에는 플랫폼이 null)
      // → 웹툰 기록의 표지·장르를 우선 사용 (예: 문유 단행본 장르 "SF" 대신 웹툰 장르 "개그")
      saved.platform = item.pltfomCdNm;
      saved.image = kmasImageUrl(item.imageDownloadUrl) || saved.image;
      saved.genre = item.mainGenreCdNm || saved.genre;
      saved.year ||= startYear(item);
    } else {
      // 그 밖의 권: 비어 있는 칸만 채움
      saved.image ||= kmasImageUrl(item.imageDownloadUrl);
      saved.genre ||= item.mainGenreCdNm || "";
      saved.year ||= startYear(item);
    }
  });

  // 확인용: 목록에서 빠진 작품 (다른 권은 남아 있는 작품은 제외하고 표시)
  const kept = new Set([...map.values()].map((w) => w.title));
  const removed = [...excluded].filter((label) => !kept.has(label.replace(/ \((브랜드|공동)\)$/, "")));
  if (removed.length) console.log("목록에서 뺀 작품:", removed);

  return [...map.values()];
}

// 웹툰마다 실사화 찾기 (TMDB 요청이 몰리지 않게 5개씩 나눠서)
async function attachAdaptations(webtoons) {
  for (let i = 0; i < webtoons.length; i += 5) {
    const group = webtoons.slice(i, i + 5);
    const results = await Promise.all(group.map((w) => findAdaptations(w.title)));
    group.forEach((w, index) => (w.adaptations = results[index]));
  }
}

// 각 작품의 detail.html 주소
function webtoonDetailUrl(webtoon, writerName) {
  const params = new URLSearchParams({ type: "webtoon", title: webtoon.title, writer: writerName });
  return `detail.html?${params}`;
}

function screenDetailUrl(adaptation) {
  return `detail.html?type=${adaptation.media}&id=${adaptation.id}`;
}

// 표지 하나 (이미지 + 종류 라벨 + 아래 이름)
// - 이미지가 없거나 깨지면 작품 이름이 적힌 빈 표지가 보임
function coverLink({ href, image, title, label }) {
  return `
    <a href="${href}" class="rep-item">
      <div class="rep-cover">
        <span class="rep-cover-empty">${esc(title)}</span>
        ${image ? `<img src="${esc(image)}" alt="${esc(title)}" loading="lazy" onerror="this.remove()">` : ""}
        <span class="rep-label">${label}</span>
      </div>
      <p class="rep-title">${esc(title)}</p>
    </a>`;
}

// 대표 작품 카드 그리기
// - 실사화가 2개(영화 + 드라마)인 웹툰은 카드도 2개로 따로
function renderRepresentative(webtoons, writerName) {
  const pairs = webtoons.flatMap((webtoon) =>
    webtoon.adaptations.map((adaptation) => ({ webtoon, adaptation }))
  );

  if (pairs.length === 0) {
    el.repList.innerHTML = `<li class="rep-empty">아직 영화·드라마로 만들어진 작품이 없어요.</li>`;
    return;
  }

  el.repList.innerHTML = pairs
    .map(({ webtoon, adaptation }) => `
      <li class="rep-card">
        ${coverLink({
          href: webtoonDetailUrl(webtoon, writerName),
          image: webtoon.image,
          title: webtoon.title,
          label: "웹툰",
        })}
        <span class="rep-arrow" aria-hidden="true">→</span>
        ${coverLink({
          href: screenDetailUrl(adaptation),
          image: adaptation.poster,
          title: adaptation.title,
          label: adaptation.media === "movie" ? "영화" : "드라마",
        })}
      </li>`)
    .join("");
}

/* =========================================================
   6. 전체 작품 목록 (표)
========================================================= */

// 표 머리글 + 내용 그리기
function renderWorksTable(webtoons, writerName) {
  // 연재 시작 연도가 하나라도 있을 때만 '연재 시작' 칸을 만듦
  const showYear = webtoons.some((w) => w.year);

  const columns = ["작품", "연재 플랫폼", "장르", ...(showYear ? ["연재 시작"] : []), "실사화 정보"];
  el.worksHead.innerHTML = `<tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr>`;

  el.worksBody.innerHTML = webtoons
    .map((webtoon) => {
      const adapted = webtoon.adaptations.length > 0;

      // 실사화 정보: 있으면 영화/드라마 배지(누르면 그 작품 detail), 없으면 회색 글자
      const adaptationCell = adapted
        ? webtoon.adaptations
            .map((a) => `
              <a href="${screenDetailUrl(a)}" class="adapt-chip is-${a.media}">
                <span class="adapt-type">${a.media === "movie" ? "영화" : "드라마"}</span>
                ${esc(a.title)}
              </a>`)
            .join("")
        : `<span class="no-adapt">실사화 없음</span>`;

      return `
        <tr data-adapted="${adapted}">
          <td>
            <a href="${webtoonDetailUrl(webtoon, writerName)}" class="work-title">
              <span class="work-thumb">
                ${webtoon.image ? `<img src="${esc(webtoon.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
              </span>
              <span>${esc(webtoon.title)}</span>
            </a>
          </td>
          <td>${esc(webtoon.platform) || "-"}</td>
          <td>${esc(webtoon.genre) || "-"}</td>
          ${showYear ? `<td>${webtoon.year || "-"}</td>` : ""}
          <td><div class="adapt-list">${adaptationCell}</div></td>
        </tr>`;
    })
    .join("");

  // 필터를 바꾼 뒤 다시 그려도 현재 선택된 필터가 유지되게
  applyFilter();
}

// 안내 문구 한 줄 (불러오는 중 / 결과 없음 / 오류)
function renderWorksMessage(message) {
  el.worksHead.innerHTML = "";
  el.worksBody.innerHTML = `<tr><td class="works-message" colspan="10">${message}</td></tr>`;
}

// 필터: '실사화된 작품'이 선택되면 data-adapted="false" 인 줄을 숨김
function applyFilter() {
  const active = document.querySelector(".filter-btn.is-active");
  const onlyAdapted = active?.dataset.filter === "adapted";

  let visible = 0;
  el.worksBody.querySelectorAll("tr[data-adapted]").forEach((row) => {
    row.hidden = onlyAdapted && row.dataset.adapted !== "true";
    if (!row.hidden) visible++;
  });

  // 실사화된 작품이 하나도 없으면 안내 줄 표시
  el.worksBody.querySelector(".filter-empty")?.remove();
  if (onlyAdapted && visible === 0 && el.worksBody.querySelector("tr[data-adapted]")) {
    el.worksBody.insertAdjacentHTML(
      "beforeend",
      `<tr class="filter-empty"><td class="works-message" colspan="10">실사화된 작품이 없어요.</td></tr>`
    );
  }
}

// 필터 버튼 클릭
el.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    el.filterButtons.forEach((b) => b.classList.remove("is-active"));
    button.classList.add("is-active");
    applyFilter();
  });
});

/* =========================================================
   7. 작품 불러오기 (대표 작품 + 전체 작품 목록 공통)
   - 만화규장각 · TMDB 요청은 한 번만 하고, 결과로 두 섹션을 함께 그림
========================================================= */
async function loadWorks(writerName) {
  const items = await loadWebtoonItems(writerName);
  const webtoons = toWebtoons(items, writerName);
  console.log(`만화규장각 결과 ${items.length}건 → 작품 ${webtoons.length}개`, webtoons); // 확인용
  if (items[0]) console.log("만화규장각 응답 항목 예시 (연재 시작일 항목이 있는지 확인용):", items[0]);

  if (webtoons.length === 0) {
    el.repList.innerHTML = `<li class="rep-empty">'${esc(writerName)}' 작가의 웹툰을 찾지 못했어요.</li>`;
    renderWorksMessage(`'${esc(writerName)}' 작가의 작품을 찾지 못했어요.`);
    return;
  }

  // 실사화 찾기(TMDB)와 빠진 표지 찾기(만화규장각)를 동시에
  await Promise.all([attachAdaptations(webtoons), fillMissingCovers(webtoons, writerName)]);
  renderRepresentative(webtoons, writerName);
  renderWorksTable(webtoons, writerName);
}

/* =========================================================
   8. 시작
========================================================= */
async function init() {
  const writerName = (new URLSearchParams(location.search).get("writer") || "").trim();

  // 주소에 작가 이름이 없을 때
  if (!writerName) {
    el.name.textContent = "작가 정보 없음";
    el.badge.textContent = "안내";
    showDefaultPhoto();
    renderBio({ text: "작품 상세페이지에서 작가 이름을 눌러 들어와 주세요.", lang: "ko" });
    el.profile.classList.remove("is-loading");
    el.repList.innerHTML = `<li class="rep-empty">작가 정보가 없어 작품을 보여줄 수 없어요.</li>`;
    renderWorksMessage("작가 정보가 없어 작품을 보여줄 수 없어요.");
    return;
  }

  // 이름은 TMDB 영문 이름 대신 주소의 한글 이름을 그대로 사용
  el.name.textContent = writerName;
  document.title = `StoLink - ${writerName}`;

  // 프로필과 작품(대표 작품 + 전체 목록)을 동시에 불러옴 (한쪽이 실패해도 다른 쪽은 표시)
  await Promise.allSettled([
    loadProfile(writerName),
    loadWorks(writerName).catch((error) => {
      console.error("작품 불러오기 오류:", error);
      el.repList.innerHTML = `<li class="rep-empty">대표 작품을 불러오지 못했어요.</li>`;
      renderWorksMessage("작품 목록을 불러오지 못했어요.");
    }),
  ]);
}

init();