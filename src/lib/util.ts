export function groupBy(list: any[], key: string) {
	return list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})
}

export function in_range(x: number, from: number, to: number) {
	return from <= x && x <= to
}

export function float_to_hh_mm(time: number) {
	return `${Math.floor(time)}:${(time % 1) * 60}`.replace(':0', ':00')
}

export function to_float(date: string) {
	const [hours, minutes] = new Date(date)
		.toLocaleTimeString('en', { timeStyle: 'short', hour12: false })
		.split(':')
	return parseFloat(hours) + parseFloat(minutes) / 60
}
