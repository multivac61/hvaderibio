// Shared day selection state that persists across pages
class DayState {
  value = $state("0");

  set(day: string) {
    this.value = day;
  }
}

export const dayState = new DayState();
