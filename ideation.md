# 🎂 Ideation: Web sinh nhật cho người ấy

> Cập nhật 28/09/2026 · Trạng thái: ý tưởng, chưa code

---

## TL;DR

1. **Làm web (PWA), deploy Vercel free. Không làm app Xcode.** App ký bằng Apple ID free sẽ hết hạn sau 7 ngày. Muốn cài còn phải cầm iPhone của người ấy cắm vào Mac, nên lộ luôn bất ngờ. Web thì gửi link hoặc QR là xong, dùng mãi được, và "Thêm vào MH chính" là có icon y như app.
2. **Concept: "Cuộn phim của tụi mình".** Cả web là một chiếc máy ảnh dùng một lần. Mỗi chương là một "kiểu ảnh". Góc màn hình có bộ đếm phim `07 → 00`, dùng luôn làm thanh tiến trình.
3. **Flow 7 chương:** Mở khoá → Lời mời → Rửa ảnh (5–7 polaroid) → Thắp & thổi nến (mic) → Cắt bánh → Lá thư → Quà cuối.
4. **Stack:** Vite + React + TypeScript + Motion + canvas-confetti. Không cần backend. Làm 2D theo phong cách scrapbook, không làm 3D.
5. **Thời gian:** bản đầy đủ khoảng 30–35 giờ code. Bản tối thiểu (MVP) khoảng 15 giờ.
6. **Làm phần thổi nến bằng mic trước tiên** (1–2 giờ, deploy lên Vercel, test trên iPhone thật). Đây là phần rủi ro nhất.

---

## 1. Web hay app Xcode?

| Tiêu chí | Xcode + Apple ID free | Xcode + Apple Developer ($99/năm) | **Web/PWA trên Vercel** |
|---|---|---|---|
| Dùng được bao lâu | **7 ngày**, sau đó phải cắm máy vào Mac build lại | Tối đa 1 năm (ad-hoc), TestFlight thì 90 ngày/build | **Mãi mãi**, miễn link còn |
| Cài lên máy người ấy | Phải cầm iPhone người ấy cắm vào Mac, bật Developer Mode (máy khởi động lại), trust certificate → **lộ bất ngờ** | Gửi link TestFlight, người ấy cài app TestFlight trước | Gửi link/QR. "Thêm vào MH chính" để có icon, mở toàn màn hình |
| Chi phí | 0đ | ~2,5 triệu/năm | 0đ (subdomain `.vercel.app`); domain riêng tuỳ chọn |
| Thổi nến bằng mic | Có (AVAudioEngine) | Có | Có (cần HTTPS + xin quyền mic) |
| Rung (haptic) | Core Haptics, rung tuỳ ý | Như bên trái | Hạn chế: chỉ rung được khi người dùng chạm (xem mục 6) |
| Sửa nội dung sau khi gửi | Build + cài lại, cần cầm máy | Upload build mới | `git push`, khoảng 30 giây là live |
| Giới hạn khác | Tối đa 3 app/máy, 3 máy/tài khoản | Không đáng kể | Không đáng kể |

**Kết luận: web/PWA.** Native chỉ hơn ở rung xịn hơn và animation mượt hơn một chút. Đổi lại phải chịu hạn 7 ngày và mất yếu tố bất ngờ, nên không đáng.

Chỉ nên chọn native khi đằng nào cũng muốn học SwiftUI **và** chịu trả $99/năm.

**Điểm cộng của web mà ít ai để ý: món quà dùng được lâu dài.** Mỗi dịp (sinh nhật, kỷ niệm) có thể thêm một "cuộn phim" mới vào cùng link. Dần dần nó thành một album của hai người theo từng năm.

---

## 2. Concept & phong cách

### Concept: "Cuộn phim của tụi mình"

- Toàn bộ trải nghiệm là một chiếc **máy ảnh dùng một lần**.
- Góc trên màn hình có **bộ đếm phim** kiểu máy film: `07`, `06`, … đến `00`. Mỗi chương là một kiểu ảnh.
- Kết thúc ở `00`: *"Hết cuộn này rồi. Còn nhiều cuộn nữa, mình chụp tiếp nhé."*

