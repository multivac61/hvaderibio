export function group_by<T extends object>(list: T[], key: keyof T): Record<string | number | symbol, T[]> {
  return list.reduce((hash: Record<string | number | symbol, T[]>, obj: T) => {
    const group_key = obj[key] as keyof T;
    return {
      ...hash,
      [group_key]: (hash[group_key] || []).concat(obj),
    };
  }, {});
}

export function in_range(x: number, from: number, to: number) {
  return from <= x && x <= to;
}

export function to_hhmm(time: number) {
  return `${Math.floor(time)}:${(time % 1) * 60}`.replace(":0", ":00");
}

export function to_float(date: string) {
  const [hours, minutes] = new Date(date).toLocaleTimeString("en", { timeStyle: "short", hour12: false }).split(":");
  return parseFloat(hours) + parseFloat(minutes) / 60;
}

import { styleToString } from "@melt-ui/svelte/internal/helpers";
import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

type FlyAndScaleOptions = {
  y: number;
  start: number;
  duration?: number;
};
const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
  const [minA, maxA] = scaleA;
  const [minB, maxB] = scaleB;

  const percentage = (valueA - minA) / (maxA - minA);
  const valueB = percentage * (maxB - minB) + minB;

  return valueB;
};
export const flyAndScale = (node: HTMLElement, options: FlyAndScaleOptions): TransitionConfig => {
  const style = getComputedStyle(node);
  const transform = style.transform === "none" ? "" : style.transform;

  return {
    duration: options.duration ?? 150,
    delay: 0,
    css: (t: number) => {
      const y = scaleConversion(t, [0, 1], [options.y, 0]);
      const scale = scaleConversion(t, [0, 1], [options.start, 1]);

      return styleToString({
        transform: `${transform} translate3d(0, ${y}px, 0) scale(${scale})`,
        opacity: t,
      });
    },
    easing: cubicOut,
  };
};
