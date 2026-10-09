import { describe, expect, test } from "vitest";
import { setTimeout as sleep } from "timers/promises";
import { map_concurrent } from "../src/lib/concurrency";

describe("map_concurrent", () => {
  test("preserves input order while running at most `limit` tasks at once", async () => {
    let running = 0;
    let peak = 0;
    const delays = [30, 5, 20, 1, 10, 15];

    const result = await map_concurrent(delays, 2, async (ms, index) => {
      running++;
      peak = Math.max(peak, running);
      await sleep(ms);
      running--;
      return `${index}:${ms}`;
    });

    expect(result).toEqual(["0:30", "1:5", "2:20", "3:1", "4:10", "5:15"]);
    expect(peak).toBe(2);
  });

  test("handles empty input", async () => {
    expect(await map_concurrent([], 4, async () => 1)).toEqual([]);
  });
});
