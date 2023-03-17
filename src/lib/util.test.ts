import { group_by, in_range, to_float, to_hhmm } from './util'
import { it, expect } from 'vitest'

it('should group by key', () => {
	const list = [{ a: 1 }, { a: 2 }, { a: 1 }]
	console.log(list, group_by(list, 'a'))
	expect(group_by([{ a: 1 }, { a: 2 }, { a: 1 }], 'a')).toStrictEqual({
		1: [{ a: 1 }, { a: 1 }],
		2: [{ a: 2 }]
	})
})

it('test hvaderibio', function () {
	const list = [
		{ id: 1, name: 'a' },
		{ id: 1, name: 'b' },
		{ id: 2, name: 'c' },
		{ id: 2, name: 'd' }
	]
	const expected = {
		1: [
			{ id: 1, name: 'a' },
			{ id: 1, name: 'b' }
		],
		2: [
			{ id: 2, name: 'c' },
			{ id: 2, name: 'd' }
		]
	}
	expect(group_by(list, 'id')).toStrictEqual(expected)
})

it('in_range should work as expected', () => {
	expect(in_range(10, 0, 100)).toBe(true)
	expect(in_range(1, 0, 10)).toBe(true)
	expect(in_range(0, 0, 10)).toBe(true)
	expect(in_range(10, 0, 10)).toBe(true)
	expect(in_range(-1, 0, 10)).toBe(false)
	expect(in_range(-1, 0, 10)).toBe(false)

	expect(in_range(3, 1, 9)).toBe(true)
	expect(in_range(1, 1, 9)).toBe(true)
	expect(in_range(9, 1, 9)).toBe(true)
	expect(in_range(0, 1, 9)).toBe(false)
	expect(in_range(10, 1, 9)).toBe(false)
	expect(in_range(0, 1, 0)).toBe(false)

	expect(in_range(10, 0, 100)).toBe(true)
	expect(in_range(1, 0, 10)).toBe(true)
	expect(in_range(0, 0, 10)).toBe(true)
	expect(in_range(-1, 0, 10)).toBe(false)
})

it('test hvaderibio.to_float', function () {
	expect(to_float('2020-06-01T12:00:00+00:00')).toBe(12.0)

	expect(to_float('2019-10-28T09:00:00+00:00')).toBe(9)
	expect(to_float('2019-10-28T09:30:00+00:00')).toBe(9.5)
	expect(to_float('2019-10-28T10:00:00+00:00')).toBe(10)
	expect(to_float('2019-10-28T10:30:00+00:00')).toBe(10.5)
	expect(to_float('2019-10-28T11:00:00+00:00')).toBe(11)
	expect(to_float('2019-10-28T11:30:00+00:00')).toBe(11.5)
	expect(to_float('2019-10-28T12:00:00+00:00')).toBe(12)
	expect(to_float('2019-10-28T12:30:00+00:00')).toBe(12.5)
	expect(to_float('2019-10-28T13:00:00+00:00')).toBe(13)
	expect(to_float('2019-10-28T13:30:00+00:00')).toBe(13.5)
	expect(to_float('2019-10-28T14:00:00+00:00')).toBe(14)
	expect(to_float('2019-10-28T14:30:00+00:00')).toBe(14.5)
	expect(to_float('2019-10-28T15:00:00+00:00')).toBe(15)
	expect(to_float('2019-10-28T15:30:00+00:00')).toBe(15.5)
	expect(to_float('2019-10-28T16:00:00+00:00')).toBe(16)
	expect(to_float('2019-10-28T16:30:00+00:00')).toBe(16.5)
	expect(to_float('2019-10-28T17:00:00+00:00')).toBe(17)
	expect(to_float('2019-10-28T17:30:00+00:00')).toBe(17.5)
	expect(to_float('2019-10-28T18:00:00+00:00')).toBe(18)
	expect(to_float('2019-10-28T18:30:00+00:00')).toBe(18.5)
	expect(to_float('2019-10-28T19:00:00+00:00')).toBe(19)
	expect(to_float('2019-10-28T19:30:00+00:00')).toBe(19.5)
	expect(to_float('2019-10-28T20:00:00+00:00')).toBe(20)
	expect(to_float('2019-10-28T20:30:00+00:00')).toBe(20.5)
	expect(to_float('2019-10-28T21:00:00+00:00')).toBe(21)
	expect(to_float('2019-10-28T21:30:00+00:00')).toBe(21.5)
	expect(to_float('2019-10-28T22:00:00+00:00')).toBe(22)
	expect(to_float('2019-10-28T22:30:00+00:00')).toBe(22.5)
	expect(to_float('2019-10-28T23:00:00+00:00')).toBe(23)
	expect(to_float('2019-10-28T23:30:00+00:00')).toBe(23.5)
})

