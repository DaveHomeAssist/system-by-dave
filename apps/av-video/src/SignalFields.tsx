import { useEffect, useState } from "react";
import { PresetSelect } from "./PresetSelect";
import { CONNECTOR_GROUPS, customFormat, FORMAT_GROUPS, isPresetFormat, savedLedTiming, timingParts } from "./signalOptions";

type Props = { format: string; connector: string; onChange: (field: "format" | "connector", value: string) => void; notify: (message: string, error?: boolean) => void };
export function SignalFields({ format, connector, onChange, notify }: Props) {
  const [custom, setCustom] = useState(Boolean(format && !isPresetFormat(format)));
  const [timing, setTiming] = useState(() => timingParts(format));
  useEffect(() => { setCustom(Boolean(format && !isPresetFormat(format))); setTiming(timingParts(format)); }, [format]);
  function fromLed() {
    try {
      const saved = savedLedTiming(localStorage.getItem("avCalculator.v1"));
      setCustom(true); setTiming(saved); onChange("format", saved.format);
      notify(`Using ${saved.format} from ${saved.name}. Confirm the processor accepts this native raster.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not read the saved LED wall.", true); }
  }
  const knownConnector = CONNECTOR_GROUPS.some(g => g.values.includes(connector));
  return <>
    <label>Format / EDID timing<PresetSelect label="Format" value={custom ? "custom" : format}
      options={[{ value: "", label: "Choose format…" }, ...FORMAT_GROUPS.flatMap(g => g.values.map(v => ({ value: v, label: v, group: g.label }))), { value: "custom", label: "Custom / LED wall…" }]}
      onChange={value => { if (value === "custom") setCustom(true); else { setCustom(false); onChange("format", value); } }} /></label>
    <label>Connector<PresetSelect label="Connector" value={connector}
      options={[{ value: "", label: "Choose connector…" }, ...(!knownConnector && connector ? [{ value: connector, label: `${connector} · saved value` }] : []), ...CONNECTOR_GROUPS.flatMap(g => g.values.map(v => ({ value: v, label: v, group: g.label })))]}
      onChange={value => onChange("connector", value)} /></label>
    {custom && <fieldset className="wide custom-timing"><legend>Custom / LED wall timing</legend><div className="field-grid"><label>Width · pixels<input aria-label="Custom width" type="number" min="1" max="65535" step="1" value={timing.width} onChange={e => setTiming({ ...timing, width: e.target.value })} /></label><label>Height · pixels<input aria-label="Custom height" type="number" min="1" max="65535" step="1" value={timing.height} onChange={e => setTiming({ ...timing, height: e.target.value })} /></label><label>Frame rate · Hz<input aria-label="Custom frame rate" type="number" min="0.001" max="1000" step="any" value={timing.rate} onChange={e => setTiming({ ...timing, rate: e.target.value })} /></label><button type="button" onClick={() => { try { onChange("format", customFormat(timing.width, timing.height, timing.rate)); notify("Custom format applied."); } catch (error) { notify((error as Error).message, true); } }}>Apply custom format</button></div><p>Current: {format || "not set"}</p><button type="button" onClick={fromLed}>Use saved LED wall</button><a href="../led-wall-calculator.html" target="_blank" rel="noopener noreferrer">Open LED Wall Calculator ↗</a><small>Uses the native wall raster saved in this browser. Format presets are planning targets; they do not program hardware EDID.</small></fieldset>}
  </>;
}
