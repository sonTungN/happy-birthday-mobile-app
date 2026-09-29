import type { Content } from "./types";

/**
 * ALL THE CONTENT LIVES IN THIS FILE: change text, photos and the passcode without touching any other code.
 *
 * - Photos: drop .jpg / .png files into src/assets/photos/ and use the exact file name below.
 *   iPhone photos (.HEIC) must be converted to .jpg first, see the README.
 * - Background music / voice note: drop .mp3 / .m4a files into src/assets/audio/.
 * - These placeholders work in any sentence:
 *   {name} {fullName} {sender}   the names below
 *   {age} {ageWords} {AgeWords}  the age she turns: 22 / twenty-two / Twenty-two
 *   {days}                       days since she was born, e.g. 8,036
 *   {birthDate}                  her birth date, e.g. Oct 21, 2004
 *
 * The photos and the letter are SAMPLES. Replace them with your own.
 */
export const content: Content = {
  name: "Mít", // what you call her
  fullName: "Nguyễn Mai Anh",
  sender: "Tùng", // signs the letter and the last frame
  // The two of you as a film studio (your shared account): its mark is the app icon and opens the credits
  studio: { name: "Ever After", kind: "Film", handle: "@ever.after_film" },
  initials: "M", // printed on the envelope's wax seal (1–3 letters)
  birthday: "2004-10-21",

  // Before this moment the site only shows a countdown. null = open right away.
  // (While testing, add ?nocountdown to the link. `npm run dev` skips it automatically.)
  unlockAt: "2026-10-21T00:00:00",

  passcode: "2110", // her birthday: day + month
  passcodeHint: "The day and month you arrived. Day first.",
  // Yours, for testing before the day: tap the lock icon five times while it counts down and enter this
  previewCode: "1901",
  passcodeReplies: {
    "2010":
      "Close. That is Women’s Day, and it belongs to every woman in the country. Try the day that is only yours.",
    "1021": "Day first, then month. We do things properly here.",
    "2004": "That is the year. The lock would like the day and month.",
  },

  lockPhoto: "lock.jpg", // lock screen background (gets blurred)
  music: null, // e.g. 'her-song.mp3' in src/assets/audio. null = no background music

  invite: {
    eyebrow: "For Miss {fullName}",
    question: "On the 21st of October you turn {ageWords}. Do you accept?",
    accept: "I ACCEPT",
    appeal: "I APPEAL",
    rulings: [
      "Time does not take requests.",
      "Twenty-one has been used in full.",
      "The candles have already been made.",
      "The court notes that you look very well for {ageWords}.",
      "The court is adjourned. Further appeals will not be heard.",
    ],
    denied: "DENIED",
    approved: "APPROVED",
    sealRing: "The Office of the Calendar · Est. 2004 ·",
    // The three prints scattered on the notice, from src/assets/photos/us/ (a `title` would go on the border)
    photos: [
      { file: "us/2025-12-13_us.jpg", date: "2025-12-13" },
      { file: "us/2025-12-22_us.jpg", date: "2025-12-22", focus: "center 20%" },
      { file: "us/2026-01-28_us_home.jpg", date: "2026-01-28", focus: "center 25%" },
    ],
  },

  // A birthday edition: it comes out on her birthday and looks back at the day she was born, then breaks
  // today's news at the foot of the page. ==Words between double equals== get the yellow marker,
  // ((words in double brackets)) a red pen circle. Real news from that week (checked): the Red Sox won
  // Game 7 on 20 Oct 2004, and the finished human genome was published in Nature on 21 Oct 2004.
  newspaper: {
    masthead: "The Morning Gazette",
    edition: "Vol. XXII · Birthday issue",
    archiveLabel: "From the archives · October 2004",
    stories: [
      {
        tag: "Births",
        headline: "It’s ==a Girl==",
        dek: "(({AgeWords})) years ago today, {fullName} arrived one day after Women’s Day. ==The family already calls her Mít.==",
        // The lead runs on under the photo. SAMPLE: make it yours
        body: [
          "She arrived on her own schedule and was declared perfect by everyone in the room, a verdict this newspaper sees no reason to question. Witnesses describe a small person with a great deal to say and, as yet, no words to say it with. The name Mít was settled within the hour. The paperwork took longer.",
          "Asked for comment, the newborn declined and slept through the rest of the interview. The Gazette expects great things, and ==will be following this story for some years.==",
        ],
      },
      {
        tag: "Civic Affairs",
        // The archive stories are lesser news: **bold** in the headline instead of the marker
        headline: "Men’s Day Petition **Withdrawn**",
        dek: "The 21st of October has been claimed, ==permanently, by a baby girl.==",
      },
      {
        tag: "Sport",
        headline: "**Impossible Comeback** in Boston",
        dek: "Down three games to none, the Red Sox win four straight. ==Only the second most remarkable event of the week.==",
      },
      {
        tag: "Science",
        headline: "**Fewer Genes** Than Thought",
        dek: "Scientists count only 20,000 to 25,000. ==Plenty, it turns out, to make her.==",
      },
    ],
    // Her, growing up, pasted onto the lead one after another (cut-outs from src/assets/photos/news/, see
    // scripts/cutout.swift). The note is scribbled by the arrow. SAMPLE notes: make them yours
    growUp: [
      { file: "news/1.png", note: "Mít, chapter one" },
      { file: "news/2.png", note: "Mít, chapter two" },
      { file: "news/3.png", note: "Mít, chapter three" },
      { file: "news/4.png", note: "Mít, today" },
    ],
    // The moving picture at the foot of the page (src/assets/video/tiktok.mp4). Silent until she taps it
    clip: {
      file: "tiktok.mp4",
      tag: "Stop press",
      headline: "==Dance Footage== Surfaces",
      dek: "A clip has reached this newsroom. The editor has watched it eleven times, strictly for verification.",
      // Set beside and under the picture. SAMPLE: make it yours
      body: [
        "The footage, believed to have been recorded at home, shows the subject in full command of the choreography. Witnesses report that a second take was not required.",
        "Asked whether the clip would be released, a spokesman for the family said only: “It just was.”",
      ],
      caption: "Tap the picture for sound",
      captionOn: "Tap again for quiet",
    },
  },

  darkroom: {
    // No number anywhere here: how many frames there are, and whose the last one is, stays a surprise
    title: "The year, frame by frame",
    emptyBoard: "The past year is still in the camera.\nPress the shutter.",
    arrangeHint: "Drag them where you like",
    outro: "Tap a print to read its back",
    gridHint: "Drag a print by its border to reorder",
    cameraName: "Ngỗng & Mít",
    // After the eight, the camera turns round: the ninth frame is a photo of her, taken right then
    selfie: {
      title: "One more. Your turn.",
      caption: "Sinh nhật của em",
      place: "Right here",
      // The back of her print carries the line she writes when she prints it; this one is the fallback
      note: "Taken on the day. It came out perfectly, naturally.",
      blankCaption: "Sinh nhật của em",
      blankNote: "This one hasn’t been taken yet. Tonight, then.",
      keep: "Keep this print",
      signature: "Us",
    },
  },

  // 6–8 photos looks best (8 max). SAMPLE captions: replace them with your own.
  photos: [
    // `focus` is where the square crop looks (CSS object-position): "center 30%" keeps the top of a
    // portrait photo, "60% center" the right part of a landscape one. Lowercase .jpg only: the build
    // pipeline (resize, webp, no location data) skips other spellings
    {
      file: "darkroom/2025-12-22_home.jpg",
      date: "2025-12-22",
      title: "Chúng mình, ở nhà",
      place: "Sunrise Block G, 20.09",
      note: 'Chúng mình. Anh ngồi làm việc, còn em thì "yêu" anh. Anh thích lắm.',
      focus: "center 40%",
    },
    {
      file: "darkroom/2026-01-20_birthday_presents.jpg",
      date: "2026-01-20",
      title: "Quà sinh nhật",
      place: "Sunrise Block G, 20.09",
      note: "Sinh nhật anh, một mình. Rồi hoa và quà em gửi từ Đài Loan tới. Ấm áp và yêu em nhiều lắm <3",
      focus: "center 60%",
    },
    {
      file: "darkroom/2026-01-24_first_date_dinner.jpg",
      date: "2026-01-24",
      title: "Bữa tối hẹn hò đầu tiên",
      place: "Hoshiyo Dining Lounge",
      note: "Buổi date đầu tiên của tụi mình, và cũng là tình đầu của anh. Ngại lắm, nhưng mà thành công rồi!",
      focus: "center 30%",
    },
    {
      file: "darkroom/2026-01-24_dinner_flower.jpg",
      date: "2026-01-24",
      title: "Bó hoa đầu tiên cho em",
      place: "Hoshiyo Dining Lounge",
      note: "Bó hoa đầu tiên anh tặng em, gửi gắm nhiều lắm. Anh rất vui vì em đã thích nó thật nhiều.",
      focus: "center 35%",
    },
    {
      file: "darkroom/2026-02-01_HCM_Photobooth.jpg",
      date: "2026-02-01",
      title: "Photobooth đầu tiên của anh",
      place: "Photobooth HCM",
      note: "Lần đầu anh đi photobooth, mà là với em. Em hôn má anh. Em xinh lắm!",
      focus: "center 25%",
    },
    {
      file: "darkroom/2026-02-01_matcha_drawing.jpg",
      date: "2026-02-01",
      title: 'Buổi đi "chơi" đầu tiên của anh',
      place: "Sundate Matcha",
      note: "Vẽ lên ly matcha. Anh vẽ hai đứa mình, em vẽ hoa với mây. Em cười nhiều lắm.",
      focus: "center 45%",
    },
    {
      file: "darkroom/2026-02-15_Hanoi_Photobooth.jpg",
      date: "2026-02-15",
      title: "Ra Hà Nội cùng em",
      place: "Photobooth Hà Nội",
      note: "Ra Hà Nội chơi với em. Tấm photobooth anh thích nhất từ trước tới giờ <3",
      focus: "55% center",
    },
    {
      file: "darkroom/2026-07-12_date_gom.jpg",
      date: "2026-07-12",
      title: "Đi làm gốm cùng em",
      place: "Gốm Sài Gòn",
      note: "Lần đầu anh làm gốm, và là với em. Có được một cái cốc và một cái đĩa ăn cho Tít.",
      focus: "50% center",
    },
  ],

  cake: {
    age: null, // null = the age she turns, worked out from `birthday`
    trickCandle: true,
    trickLine: "One of the candles is not ready for {ageWords}. Blow again.",
    message: "Happy Birthday",
    birthdayLine: "Happy birthday, {name}.",
    cutLine: "Flavour: jackfruit, naturally.",
  },

  letter: {
    title: "A letter for {name}",
    greeting: "Dear {name},",
    paragraphs: [
      "Happy birthday. {AgeWords} suits you, and you have only been wearing it for a few minutes.",
      "This is where the real letter goes. Write about her year, the things you admire about her that she never notices, and what you hope {ageWords} brings her.",
      "Each paragraph fades in as she scrolls. To add another one, add a new line to this list in src/content.ts.",
      "Here is to a year that is kind to you, and a little less crowded on the 20th.",
    ],
    closing: "Yours, always,",
    signature: "{sender}",
    image: null, // e.g. 'handwritten-letter.jpg' in src/assets/photos
    voiceNote: null, // e.g. 'birthday-message.m4a' in src/assets/audio
  },

  // Four tickets, she may scratch only `picks` of them. The rest stay sealed.
  tickets: {
    title: "Four tickets. Pick two.",
    intro: "Scratch any two. The other two stay sealed, so choose with care.",
    picks: 2,
    heldStamp: "HELD OVER",
    heldLine: "The other two are held over until your next birthday.",
    list: [
      {
        title: "The Women’s Day Refund",
        note: "One extra bouquet, since the 20th always gets flowers first.",
      },
      {
        title: "A Day Off From Deciding",
        note: "Where to eat, what to watch, which way to walk. All handled.",
      },
      {
        title: "A Film of Your Choosing",
        note: "Any film at all. Tissues provided, no remarks made.",
      },
      {
        title: "Breakfast, Delivered",
        note: "Any morning you like. Alarm not included.",
      },
    ],
  },

  // The real plan, hidden behind one of the four tickets. She is guaranteed to find it: if her first
  // ticket isn't it, the second one is, whichever she picks (it's decided the moment she starts scratching).
  // MOCK EVENT: replace every field with the real plan (or set `event: null` for four plain tickets).
  event: {
    feature: "The feature presentation",
    kicker: "Admit one · Guest of honour",
    title: "Dinner, somewhere with a view",
    date: "2026-10-21",
    time: "19:30",
    hours: 3,
    place: "To be revealed at the door",
    address: null,
    mapUrl: null,
    dress: "Whatever makes you feel like the lead",
    note: "Bring nothing. Everything has been arranged.",
  },

  finale: {
    photo: "finale.jpg",
    caption: "to be continued",
    title: "The End",
    line: "…of this reel. {AgeWords} begins now.",
    // The credits open with "{fullName} in {AgeWords}", like an old film title
    credits: [
      { role: "Featuring", name: "Mít, as herself" },
      { role: "Produced by", name: "{studio}" },
      { role: "Filmed on location", name: "Wherever she happened to be" },
      { role: "Running time", name: "{age} years, and counting" },
      { role: "Soundtrack", name: "Her laugh" },
      {
        role: "Special thanks",
        name: "Her parents, for the 21st of October 2004",
      },
    ],
    creditsNote: "No jackfruits were harmed in the making of this film.",
  },
};
