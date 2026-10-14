import { Children, cloneElement, isValidElement, useLayoutEffect, useRef, useSyncExternalStore, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ConsoleWorkspace } from "./Workspace";
import type { Panel } from "./layout";

export type DepartmentPresentation = { present?: (screen: ReactElement) => ReactElement };
type Target = { id: string; type: string; node: HTMLElement };
export function createDepartmentBridge(id: string, name: string) {
  let targets: Target[] = [];
  let started = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(fn => fn());
  return {
    id, name,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    snapshot: () => targets,
    started: () => started,
    attach(target: Target) {
      started = true; targets = [...targets.filter(t => t.id !== target.id), target]; emit();
      return () => { targets = targets.filter(t => t !== target); emit(); };
    },
  };
}
export type DepartmentBridge = ReturnType<typeof createDepartmentBridge>;

export function DepartmentSlot({ bridge, panel }: { bridge: DepartmentBridge; panel: Panel }) {
  const node = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => bridge.attach({ id: panel.id, type: panel.type.split(":")[1], node: node.current! }), [bridge, panel.id, panel.type]);
  return <div className="department-slot" ref={node} />;
}

type WorkspaceElement = ReactElement<ComponentProps<typeof ConsoleWorkspace>>;
// The existing controllers provide their screen descriptor without mounting
// another console. Only its native panel bodies and explicit controls are used.
function workspaceIn(node: ReactNode): WorkspaceElement | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  if (node.type === ConsoleWorkspace) return node as WorkspaceElement;
  for (const child of Children.toArray(node.props.children)) {
    const found = workspaceIn(child); if (found) return found;
  }
}
function controlsOnly(node: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  if (node.type === ConsoleWorkspace) return null;
  if (node.props.children === undefined) return node;
  return cloneElement(node, {}, Children.map(node.props.children, controlsOnly));
}
export function DepartmentScreen({ bridge, screen }: { bridge: DepartmentBridge; screen: ReactElement }) {
  const targets = useSyncExternalStore(bridge.subscribe, bridge.snapshot);
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = workspaceIn(screen);
  if (!workspace) throw new Error(`Missing native panel contract for ${bridge.name}`);
  return <>
    <dialog ref={dialog} className="department-controls" data-department={bridge.id} aria-label={`${bridge.name} controls`}>
      <button type="button" onClick={() => dialog.current?.close()}>Back to workspace</button>
      {controlsOnly(screen)}
    </dialog>
    {targets.map(target => {
      const out = workspace.props.render(target.type, { id: target.id, type: target.type, x: 0, y: 0, w: 12, h: 8 });
      return createPortal(<div className="department-panel" data-department={bridge.id}>
        <div className="department-actions"><button type="button" onClick={() => dialog.current?.showModal()}>{bridge.name} controls / Save</button>{out.actions}</div>
        <div className="department-body">{out.body}</div>
      </div>, target.node, target.id);
    })}
  </>;
}
