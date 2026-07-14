/**
 * Backend for the Women in AI monthly pulse survey.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * See SETUP.md for the Sheet schema this expects.
 *
 * Responses are anonymous — there's no attendee identity/token check here.
 * Check-in is handled natively by the AI Tinkerers platform's own
 * confirm_attendance links, so this script only has one job: accept a
 * survey submission and append it to the Responses sheet.
 *
 * Calls are GET with an `action` param, optionally wrapped in JSONP via a
 * `callback` param — this is what lets a static GitHub Pages site talk to
 * Apps Script without hitting its inconsistent CORS behavior on fetch().
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  try {
    if (action === 'submit') return respond(e, handleSubmit(ss, e.parameter));
    if (action === 'trends') return respond(e, handleTrends(ss, e.parameter));
    return respond(e, { ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return respond(e, { ok: false, error: String(err) });
  }
}

// Free-text columns are never aggregated or returned by handleTrends — the
// dashboard only ever sees counts, never response content, even though
// responses are anonymous (a free-text answer can still be identifying).
// Scale columns get an average + value histogram instead of an option tally.
// If a rotating question's type changes (see index.html QUESTIONS), update
// these two maps to match — handleSubmit itself doesn't need this, only
// handleTrends does.
var TEXT_FIELDS = ['q10_blocker', 'q15_future_topics'];
var SCALE_FIELDS = {
  q9_comfort: { min: 1, max: 5, isNps: false },
  q13_nps: { min: 0, max: 10, isNps: true }
};

function respond(e, obj) {
  var callback = e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Response columns are read from the sheet's own header row, so
 * adding/renaming a rotating question only requires editing that row —
 * no script changes needed. Uses the first sheet/tab regardless of its
 * name, so there's no naming convention to maintain.
 */
function handleSubmit(ss, params) {
  var responses = ss.getSheets()[0];
  var headers = responses.getRange(1, 1, 1, responses.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    if (h === 'submitted_at') return new Date();
    return params[h] !== undefined ? params[h] : '';
  });
  responses.appendRow(row);
  return { ok: true };
}

/**
 * Aggregates-only view of the Responses sheet — never returns raw rows or
 * free-text content, only counts/percentages/averages, so this can be
 * called from a public dashboard page without exposing individual answers.
 * Pass event_date to snapshot a single event; omit it to aggregate all-time.
 */
function handleTrends(ss, params) {
  var sheet = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { ok: true, totalResponses: 0, byEvent: [], questions: {} };

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var eventDateCol = headers.indexOf('event_date');

  var byEventCounts = {};
  data.forEach(function (row) {
    var ed = String(row[eventDateCol] || 'unknown');
    byEventCounts[ed] = (byEventCounts[ed] || 0) + 1;
  });
  var byEvent = Object.keys(byEventCounts).sort().map(function (ed) {
    return { event_date: ed, count: byEventCounts[ed] };
  });

  var filterDate = params.event_date;
  var rows = filterDate
    ? data.filter(function (row) { return String(row[eventDateCol]) === String(filterDate); })
    : data;

  var questions = {};
  headers.forEach(function (h, colIndex) {
    if (h === 'event_date' || h === 'submitted_at' || TEXT_FIELDS.indexOf(h) !== -1) return;

    var values = rows.map(function (row) { return row[colIndex]; }).filter(function (v) { return v !== '' && v != null; });

    if (SCALE_FIELDS[h]) {
      var cfg = SCALE_FIELDS[h];
      var nums = values.map(Number).filter(function (n) { return !isNaN(n); });
      var histogram = {};
      for (var v = cfg.min; v <= cfg.max; v++) histogram[v] = 0;
      nums.forEach(function (n) { histogram[n] = (histogram[n] || 0) + 1; });
      var avg = nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : null;
      var entry = { type: 'scale', count: nums.length, average: avg, histogram: histogram };
      if (cfg.isNps && nums.length) {
        var promoters = nums.filter(function (n) { return n >= 9; }).length;
        var detractors = nums.filter(function (n) { return n <= 6; }).length;
        entry.npsScore = Math.round(((promoters - detractors) / nums.length) * 100);
      }
      questions[h] = entry;
    } else {
      var counts = {};
      values.forEach(function (v) {
        String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (opt) {
          counts[opt] = (counts[opt] || 0) + 1;
        });
      });
      questions[h] = { type: 'choice', count: values.length, counts: counts };
    }
  });

  return { ok: true, totalResponses: data.length, byEvent: byEvent, questions: questions };
}
