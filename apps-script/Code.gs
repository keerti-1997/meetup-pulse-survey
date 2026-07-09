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
    return respond(e, { ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return respond(e, { ok: false, error: String(err) });
  }
}

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
 * Response columns are read from the Responses sheet's own header row, so
 * adding/renaming a rotating question only requires editing that row —
 * no script changes needed.
 */
function handleSubmit(ss, params) {
  var responses = ss.getSheetByName('Responses');
  var headers = responses.getRange(1, 1, 1, responses.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    if (h === 'submitted_at') return new Date();
    return params[h] !== undefined ? params[h] : '';
  });
  responses.appendRow(row);
  return { ok: true };
}
