import type { Content } from './types'

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
  name: 'Mít', // what you call her
  fullName: 'Nguyễn Mai Anh',
  sender: 'Tùng', // signs the letter and the last frame
  initials: 'M', // printed on the envelope's wax seal (1–3 letters)
  birthday: '2004-10-21',

  // Before this moment the site only shows a countdown. null = open right away.
  // (While testing, add ?nocountdown to the link. `npm run dev` skips it automatically.)
  unlockAt: '2026-10-21T00:00:00',

  passcode: '2110', // her birthday: day + month
  passcodeHint: 'The day and month you arrived. Day first.',
  passcodeReplies: {
    '2010': 'Close. That is Women’s Day, and it belongs to every woman in the country. Try the day that is only yours.',
    '1021': 'Day first, then month. We do things properly here.',
    '2004': 'That is the year. The lock would like the day and month.',
  },

  lockPhoto: 'lock.jpg', // lock screen background (gets blurred)
  music: null, // e.g. 'her-song.mp3' in src/assets/audio. null = no background music

  invite: {
    eyebrow: 'For Miss {fullName}',
    question: 'On the 21st of October you turn {ageWords}. Do you accept?',
    accept: 'I ACCEPT',
    appeal: 'I APPEAL',
    rulings: [
      'Time does not take requests.',
      'Twenty-one has been used in full.',
      'The candles have already been made.',
      'The court notes that you look very well for {ageWords}.',
      'The court is adjourned. Further appeals will not be heard.',
    ],
    denied: 'DENIED',
    approved: 'APPROVED',
    sealRing: 'The Court of Birthdays · Est. 2004 ·',
  },

  // The front page of the day she was born. ==Words between double equals== get the yellow marker,
  // ((words in double brackets)) a red pen circle. Real news from that week (checked): the Red Sox won
  // Game 7 on 20 Oct 2004, and the finished human genome was published in Nature on 21 Oct 2004.
  newspaper: {
    masthead: 'The Morning Gazette',
    edition: 'Vol. I · No. 1',
    stories: [
      {
        tag: 'Births',
        headline: 'It’s ==a Girl==',
        dek: '{fullName} arrives one day after Women’s Day. ==The family already calls her Mít.==',
        photo: 'gazette.png', // a baby photo. A .png with the background removed gets the cut-out look
        note: 'Mít, day one',
      },
      {
        tag: 'Civic Affairs',
        headline: 'Men’s Day Petition ==Withdrawn==',
        dek: 'The 21st of October has been claimed, ==permanently, by a baby girl.==',
      },
      {
        tag: 'Sport',
        headline: '==Impossible Comeback== in Boston',
        dek: 'Down three games to none, the Red Sox win four straight. ==Only the second most remarkable event of the week.==',
      },
      {
        tag: 'Science',
        headline: '==Fewer Genes== Than Thought',
        dek: 'Scientists count only 20,000 to 25,000. ==Plenty, it turns out, to make her.==',
      },
    ],
    correction: {
      title: 'Correction',
      text: 'This edition was delayed by (({ageWords} years)). The editor, aged nine months at the time, apologises.',
      signature: 'The Editor',
    },
  },

  darkroom: {
    title: 'The year in eight frames',
    emptyBoard: 'Eight frames from the past year.\nPress the shutter to develop them.',
    arrangeHint: 'Drag the prints anywhere you like',
    outro: 'Tap a picture to read the back',
    gridHint: 'Drag a print by its border to rearrange',
    cameraName: 'Ngỗng & Mít',
    // After the eight, the camera turns round: the ninth frame is a photo of her, taken right then
    selfie: {
      title: 'One more. Your turn.',
      hint: 'Tap the shutter to open the camera.',
      caption: 'Exhibit I: {ageWords}',
      place: 'Right here',
      // The back of her print carries the line she writes when she prints it; this one is the fallback
      note: 'Taken on the day. It came out perfectly, naturally.',
      blankCaption: 'Exhibit I: pending',
      blankNote: 'This one hasn’t been taken yet. Tonight, then.',
      keep: 'Keep this print',
      signature: 'Us',
    },
  },

  // 6–8 photos looks best (8 max). SAMPLE captions: replace them with your own.
  photos: [
    { file: '01.jpg', date: '2025-10-21', title: 'Exhibit A: twenty-one', place: 'Last birthday', note: 'The morning you turned twenty-one. You said you felt no different. The evidence suggests otherwise.' },
    { file: '02.jpg', date: '2025-12-24', title: 'Exhibit B: the cold', place: 'Somewhere cold', note: 'Four layers, two scarves and one complaint per minute. Still the best-dressed person in the frame.' },
    { file: '03.jpg', date: '2026-02-17', title: 'Exhibit C: Tết', place: 'Home', note: 'Lì xì counted twice, for accuracy.' },
    { file: '04.jpg', date: '2026-05-01', title: 'Exhibit D: off duty', place: 'Somewhere with a view', note: 'A rare record of you doing absolutely nothing, and doing it beautifully.' },
    { file: '05.jpg', date: '2026-07-12', title: 'Exhibit E: mid-story', place: 'Dinner', note: 'Caught halfway through a very long story. The photographer has no regrets.' },
    { file: '06.jpg', date: '2026-08-22', title: 'Exhibit F: the long way round', place: 'The fair', note: 'You wanted the view from the top. You got it, and two more laps besides.' },
    { file: '07.jpg', date: '2026-09-14', title: 'Exhibit G: the downpour', place: 'Under an awning', note: 'No umbrella, and still the most composed person on the street.' },
    { file: '08.jpg', date: '2026-10-20', title: 'Exhibit H: the eve', place: 'Women’s Day', note: 'Flowers for the whole country today. Tomorrow is yours alone.' },
  ],

  cake: {
    age: null, // null = the age she turns, worked out from `birthday`
    trickCandle: true,
    trickLine: 'One of the candles is not ready for {ageWords}. Blow again.',
    message: 'Happy Birthday',
    birthdayLine: 'Happy birthday, {name}.',
    cutLine: 'Flavour: jackfruit, naturally.',
  },

  letter: {
    title: 'A letter for {name}',
    greeting: 'Dear {name},',
    paragraphs: [
      'Happy birthday. {AgeWords} suits you, and you have only been wearing it for a few minutes.',
      'This is where the real letter goes. Write about her year, the things you admire about her that she never notices, and what you hope {ageWords} brings her.',
      'Each paragraph fades in as she scrolls. To add another one, add a new line to this list in src/content.ts.',
      'Here is to a year that is kind to you, and a little less crowded on the 20th.',
    ],
    closing: 'Yours, always,',
    signature: '{sender}',
    image: null, // e.g. 'handwritten-letter.jpg' in src/assets/photos
    voiceNote: null, // e.g. 'birthday-message.m4a' in src/assets/audio
  },

  // Four tickets, she may scratch only `picks` of them. The rest stay sealed.
  tickets: {
    title: 'Four tickets, two choices',
    intro: 'Scratch any two. The other two stay sealed, so choose with care.',
    picks: 2,
    heldStamp: 'HELD OVER',
    heldLine: 'The other two are held over until your next birthday.',
    list: [
      { title: 'The Women’s Day Refund', note: 'One extra bouquet, since the 20th always gets flowers first.' },
      { title: 'A Day Off From Deciding', note: 'Where to eat, what to watch, which way to walk. All handled.' },
      { title: 'A Film of Your Choosing', note: 'Any film at all. Tissues provided, no remarks made.' },
      { title: 'Breakfast, Delivered', note: 'Any morning you like. Alarm not included.' },
    ],
  },

  // The real plan, hidden behind one of the four tickets. She is guaranteed to find it: if her first
  // ticket isn't it, the second one is, whichever she picks (it's decided the moment she starts scratching).
  // MOCK EVENT: replace every field with the real plan (or set `event: null` for four plain tickets).
  event: {
    feature: 'The feature presentation',
    kicker: 'Admit one · Guest of honour',
    title: 'Dinner, somewhere with a view',
    date: '2026-10-21',
    time: '19:30',
    hours: 3,
    place: 'To be revealed at the door',
    address: null,
    mapUrl: null,
    dress: 'Whatever makes you feel like the lead',
    note: 'Bring nothing. Everything has been arranged.',
  },

  finale: {
    photo: 'finale.jpg',
    caption: 'to be continued',
    title: 'The End',
    line: '…of this reel. {AgeWords} begins now.',
    // The credits open with "{fullName} in {AgeWords}", like an old film title
    credits: [
      { role: 'Featuring', name: 'Mít, as herself' },
      { role: 'Written & directed by', name: 'Nguyễn Sơn Tùng' },
      { role: 'Filmed on location', name: 'Wherever she happened to be' },
      { role: 'Running time', name: '{age} years, and counting' },
      { role: 'Soundtrack', name: 'Her laugh' },
      { role: 'Special thanks', name: 'Her parents, for the 21st of October 2004' },
    ],
    creditsNote: 'No jackfruits were harmed in the making of this film.',
  },

}
