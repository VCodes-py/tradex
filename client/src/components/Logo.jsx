// TradeX wordmark. Letters are drawn as paths so the logo never depends on a font.
export default function Logo({ height = 16, title = 'TradeX' }) {
  return (
    <svg className="logo" viewBox="-3 -26 341 71" height={height} role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="miter"><path transform="translate(0 0)" d="M0 3.5H36M18 3.5V40"/><path transform="translate(45 0)" d="M3.5 40V3.5H21a9 9 0 0 1 0 18H3.5"/><path transform="translate(133 0)" d="M3.5 0V40M3.5 3.5H18a16.5 16.5 0 0 1 0 33H3.5"/><path transform="translate(180 0)" d="M3.5 0V40M0 3.5H32M0 20H28M0 36.5H32"/></g><g fill="currentColor" fillRule="evenodd"><path transform="translate(45 0)" d="M13 21H21L34 40H26Z"/><path transform="translate(88 0)" d="M0 40L13.5 0H22.5L36 40H28.5L26.5 33.5H9.5L7.5 40ZM11.7 27H24.3L18 8.3Z"/><path transform="translate(221 0)" d="M0 0H9L40 40H31Z"/><path transform="translate(221 0)" d="M0 40H9L40 0C58 -10 80 -17 112 -20C76 -22.5 48 -14 31 0Z"/></g>
    </svg>
  );
}

export function LogoMark({ height = 16 }) {
  return (
    <svg className="logo" viewBox="-2 -24 116 66" height={height} aria-hidden="true">
      <g fill="currentColor">
        <path d="M0 0H9L40 40H31Z" />
        <path d="M0 40H9L40 0C58 -10 80 -17 112 -20C76 -22.5 48 -14 31 0Z" />
      </g>
    </svg>
  );
}
