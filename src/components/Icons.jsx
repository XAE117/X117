const S = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  />
)

export function CalendarIcon(props) {
  return (
    <S {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </S>
  )
}

export function ColumnsIcon(props) {
  return (
    <S {...props}>
      <path d="M2 20h20" />
      <path d="M12 4L2 8h20z" />
      <path d="M6 8v12M10 8v12M14 8v12M18 8v12" />
    </S>
  )
}

export function HeartIcon(props) {
  return (
    <S {...props}>
      <path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        fill="currentColor"
        stroke="none"
      />
    </S>
  )
}

export function MapIcon(props) {
  return (
    <S {...props}>
      <path d="M1 6l7-4 8 4 7-4v16l-7 4-8-4-7 4V6z" />
      <path d="M8 2v16M16 6v16" />
    </S>
  )
}

export function SignalIcon(props) {
  return (
    <S {...props}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14" />
    </S>
  )
}

export function MoonIcon(props) {
  return (
    <S {...props}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </S>
  )
}

export function FilmStripIcon(props) {
  return (
    <S {...props}>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20M17 2v20" />
      <path d="M2 7h5M2 12h5M2 17h5M17 7h5M17 12h5M17 17h5" />
    </S>
  )
}

export function FilmReelIcon(props) {
  return (
    <S {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="18.5" cy="12" r="2" />
      <circle cx="14" cy="18.2" r="2" />
      <circle cx="6.7" cy="15.8" r="2" />
      <circle cx="6.7" cy="8.2" r="2" />
      <circle cx="14" cy="5.8" r="2" />
    </S>
  )
}

export function TrumpetIcon(props) {
  return (
    <S {...props} strokeWidth="2">
      <path d="M2 12h5" strokeWidth="3" strokeLinecap="round" />
      <rect x="7" y="9" width="7" height="6" rx="1" />
      <path d="M14 9c2-2 4-4 8-4v14c-4 0-6-2-8-4z" fill="currentColor" strokeWidth="0" />
      <line x1="9.5" y1="9" x2="9.5" y2="6" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="9" x2="12" y2="6" strokeWidth="2" strokeLinecap="round" />
    </S>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <S {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </S>
  )
}

export function ClapboardIcon(props) {
  return (
    <S {...props}>
      <path d="M4 20h16a2 2 0 002-2V8H2v10a2 2 0 002 2z" />
      <path d="M2 8l2-4h16l2 4" />
      <path d="M7 4l-2 4M12 4l-2 4M17 4l-2 4" />
    </S>
  )
}

export function DiscoBallIcon(props) {
  return (
    <S {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c-2.5 3-4 6-4 9s1.5 6 4 9" />
      <path d="M12 3c2.5 3 4 6 4 9s-1.5 6-4 9" />
      <path d="M3 12h18" />
      <path d="M4.5 7.5h15M4.5 16.5h15" />
    </S>
  )
}

export function StarIcon(props) {
  return (
    <S {...props}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="currentColor"
        stroke="none"
      />
    </S>
  )
}

export function TargetIcon(props) {
  return (
    <S {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </S>
  )
}

export function BubblesIcon(props) {
  return (
    <S {...props}>
      <circle cx="8" cy="10" r="5" />
      <circle cx="17" cy="8" r="3" />
      <circle cx="15" cy="17" r="4" />
    </S>
  )
}

export function MusicNoteIcon(props) {
  return (
    <S {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="16" r="3" fill="currentColor" stroke="none" />
    </S>
  )
}
