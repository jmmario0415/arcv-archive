# Arc-V 대회 기록

GitHub Pages용 유희왕 동아리 대회 기록실. 별도 빌드나 npm 설치가 필요하지 않습니다.

## 포함된 기능

- 제공받은 1~4회 실제 기록 (연도는 2026년으로 가정)
- 플랫폼 필터, 우승자·덱·회차 검색. 명예의 전당 및 개인별 우승 집계는 제외
- 대회별 덱 썸네일 URL, 대회 상세, 덱 리스트 텍스트, 덱리 이미지 URL, 외부 덱리/영상 링크
- 회원의 Supabase 직접 제출 → 운영자 승인 → 공개
- 작은 화면 대응, 키보드 조작, 외부 입력 HTML 이스케이프

## 실행

이 폴더에서 `python -m http.server 4173 --bind 127.0.0.1` 실행 후 http://127.0.0.1:4173 접속.
DB 연결 전에도 기존 4개 기록을 열람할 수 있습니다. 저장 버튼은 연결 전에는 비활성화됩니다.

## 데이터베이스 연결

1. 본인의 Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase.sql` 전체를 실행합니다. 테이블, 권한, 공개 정책 및 4개 초기 기록을 생성합니다.
3. 프로젝트의 Data API URL과 **publishable key**를 `config.js`의 `supabaseUrl`, `supabaseKey`에 넣습니다. service_role/secret key는 넣지 마세요.
4. 사이트를 새로고침하고 ‘승인된 최신 기록을 불러왔습니다’를 확인합니다.
5. 등록 폼으로 테스트 기록을 제출하고 Supabase Table Editor의 `tournaments`에서 `approved=false`로 저장되었는지 확인합니다.
6. 운영자가 내용을 검토한 뒤 `approved=true`로 바꾸면 새로고침 시 공개됩니다. 동일 회차의 승인 기록은 하나만 허용됩니다. 기존 회차의 덱리 보완은 기존 행을 수정하세요.

회원은 로그인 없이 제출할 수 있습니다. 공개 조회는 승인된 기록만 가능하며, 회원은 공개 API로 승인/수정/삭제할 수 없습니다. 승인 대기 목록과 승인은 Supabase 대시보드에서만 관리합니다. 동아리 회원 여부 확인이나 CAPTCHA/요청 제한은 현재 포함되지 않습니다. 공개 URL로 누구나 제출할 수 있는 구조입니다.

이미지 파일 업로드는 포함하지 않습니다. 회원은 외부에 업로드한 HTTPS 이미지 URL을 붙여넣습니다. 이미지가 삭제되면 표시되지 않으므로 동아리 관리 저장 공간의 주소를 권장합니다. 텍스트 덱리는 데이터베이스에 보존됩니다.

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더의 `index.html`, `style.css`, `theme.css`, `app.js`, `config.js`, `data.js`, `.nojekyll`을 저장소 최상단에 올립니다. README와 SQL은 함께 보관해도 됩니다.
3. 저장소 **Settings → Pages → Build and deployment → Deploy from a branch**를 선택합니다.
4. 소스 브랜치(예: main), 폴더 `/ (root)`를 선택하고 저장합니다.
5. GitHub에서 표시하는 Pages 주소를 엽니다. 저장소 하위 경로에서도 작동하도록 모든 자산 경로를 상대 경로로 만들었습니다.

GitHub 저장소: https://github.com/jmmario0415/arcv-archive

Supabase는 아직 연결되지 않았습니다. DB 연결 전에는 기존 4개 기록의 열람만 가능하며 회원 제출은 비활성화됩니다.

## 수정

- 동아리 이름: `index.html`의 ‘Arc-V’ 수정
- 기본 4개 기록: `data.js` 수정. DB 연결 후에는 DB 초기 기록도 함께 수정
- 연도: `data.js`와 `supabase.sql`의 2026년 확인
- DB 연결 후 최신 기록의 기준은 DB입니다. 연결 오류 시 원본 4건만 표시합니다.
- 외부 폰트를 불러오지 못하면 시스템 sans-serif로 표시합니다.

참고: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
참고: https://supabase.com/docs/guides/database/postgres/row-level-security

## 덱 썸네일

등록 폼의 ‘덱 썸네일 이미지 URL’에 대표 카드/덱 이미지의 HTTPS 주소를 넣습니다.
썸네일은 사람에게 고정되지 않고 각각의 대회 기록에 저장됩니다. 같은 사람이 다음 대회에서 다른 덱을 사용하면 별도 이미지로 기록됩니다.
기존 기록은 `data.js`의 해당 항목에 `thumbnail: 'https://…'`을 추가하거나 DB 행의 thumbnail 필드를 수정합니다.
현재 4개 기록은 이미지를 제공받지 않았으므로 미등록으로 표시합니다. 잘못된 이미지 주소도 기본 표시로 대체됩니다.
DB가 이미 설치되어 있다면 변경된 `supabase.sql`을 다시 실행하세요. 기존 기록을 덮어쓰지 않고 thumbnail 열과 권한을 추가합니다.

## 기존 대회에 썸네일·덱리 등록

각 대회 카드 또는 상세 화면에서 ‘썸네일·덱리 등록’을 누릅니다. 해당 회차의 현재 내용을 불러오며 이미지 주소, 링크, 덱 리스트를 입력해서 등록 요청할 수 있습니다.
요청은 tournament_media 테이블에 승인 대기로 저장됩니다. 운영자는 Supabase Table Editor에서 요청을 검토하고 approved를 true로 바꿉니다. 승인된 가장 최근 요청이 해당 대회에 적용됩니다. 기존 대회 결과는 수정하지 않습니다.
DB 미연결 시 저장 버튼은 비활성화됩니다. 로컬에서만 저장하고 공개 저장으로 표시하는 동작은 없습니다.
