// =========================================================
// mockWebtoons.js - 만화규장각 목업(가짜) 데이터
//
// - 인증키 승인 전 / API 오류일 때 화면을 보여주기 위한 예시
// - 실제 응답의 itemList 와 같은 모양이라, 진짜 데이터로 바뀌어도 writer.js 는 그대로
// - imageDownloadUrl 이 null 이면 표지 자리에 작품 이름이 적힌 빈 표지가 보임
// - fnshYn : "Y" 완결 / "N" 연재 중
// =========================================================

export const MOCK_ITEMS = [
  // ── 윤태호
  { prdctNm: "미생", title: "미생", mainGenreCdNm: "드라마", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "윤태호", pictrWritrNm: "윤태호", pltfomCdNm: "다음웹툰" },
  { prdctNm: "이끼", title: "이끼", mainGenreCdNm: "스릴러", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "윤태호", pictrWritrNm: "윤태호", pltfomCdNm: "다음웹툰" },
  { prdctNm: "내부자들", title: "내부자들", mainGenreCdNm: "범죄", fnshYn: "N", imageDownloadUrl: null, sntncWritrNm: "윤태호", pictrWritrNm: "윤태호", pltfomCdNm: "다음웹툰" },
  { prdctNm: "파인", title: "파인", mainGenreCdNm: "범죄", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "윤태호", pictrWritrNm: "윤태호", pltfomCdNm: "다음웹툰" },
  { prdctNm: "오리진", title: "오리진", mainGenreCdNm: "SF", fnshYn: "N", imageDownloadUrl: null, sntncWritrNm: "윤태호", pictrWritrNm: "윤태호", pltfomCdNm: "카카오페이지" },

  // ── 조석
  { prdctNm: "마음의 소리", title: "마음의 소리", mainGenreCdNm: "개그", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "조석", pictrWritrNm: "조석", pltfomCdNm: "네이버웹툰" },
  { prdctNm: "문유", title: "문유", mainGenreCdNm: "SF", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "조석", pictrWritrNm: "조석", pltfomCdNm: "네이버웹툰" },
  { prdctNm: "조의 영역", title: "조의 영역", mainGenreCdNm: "개그", fnshYn: "Y", imageDownloadUrl: null, sntncWritrNm: "조석", pictrWritrNm: "조석", pltfomCdNm: "네이버웹툰" },
];

// 작가 이름으로 목업 검색 (실제 API 처럼 글작가 / 그림작가 둘 다 확인)
export function searchMockByWriter(writerName) {
  return MOCK_ITEMS.filter(
    (item) =>
      (item.sntncWritrNm || "").includes(writerName) ||
      (item.pictrWritrNm || "").includes(writerName)
  );
}