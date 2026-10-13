import { useRef, useState } from "react";
import { ConsoleWorkspace, useConsoleWorkspace } from "../../shared/av-console/Workspace";
import { useAudioPack } from "./pack";

/* Standalone Audio host: the pack inside its own workspace with page chrome.
   The suite shell at /av/ mounts the same pack beside the other applications. */
export function App() {
  const workspace = useRef<ReturnType<typeof useConsoleWorkspace> | null>(null);
  const [host] = useState(() => ({
    show: (type: string) => workspace.current?.show(type) ?? false,
    notify: (_text: string, _error?: boolean) => undefined,
    resetLayout: () => { workspace.current?.setLive({}); workspace.current?.setMax({}); },
  }));
  const pack = useAudioPack(host);
  const ws = useConsoleWorkspace(pack.views, pack.library);
  workspace.current = ws;
  return <main className="audio-app"><header className="audio-header"><div><small>AV BY DAVE / APPLICATION</small><h1>Audio</h1><p>Inputs → patch → line check</p></div><div className="audio-actions"><span aria-live="polite">{pack.dirty?"Unsaved edits":"Saved state"}</span><button onClick={pack.exportDoc}>Export JSON</button><button className="primary" onClick={() => void pack.save()} disabled={!pack.dirty||pack.blocked}>Save</button></div></header><div className="audio-status" role="status">{pack.status}</div><ConsoleWorkspace ws={ws} label="Audio" quick={pack.quick} render={pack.render} onViewsChange={pack.storeViews} notify={text => host.notify(text)}/></main>;
}