it('test hvaderibio.to_hhmm', function (done) {
	expect(to_hhmm(0)).toBe('0:00')
	expect(to_hhmm(0.5)).toBe('0:30')
	expect(to_hhmm(1)).toBe('1:00')
	expect(to_hhmm(1.5)).toBe('1:30')
	expect(to_hhmm(2)).toBe('2:00')
	expect(to_hhmm(2.5)).toBe('2:30')
	expect(to_hhmm(3)).toBe('3:00')
	expect(to_hhmm(3.5)).toBe('3:30')
	expect(to_hhmm(4)).toBe('4:00')
	expect(to_hhmm(4.5)).toBe('4:30')
	expect(to_hhmm(5)).toBe('5:00')
	expect(to_hhmm(5.5)).toBe('5:30')
	expect(to_hhmm(6)).toBe('6:00')
	expect(to_hhmm(6.5)).toBe('6:30')
	expect(to_hhmm(7)).toBe('7:00')
	expect(to_hhmm(7.5)).toBe('7:30')
	expect(to_hhmm(8)).toBe('8:00')
	expect(to_hhmm(8.5)).toBe('8:30')
	expect(to_hhmm(9)).toBe('9:00')
	expect(to_hhmm(9.5)).toBe('9:30')
	expect(to_hhmm(10)).toBe('10:00')
	expect(to_hhmm(10.5)).toBe('10:30')
	expect(to_hhmm(11)).toBe('11:00')
	expect(to_hhmm(11.5)).toBe('11:30')
	expect(to_hhmm(12)).toBe('12:00')
	expect(to_hhmm(12.5)).toBe('12:30')
	expect(to_hhmm(13)).toBe('13:00')
	expect(to_hhmm(13.5)).toBe('13:30')
	expect(to_hhmm(14)).toBe('14:00')
	expect(to_hhmm(14.5)).toBe('14:30')
	expect(to_hhmm(15)).toBe('15:00')
	expect(to_hhmm(15.5)).toBe('15:30')
	expect(to_hhmm(16)).toBe('16:00')
	expect(to_hhmm(16.5)).toBe('16:30')
	expect(to_hhmm(17)).toBe('17:00')
	expect(to_hhmm(17.5)).toBe('17:30')
	expect(to_hhmm(18)).toBe('18:00')
	expect(to_hhmm(18.5)).toBe('18:30')
	expect(to_hhmm(19)).toBe('19:00')
	expect(to_hhmm(19.5)).toBe('19:30')
	expect(to_hhmm(20)).toBe('20:00')
	expect(to_hhmm(20.5)).toBe('20:30')
	expect(to_hhmm(21)).toBe('21:00')
	expect(to_hhmm(21.5)).toBe('21:30')
	expect(to_hhmm(22)).toBe('22:00')
	expect(to_hhmm(22.5)).toBe('22:30')
	expect(to_hhmm(23)).toBe('23:00')
	expect(to_hhmm(23.5)).toBe('23:30')
	expect(to_hhmm(24)).toBe('24:00')
	expect(to_hhmm(24.5)).toBe('24:30')
	expect(to_hhmm(25)).toBe('25:00')
	expect(to_hhmm(25.5)).toBe('25:30')
})
