# Backend setup

One-time setup, ~10 minutes. Re-runs of this project each month don't touch
any of this — it's the same Sheet and same deployed URL every time.

Check-in is handled by the AI Tinkerers platform's own QR codes (emailed
to attendees automatically) — nothing to set up for that here. This
backend exists only to collect anonymous pulse survey responses.

## 1. Create the Sheet

Create a new Google Sheet. Rename the default tab to **`Responses`**, with
this header row (row 1):

```
event_date	submitted_at	q1_role	q2_industry	q3_years	q4_employment	q5_tools	q6_agent_count	q7_agent_use	q8_tool_ownership	q9_comfort	q10_blocker	q11_first_meetup	q12_brought_here	q13_nps	q14_openweight	q15_future_topics
```

The `q14_*`/`q15_*` columns are this month's rotating slots (see
[plan.html](../plan.html) §04). Swap them for next month's rotating
questions by renaming those two header cells and updating the `QUESTIONS`
entries in `index.html` to match — the script needs no changes
either way, since it writes whatever column names it finds in row 1.

## 2. Add the script

Extensions → Apps Script. Delete the default `Code.gs` contents and paste
in [`Code.gs`](./Code.gs) from this folder. Save.

## 3. Deploy as a Web App

Deploy → New deployment → type **Web app**.

- Execute as: **Me**
- Who has access: **Anyone**

Deploy, then copy the Web app URL (ends in `/exec`). You'll need to repeat
"New deployment" (not just "Manage deployments" → edit) whenever you change
`Code.gs`, since editing an existing deployment's code doesn't take effect
until a new version is deployed.

## 4. Wire it into the site

Paste that URL into `APPS_SCRIPT_URL` in the `PULSE_CONFIG` object near the
top of [`index.html`](../index.html)'s inline script, along with this
event's date in `EVENT_DATE`.

## 5. Smoke test

Open `index.html`, submit a test response, and confirm a new row lands in
the Responses sheet.
