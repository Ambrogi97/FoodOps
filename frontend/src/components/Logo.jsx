export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Orange rounded background */}
      <rect width="64" height="64" rx="14" fill="#f97316"/>

      {/* Fork — represents food / restaurant */}
      <rect x="9"  y="8" width="3.5" height="18" rx="1.75" fill="white"/>
      <rect x="16" y="8" width="3.5" height="18" rx="1.75" fill="white"/>
      <rect x="23" y="8" width="3.5" height="18" rx="1.75" fill="white"/>
      {/* Shoulder: tines converge into the handle */}
      <path d="M9 26 L9 28 Q17.75 35 26.5 28 L26.5 26 Z" fill="white"/>
      {/* Handle */}
      <rect x="16" y="32" width="3.5" height="23" rx="1.75" fill="white"/>

      {/* Ascending bar chart — represents operations / analytics */}
      <rect x="37" y="47" width="5.5" height="9"  rx="2" fill="white"/>
      <rect x="44" y="37" width="5.5" height="19" rx="2" fill="white" opacity="0.9"/>
      <rect x="51" y="27" width="5.5" height="29" rx="2" fill="white" opacity="0.85"/>
    </svg>
  )
}
