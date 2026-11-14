// Delay simulator mutations so API tests can change eligibility before the write.
export async function load(url, context, nextLoad) {
  if (!url.endsWith('/server/drivers/index.js')) return nextLoad(url, context);
  return {
    format: 'module', shortCircuit: true,
    source: `
      import { makeDriver as original } from ${JSON.stringify(url + '?original')};
      import { existsSync, writeFileSync } from 'node:fs';
      import { setTimeout as delay } from 'node:timers/promises';
      export function makeDriver(projector) {
        const driver = original(projector);
        if (driver.kind !== 'simulator' || projector.slot !== 'P1') return driver;
        return new Proxy(driver, { get(target, key) {
          const value = target[key];
          if (key !== process.env.PROJCTL_TEST_DELAY_METHOD) return value;
          return async (...args) => {
            const gate = process.env.PROJCTL_TEST_GATE;
            writeFileSync(gate + '.started', 'started');
            const deadline = Date.now() + 5000;
            while (!existsSync(gate + '.release')) {
              if (Date.now() > deadline) throw new Error('Test driver gate timed out');
              await delay(10);
            }
            return value.apply(target, args);
          };
        }});
      }
    `,
  };
}
