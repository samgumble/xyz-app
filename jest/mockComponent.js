/**
 * A patched copy of `react-native/jest/mockComponent.js`.
 *
 * Upstream does an unguarded `RealComponent.prototype.constructor` check. On
 * React Native 0.81 the core components (`Text`, `View`, ...) are forwardRef
 * objects and function components with no `prototype`, so importing `Text`
 * from 'react-native' inside a test throws:
 *
 *   TypeError: Cannot read properties of undefined (reading 'constructor')
 *       at react-native/jest/mockComponent.js:42
 *
 * That makes it impossible to render ANY component in a test. The only change
 * here is the optional chain on `prototype`. Wired up through
 * `moduleNameMapper` in jest.config.js rather than by patching node_modules,
 * so it survives `npm ci` in CI.
 *
 * Revisit when React Native fixes this upstream; then delete this file and the
 * mapping and confirm `src/components/__tests__/smoke.test.tsx` still passes.
 */
const path = require('path');
const React = require('react');
const { createElement } = require('react');

// `moduleName` arrives relative to react-native/jest/, not to this file, so it
// has to be re-anchored there before requiring.
const RN_JEST_DIR = path.dirname(require.resolve('react-native/jest/mockComponent.js'));

module.exports.default = function mockComponent(moduleName, instanceMethods, isESModule) {
  const resolved = path.join(RN_JEST_DIR, moduleName);
  const RealComponent = isESModule
    ? jest.requireActual(resolved).default
    : jest.requireActual(resolved);

  const SuperClass =
    typeof RealComponent === 'function' &&
    // The upstream bug is here: `prototype` can be undefined.
    RealComponent.prototype?.constructor instanceof React.Component
      ? RealComponent
      : React.Component;

  const name =
    RealComponent.displayName ??
    RealComponent.name ??
    (RealComponent.render == null
      ? 'Unknown'
      : (RealComponent.render.displayName ?? RealComponent.render.name));

  const nameWithoutPrefix = name.replace(/^(RCT|RK)/, '');

  const Component = class extends SuperClass {
    static displayName = 'Component';

    render() {
      const props = { ...RealComponent.defaultProps };

      if (this.props) {
        Object.keys(this.props).forEach((prop) => {
          if (this.props[prop] !== undefined) {
            props[prop] = this.props[prop];
          }
        });
      }

      return createElement(nameWithoutPrefix, props, this.props.children);
    }
  };

  Object.defineProperty(Component, 'name', {
    value: name,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  Component.displayName = nameWithoutPrefix;

  Object.keys(RealComponent).forEach((classStatic) => {
    Component[classStatic] = RealComponent[classStatic];
  });

  if (instanceMethods != null) {
    Object.assign(Component.prototype, instanceMethods);
  }

  return Component;
};
