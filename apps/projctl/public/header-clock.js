// The operator clock follows Eastern time, independently of relay connectivity.
export function startHeaderClock(clock) {
  const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  const update = () => {
    stop();
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.querySelector('[data-clock-date]').textContent = dateFormat.format(now);
    clock.querySelector('[data-clock-time]').textContent = timeFormat.format(now);
    if (!document.hidden) timer = setTimeout(update, 1000 - (Date.now() % 1000));
  };
  const visibility = () => { if (document.hidden) stop(); else update(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', visibility);
  update();
}
