/**
 * The suite runs with the device clock in Sydney (see the `test` script) so a
 * regression that leaks the device timezone into a festival-time render fails
 * loudly. Set here as well so `jest --runTestsByPath` behaves the same way.
 */
process.env.TZ = process.env.TZ ?? 'Australia/Sydney';
