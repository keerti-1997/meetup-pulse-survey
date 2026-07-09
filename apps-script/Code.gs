/**
 * Backend for the Women in AI pulse survey + check-in system.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * See SETUP.md for the Sheet schema this expects.
 *
 * All calls are GET with an `action` param, optionally wrapped in JSONP via
 * a `callback` param — this is what lets a static GitHub Pages site talk to
 * Apps Script without hitting its inconsistent CORS behavior on fetch().
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  try {
    if (action === 'checkin') return respond(e, handleCheckin(ss, e.parameter));
    if (action === 'lookup') return respond(e, handleLookup(ss, e.parameter));
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

function findAttendeeRow(attendeesSheet, token) {
  var data = attendeesSheet.getDataRange().getValues();
  var headers = data[0];
  var tokenCol = headers.indexOf('token');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][tokenCol]) === String(token)) {
      var record = {};
      for (var c = 0; c < headers.length; c++) record[headers[c]] = data[i][c];
      return { rowIndex: i + 1, headers: headers, record: record };
    }
  }
  return null;
}

function handleLookup(ss, params) {
  var attendees = ss.getSheetByName('Attendees');
  var found = findAttendeeRow(attendees, params.token);
  if (!found) return { ok: false, error: 'unknown token' };
  return {
    ok: true,
    name: found.record.name,
    checkedIn: found.record.checked_in === true || found.record.checked_in === 'TRUE'
  };
}

function handleCheckin(ss, params) {
  var attendees = ss.getSheetByName('Attendees');
  var found = findAttendeeRow(attendees, params.token);
  if (!found) return { ok: false, error: 'unknown token' };

  var alreadyCheckedIn = found.record.checked_in === true || found.record.checked_in === 'TRUE';
  if (!alreadyCheckedIn) {
    var checkedInCol = found.headers.indexOf('checked_in') + 1;
    var checkedInAtCol = found.headers.indexOf('checked_in_at') + 1;
    attendees.getRange(found.rowIndex, checkedInCol).setValue(true);
    attendees.getRange(found.rowIndex, checkedInAtCol).setValue(new Date());
  }
  return { ok: true, name: found.record.name, alreadyCheckedIn: alreadyCheckedIn };
}

/**
 * Response columns are read from the Responses sheet's own header row, so
 * adding/renaming a rotating question only requires editing that row —
 * no script changes needed.
 */
function handleSubmit(ss, params) {
  var attendees = ss.getSheetByName('Attendees');
  var found = findAttendeeRow(attendees, params.token);
  if (!found) return { ok: false, error: 'unknown token' };

  var responses = ss.getSheetByName('Responses');
  var headers = responses.getRange(1, 1, 1, responses.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) {
    if (h === 'token') return params.token;
    if (h === 'name') return found.record.name;
    if (h === 'submitted_at') return new Date();
    return params[h] !== undefined ? params[h] : '';
  });
  responses.appendRow(row);
  return { ok: true };
}
