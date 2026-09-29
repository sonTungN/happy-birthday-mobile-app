# Reel Twenty-Two

A birthday present for Mít, built as a small web app for the phone. It looks and sounds like an old black-and-white film. It installs to the Home Screen and works offline once opened.

The roll has six frames, counted down in the top-right corner on a little strip of film:

| Frame   | Chapter        | What she does                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 06      | Lock screen    | Types the passcode (her birthday, `2110`). `2010`, `1021` and `2004` get their own replies.                                                                                                                                                                                                                                                                                                                                                                        |
| 05      | The notice     | Is asked to accept turning 22. Every appeal is denied by the Office of the Calendar; accepting stamps the court's round seal on it.                                                                                                                                                                                                                                                                                                                                    |
| 04      | The front page | Reads the newspaper from the day she was born. A blank sheet spins in like the headline montage of an old film and the ink comes up on it, then an editor marks it up by hand (yellow highlighter, red pen, her photo pasted on as a cut-out) as she scrolls down the page.                                                                                                                                                                                        |
| 03      | Darkroom       | Takes eight photos with an instant camera (seen from the back) and rubs them to develop. Then the camera turns round: a tap on its shutter dives into the lens and opens the phone's own camera (flash, zoom, front or back). She writes a line for the back of the print and prints it, or keeps the photo as it is. The prints spread into a grid she can rearrange; a tap turns one over, a swipe brings the next, and her own print can be saved to her phone. |
| 02      | Candles        | Strikes a match, lights the "2" and "2" candles, blows them out into the mic, cuts the same cake, and reads the letter that was inside. One continuous scene.                                                                                                                                                                                                                                                                                                      |
| 01 → 00 | Finale         | Scratches two of four tickets (one of her two is always the invitation to the real plan), winds on to the closing credits, then "The End".                                                                                                                                                                                                                                                                                                                         |

There are no "Next" buttons. When a chapter is finished, **Wind on** appears next to the frame counter; a tap (or a flick across the film strip) pulls the film on one frame with a ratchet click, and the next chapter starts.

Opened in a browser, it first offers to go full screen (on an iPhone that means adding it to the Home Screen, which the sheet explains); the button next to the speaker toggles it afterwards.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 (the countdown is skipped in dev)
```

To try it on a real iPhone, use `npm run dev:phone`. The mic and the camera only work over HTTPS, so this serves a self-signed certificate. Open the `https://192.168.x.x:5173` address it prints, then tap "Show Details → visit this website".

Other scripts: `npm test`, `npm run lint`, `npm run build`, `npm run preview`.

### Test links

Add these to the URL:

