import '@testing-library/jest-dom';

// jsdom does not implement window.matchMedia — add a minimal stub so modules
// that call it at load time (e.g. analytics.js deviceContext) don't throw.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: function(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; },
    };
  },
});
