/**
 * Lucide icons, inlined.
 *
 * The design system specifies Lucide (see the handoff's Assets section). These
 * are the upstream 24×24 path definitions with Lucide's stroke conventions —
 * kept local so the bundle gains no runtime dependency.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 16,
  strokeWidth = 2,
  className,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const PlaneIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </Svg>
);

export const CarIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </Svg>
);

export const PlayIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <polygon points="6 3 20 12 6 21 6 3" />
  </Svg>
);

export const PauseIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="14" y="4" width="4" height="16" rx="1" />
    <rect x="6" y="4" width="4" height="16" rx="1" />
  </Svg>
);

export const ChevronsLeftIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </Svg>
);

export const ChevronsRightIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </Svg>
);

export const UploadIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);

export const CropIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </Svg>
);

export const Share2Icon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Svg>
);

export const DownloadIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Svg>
);

export const MusicIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Svg>
);

export const MapPinIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M20 10c0 4.4-7 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);

export const GripVerticalIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </Svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="m12 19-7-7 7-7" />
    <line x1="19" y1="12" x2="5" y2="12" />
  </Svg>
);

export const PencilIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const XIcon: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);