### Moodboard (lấy từ ảnh tham khảo)

- **Nền:** navy, sọc dọc mờ (khoảng `#2E3A6E` và `#34427A`).
- **Polaroid:** khung màu kem (`#F8F4EA`), xoay lệch ±3–8°, bóng đổ mềm.
- **Sticker:** tim hồng, băng dính washi, gấu bông, và đồ vật gắn với sở thích riêng của hai người (ảnh tham khảo dùng bóng bầu dục + bóng đá).
- **Nút dạng pill:** đen chữ trắng cho nút chính, xanh baby (`#8FA8E0`) cho nút phụ, viền trắng.
- **Chất phim:** hạt grain, vệt lộ sáng (light leak) cam/đỏ ở mép ảnh, date stamp màu cam kiểu máy film (`'26 10 05`).

### Font (đã kiểm tra trên Google Fonts: có hỗ trợ tiếng Việt)

| Vai trò | Gợi ý | Ghi chú |
|---|---|---|
| Chữ tay (caption, thư) | **Pangolin**, Patrick Hand, Mali, Dancing Script | ⚠️ **Caveat, Kalam, Gochi Hand, Shadows Into Light không có tiếng Việt** nên sẽ vỡ dấu. Caveat rất hay được dùng nên dễ dính. |
| UI / chữ thường | **Be Vietnam Pro**, Nunito | |
| Tiêu đề điệu | Fraunces, Playfair Display, Pacifico | |
| Date stamp | DSEG7 (font 7-segment, free, tự host) | Chỉ có số nên không cần dấu |

### Âm thanh

- **Nhạc nền:** "bài của hai người" (file mp3 tự host).
- **Hiệu ứng (SFX):** tiếng màn trập, tiếng lên phim, quẹt diêm, tiếng thổi phù, dao cắt bánh, giấy mở ra, hộp nhạc Happy Birthday.
- **Nguồn SFX free:** freesound.org, pixabay.com/sound-effects.

---

## 3. Flow chi tiết

```
 [0 Mở khoá] → [1 Lời mời] → [2 Rửa ảnh] → [3 Nến] → [4 Cắt bánh] → [5 Lá thư] → [6 Quà]
     07            06             05          04          03            02         01 → 00
```

### Chương 0: Mở khoá (frame 07)

- Màn hình giống lock screen iPhone: hình nền là ảnh hai người làm mờ, có bàn phím số.
- **Mật mã:** ngày kỷ niệm (DDMM).
  - Nhập sai thì ô nhập rung lắc, kèm gợi ý dễ thương (*"gợi ý: ngày ai đó tỏ tình 👀"*).
- **Nếu chưa tới sinh nhật:** hiện đồng hồ đếm ngược đến 00:00, chưa cho mở.
- **Lý do kỹ thuật:** cú chạm này là tương tác đầu tiên của người dùng. iOS bắt buộc phải có cú chạm như vậy mới cho phát âm thanh.

### Chương 1: Lời mời (frame 06)

- Lấy thẳng từ ảnh tham khảo: 3 polaroid + câu hỏi *"Muốn xem bất ngờ không?"*
- Hai nút `YES, PLEASE!` / `NO, THANKS!`:
  - Chạm vào **NO** thì nút nhảy sang chỗ khác và đổi chữ: *"Chắc chưa?"* → *"Nghĩ lại đi"* → *"Bấm nhầm đúng không"*.
  - Mỗi lần bấm NO, nút YES to thêm một chút.
  - Lưu ý: điện thoại không có hover, nên để nút NO chạy khi *chạm*, không phải khi ngón tay *lại gần*.
- Bấm YES thì nhạc nền bắt đầu, kèm một chút confetti.

### Chương 2: Rửa ảnh (frame 05) ⭐ 5–7 ảnh film

**Trải nghiệm:**

