# Arc-V 대회 기록

공개 사이트: https://jmmario0415.github.io/arcv-archive/
저장소: https://github.com/jmmario0415/arcv-archive

## 기능

- 제공받은 1~4회 기록, 플랫폼 필터, 우승자/덱/회차 검색
- 새 대회 기록 등록, 기존 대회의 썸네일 및 덱리 등록
- 사진 파일 선택, 미리보기, Supabase Storage 업로드
- JPG, PNG, WebP, GIF: 한 장당 5MB 이하
- 덱리 텍스트와 외부 영상/덱리 링크
- 로그인이나 운영자 승인 없이 등록 후 즉시 공개

이미지를 선택하지 않으면 해당 대회에 저장된 이미지가 유지됩니다.
새 이미지 등록은 기존 사진을 덮어쓰지 않고 새 URL을 생성합니다.
공개 버킷이므로 업로드된 사진은 주소를 아는 누구나 볼 수 있습니다.
방문자에게 기존 파일의 덮어쓰기/삭제 권한은 부여하지 않습니다.
공개 가능한 닉네임과 이미지만 등록해주세요.

## 구성

- index.html, style.css, theme.css: 화면
- app.js: 대회 기록 조회/등록
- uploads.js: 파일 검증, 미리보기, 바이너리 업로드
- config.js: Supabase 프로젝트 URL과 브라우저용 publishable key (비밀 키 사용 금지)
- data.js: DB 조회 실패 시 제공받은 기본 4개 기록
- supabase.sql: 대회/덱리 테이블, 권한, 초기 기록 및 즉시 공개 정책
- storage-uploads.sql: duel-images 공개 버킷과 새 파일 업로드 정책

## 운영

DB는 Supabase tournaments와 tournament_media 테이블을 사용합니다.
각 대회의 가장 최근 공개 tournament_media 등록 내용이 표시됩니다.
approved 필드는 호환성 때문에 유지하되 새 등록의 기본값은 true입니다.
기존에 승인 대기 상태로 제출된 내용은 자동 공개하지 않습니다.
기존 기록 정정이나 삭제는 운영자가 Supabase 대시보드에서 수행합니다.

파일 업로드 후 기록 저장에 실패하면 입력과 파일 선택을 유지합니다.
같은 창에서 재시도하면 업로드가 끝난 파일을 재사용합니다.
창을 닫거나 새로고침하면 업로드 캐시는 사라집니다.
기록에 연결되지 않은 파일은 운영자가 Storage에서 확인해 정리할 수 있습니다.

## 실행 및 배포

로컬 실행: python -m http.server 4173 --bind 127.0.0.1
검사: node verify.cjs
별도 빌드 없이 GitHub Pages의 main / (root)에서 자동 배포합니다.
배포할 때 uploads.js를 포함한 모든 런타임 파일을 함께 올립니다.

## 기본 정보 수정
각 대회의 기본 정보 수정에서 회차·날짜·플랫폼·인원·방식·우승자·덱 이름·메모를 수정합니다. basic-edit.sql의 RPC는 로그인 없이 사용할 수 있습니다. 직접 UPDATE/DELETE 권한을 부여하지 않고 지정한 기본 정보만 수정합니다. 중복 회차와 동시에 변경된 기록은 거절됩니다. 회차를 바꾸면 사진과 덱리의 연결도 같은 트랜잭션에서 이동합니다.
