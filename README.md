# StoLink

> 콘텐츠 탐색·기록 및 작품 추천 웹앱

영화, 드라마, 웹툰 등 다양한 콘텐츠를 하나의 플랫폼에서 저장하고 서로 연결하여 탐색할 수 있는 웹 서비스입니다.

---

## 📑 중요내용 바로가기

- [🤝 Git 협업 방법](#-git-협업-방법)
- [📝 Commit](#-commit)
- [🔄 Git 작업 기본 순서](#-git-작업-기본-순서)
- [⚠️ Merge Conflict가 발생했을 때](#️-merge-conflict가-발생했을-때)

---

## 🤝 Git 협업 방법

### 1. 프로젝트 다운로드

처음 한 번만 실행합니다.

```bash
git clone https://github.com/깃허브아이디/StoLink.git
cd StoLink
```

### 2. 최신 코드 받기

작업을 시작하기 전에 항상 최신 코드를 받아옵니다.

```bash
git switch main
git pull origin main
```

### 3. 작업 브랜치 생성

`main`에서 직접 작업하지 않고, 기능별 브랜치를 만들어 작업합니다.

```bash
git switch -c feature/작업내용
```

예시:

```bash
git switch -c feature/login
git switch -c feature/tmdb-search
git switch -c feature/webtoon-api
```

현재 브랜치 확인:

```bash
git branch
```

### 4. 작업 후 GitHub에 올리기

```bash
git add .
git commit -m "feat: 로그인 기능 구현"
git push -u origin feature/login
```

처음 Push한 이후에는 `git push`만 사용하면 됩니다.

### 5. Pull Request

Push가 완료되면 GitHub에서

```text
Compare & pull request
        ↓
Pull Request 생성
        ↓
팀원 코드 확인
        ↓
Merge
```

순서로 진행합니다.

> ⚠️ `main`에 바로 Push하거나 Merge하지 않고, 팀원의 확인 후 Merge하는 것을 원칙으로 합니다.

---

## 📝 Commit

Commit 메시지는 **무엇을 변경했는지 알 수 있도록** 작성합니다.

### Commit 형식

```text
feat: 새로운 기능
fix: 버그 수정
style: CSS 및 디자인 수정
refactor: 코드 구조 개선
docs: 문서 수정
chore: 설정 및 기타 작업
```

### 예시

```bash
git commit -m "feat: 영화 검색 기능 구현"
git commit -m "fix: 로그인 오류 수정"
git commit -m "style: 메인 페이지 UI 수정"
```

❌ 의미 없는 Commit

```bash
git commit -m "수정"
git commit -m "진짜 마지막"
```

---

## 🔄 Git 작업 기본 순서

새로운 기능을 개발할 때는 다음 순서를 기본으로 합니다.

```text
① main 최신화
       ↓
② 작업 브랜치 생성
       ↓
③ 코드 작성
       ↓
④ git add
       ↓
⑤ git commit
       ↓
⑥ git push
       ↓
⑦ Pull Request
       ↓
⑧ 팀원 코드 리뷰
       ↓
⑨ main에 Merge
```

### 실제 명령어

```bash
# 1. 최신 코드 받기
git switch main
git pull origin main

# 2. 작업 브랜치 생성
git switch -c feature/작업내용

# 3. 코드 작성

# 4. 변경사항 추가
git add .

# 5. Commit
git commit -m "feat: 작업내용"

# 6. GitHub에 Push
git push -u origin feature/작업내용
```

이후 GitHub에서 **Pull Request → 코드 리뷰 → Merge**를 진행합니다.

### 새로운 작업을 시작할 때

기존 작업이 끝나고 새로운 기능을 시작할 때도 항상 최신 `main`에서 새로운 브랜치를 만듭니다.

```bash
git switch main
git pull origin main
git switch -c feature/새로운작업
```

---

## ⚠️ Merge Conflict가 발생했을 때

같은 파일의 같은 부분을 여러 명이 수정하면 **Merge Conflict**가 발생할 수 있습니다.

예:

```text
<<<<<<< HEAD
내가 작성한 코드
=======
다른 팀원이 작성한 코드
>>>>>>> main
```

### 해결 방법

1. 실제로 사용할 코드를 선택합니다.
2. 아래 충돌 표시를 모두 삭제합니다.

```text
<<<<<<< HEAD
=======
>>>>>>> main
```

3. 파일을 저장한 후 Commit합니다.

```bash
git add .
git commit -m "fix: merge conflict 해결"
git push
```

> ⚠️ 충돌 내용을 이해하기 어렵다면 혼자 해결하지 말고 수정한 팀원과 먼저 확인합니다.

---

## 📌 우리 팀 Git 규칙

1. `main`에서 직접 작업하지 않는다.
2. 기능별로 `feature/작업내용` 브랜치를 만든다.
3. 작업 시작 전 `git pull`을 한다.
4. Commit 메시지를 구체적으로 작성한다.
5. Push 후 Pull Request를 생성한다.
6. 팀원 확인 후 `main`에 Merge한다.
7. API Key와 비밀번호 등 민감한 정보를 GitHub에 올리지 않는다.

---

### 🔥 한 줄 요약

**최신화 → 브랜치 생성 → 작업 → add → commit → push → PR → 리뷰 → Merge**
