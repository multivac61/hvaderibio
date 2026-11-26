---- MODULE Picker ----
\* The desktop programme picker panel (src/lib/ProgrammePicker.svelte, presentation
\* "header" or "inline"), the completion runs of bits-ui 2.22's PresenceManager, the
\* coalescing in src/lib/view-transition.ts, and the movie page's "Hreinsa val".
\* Untimed: any enabled step may come next. See README.md.
EXTENDS TLC
CONSTANTS Cinemas, Days, DefaultCinema, DefaultDay, None,
          Shipped,       \* TRUE: the code as shipped; FALSE: the code before (the control)
          VtUrgent,      \* TRUE: the view transition's update runs before further input
          ExternalWriter \* TRUE: "Hreinsa val" (routes/movie/[id]/+page.svelte:63)
VARIABLES open, run, held, landing, sel, day, vtWaiting, intent, mounted
vars == <<open, run, held, landing, sel, day, vtWaiting, intent, mounted>>

Runs == {"idle", "opening", "closing"}
Held == [choice : Cinemas, cinema : Cinemas, day : Days]
Blank == [choice |-> DefaultCinema, cinema |-> DefaultCinema, day |-> DefaultDay]
TypeOK == /\ open \in BOOLEAN /\ run \in Runs
          /\ held \in BOOLEAN /\ landing \in Held /\ vtWaiting \in Cinemas \cup {None}
          /\ sel \in Cinemas /\ day \in Days /\ intent \in Cinemas \X Days
          /\ mounted \in BOOLEAN

Init == /\ open = FALSE /\ run = "idle" /\ held = FALSE /\ landing = Blank /\ vtWaiting = None
        /\ sel = DefaultCinema /\ day = DefaultDay /\ intent = <<DefaultCinema, DefaultDay>>
        /\ mounted = TRUE

\* Once the picker is gone, its panel takes no input.
UserMayAct == mounted /\ (VtUrgent => vtWaiting = None)

\* ProgrammeControls.svelte:260-264 select_cinema; a slide goes through
\* view-transition.ts:25-35, which keeps only the latest waiting update.
SelectCinema(c, slide) ==
  IF c = sel THEN UNCHANGED <<sel, vtWaiting>>
  ELSE IF slide THEN /\ vtWaiting' = c /\ UNCHANGED sel
       ELSE /\ sel' = c /\ UNCHANGED vtWaiting

\* ProgrammePicker.svelte land(slide). Shipped: dropped when the day or cinema
\* changed since the click.
Land(slide) ==
  IF ~held THEN UNCHANGED <<held, landing, sel, vtWaiting>>
  ELSE /\ held' = FALSE /\ landing' = Blank
       /\ IF Shipped /\ (landing.cinema # sel \/ landing.day # day)
            THEN UNCHANGED <<sel, vtWaiting>>
            ELSE SelectCinema(landing.choice, slide)

\* The pill opens the panel: bits-ui calls onOpenChange(true) (shipped: land at
\* once, no slide) and starts an "opening" run, cancelling a pending "closing"
\* run (presence-manager.svelte.js:21-62, animations-complete.js:20).
OpenTrigger ==
  /\ UserMayAct /\ ~open /\ open' = TRUE /\ run' = "opening"
  /\ IF Shipped THEN Land(FALSE) ELSE UNCHANGED <<held, landing, sel, vtWaiting>>
  /\ UNCHANGED <<day, intent, mounted>>

\* The phrase button, Escape, or a press outside the panel.
Dismiss == /\ UserMayAct /\ open /\ open' = FALSE /\ run' = "closing"
           /\ UNCHANGED <<held, landing, sel, day, vtWaiting, intent, mounted>>

\* ProgrammeChoices.svelte onclick -> pick_cinema(c, true): held, panel closes.
ClickCinema(c) ==
  /\ UserMayAct /\ open
  /\ held' = TRUE /\ landing' = [choice |-> c, cinema |-> sel, day |-> day]
  /\ open' = FALSE /\ run' = "closing" /\ intent' = <<c, day>>
  /\ UNCHANGED <<sel, day, vtWaiting, mounted>>

\* ProgrammeChoices.svelte onkeydown -> pick_cinema(c, false): lands at once.
ArrowCinema(c) ==
  /\ UserMayAct /\ open /\ intent' = <<c, day>> /\ SelectCinema(c, FALSE)
  /\ UNCHANGED <<open, run, held, landing, day, mounted>>

\* ProgrammeControls.svelte select_day: lands at once.
PickDay(d) ==
  /\ UserMayAct /\ open /\ day' = d /\ intent' = <<intent[1], d>>
  /\ UNCHANGED <<open, run, held, landing, sel, vtWaiting, mounted>>

\* onOpenChangeComplete fires only if the run still matches open. Before: land(!now_open)
\* either way. Shipped: only a completed close lands (with a slide).
CompleteOpen  == /\ mounted /\ run = "opening" /\ open /\ run' = "idle"
                 /\ IF Shipped THEN UNCHANGED <<held, landing, sel, vtWaiting>> ELSE Land(FALSE)
                 /\ UNCHANGED <<open, day, intent, mounted>>
CompleteClose == /\ mounted /\ run = "closing" /\ ~open /\ run' = "idle" /\ Land(TRUE)
                 /\ UNCHANGED <<open, day, intent, mounted>>

\* The startViewTransition update callback.
VtCallback == /\ vtWaiting # None /\ sel' = vtWaiting /\ vtWaiting' = None
              /\ UNCHANGED <<open, run, held, landing, day, intent, mounted>>

\* "Hreinsa val": shown only for a choice other than the default (chose_otherwise,
\* routes/movie/[id]/+page.svelte:62,243), and reachable while the panel is shut (a
\* press beside the open panel only closes it, ProgrammePicker.svelte:83-89).
ClearChoice == /\ ExternalWriter /\ UserMayAct /\ ~open
               /\ <<sel, day>> # <<DefaultCinema, DefaultDay>>
               /\ sel' = DefaultCinema /\ day' = DefaultDay /\ intent' = <<DefaultCinema, DefaultDay>>
               /\ UNCHANGED <<open, run, held, landing, vtWaiting, mounted>>

\* Leaving the page destroys the picker: bits-ui cancels its completion run
\* (animations-complete.js:9). Shipped: the teardown effect lands what is held, at
\* once (ProgrammePicker.svelte land on destroy). Before: it was dropped. The view
\* transition's update is module state and still runs.
Unmount == /\ mounted /\ mounted' = FALSE /\ open' = FALSE /\ run' = "idle"
           /\ IF Shipped THEN Land(FALSE) ELSE UNCHANGED <<held, landing, sel, vtWaiting>>
           /\ UNCHANGED <<day, intent>>

Done == /\ run = "idle" /\ vtWaiting = None /\ UNCHANGED vars

Next == \/ OpenTrigger \/ Dismiss \/ CompleteOpen \/ CompleteClose \/ VtCallback \/ ClearChoice \/ Unmount \/ Done
        \/ \E c \in Cinemas : ClickCinema(c) \/ ArrowCinema(c)
        \/ \E d \in Days : PickDay(d)
Spec == Init /\ [][Next]_vars

Quiescent == run = "idle" /\ vtWaiting = None
\* Once nothing is in flight, the page shows what the visitor chose last.
LastChoiceWins == Quiescent => <<sel, day>> = intent

\* Reachability probes: each must be violated.
NeverLeftWhileHeld == ~(~mounted /\ held)
NeverReopenWhileHeld == ~(open /\ run = "opening" /\ held)
NeverHeldWhileShut == ~(~open /\ held)
NeverSlides == vtWaiting = None
====
