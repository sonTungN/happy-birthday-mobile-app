export interface PhotoEntry {
  /** File name inside src/assets/photos, e.g. '01.jpg' */
  file: string
  /** 'YYYY-MM-DD': printed on the photo (date stamp) and on the back */
  date: string
  /** Handwritten caption on the polaroid's bottom border */
  title: string
  /** Where it was taken (back of the photo) */
  place?: string
  /** One or two sentences on the back */
  note: string
  /** Who signed the back. Default: `sender` */
  signedBy?: string
  /** How to crop the photo into a square (CSS object-position), e.g. 'center 30%' */
  focus?: string
}

export interface Coupon {
  title: string
  note?: string
}

export interface NewsStory {
  /** The small red label above the headline, e.g. 'Births' or 'Oct 20, 2004' */
  tag: string
  /** Put ==double equals== around the words the yellow marker goes over, ((double brackets)) for a red pen circle */
  headline: string
  /** One or two sentences under the headline. The marks work here too */
  dek: string
  /**
   * A photo in src/assets/photos. A .png with the background removed is pasted on as a cut-out with a red
   * outline (iPhone: touch and hold the person in Photos, then Share); a .jpg is printed as a press photo.
   * Only the first story shows its photo.
   */
  photo?: string | null
  /** Scribbled in red pen next to the arrow that points at the photo */
  note?: string
}

export interface PlanEvent {
  /** Label on the scratch ticket and above the invitation, e.g. 'The feature presentation' */
  feature: string
  kicker: string
  title: string
  /** 'YYYY-MM-DD' and 'HH:MM', in her local time */
  date: string
  time: string
  /** Length in hours (for the calendar entry) */
  hours: number
  place: string
  /** Street address for the calendar entry. null = leave out */
  address: string | null
  /** A Google/Apple Maps link. null = no directions button */
  mapUrl: string | null
  dress: string
  note: string
}

export interface Credit {
  role: string
  name: string
}

export interface Content {
  name: string
  fullName: string
  sender: string
  initials: string
  /** 'YYYY-MM-DD': drives the age on the candles, the newspaper's date and the "days on Earth" counter */
  birthday: string
  unlockAt: string | null
  passcode: string
  passcodeHint: string
  /** For testing before `unlockAt`: five quick taps on the lock during the countdown, then this code, and that device skips the countdown */
  previewCode: string
  /** Wrong passcodes that get their own reply instead of the plain hint */
  passcodeReplies: Record<string, string>
  lockPhoto: string
  music: string | null
  invite: {
    eyebrow: string
    question: string
    accept: string
    appeal: string
    /** One ruling per appeal. After the last one the appeal button is gone. */
    rulings: string[]
    /** Stamped on every ruling */
    denied: string
    /** The round seal stamped on the notice when she accepts: the word in the middle and the text around the ring */
    approved: string
    sealRing: string
    /** 3 photos for the invite screen. Leave out to use the first 3 of `photos` */
    photos?: string[]
  }
  newspaper: {
    /** The paper's name, set in blackletter across the top of the page */
    masthead: string
    /** Left of the date line under the masthead (the date itself comes from `birthday`) */
    edition: string
    /** The first story leads the page with the photo, the next two share a row, any others run full width */
    stories: NewsStory[]
    /** The boxed note at the foot of the page. Marks work in `text` */
    correction: { title: string; text: string; signature: string }
  }
  darkroom: {
    title: string
    emptyBoard: string
    /** Under the title while she is still shooting: the prints can be moved around */
    arrangeHint: string
    outro: string
    /** Under the title once the prints are in the grid */
    gridHint: string
    /** Written on the back of the camera, bottom left */
    cameraName: string
    /** The last frame is hers: after the roll, the camera turns round and takes her picture with the front camera */
    selfie: {
      /** Title once the roll is done and the camera has turned round */
      title: string
      /** Under the camera, in place of the usual hint */
      hint: string
      /** On the print's border, and on its back */
      caption: string
      place?: string
      note: string
      /** The print comes out blank when the camera can't be used (no permission, no camera): its caption and note */
      blankCaption: string
      blankNote: string
      /** Button under her print in the viewer: saves it to her phone */
      keep: string
      /** Who signs the back of her print (the two of them, or whoever took it) */
      signature: string
    }
  }
  photos: PhotoEntry[]
  cake: {
    /** Number candles show this age. null = worked out from `birthday` */
    age: number | null
    /** One candle relights itself once, so she has to blow again */
    trickCandle: boolean
    trickLine: string
    message: string
    birthdayLine: string
    /** Shown under the cake once it's cut */
    cutLine: string
  }
  letter: {
    title: string
    greeting: string
    paragraphs: string[]
    closing: string
    signature: string
    /** Photo of a handwritten letter (in src/assets/photos). null = typed text only */
    image: string | null
    /** Voice note (in src/assets/audio). null = hidden */
    voiceNote: string | null
  }
  tickets: {
    title: string
    intro: string
    /** How many tickets she may scratch */
    picks: number
    /** Stamped on the tickets she didn't pick */
    heldStamp: string
    heldLine: string
    list: Coupon[]
  }
  finale: {
    photo: string
    caption: string
    title: string
    line: string
    credits: Credit[]
    creditsNote: string
  }
  /** The real plan, hidden behind one of the scratch tickets. null = four plain tickets */
  event: PlanEvent | null
}

export interface ChapterProps {
  onDone: () => void
}