1. Màn hình là một chiếc máy ảnh instant (Instax/Polaroid) nhìn từ phía trước, có nút chụp.
2. Chạm nút chụp: màn hình loé trắng, có tiếng màn trập, polaroid trượt ra từ khe máy.
3. Ảnh vừa ra còn xám tối, chưa hiện hình. Người ấy **xoa ngón tay lên ảnh** để ảnh hiện dần ("shake it like a Polaroid picture"), không cần xin quyền gì. Nếu không xoa, ảnh tự hiện sau khoảng 5 giây.
4. Ảnh hiện xong thì bay lên, dán vào **bảng scrapbook** phía trên, kèm sticker và date stamp.
5. Lặp lại cho 5–7 ảnh. Xong hết thì bảng scrapbook đầy như ảnh tham khảo.
6. Chạm vào một polaroid: ảnh phóng to và **lật ra mặt sau**. Mặt sau có chữ tay ghi ngày, nơi chốn và một câu về khoảnh khắc đó.
7. Các polaroid trên bảng kéo thả được, cho vui.

**Kỹ thuật:**

- **Hiệu ứng ảnh hiện dần:** phủ một lớp xám xanh `#3A4640`, opacity giảm từ 1 về 0. Ảnh bên dưới chuyển từ `filter: brightness(.3) sepia(1) blur(3px)` về bình thường. Tiến độ tăng theo `pointermove` trên ảnh.
- **Kéo thả, lật ảnh:** dùng Motion (`drag`, `rotateY`).
- **Chất film:** chỉnh sẵn vào ảnh bằng app **Dazz Cam** hoặc **VSCO** (đồng bộ hơn làm bằng CSS). CSS chỉ thêm một lớp grain phủ toàn màn hình.
- **Không khuyên:** lắc điện thoại cho ảnh hiện nhanh hơn. Làm vậy phải xin thêm quyền cảm biến chuyển động, trong khi chương 3 đã xin quyền mic rồi. Xin quyền nhiều lần dễ gây phiền.

### Chương 3: Thắp & thổi nến (frame 04) ⭐

**Trải nghiệm:**

1. Bánh kem 2D, số nến bằng số tuổi (hoặc dùng nến số). Nến chưa thắp.
2. Ở góc có hộp diêm. **Vuốt que diêm lên hộp** để quẹt ra lửa, rồi kéo lửa chạm vào từng bấc nến để thắp.
3. Màn hình tối lại: *"Nhắm mắt, ước một điều đi"*. Giữ ngón tay trên màn hình 3 giây, có vòng tròn chạy quanh ngón tay.
4. **Màn xin quyền mic tự làm**, hiện trước popup của iOS: *"Cho phép micro để thổi nến nha, không ghi âm gì hết"*. Có mũi tên chỉ xuống **cạnh dưới iPhone**, vì mic nằm ở đó.
5. **Thổi:** lửa **nghiêng và chập chờn theo độ mạnh của hơi thổi**. Thổi đủ lâu thì từng ngọn tắt và bốc khói.
6. **Troll nhẹ:** có một cây "nến ma thuật" tự cháy lại một lần, phải thổi thêm phát nữa.
7. Tắt hết nến: confetti, hộp nhạc Happy Birthday, rồi nhạc nền quay lại.
8. **Dự phòng** khi người ấy từ chối quyền mic hoặc mic lỗi: có nút "Thổi bằng tay", vuốt lên trên ngọn nến để tắt.

**Kỹ thuật:** xem mục 6 (các bẫy trên iOS) và đoạn code phát hiện thổi ở cuối mục đó.

### Chương 4: Cắt bánh (frame 03)

1. Con dao chạy theo ngón tay.
2. Vuốt một đường từ trên xuống qua bánh: vệt cắt hiện ra, bánh tách đôi và trượt sang hai bên.
3. **Bất ngờ giữa bánh:** bên trong giấu một phong bì nhỏ, dẫn thẳng sang chương lá thư.
4. Nếu vuốt ngắn quá hoặc lệch ra ngoài bánh: dao lắc lắc, kèm dòng *"cắt dứt khoát lên nào"*.

**Kỹ thuật:** bánh là một ảnh/SVG, render thành 2 bản với `clip-path: polygon(...)` tính từ đường vuốt, rồi animate hai nửa tách ra. Không cần physics hay 3D.

### Chương 5: Lá thư (frame 02)

