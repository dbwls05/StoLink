// =========================================================
// kmas.js - 만화규장각 API
//
// 원래 시험 코드(출판사 '지학사'로 1건 검색)를
// '작가 이름으로 검색하는 함수'로 바꾼 것. 주소·검색 조건 방식은 그대로.
//
// 검색 종류 (type)
//   dcmtDtaList        : 웹툰, 만화책, 영화, 드라마 등 검색
//   bookAndWebtoonList : 도서·웹툰 중심 검색  ← 사용
//
// 검색 조건 (searchList)
//   title(작품명), isbn, pictrWritrNm(그림작가), sntncWritrNm(글작가),
//   pltfomCdNm(플랫폼), plscmpnIdNm(출판사)
//
// 응답
//   result   : viewItemCnt, pageNo, resultState('success'), resultMessage, totalCount
//   itemList : prdctNm(작품명), title(도서 서명), subtitl, edtn, pictrWritrNm, sntncWritrNm,
//              orginlTitle, mainGenreCdNm(장르), outline(줄거리), isbn, setIsbn,
//              plscmpnIdNm, pltfomCdNm(플랫폼), ageGradCdNm, fnshYn(완결여부),
//              imageDownloadUrl(표지 이미지 주소)
// =========================================================

// import * as config : config.js 에 KMAS_API_KEY 가 아직 없어도 페이지가 멈추지 않게
// (import { KMAS_API_KEY } 로 쓰면 이름이 없을 때 이 파일을 쓰는 페이지 전체가 멈춤)
import * as config from "../../config.js";

const KMAS_API_KEY = config.KMAS_API_KEY;
const type = ["dcmtDtaList", "bookAndWebtoonList"];

// ---------------------------------------------------------
// 요청 주소 (CORS 해결)
// - 만화규장각 API 는 다른 사이트(예: 127.0.0.1:5501)의 fetch 요청을 CORS 로 막음
//   (주소창에 직접 입력하면 되지만, 페이지 코드에서 부르면 막힘)
// - 그래서 로컬 개발 중에는 Live Server 의 프록시를 거침
//     페이지 → /kmas/openapi/...  (같은 주소라 CORS 없음)
//     Live Server → https://www.kmas.or.kr/openapi/...  (대신 전달)
// - 프록시 설정: 프로젝트 폴더의 .vscode/settings.json
//     "liveServer.settings.proxy": { "enable": true, "baseUri": "/kmas", "proxyUri": "https://www.kmas.or.kr" }
// ---------------------------------------------------------
const IS_LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);
const KMAS_ORIGIN = IS_LOCAL ? `${location.origin}/kmas` : "https://www.kmas.or.kr";
const BASE_URL = `${KMAS_ORIGIN}/openapi/search/${type[1]}`;

// 한 가지 조건으로 검색 → itemList 배열
// 실패하면 에러를 던짐 → 쓰는 쪽(writer.js)에서 '준비 중' + 목업 데이터로 바꿈
async function requestKmas(searchField, keyword) {
  const url = new URL(BASE_URL);

  // 검색 조건 설정
  url.searchParams.set("prvKey", KMAS_API_KEY);
  url.searchParams.set(searchField, keyword); // 검색
  url.searchParams.set("pageNo", "0"); // 몇 페이지
  url.searchParams.set("viewItemCnt", "100"); // 한 번에 몇 개

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("API 요청 실패: " + response.status);
  }

  const data = await response.json();

  // 인증키 미승인 등은 HTTP 는 성공(200)이어도 resultState 가 'success' 가 아님
  if (data.result?.resultState !== "success") {
    throw new Error("만화규장각 응답 오류: " + (data.result?.resultMessage || "알 수 없음"));
  }

  return data.itemList || [];
}

// 작품 제목으로 검색 (표지 이미지를 찾을 때 사용)
// - 작가 검색 결과에 표지가 없을 때, 같은 작품의 다른 권/판본에서 표지를 찾기 위함
// - 실패해도 페이지가 멈추지 않게 빈 배열을 돌려줌
export async function searchByTitle(title) {
  if (!KMAS_API_KEY) return [];
  try {
    return await requestKmas("title", title);
  } catch (error) {
    console.warn("만화규장각 제목 검색 실패:", title, error.message);
    return [];
  }
}

// 작가 이름으로 웹툰 검색
// - 글작가(sntncWritrNm) + 그림작가(pictrWritrNm) 두 번 검색해서 합침
// - 결과는 만화규장각 원본 형식 그대로 (정리는 쓰는 쪽에서)
export async function searchWebtoonsByWriter(writerName) {
  if (!KMAS_API_KEY) {
    throw new Error("만화규장각 인증키가 없습니다 (승인 대기 중)");
  }

  const [bySentence, byPicture] = await Promise.all([
    requestKmas("sntncWritrNm", writerName),
    requestKmas("pictrWritrNm", writerName),
  ]);

  return [...bySentence, ...byPicture];
}