- `?chapter=news` jumps to a chapter. The ids are `lock`, `invite`, `news`, `darkroom`, `candles` and `finale`; `cake` and `letter` jump into the middle of the candles scene.
- `?reset` starts over, as if she had never opened it.
- `?nocountdown` skips the countdown on the deployed site, and that browser remembers it. `?countdown` shows it in dev. On the phone (or the Home Screen app, which can't take a query string), tap the lock icon five times while it counts down and enter `previewCode` from `content.ts`: that device then skips the countdown too. `?reset` forgets it. For a test build that never shows it: `VITE_SKIP_COUNTDOWN=1 npm run build`.
- `?debug&minrms=0.06&ratio=3.5` shows the mic level and lets you tune the blow detector.

## Make it yours

All the text lives in **`src/content.ts`**.

- **Names and dates.** `name`, `fullName`, `sender` (currently `Tùng`), `studio` (the two of you as a film studio: its mark is the app icon and opens the closing credits; `handle` is your shared account, or `''`), `birthday`, and `unlockAt` (currently `2026-10-21T00:00:00`). Before `unlockAt` the lock screen only shows a countdown.
  - The candles, the news date and "days on Earth" all come from `birthday`.
- **Placeholders.** `{name}`, `{fullName}`, `{sender}`, `{studio}`, `{age}`, `{ageWords}`, `{AgeWords}`, `{days}` and `{birthDate}` work in any sentence.
- **Photos.** Drop them into `src/assets/photos/` and use the same file names as `content.ts`:
  - `01.jpg`–`08.jpg`: the darkroom (up to eight).
  - `finale.jpg`: the end.
  - `lock.jpg`: the lock screen.
  - `gazette.png`: the baby photo on the front page. A `.png` with the background removed is pasted on as a cut-out with a red outline; a `.jpg` is printed as a press photo. To cut one out on an iPhone, open the photo, touch and hold the person until they light up, tap **Share** and AirDrop it to the Mac: it arrives as a `.png` without the background.

  They are resized and stripped of location data at build time. Convert iPhone `.HEIC` photos first: `sips -s format jpeg IMG_1234.HEIC --out 01.jpg`.

- **Photo captions.** Each photo has a caption on the front and a note on its back. The eight "Exhibit" captions are samples.
- **The letter.** `letter.paragraphs` holds the text, one entry per paragraph. You can also add a photo of a handwritten letter (`letter.image`) or a voice note in `src/assets/audio/` (`letter.voiceNote`).
- **Music.** Add an `.mp3` to `src/assets/audio/` and set `music`.
- **The front page.** `newspaper.masthead` is the paper's name. Each of `newspaper.stories` has a red `tag`, a `headline`, a `dek` (the line under it) and, if you like, a `body` (a list of paragraphs); the first story leads the page with the photo and its `note` (scribbled by the arrow), and runs its `body` on under the photo with a drop cap, the next two share a row. Put `==double equals==` around the words the yellow highlighter goes over, and `((double brackets))` around words the red pen circles. A circled phrase never breaks across lines, so if it drops to the next line and leaves a gap, put `\n` in the text where the line should break (before the phrase, usually). `newspaper.correction` is the signed box at the foot of the page.
- **The camera.** `darkroom.cameraName` is written on the back of the camera. `darkroom.selfie` holds the ninth frame: the title once the camera has turned round, the caption of her print and who signs its back (`signature`, "Us"; the line on the back is the one she writes when she prints it, `note` is only the fallback), and the caption and note of the blank print she gets instead if she doesn't allow the camera (or the phone has none).
- **Tickets.** `tickets.list` holds the four vouchers. She can scratch `tickets.picks` of them (2); the rest are stamped HELD OVER.
- **The real plan.** `event` hides behind one of the four tickets. What's behind a ticket is drawn the moment she starts scratching it:
  - her first ticket is the invitation 1 time in 4;
  - if it isn't, her second ticket always is, whichever she picks.

  Every replay is a new draw. If she finds it on her first pick, the ticket shows "Click for details" and waits; once both picks are done the invitation opens by itself (unless she has already read it), with an "Add to calendar" button. It is currently a MOCK dinner on 21 Oct at 19:30: fill in the real title, date, time, place, dress code and note (plus `address` / `mapUrl` for directions), or set `event: null` for four plain tickets.

## Change the look

Styles are [Tailwind CSS](https://tailwindcss.com/docs) classes written on each element, so a change is made where the element is.

- **One element** (a size, a gap, a colour): find it in `src/chapters/` or `src/components/` and edit its `className`, e.g. `text-[22px]` → `text-[24px]`, `mt-3` → `mt-5`, `opacity-72` → `opacity-90`.
- **The palette and the fonts** are in `src/styles/global.css`, under `@theme`. Each colour gives its classes (`--color-bone` → `bg-bone`, `text-bone`, `border-bone`) and each font a `font-*` class; change a value there and everything using it follows.
- **Drawn things** that would be unreadable as a line of classes (the camera, the cake, the newsprint, the film grain) and all the animations are plain CSS in `src/styles/effects.css`, in a section titled with the file that uses it.
- `desk:` classes only apply on a laptop, where the site sits in a phone-sized frame; `short:` classes only on short phones like the iPhone SE.

The [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) extension for VS Code autocompletes the classes and shows the CSS behind each one.

## Put it online (free, Vercel)

1. Push this folder to a private GitHub repo.
2. On vercel.com, choose **Add New → Project** and import the repo. The defaults work: Vite, `npm run build`, output `dist`.
3. Send her the link. On iPhone: Share → **Add to Home Screen** makes it open full-screen like an app.

There is no web app manifest on purpose: on iOS 26 a page that links one (or asks for a translucent status bar) opens from the Home Screen one status bar too short, with a bare strip at the bottom. The iPhone metas in `index.html` are enough for it to open full screen, and the service worker keeps it working offline.

The site asks search engines not to index it (`noindex` meta tag plus an `X-Robots-Tag` header). The link preview image uses the Vercel production URL automatically; set `SITE_URL` if you use a custom domain.

## Credits

The paper and knife sounds are from Kenney's [RPG Audio](https://kenney.nl/assets/rpg-audio) pack (CC0, see `src/assets/sfx/LICENSE-kenney.txt`). Every other sound is synthesized in the browser.

The newspaper is set in [Newsreader](https://github.com/productiontype/Newsreader) by Production Type, with [Chomsky](https://github.com/ctrlcctrlv/chomsky) by Fredrick Brennan for the masthead and [Caveat](https://github.com/googlefonts/caveat) for the red pen (all SIL Open Font License, see `src/assets/fonts/`). Its crumpled newsprint is baked from ambientCG's [Paper 003](https://ambientcg.com/view?id=Paper003) (CC0).

The front page uses real news from that week:

- The Red Sox won Game 7 of the ALCS on 20 Oct 2004.
- The finished human genome was published in _Nature_ on 21 Oct 2004.
