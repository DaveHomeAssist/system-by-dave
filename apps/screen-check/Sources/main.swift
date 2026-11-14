import AppKit
import SwiftUI
import ServiceManagement
import UniformTypeIdentifiers

func accent(_ name: String) -> Color {
    switch name {
    case "purple": return .purple
    case "cyan": return .cyan
    case "yellow": return .yellow
    case "orange": return .orange
    default: return .blue
    }
}

struct DisplayRowView: View {
    let row: CheckRow
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 2).fill(accent(row.color)).frame(width: 4)
            VStack(alignment: .leading, spacing: 5) {
                HStack {
                    Text(row.name).font(.headline)
                    Spacer()
                    Label(row.stateLabel,
                          systemImage: row.state == .ready ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                        .font(.caption.bold())
                }
                HStack {
                    Text(row.model).foregroundStyle(.secondary)
                    Spacer()
                    Text(row.target).monospacedDigit()
                }.font(.caption)
                if row.observations.isEmpty {
                    Text("No matching display detected").font(.callout).foregroundStyle(.secondary)
                }
                ForEach(row.observations, id: \.id) { display in
                    Text(display.detail).font(.system(size: 12, design: .monospaced)).textSelection(.enabled)
                }
                if !row.issues.isEmpty {
                    Text(row.issues.joined(separator: " ")).font(.caption)
                }
                if !row.note.isEmpty { Text(row.note).font(.caption2).foregroundStyle(.secondary) }
            }
        }.padding(12).background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 9))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(row.accessibilitySummary)
    }
}

