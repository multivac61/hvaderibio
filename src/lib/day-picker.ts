import { DAYS_SHOWN } from "#lib/constants.js";
import { reykjavik_date_after } from "#lib/reykjavik.js";

export const AVAILABLE_DAYS = Array.from({ length: DAYS_SHOWN }, (_, day) => String(day));

const WEEKDAYS = ["sunnudag", "mánudag", "þriðjudag", "miðvikudag", "fimmtudag", "föstudag", "laugardag"];

export const get_day_label = (day: string, now = new Date()) => {
  if (day === "0") return "í dag";
  if (day === "1") return "á morgun";

  return WEEKDAYS[new Date(reykjavik_date_after(now, parseInt(day))).getUTCDay()];
};
