/*
  듀얼리스트 사진 설정
  - name: 참가자 이름 그대로 (띄어쓰기·대소문자 무시). 이 이름이 나오면 이 사진이 떠요.
  - name 없이 img만 있으면 "랜덤용" 사진이에요.
  - 등록 안 된 이름은 여기 있는 사진 중 남는 걸로 랜덤 배정돼요 (같은 대회에선 계속 같은 사진).
  - 사진 파일은 img 폴더에 넣어요. 정사각형에 가까울수록 예뻐요.
*/
window.AVATARS = [
  { name: "영진", img: "img/yeongjin.jpg" },
  { name: "성훈", img: "img/seonghun.jpg" },
  { name: "준민", img: "img/junmin.jpg" },
  { name: "현서", img: "img/hyunseo.jpg" },
  { name: "규현", img: "img/gyuhyun.jpg" },
  { name: "인우", img: "img/inwoo.jpg" },
  { name: "석진", img: "img/seokjin.jpg" },
  { name: "연우", img: "img/yeonwoo.jpg" },
];

/* 우승자가 정해진 내전을 지울 때 필요한 비밀번호 */
window.ADMIN_PW = "arcv";
