# solar-birthday

Calculate your **solar birthday** — the number of true laps you've completed around the
Sun, measured against the fixed stars rather than the human-constructed calendar.

A calendar year rounds Earth's orbit to a whole number of days. A **sidereal year** — the
real time Earth takes to return to the same point in its orbit relative to the distant stars —
is `365 days, 6 hours, 9 minutes, 10 seconds`. Because that's about 20 minutes longer than the
calendar year, your solar birthday quietly drifts later on the calendar with every lap.

## What it does

Enter your birth date (and, optionally, birth time) and the site shows:

- A live **orbital diagram** — the Sun, Earth on its orbit, and a progress arc marking how far
  through your current lap you are.
- A real-time **countdown** to your next solar birthday.
- Your exact **solar age** (fractional laps completed).
- The **distance you've travelled** around the Sun so far.
- How far your solar birthday has **drifted** from your calendar birthday.
- A table of your upcoming solar birthdays, with milestone laps marked.

## Stack

A static site — plain HTML, CSS, and JavaScript with an animated canvas starfield and an SVG
orbit. No build step and no backend: everything is computed in the browser, and no data leaves
the page.

```
solarbirthday/
  index.html
  css/styles.css
  js/script.js
```
