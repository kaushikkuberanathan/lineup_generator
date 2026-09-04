import {
  LuArrowLeft,
  LuCalendarDays,
  LuChevronRight,
  LuCircleCheck,
  LuCircleHelp,
  LuClipboardList,
  LuEllipsis,
  LuExternalLink,
  LuEye,
  LuHouse,
  LuInfo,
  LuLayoutList,
  LuLockKeyhole,
  LuLockKeyholeOpen,
  LuMusic2,
  LuPencil,
  LuPlus,
  LuSettings,
  LuSearch,
  LuShare2,
  LuTrash2,
  LuTriangleAlert,
  LuTrophy,
  LuUpload,
  LuDownload,
  LuUserRound,
  LuUsersRound,
  LuX,
} from 'react-icons/lu';
import { GiBaseballBat, GiBaseballGlove } from 'react-icons/gi';

var ICON_MAP = {
  home: LuHouse,
  team: LuUsersRound,
  calendar: LuCalendarDays,
  gameDay: LuTrophy,
  support: LuCircleHelp,
  add: LuPlus,
  player: LuUserRound,
  lineup: LuLayoutList,
  roster: LuClipboardList,
  settings: LuSettings,
  search: LuSearch,
  share: LuShare2,
  chevronRight: LuChevronRight,
  overflow: LuEllipsis,
  success: LuCircleCheck,
  attention: LuTriangleAlert,
  back: LuArrowLeft,
  baseball: GiBaseballBat,
  glove: GiBaseballGlove,
  edit: LuPencil,
  delete: LuTrash2,
  close: LuX,
  download: LuDownload,
  upload: LuUpload,
  music: LuMusic2,
  lock: LuLockKeyhole,
  unlock: LuLockKeyholeOpen,
  view: LuEye,
  info: LuInfo,
  externalLink: LuExternalLink,
};

var SIZE_MAP = { sm: 16, md: 20, lg: 24 };

export var ICON_NAMES = Object.freeze(Object.keys(ICON_MAP));

export function Icon({ name, size = 'md', label, color = 'currentColor', ...rest }) {
  var IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    /* v8 ignore next -- import.meta.env.DEV is compile-time false in production */
    if (import.meta.env.DEV) {
      console.error(`Unknown Dugout Lineup icon: ${name}`);
    }
    return null;
  }

  var pixelSize = SIZE_MAP[size] || size;
  var accessibility = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': 'true', focusable: 'false' };

  return (
    <IconComponent
      size={pixelSize}
      color={color}
      {...accessibility}
      {...rest}
    />
  );
}
