import {
  LuCalendarDays,
  LuChevronRight,
  LuCircleCheck,
  LuCircleHelp,
  LuClipboardList,
  LuEllipsis,
  LuHouse,
  LuLayoutList,
  LuPlus,
  LuSettings,
  LuSearch,
  LuShare2,
  LuTriangleAlert,
  LuTrophy,
  LuUserRound,
  LuUsersRound,
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
  baseball: GiBaseballBat,
  glove: GiBaseballGlove,
};

var SIZE_MAP = { sm: 16, md: 20, lg: 24 };

export var ICON_NAMES = Object.freeze(Object.keys(ICON_MAP));

export function Icon({ name, size = 'md', label, color = 'currentColor', ...rest }) {
  var IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    console.error(`Unknown Dugout Lineup icon: ${name}`);
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
