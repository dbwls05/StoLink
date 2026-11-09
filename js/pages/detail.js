import { getMovieDetail, getPersonCredits} from "../api/tmdb.js";

const IMG = "https://image.tmdb.org/t/p"
const id = new URLSearchParams(location.search).get("id")
const movie = await getMovieDetail(id)

if (!movie) {
    document.getElementById("title").textContent = "작품 정보를 불러오지 못했습니다.";
} else {
    // 포스터
    if (movie.poster_path) {
        document.getElementById("poster").innerHTML =
            `<img src="${IMG}/w500${movie.poster_path}" alt="${movie.title}">`;
    }

    // 제목, 연도·러닝타임, 줄거리
    const year = (movie.release_date || "").slice(0, 4);
    document.getElementById("title").textContent = movie.title;
    document.getElementById("sub").textContent = `${year} · ${movie.runtime}분`;
    document.getElementById("overview").textContent = movie.overview || "줄거리 정보가 없습니다.";

    // 장르
    document.getElementById("genres").innerHTML = movie.genres.map((g) => `<li>${g.name}</li>`).join("");

    // 개봉일, 제작사, 감독
    document.getElementById("release").textContent = movie.release_date;
    document.getElementById("company").textContent = movie.production_companies.map((c) => c.name).join(", ");

    const director = movie.credits.crew.find((p) => p.job === "Director");
    document.getElementById("director").textContent = director ? director.name : "-";

    // 출연진 (앞 6명)
    document.getElementById("cast-list").innerHTML = movie.credits.cast.slice(0, 6).map(
        (a) => `
    <li class="cast-card">
      <a href="person-detail.html?id=${a.id}">
        <div class="cast-photo">
          ${a.profile_path ? `<img src="${IMG}/w185${a.profile_path}" alt="${a.name}">` : ""}
        </div>
        <p class="cast-name">${a.name}</p>
        <p class="cast-role">${a.character} 역</p>
      </a>
    </li>`
    ).join("");

  // 제작진 (주요 직책 앞 6명)
  document.getElementById("crew-list").innerHTML = movie.credits.crew
    .filter((a) =>
      ["Director", "Writer", "Screenplay", "Producer"].includes(a.job)
    )
    .slice(0, 6)
    .map(
      (a) => `
    <li class="cast-card">
      <a href="person-detail.html?id=${a.id}">
        <div class="cast-photo">
          ${a.profile_path ? `<img src="${IMG}/w185${a.profile_path}" alt="${a.name}">` : ""}
        </div>
        <p class="cast-name">${a.name}</p>
        <p class="cast-role">${a.job}</p>
      </a>
    </li>`
    )
    .join("");
}