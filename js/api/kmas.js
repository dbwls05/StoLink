//만화규장각 api
const API_KEY = "5cfaf8ffd79694b8e2f8ba176d8912bc";
const type = ["dcmtDtaList","bookAndWebtoonList"];
// dcmtDtaList : 웹툰, 만화책, 영화, 드라마 등 검색
// bookAndWebtoonList : 도서·웹툰 중심 검색


const searchList = ["title","isbn","pictrWritrNm","sntncWritrNm","pltfomCdNm","plscmpnIdNm"];
// 0. title : 작품명, 도서 제목
// 1. isbn : 국제 표준 도서 번호
// 2. pictrWritrNm : 그림작가 이름
// 3. sntncWritrNm : 글 작가 이름
// 4. pltfomCdNm : 플랫폼명
// 5. plscmpnIdNm : 출판사명
const url = new URL("https://www.kmas.or.kr/openapi/search/"+type[1]);

// 검색 조건 설정
url.searchParams.set("prvKey", API_KEY);
url.searchParams.set(searchList[5], "지학사");  // 검색
url.searchParams.set("pageNo", "0");        // 몇 페이지
url.searchParams.set("viewItemCnt", "1");   // 몇 페이지에서 몇 개의 데이터를 가져올건지

let API = {};
// let API = new Map();
// API 요청
const apiGet = (url) =>{
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("API 요청 실패: " + response.status);
            }

            return response.json();
        })
        .then(data => {
            // for(let [x,y] of Object.entries(data)){
            //     API.set(x,y);
            // }
            // console.log(API);
            API = data;
            console.log(API);
        })
        .catch(error => {
            console.error("오류 발생:", error);
        });
}
apiGet(url);