struct DashboardView: View {
    @ObservedObject var model: CheckModel
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FROZEN / SCREEN CHECK").font(.caption.weight(.semibold)).tracking(1.5).foregroundStyle(.secondary)
                    Text(model.headline).font(.system(size: 25, weight: .bold)).accessibilityAddTraits(.isHeader)
                }
                Spacer()
                Button(action: { model.check() }) { Label("Check Now", systemImage: "arrow.clockwise") }
                    .keyboardShortcut("r", modifiers: .command).controlSize(.large)
            }
            HStack(spacing: 8) {
                Image(systemName: "info.circle")
                Text("Verifies Mac output identity and timing. It never changes a display or projector.")
            }.font(.caption).foregroundStyle(.secondary)
            if let error = model.error {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Unable to verify", systemImage: "exclamationmark.triangle.fill").font(.headline)
                    Text(error).textSelection(.enabled)
                    Button("Open profile folder") { model.profileFolder() }
                }.padding().frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 9))
            }
            ScrollView {
                VStack(spacing: 8) {
                    if model.checking && model.report != nil {
                        Label("Checking for changes. Previous readings shown below.", systemImage: "arrow.clockwise")
                            .font(.caption).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let report = model.report {
                        ForEach(report.rows) { row in DisplayRowView(row: row) }
                    }
                    if model.report == nil && model.error == nil { ProgressView().padding(50) }
                }.frame(maxWidth: .infinity)
            }.frame(maxHeight: .infinity)
            HStack {
                Label(model.loginState, systemImage: model.loginEnabled ? "checkmark.circle" : "power")
                    .font(.callout)
                Spacer()
                Button(model.loginApproval ? "Open Login Settings" : (model.loginEnabled ? "Disable" : "Enable at Login")) { model.changeLogin() }
            }
            if let message = model.actionMessage { Text(message).font(.caption).foregroundStyle(.secondary).textSelection(.enabled) }
            if let warning = model.saveWarning { Label(warning, systemImage: "exclamationmark.triangle").font(.caption).textSelection(.enabled) }
            Divider()
            HStack {
                if let report = model.report {
                    Text("Checked \(displayCheckTime(report.checkedAt))").font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                Button("Profile…") { model.profileFolder() }
                    .keyboardShortcut(",", modifiers: .command)
                Button("Export Report…") { model.export() }.disabled(model.report == nil || model.checking)
                    .keyboardShortcut("e", modifiers: .command)
            }
            Text("A match confirms Mac output settings only—not cabling, projector reception or mapped content.")
                .font(.caption2).foregroundStyle(.secondary)
        }.padding(16).frame(minWidth: 560, minHeight: 460)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    let model = CheckModel()
    var window: NSWindow!
    var status: NSStatusItem!
    var summaryItem: NSMenuItem!
    private var lastOpenRequest: String?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        let menu = NSMenu()
        summaryItem = NSMenuItem(title: "Checking screens…", action: nil, keyEquivalent: "")
        menu.addItem(summaryItem); menu.addItem(.separator())
        for (title, action) in [("Open Checklist", #selector(show)), ("Check Now", #selector(check)),
                                ("Export Report…", #selector(exportReport)), ("Quit Screen Check", #selector(quit))] {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
            item.target = self; menu.addItem(item)
        }
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.menu = menu
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 740, height: 690),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Frozen Screen Check"
        window.contentView = NSHostingView(rootView: DashboardView(model: model))
        window.minSize = NSSize(width: 580, height: 520)
        window.isReleasedWhenClosed = false; window.center()
        DistributedNotificationCenter.default().addObserver(self, selector: #selector(openRequested(_:)), name: openRequestName, object: nil)
        model.didUpdate = { [weak self] in self?.updateStatus() }
        model.prepare()
        if invocation == .gui(login: true) {
            // A screen-change debounce must not cancel the startup review.
            model.checking = true; updateStatus()
            DispatchQueue.main.asyncAfter(deadline: .now() + 12) { [weak self] in
                guard let self else { return }
                self.model.check()
                if self.model.report?.state != .ready { self.show() }
            }
        } else { model.check(); show() }
        NotificationCenter.default.addObserver(self, selector: #selector(becameActive), name: NSApplication.didBecomeActiveNotification, object: nil)
    }

    func updateStatus() {
        let ready = !model.checking && model.error == nil && model.report?.state == .ready
        let symbol = model.checking ? "display" : (ready ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
        status.button?.image = NSImage(systemSymbolName: symbol, accessibilityDescription: model.headline)
        if model.checking { status.button?.title = " Screens…" }
        else if model.error != nil { status.button?.title = " Screens unavailable" }
        else if let report = model.report, report.state != .ready && report.readyCount == report.expectedCount {
            status.button?.title = " Screens: review"
        } else { status.button?.title = " Screens \(model.report?.readyCount ?? 0)/\(model.report?.expectedCount ?? 5)" }
        let summary = model.headline + (model.saveWarning == nil ? "" : " · report not saved")
        status.button?.toolTip = summary
        summaryItem.title = summary
    }
    @objc func show() { window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
    @objc func check() { model.check() }
    @objc func exportReport() { show(); model.export() }
    @objc func quit() { NSApp.terminate(nil) }
    @objc func becameActive() { model.refreshLogin() }
    @objc func openRequested(_ notification: Notification) {
        guard let request = notification.userInfo?["request"] as? String, request != lastOpenRequest else { return }
        lastOpenRequest = request
        show(); model.check()
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { show(); model.check(); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

let invocation: Invocation
do { invocation = try parseInvocation(Array(CommandLine.arguments.dropFirst())) }
catch { fputs("\(error.localizedDescription)\n", stderr); exit(3) }

if case .json(let path) = invocation {
    do {
        let url: URL
        if let path { url = URL(fileURLWithPath: path) }
        else { url = FileManager.default.fileExists(atPath: profileURL.path) ? profileURL : try bundledProfileURL() }
        let report = try evaluate(profile: loadProfile(at: url), displays: readDisplays())
        print(String(decoding: try encodedReport(report), as: UTF8.self))
        exit(report.state == .ready ? 0 : 2)
    } catch { fputs("Unable to verify: \(error.localizedDescription)\n", stderr); exit(3) }
}

let instanceLease: InstanceLease
do {
    try FileManager.default.createDirectory(at: supportURL, withIntermediateDirectories: true)
    guard let lease = try InstanceLease.acquire(at: supportURL.appendingPathComponent("instance.lock")) else {
        if invocation != .gui(login: true) {
            let request = UUID().uuidString
            let started = Date()
            // Retry briefly if the owning process is still creating its window.
            // The receiver deduplicates the token, so one request causes one check.
            for offset in [0.0, 0.1, 0.3, 0.6, 1.0] {
                RunLoop.current.run(until: started.addingTimeInterval(offset))
                DistributedNotificationCenter.default().postNotificationName(openRequestName, object: nil, userInfo: ["request": request], deliverImmediately: true)
            }
        }
        exit(0)
    }
    instanceLease = lease
} catch {
    NSApplication.shared.setActivationPolicy(.accessory)
    let alert = NSAlert()
    alert.messageText = "Screen Check could not start"
    alert.informativeText = error.localizedDescription
    alert.addButton(withTitle: "Quit")
    alert.runModal()
    exit(3)
}
let delegate = AppDelegate()
NSApplication.shared.delegate = delegate
withExtendedLifetime(instanceLease) { NSApplication.shared.run() }
