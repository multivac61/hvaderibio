export function group_by<T extends object>(list: T[], key: keyof T): Record<string | number | symbol, T[]> {
  return list.reduce((hash: Record<string | number | symbol, T[]>, obj: T) => {
    const group_key = obj[key] as keyof T;
    return {
      ...hash,
      [group_key]: (hash[group_key] || []).concat(obj),
    };
  }, {});
}

export function to_hhmm(time: number) {
  const mins = Math.round((time % 1) * 60);
  return `${Math.floor(time)}:${mins.toString().padStart(2, "0")}`;
}
