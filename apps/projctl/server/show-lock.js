// Show Lock: shutter close stays available; shutter open, power, lens (except
// stop), input, pattern and picture are refused with a loggable message.

export function isBlockedByShowLock(cmd, arg) {
  if (cmd === 'shutter') return !arg; // 1 / true = closed, stays allowed
  if (cmd === 'power' || cmd === 'input' || cmd === 'pattern' || cmd === 'picture') return true;
  if (cmd === 'lens') return !arg || arg.op !== 'stop';
  return false;
}

export function showLockRefusal(cmd, arg) {
  if (cmd === 'shutter' && !arg) {
    return 'Show Lock is on: opening shutters is refused. Closing shutters stays available.';
  }
  if (cmd === 'power') return 'Show Lock is on: power commands are refused.';
  if (cmd === 'input') return 'Show Lock is on: input changes are refused.';
  if (cmd === 'lens') return 'Show Lock is on: lens movement is refused. Stop lens stays available.';
  if (cmd === 'pattern') return 'Show Lock is on: test patterns are refused.';
  if (cmd === 'picture') return 'Show Lock is on: picture changes are refused.';
  return 'Show Lock is on.';
}
