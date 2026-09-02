/**
 * Minimal renderHook for React 18 hook contract tests.
 * Uses React's built-in act + createRoot — no @testing-library/react needed.
 * Async by default so that useEffect promise chains (e.g. Supabase .then())
 * are fully flushed before assertions run.
 *
 * Usage:
 *   var { result, unmount } = await renderHook(function() {
 *     return useMyHook({ param: value });
 *   });
 *   expect(result.current.someField).toBe(...);
 *   await unmount();
 */
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

export async function renderHook(useHookFn) {
  var container = document.createElement('div');
  document.body.appendChild(container);
  var root = createRoot(container);
  var result = { current: null };

  function HookWrapper() {
    result.current = useHookFn();
    return null;
  }

  await act(async function() {
    root.render(createElement(HookWrapper));
  });

  async function unmount() {
    await act(async function() {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  return { result: result, unmount: unmount };
}

/**
 * Like renderHook(), but for hooks that take a props object and need to be
 * re-rendered with new props mid-test (e.g. an isOnline flag flipping).
 *
 * Usage:
 *   var { result, rerenderProps, unmount } = await renderHookWithProps(
 *     function(props) { return useMyHook(props); },
 *     { foo: 1 }
 *   );
 *   await rerenderProps({ foo: 2 });
 */
export async function renderHookWithProps(useHookFn, initialProps) {
  var container = document.createElement('div');
  document.body.appendChild(container);
  var root = createRoot(container);
  var result = { current: null };

  function HookWrapper({ hookProps }) {
    result.current = useHookFn(hookProps);
    return null;
  }

  await act(async function() {
    root.render(createElement(HookWrapper, { hookProps: initialProps }));
  });

  async function rerenderProps(newProps) {
    await act(async function() {
      root.render(createElement(HookWrapper, { hookProps: newProps }));
    });
  }

  async function unmount() {
    await act(async function() {
      root.unmount();
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  return { result: result, rerenderProps: rerenderProps, unmount: unmount };
}
