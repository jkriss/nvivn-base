if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {scope: '/'})
  .then(function(reg) {
    console.log('Registration succeeded. Scope is ' + reg.scope);
    reg.addEventListener('updatefound', () => {
      console.log("got an update, installing")
      // An updated service worker has appeared in reg.installing!
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        // Has service worker state changed?
        if (newWorker.state === 'installed') {
          console.log("new version installed")
          if (navigator.serviceWorker.controller) {
            console.log("new version found")
          }
        }
      })
    })
  }).catch(function(error) {
    console.log('Registration failed with ' + error);
  });
}
