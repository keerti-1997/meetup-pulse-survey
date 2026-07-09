// Cross-origin GET to the Apps Script backend via a dynamically injected
// <script> tag. Apps Script's fetch()-readable CORS headers are unreliable;
// script-tag JSONP sidesteps that entirely since script loads aren't
// subject to CORS. See Code.gs `respond()` for the server-side half.
function jsonp(url, params, callback) {
  var cbName = 'jsonp_cb_' + Math.random().toString(36).slice(2);
  var script = document.createElement('script');

  var timeout = setTimeout(function () {
    cleanup();
    callback({ ok: false, error: 'request timed out' });
  }, 15000);

  function cleanup() {
    clearTimeout(timeout);
    delete window[cbName];
    if (script.parentNode) script.parentNode.removeChild(script);
  }

  window[cbName] = function (data) {
    cleanup();
    callback(data);
  };

  var query = Object.keys(params)
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k] == null ? '' : params[k]); })
    .join('&');

  script.src = url + '?' + query + '&callback=' + cbName;
  script.onerror = function () {
    cleanup();
    callback({ ok: false, error: 'network error' });
  };
  document.body.appendChild(script);
}
