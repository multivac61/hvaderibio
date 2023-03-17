export function group_by<T extends object>(list: T[], key: keyof T): Record<string | number | symbol, T[]> {
	return list.reduce(
		(hash: Record<string | number | symbol, T[]>, obj: T) => {
			const group_key = obj[key] as keyof T;
			return {
				...hash,
				[group_key]: (hash[group_key] || []).concat(obj)
			}
		},
		{}
	)
}

export function in_range(x: number, from: number, to: number) {
	return from <= x && x <= to
}

export function to_hhmm(time: number) {
	return `${Math.floor(time)}:${(time % 1) * 60}`.replace(':0', ':00')
}

export function to_float(date: string) {
	const [hours, minutes] = new Date(date)
		.toLocaleTimeString('en', { timeStyle: 'short', hour12: false })
		.split(':')
	return parseFloat(hours) + parseFloat(minutes) / 60
}