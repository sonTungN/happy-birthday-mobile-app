import { content } from "../content";

/**
 * The studio's mark, the way the old studios opened their pictures: the name in script inside a film
 * reel's ring of perforations, the kind of studio in small capitals under it. Drawn in the current text
 * colour, so it goes on black (the credits) as well as on the app icon (public/, drawn from the same
 * numbers).
 */
export function StudioMark({ className = "" }: { className?: string }) {
  const { studio } = content;
  const words = studio.name.split(" ").filter(Boolean);
  const size = words.length > 2 ? 20 : 26;
  const step = size * 1.08;
  const firstBaseline = 68 - ((words.length - 1) * step) / 2;
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={`${studio.name} ${studio.kind}`}
    >
      <circle
        cx="60"
        cy="60"
        r="57"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* The perforations */}
      <circle
        cx="60"
        cy="60"
        r="51.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeDasharray="4.2 9.28"
        strokeOpacity="0.55"
        transform="rotate(-90 60 60)"
      />
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      {words.map((word, i) => (
        <text
          key={i}
          x="60"
          y={firstBaseline + i * step}
          textAnchor="middle"
          fontSize={size}
          fill="currentColor"
          className="font-script"
        >
          {word}
        </text>
      ))}
      <text
        x="60"
        y="99"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        letterSpacing="2.4"
        fill="currentColor"
        className="font-ui uppercase"
      >
        {studio.kind}
      </text>
    </svg>
  );
}