1. Phong bì có **dấu sáp**. Chạm vào dấu sáp thì dấu vỡ, kèm rung.
2. Nắp phong bì mở ra, lá thư trượt lên rồi mở gập.
3. Chữ hiện dần **theo từng đoạn** (fade), không dùng hiệu ứng gõ từng chữ vì thư dài đọc sẽ sốt ruột.
4. **Cách cá nhân nhất:** viết tay lá thư thật trên giấy, chụp lại và dùng làm ảnh lá thư. Phần text giữ lại làm bản dự phòng.
5. **Tuỳ chọn:** nút ▶ nghe voice note tự thu (đọc lá thư hoặc hát chúc mừng).

### Chương 6: Quà cuối (frame 01 → 00)

Chọn 1, hoặc gộp cả hai:

- **Coupon cào:** 3–5 thẻ cào bằng ngón tay, mỗi thẻ là một voucher đổi ngoài đời thật. Người ấy chụp màn hình để "đổi". Ví dụ:
  - "1 buổi hẹn tuỳ ý chọn"
  - "1 lần được giận vô lý mà không bị cãi"
  - "1 bữa tự tay nấu"
  - "1 ngày làm tài xế riêng"
- **Truy tìm quà thật:** thẻ cào lộ ra manh mối về chỗ giấu quà thật.

**Kết:** một polaroid cuối cùng của hai người, bộ đếm về `00` kèm câu chốt. Có nút "Xem lại từ đầu" và hướng dẫn "Thêm vào MH chính".

### Easter eggs (nếu còn thời gian)

- Bộ đếm "đã bên nhau X ngày" giấu ở đâu đó.
- Chạm 5 lần vào sticker gấu thì hiện ảnh dìm hàng.
- Mỗi dịp kỷ niệm thêm một "cuộn phim" mới.

---

## 4. Cách trao quà

- **QR trên thiệp giấy**, đặt cạnh bánh thật hoặc hộp quà, để người ấy quét lúc 0h.
  - Trend "QR thổi nến" đang có trên TikTok VN, nên format này không còn mới. Cái làm khác biệt là **nội dung cá nhân**, không phải format.
- **Gửi link lúc 00:00** qua Messenger/Zalo/iMessage. Nhớ làm **ảnh preview cho link** (OG image) cho đẹp, để link không trông như spam.
- **Nếu ở cạnh nhau:** web là màn mở đầu, thổi nến ảo xong thì mang bánh thật ra.
- **Nếu yêu xa:** web thay cho khoảnh khắc thổi nến.

---

## 5. Stack đề xuất

| Phần | Chọn | Vì sao |
|---|---|---|
| Build | **Vite + React + TypeScript** | Nhẹ, deploy lên Vercel không cần cấu hình |
| Animation, kéo thả, chuyển chương | **Motion** (motion.dev, tên cũ Framer Motion) | Có sẵn `drag`, `AnimatePresence`, xử lý cử chỉ |
| Confetti | **canvas-confetti** | Một dòng code là xong |
| Rung trên iOS | **ios-haptics** (tijnjh) | Dùng mẹo `<input switch>` của Safari |
| PWA | **vite-plugin-pwa** | Lo manifest, icon, chạy offline |
| Style | Tailwind hoặc CSS modules | Quen cái nào dùng cái đó |
| Nội dung | 1 file `content.ts` | Ảnh, caption, thư, coupon tách riêng khỏi code |
| Lưu tiến độ | `localStorage` | Lỡ đóng tab thì mở lại vẫn đúng chương |

**Không khuyên dùng Three.js / React Three Fiber (3D):**

- Lệch với phong cách scrapbook 2D.
- Nặng máy.
- Tốn thêm khoảng 10 giờ.

GSAP (giờ đã free toàn bộ plugin) có thể thay Motion nếu đã quen dùng.

```
src/
  content.ts            # ảnh, caption, thư, coupon
  App.tsx               # state machine: chương hiện tại + bộ đếm phim
  chapters/
    Lock.tsx  Invite.tsx  Darkroom.tsx  Candles.tsx  Cake.tsx  Letter.tsx  Finale.tsx
  lib/
    blow.ts             # phát hiện thổi qua mic
    audio.ts            # nhạc nền + SFX + audio session
    haptics.ts
public/photos/  public/sfx/  public/music/
```

