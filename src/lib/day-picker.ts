import { DAYS_SHOWN } from "#lib/constants.js";
import { reykjavik_date_after } from "#lib/reykjavik.js";

export const AVAILABLE_DAYS = Array.from({ length: DAYS_SHOWN }, (_, day) => String(day));

const WEEKDAYS = ["Sunnudag", "Mánudag", "Þriðjudag", "Miðvikudag", "Fimmtudag", "Föstudag", "Laugardag"];

export const get_day_label = (day: string, now = new Date()) => {
  if (day === "0") return "Í dag";
  if (day === "1") return "Á morgun";

  return WEEKDAYS[new Date(reykjavik_date_after(now, parseInt(day))).getUTCDay()];
};
