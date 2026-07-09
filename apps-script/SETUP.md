# Backend setup

One-time setup, ~15 minutes. Re-runs of this project each month don't touch
any of this — it's the same Sheet and same deployed URL every time.

## 1. Create the Sheet

Create a new Google Sheet. Rename the two default/added tabs exactly:

**`Attendees`** — header row (row 1):

```
token	name	email	checked_in	checked_in_at
```

**`Responses`** — header row (row 1). Column order doesn't matter to the
script, but names must match what the survey page sends:

```
token	name	event_date	submitted_at	q1_role	q2_industry	q3_years	q4_employment	q5_tools	q6_agent_count	q7_agent_use	q8_tool_ownership	q9_comfort	q10_blocker	q11_first_meetup	q12_brought_here	q13_nps	q14_openweight	q15_future_topics
```

The `q14_*`/`q15_*` columns are this month's rotating slots (see
[plan.html](../plan.html) §04). Swap them for next month's rotating
questions by renaming those two header cells and updating the `ROTATING`
array in `site/survey.html` to match — the script needs no changes either
way, since it writes whatever column names it finds in row 1.

## 2. Populate Attendees (per event)

Until the Phase 3 CSV importer/badge tool exists, add rows manually or via
paste from your RSVP export, with a generated token per row. For testing,
put this formula in the token column and then paste-as-values over it:

```
=CONCATENATE("t", TEXT(RANDBETWEEN(100000, 999999), "000000"))
```

Leave `checked_in` and `checked_in_at` blank — the script fills those in.

## 3. Add the script

Extensions → Apps Script. Delete the default `Code.gs` contents and paste
in [`Code.gs`](./Code.gs) from this folder. Save.

## 4. Deploy as a Web App

Deploy → New deployment → type **Web app**.

- Execute as: **Me**
- Who has access: **Anyone**

Deploy, then copy the Web app URL (ends in `/exec`). You'll need to repeat
"New deployment" (not just "Manage deployments" → edit) whenever you change
`Code.gs`, since editing an existing deployment's code doesn't take effect
until a new version is deployed.

## 5. Wire it into the site

Paste that URL into `APPS_SCRIPT_URL` in
[`site/config.js`](../site/config.js), along with this event's date in
`EVENT_DATE`.

## 6. Smoke test

With a real token from the Attendees sheet:

- `checkin.html?t=TOKEN` should show a welcome card and flip `checked_in`
  to `TRUE` in the Sheet.
- `survey.html?t=TOKEN` should greet you by name, accept answers, and
  append a row to Responses on submit.
