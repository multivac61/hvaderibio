# The picker panel's landing, model-checked

A TLA+ model of the desktop programme picker (`src/lib/ProgrammePicker.svelte`,
presentation `header` or `inline`). A cinema clicked there is held until the
panel has closed, then lands with a view transition. The model checks that
whatever the visitor chose last is what the page shows once nothing is in
flight (`LastChoiceWins`), across every order of these steps:

- the pill opening the panel, and the panel dismissed
- a cinema clicked (held), a cinema reached by the arrow keys, a day picked
- bits-ui's open and close completion runs, each cancelled by the next change
  of `open` (`presence-manager.svelte.js`)
- the view transition's update (`src/lib/view-transition.ts`)
- "Hreinsa val" on a movie's page
- leaving the page, which destroys the picker and cancels its completion run

Each action names the code it mirrors.

## Running it

```sh
./check.sh
```

| Config                     | Expect   | What it shows                                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `Picker.cfg`               | holds    | the code as shipped                                                                           |
| `Control.cfg`              | violated | the code before: a held cinema landed over a newer choice, or was lost when the page was left |
| `ReachHeldWhileShut.cfg`   | violated | a cinema is held while the panel closes                                                       |
| `ReachSlides.cfg`          | violated | a held cinema lands with a view transition                                                    |
| `ReachLeftWhileHeld.cfg`   | violated | before the fix, the page could be left with a cinema still held, which was then lost          |
| `ReachReopenWhileHeld.cfg` | violated | before the fix, the panel reopened with a cinema still held (the race the fix removes)        |

## What it leaves out

- Time. The panel's close takes about 160ms and a reopened panel completed
  within three frames; the model allows any order. With `VtUrgent`, the view
  transition's update runs before further input, as the browser runs it on
  the next frame. Without it the model finds a choice overwritten by an update
  delayed past a whole reopening, which no browser does.
- The phone's sheet, which lands a cinema at once and holds nothing.
- Focus. The model takes an arrow key as choosing any cinema.
- Which page comes next. "Hreinsa val" is modeled only while the picker is
  there; after leaving, nothing but the view transition's update runs.
- Bounds: three cinemas, two days.
