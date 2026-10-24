// lib/meal_sections.js - Sri Gokulam Meal Timings & Auto-Scheduling Engine
// Manages Breakfast, Lunch, Evening Snacks, and Dinner with live IST schedule evaluation and admin overrides.

export const DEFAULT_MEAL_SECTIONS = [
  {
    id: 'BREAKFAST',
    name: 'Breakfast',
    tamilName: 'காலை உணவு',
    icon: '🌅',
    startTime: '07:00',
    endTime: '11:30',
    timeLabel: '7:00 AM – 11:30 AM',
    isEnabled: true,
    overrideStatus: 'AUTO', // 'AUTO' | 'FORCE_ACTIVE' | 'FORCE_INACTIVE'
    displayOrder: 1,
    description: 'Fresh morning idlis, pongal, crispy vadas, roasts & degree filter coffee',
  },
  {
    id: 'LUNCH',
    name: 'Lunch',
    tamilName: 'மதிய உணவு',
    icon: '☀️',
    startTime: '11:30',
    endTime: '15:00',
    timeLabel: '11:30 AM – 3:00 PM',
    isEnabled: true,
    overrideStatus: 'AUTO', // 'AUTO' | 'FORCE_ACTIVE' | 'FORCE_INACTIVE'
    displayOrder: 2,
    description: 'Royal Chettinad meals, variety rice, biryanis, rotis & gravies',
  },
  {
    id: 'EVENING_SNACKS',
    name: 'Evening Snacks',
    tamilName: 'செட்டிநாடு பலகாரம்',
    icon: '☕',
    startTime: '16:00',
    endTime: '18:00',
    timeLabel: '4:00 PM – 6:00 PM',
    isEnabled: true,
    overrideStatus: 'AUTO', // 'AUTO' | 'FORCE_ACTIVE' | 'FORCE_INACTIVE'
    displayOrder: 3,
    description: 'Traditional Chettinad savories, paniyaram, kozhukattai & sweets',
  },
  {
    id: 'DINNER',
    name: 'Dinner',
    tamilName: 'இரவு உணவு',
    icon: '🌙',
    startTime: '18:00',
    endTime: '22:30',
    timeLabel: '6:00 PM – 10:30 PM',
    isEnabled: true,
    overrideStatus: 'AUTO', // 'AUTO' | 'FORCE_ACTIVE' | 'FORCE_INACTIVE'
    displayOrder: 4,
    description: 'Idlis, idiyappam, hot chapathi, dosas, parottas, kothu & fried rice',
  },
];

/**
 * Gets current Indian Standard Time (IST, UTC+05:30) as HH:MM format and numeric minutes from midnight.
 */
export function getCurrentIstTime(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const timeStr = `${hour}:${minute}`;
    const totalMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);
    return { timeStr, totalMinutes, hour: parseInt(hour, 10), minute: parseInt(minute, 10) };
  } catch (e) {
    // Fallback to local time if timezone format fails
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return { timeStr: `${h}:${m}`, totalMinutes: date.getHours() * 60 + date.getMinutes(), hour: date.getHours(), minute: date.getMinutes() };
  }
}

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Evaluates whether a meal section is active right now.
 * Takes into account:
 * 1. isEnabled: if false -> INACTIVE
 * 2. overrideStatus:
 *    - 'FORCE_ACTIVE': always ACTIVE
 *    - 'FORCE_INACTIVE': always INACTIVE
 *    - 'AUTO': ACTIVE if current time is within [startTime, endTime)
 */
export function evaluateSectionStatus(section, date = new Date()) {
  if (!section) return { isActive: false, reason: 'NOT_FOUND' };

  if (section.isEnabled === false) {
    return {
      isActive: false,
      reason: 'DISABLED',
      badge: '⛔ Section Disabled',
      statusClass: 'disabled',
    };
  }

  if (section.overrideStatus === 'FORCE_ACTIVE') {
    return {
      isActive: true,
      reason: 'FORCE_ACTIVE',
      badge: '🟢 Serving Now (Admin Override)',
      statusClass: 'active',
    };
  }

  if (section.overrideStatus === 'FORCE_INACTIVE') {
    return {
      isActive: false,
      reason: 'FORCE_INACTIVE',
      badge: '🔴 Closed (Admin Override)',
      statusClass: 'closed',
    };
  }

  // AUTO schedule check
  const { totalMinutes } = getCurrentIstTime(date);
  const startMin = timeStringToMinutes(section.startTime);
  const endMin = timeStringToMinutes(section.endTime);

  const isWithinWindow = totalMinutes >= startMin && totalMinutes < endMin;

  if (isWithinWindow) {
    return {
      isActive: true,
      reason: 'SCHEDULE_ACTIVE',
      badge: `🟢 Serving Now (${section.timeLabel || `${section.startTime} - ${section.endTime}`})`,
      statusClass: 'active',
    };
  }

  return {
    isActive: false,
    reason: 'SCHEDULE_INACTIVE',
    badge: `⏰ Next Service: ${section.timeLabel || `${section.startTime} - ${section.endTime}`}`,
    statusClass: 'upcoming',
  };
}

/**
 * Returns all sections with their evaluated live statuses
 */
export function getEvaluatedMealSections(sections = DEFAULT_MEAL_SECTIONS, date = new Date()) {
  const list = Array.isArray(sections) && sections.length > 0 ? sections : DEFAULT_MEAL_SECTIONS;
  return list.map(sec => {
    const status = evaluateSectionStatus(sec, date);
    return {
      ...sec,
      ...status,
    };
  }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}
