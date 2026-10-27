
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js?v=20261027-clean-install-v2').catch(function (err) {
      console.warn('Service worker registration failed:', err);
    });
  });
}
