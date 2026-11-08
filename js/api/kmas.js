import { KMAS_API_KEY } from "../../config.js";
const type = ["dcmtDtaList", "bookAndWebtoonList"]; // 검색 뭘로 할지
// dcmtDtaList : 웹툰, 만화책, 영화, 드라마 등 검색
// bookAndWebtoonList : 도서·웹툰 중심 검색

const searchList = [
  "title",
  "isbn",
  "pictrWritrNm",
  "sntncWritrNm",
  "pltfomCdNm",
  "plscmpnIdNm",
];
// 0. title : 작품명, 도서 제목
// 1. isbn : 국제 표준 도서 번호
// 2. pictrWritrNm : 그림작가 이름
// 3. sntncWritrNm : 글 작가 이름
// 4. pltfomCdNm : 플랫폼명
// 5. plscmpnIdNm : 출판사명
const url = new URL("https://www.kmas.or.kr/openapi/search/" + type[1]);

// 검색 조건 설정
url.searchParams.set("prvKey", KMAS_API_KEY);
url.searchParams.set(searchList[5], "지학사"); // 검색
url.searchParams.set("pageNo", "0"); // 몇 페이지
url.searchParams.set("viewItemCnt", "1"); // 몇 페이지에서 몇 개의 데이터를 가져올건지

let API = {};
// API 요청
const apiGet = (url) => {
  fetch(url)
    .then((response) => {
        if (!response.ok) {
        throw new Error("API 요청 실패: " + response.status);
        }

        return response.json();
    })
    .then((data) => {
        API = data;
        console.log(API);   // 나중에 정보 넣을때 써야함.
        // result — 검색 결과 정보
        // 0. viewItemCnt : 한 번에 가져온 데이터 개수
        // 1. pageNo : 현재 페이지 번호
        // 2. resultState : 요청 처리 상태
        // 3. resultMessage : 처리 결과 메시지
        // 4. totalCount : 검색된 전체 데이터 개수
        //------------------------------------------
        // itemList — 실제 작품 정보
        // 0. prdctNm : 작품명
        // 1. title : 도서의 서명
        // 2. subtitl : 부제목
        // 3. edtn : 판본 및 에디션 정보
        // 4. pictrWritrNm	: 그림작가
        // 5. sntncWritrNm	: 글작가
        // 6. orginlTitle : 원작 제목
        // 7. mainGenreCdNm : 대표 장르명
        // 8. outline : 작품 줄거리
        // 9. isbn	: ISBN(국제 표준 도서 번호)
        // 10. setIsbn	: 세트 ISBN
        // 11. plscmpnIdNm	: 출판사명
        // 12. pltfomCdNm	: 연재 플랫폼명
        // 13. ageGradCdNm	: 이용 연령 등급
        // 14. imageDownloadUrl	: 작품 이미지 다운로드 주소
    })
    .catch((error) => {
        console.error("오류 발생:", error);
    });
};
apiGet(url);
