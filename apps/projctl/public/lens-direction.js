// Reversal belongs to the installed projector, not its model or drawing lane.
// API directions and encoder readbacks retain their device-native meaning.
export function lensDirection(projector, axis, direction) {
  const reverse = axis === 'h' ? projector?.reverseH : axis === 'v' ? projector?.reverseV : false;
  return reverse === true ? (direction === '+' ? '-' : '+') : direction;
}