---

## 6. Bẫy iOS Safari phải biết

1. **Mic cần HTTPS.** Vercel có sẵn. Nhưng lúc dev, mở `http://192.168.x.x:5173` trên iPhone thì **mic không chạy**. Cách xử lý: dùng `@vitejs/plugin-basic-ssl`, hoặc test qua bản preview trên Vercel.
2. **Âm thanh phải bắt đầu từ một cú chạm.** Tạo hoặc resume `AudioContext` ngay trong handler của nút bấm (chương 0/1).
3. **Gạt nút im lặng thì Web Audio mất tiếng.** Nhiều người để iPhone ở chế độ im lặng. Cách xử lý:
   - Phát nhạc nền bằng thẻ `<audio>`, hoặc đặt `navigator.audioSession.type = 'playback'`.
   - Thêm màn "Bật tiếng lên nha 🔊".
4. **Bật mic làm nhạc nhỏ đi hoặc đổi loa.** Khi mic mở, iOS chuyển chế độ âm thanh sang vừa phát vừa thu (`play-and-record`), âm lượng tụt xuống. Cách xử lý:
   - Tạm dừng nhạc khi thổi nến.
   - **Tắt mic ngay khi nến tắt hết** (`track.stop()`).
   - Sau đó mới phát nhạc lại.
5. **iOS không hỗ trợ `navigator.vibrate`.** Chỉ rung được bằng mẹo `<input type="checkbox" switch>`, và **chỉ khi người dùng chạm**. Nghĩa là không thể tự rung lúc nến tắt.
6. **Cảm biến lắc/nghiêng cần xin quyền:** phải gọi `DeviceMotionEvent.requestPermission()` trong một cú chạm. Không cần thì đừng dùng.
7. **Layout:**
   - `viewport-fit=cover` + `env(safe-area-inset-*)` để né tai thỏ/Dynamic Island.
   - Dùng `100dvh` thay cho `100vh`.
   - `overscroll-behavior: none` để không bị kéo-để-tải-lại.
   - `touch-action: manipulation` để chạm đúp không bị zoom.
   - `user-select: none` cho các màn tương tác.
8. **Chế độ nguồn điện thấp giới hạn 30fps.** Animation vẫn chạy nhưng kém mượt. Tính animation theo thời gian thực, đừng đếm theo frame.
9. **Ảnh:** resize cạnh dài khoảng 1080px, định dạng WebP, dưới 250KB mỗi ảnh. Tải trước ảnh của chương kế tiếp.
10. **Riêng tư:** ảnh hai người nằm trên một link công khai. Tính năng khoá bằng mật khẩu của Vercel không có ở gói free. Cách xử lý:
    - Dùng mã khoá ở chương 0. Mã này chỉ chặn người lạ lướt qua, không phải bảo mật thật.
    - Thêm `<meta name="robots" content="noindex">` để Google không index.
    - Đặt tên subdomain khó đoán.

### Phát hiện thổi qua mic: code khởi điểm

**Ý tưởng:** tiếng thổi là tiếng ồn to, trải rộng và kéo dài. Đoạn code đo độ lớn âm thanh (RMS) so với tiếng ồn nền của phòng. Nếu vượt ngưỡng đủ lâu thì tính là đang thổi.

```ts
// Gọi TRONG handler của một cú chạm
const stream = await navigator.mediaDevices.getUserMedia({
  // tắt các bộ lọc: chúng có thể lọc mất tiếng thổi
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
});
const ctx = new AudioContext();
const analyser = ctx.createAnalyser();
analyser.fftSize = 1024;
ctx.createMediaStreamSource(stream).connect(analyser);
const buf = new Float32Array(analyser.fftSize);

let baseline = 0.01; // tiếng ồn nền, tự cập nhật
let blowMs = 0;      // đã thổi liên tục bao lâu
let last = performance.now();

function tick(now: number) {
  analyser.getFloatTimeDomainData(buf);
  const rms = Math.sqrt(buf.reduce((s, x) => s + x * x, 0) / buf.length);
  const dt = now - last;
  last = now;

  if (rms > baseline * 4 && rms > 0.05) blowMs += dt;
  else {
    blowMs = Math.max(0, blowMs - dt * 0.5);
    baseline = baseline * 0.95 + rms * 0.05;
  }

  onBlow(rms, blowMs); // lửa nghiêng theo rms; tắt 1 nến mỗi khi blowMs > ~400ms
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Nến tắt hết: stream.getTracks().forEach(t => t.stop()); ctx.close();
```

