import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose(): void;
}

const SHORTCUTS: Array<[string, string]> = [
  ["Arrow keys or W A S D", "Pan and tilt while held (about half speed)"],
  ["Shift + move", "Full deflection"],
  ["Alt / Option + move", "Fine moves"],
  ["E or +  /  Q or −", "Zoom tele / wide while held"],
  ["1 – 9", "Recall preset"],
  ["Shift + 1 – 9", "Store the current shot (press twice to replace)"],
  ["H", "Camera home: pan 0°, tilt 0°, full wide"],
  ["Space or Esc", "Stop all movement, including a recall"],
  ["[  ]", "Pan and tilt speed down / up"],
  ["Shift + [  ]", "Zoom speed down / up"],
  [",  .", "Preset speed down / up"],
  ["F", "Expand or restore the monitor"],
  ["?", "This help"],
];

export function HelpDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="help-dialog" aria-labelledby="help-title" onClose={onClose} onCancel={onClose}>
      <div className="help-head">
        <h2 id="help-title">Operating the simulator</h2>
        <button type="button" className="tool-button" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
      <p>
        The on-screen joystick, keyboard and touch all drive one simulated BirdDog P240. Deflection sets speed, so holding a move keeps the camera
        moving. Letting go, switching windows or cancelling a touch stops the commanded move. Any manual input interrupts a preset recall at once.
      </p>
      <table className="spec-table shortcuts">
        <caption className="visually-hidden">Keyboard shortcuts</caption>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys}>
              <th scope="row">
                <kbd>{keys}</kbd>
              </th>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Reading the picture</h3>
      <ul>
        <li>Stage directions are performer-facing. Stage right is house left, which is the left of the Camera 4 picture.</li>
        <li>HOME is a camera function, not the FMP safe-wide show preset. Build the safe wide as a preset.</li>
        <li>The venue is approximate until its critical dimensions are measured, and camera behaviour is uncalibrated. Both flags stay visible.</li>
        <li>Nothing here connects to a real camera or controller.</li>
      </ul>
    </dialog>
  );
}
