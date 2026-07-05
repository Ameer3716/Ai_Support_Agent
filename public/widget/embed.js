/**
 * AI Support Agent — embed loader.
 *
 * Clients paste this on their own site:
 *   <script src="https://YOUR-DOMAIN/widget/embed.js" data-client="CLIENT_KEY" async></script>
 *
 * It injects a single iframe (so the widget's own CSS/JS never collides with
 * the host page's) and resizes that iframe on request via postMessage —
 * the same pattern used by Intercom/Drift/Crisp.
 */
(function () {
  'use strict';

  var currentScript = document.currentScript;
  if (!currentScript) return;

  var clientKey = currentScript.getAttribute('data-client');
  if (!clientKey) {
    console.error('[AI Support Agent] Missing data-client="..." attribute on the embed <script> tag.');
    return;
  }

  var baseUrl = currentScript.getAttribute('data-base-url');
  if (!baseUrl) {
    var src = currentScript.src || '';
    var idx = src.indexOf('/widget/embed.js');
    baseUrl = idx > -1 ? src.slice(0, idx) : '';
  }
  if (!baseUrl) {
    console.error('[AI Support Agent] Could not determine the widget base URL. Set data-base-url explicitly.');
    return;
  }

  var BUBBLE_SIZE = 68;
  var GAP = 20;
  var MOBILE_BREAKPOINT = 480;

  var side = 'right'; // updated once config loads (widgetPosition)

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function bubbleStyle() {
    var s =
      'position:fixed;bottom:' + GAP + 'px;' + side + ':' + GAP + 'px;' +
      'width:' + BUBBLE_SIZE + 'px;height:' + BUBBLE_SIZE + 'px;' +
      'border:none;z-index:2147483000;background:transparent;';
    return s;
  }

  function expandedStyle() {
    if (isMobile()) {
      return (
        'position:fixed;bottom:0;right:0;left:0;top:0;' +
        'width:100%;height:100%;border:none;z-index:2147483000;background:transparent;'
      );
    }
    var width = 384;
    var height = Math.min(640, window.innerHeight - GAP * 2);
    return (
      'position:fixed;bottom:' + GAP + 'px;' + side + ':' + GAP + 'px;' +
      'width:' + width + 'px;height:' + height + 'px;' +
      'border:none;z-index:2147483000;background:transparent;' +
      'box-shadow:0 12px 40px rgba(0,0,0,0.18);border-radius:16px;'
    );
  }

  var iframe = document.createElement('iframe');
  iframe.title = 'Chat';
  iframe.setAttribute('allowtransparency', 'true');
  iframe.style.cssText = bubbleStyle();
  iframe.src =
    baseUrl +
    '/widget/chat.html?client=' +
    encodeURIComponent(clientKey) +
    '&origin=' +
    encodeURIComponent(window.location.origin);

  function mount() {
    document.body.appendChild(iframe);
  }
  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== 'ai-support-widget') return;

    if (data.type === 'position' && (data.position === 'bottom-left' || data.position === 'bottom-right')) {
      side = data.position === 'bottom-left' ? 'left' : 'right';
      iframe.style.cssText = data.open ? expandedStyle() : bubbleStyle();
    }

    if (data.type === 'resize') {
      iframe.style.cssText = data.open ? expandedStyle() : bubbleStyle();
    }
  });

  window.addEventListener('resize', function () {
    // Re-apply whichever state we're currently in, recalculated for the new viewport.
    var isExpanded = iframe.style.width !== BUBBLE_SIZE + 'px';
    iframe.style.cssText = isExpanded ? expandedStyle() : bubbleStyle();
  });
})();