- **Các con số `4`, `0.05`, `400ms` chỉ là điểm xuất phát.** Phải chỉnh lại trên iPhone thật, tốt nhất là cùng đời máy với người ấy.
- **Bản nâng cao:** đo thêm *spectral flatness* để phân biệt thổi (giống nhiễu trắng) với nói hoặc hát (có cao độ). Bản cơ bản thì hét to vào mic cũng tắt được nến.

---

## 7. Repo & tài nguyên tham khảo

> Mới đọc README, chưa đọc code. Nên xem demo trên điện thoại trước khi lấy code.

### Chuyên về thổi nến bằng mic

| Repo | Có gì đáng lấy |
|---|---|
| [shoproizoshlo/bd-cake-react](https://github.com/shoproizoshlo/bd-cake-react) | React, nến tắt dần khi thổi. Gần với stack đề xuất nhất |
| [VIDAKHOSHPEY22/3D-Birthday-Cake](https://github.com/VIDAKHOSHPEY22/3D-Birthday-Cake) | Web Audio phát hiện thổi, **có sẵn phương án chạm cho mobile** |
| [sherryuser/cake-blow](https://github.com/sherryuser/cake-blow) | Chạm để cắm nến rồi thổi. Từng viral trên Instagram |
| [patrick-paul/happybirthday](https://github.com/patrick-paul/happybirthday) | Thổi nến bằng mic + confetti + timeline |
| [lovesulei/birthdaycandles](https://github.com/lovesulei/birthdaycandles) | Ngọn lửa có animation, tắt khi thổi |

### Có trọn một flow

| Repo | Có gì đáng lấy |
|---|---|
| [naborajs/birthday-bloom](https://github.com/naborajs/birthday-bloom) | React + Motion + R3F: cắt bánh 3D, thổi nến, polaroid nghiêng 3D, chạy theo các màn `splash → unlock → intro → main`. **Hợp để tham khảo kiến trúc**, nhưng rất nặng (thừa SEO, nút share, đa ngôn ngữ) |
| [sapthesh/Birthday-V3](https://github.com/sapthesh/Birthday-V3) | JS thuần, không thư viện: phong bì → lá thư mở ra → chữ gõ dần → bóng bay. **Hợp để tham khảo chương lá thư** |
| [aungbbo/birthday-surprise-template](https://github.com/aungbbo/birthday-surprise-template) | Gallery ảnh khung polaroid |
| [github.com/topics/birthday-website](https://github.com/topics/birthday-website) | Chỗ để lục thêm |

### Thư viện

- [tijnjh/ios-haptics](https://github.com/tijnjh/ios-haptics): rung trên Safari iOS.
- canvas-confetti.
- [motion.dev](https://motion.dev).
- vite-plugin-pwa.

---

## 8. Ước lượng thời gian & thứ tự làm

Tính theo giờ code tập trung, có Claude hỗ trợ. Nếu tự code từ đầu thì nhân khoảng 1,5.

| # | Việc | Giờ | Có trong MVP? |
|---|---|---|---|
| 1 | **Làm thử phần thổi nến bằng mic**, deploy Vercel, test iPhone thật | 1–2 | ✅ làm đầu tiên |
| 2 | Khung dự án + chuyển chương + bộ đếm phim + nhạc nền | 3 | ✅ |
| 3 | Chương 3: thắp & thổi nến (diêm, ước, mic, phương án dự phòng) | 6–7 | ✅ (bỏ phần diêm và nến ma thuật) |
| 4 | Chương 2: rửa ảnh (máy ảnh, ảnh hiện dần, bảng scrapbook, lật ảnh) | 5–6 | ✅ (chỉ làm bảng scrapbook + lật ảnh) |
| 5 | Chương 5: lá thư | 3 | ✅ |
| 6 | Chương 0 + 1: mở khoá + lời mời | 3 | ⏭ |
| 7 | Chương 4: cắt bánh | 4 | ⏭ |
| 8 | Chương 6: coupon cào + màn kết | 3 | ⏭ |
| 9 | Hoàn thiện: SFX, ảnh preview link, PWA, test trên iPhone | 4 | ✅ (phần test) |
| | **Tổng** | **~30–35** | **MVP ~15** |

---

## 9. Checklist nội dung

Phần không phải code nhưng tốn thời gian hơn mình tưởng.

- [ ] Chọn 5–7 ảnh, kèm ngày, nơi chốn và một câu cho mỗi ảnh
- [ ] Chỉnh màu film cho ảnh (Dazz Cam / VSCO)
- [ ] Viết thư (viết tay càng tốt)
- [ ] Chọn bài hát
- [ ] Nghĩ 3–5 coupon
- [ ] Chọn mật mã (ngày kỷ niệm?)
- [ ] Hỏi khéo xem người ấy dùng iPhone đời nào, iOS bản mấy, rồi test trên máy tương tự
- [ ] Chốt cách trao: QR hay link, lúc mấy giờ

---

## Bước tiếp theo

**Mở Photos, chọn 5–7 ảnh ngay hôm nay (10 phút).** Có ảnh rồi mới chốt được bảng màu và bố cục chương 2. Trong lúc đó, làm thử phần thổi nến bằng mic (việc #1 ở mục 8).

---

## Vòng 2 (28/09/2026): Claude + agy, đã chốt và đã làm

Nguồn: agy (Gemini 3.8 Flash) đưa 15 ý tưởng, Claude tự research thêm (VnExpress, Wikipedia, Nature, SABR, Billboard). Các con số agy tự bịa ("85% web sinh nhật…") đã bị loại.

**Đã đưa vào app:**
1. Mật khẩu `2110`. Gõ `2010` (ngày Phụ nữ) có câu trả lời riêng; `1021`, `2004` cũng có. (ý agy, viết lại cho "quý ông")
2. Màn "Do you accept turning 22?": bấm I APPEAL thì "Court of Birthdays" đóng dấu DENIED, 5 lần rồi hết quyền kháng cáo. Thay cho nút NO chạy trốn (quá phổ biến). (ý agy)
3. **The Morning Gazette**, trang nhất ngày 21/10/2004, xoay vào như phim cũ. Tin thật đã kiểm tra:
   - Red Sox lội ngược dòng 0–3 (20/10/2004).
   - Nature công bố bộ gen người chỉ có 20–25 nghìn gene (21/10/2004).
   - Bài số 1 nước Mỹ: "Goodies" (Ciara).
   - Mít sinh sau 20/10 một ngày; meme "21/10 là ngày đàn ông" (VnExpress) thành tin "The petition for a Men's Day has been withdrawn."
4. Nến số "2" "2" tính từ ngày sinh; cây "2" thứ hai tự cháy lại một lần. Bỏ bước wish.
5. Cắt bánh: "Flavour: jackfruit, naturally." (chơi chữ Mít)
6. Mở thư: tiếng giấy thu âm thật (Kenney, CC0) thay tiếng "rẹt".
7. 4 vé, chỉ cào được 2; 2 vé còn lại đóng dấu HELD OVER "đến sinh nhật sau".
8. Credits cuối phim: "Nguyễn Mai Anh in Twenty-Two", "No jackfruits were harmed…". (ý agy)

**Không làm (lý do):**
- Lắc điện thoại để tráng ảnh: iOS phải xin quyền cảm biến, dễ hỏng.
- Flashbulb thay mic: bạn muốn thổi nến thật.
- Bánh xe ratchet để chuyển cảnh: đã có film leader.
- "Censor board" hiện khi đứng im: dễ gây phiền.
