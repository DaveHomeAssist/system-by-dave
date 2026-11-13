import AppKit
import SwiftUI
import ServiceManagement
import UniformTypeIdentifiers

let appID = "com.systembydave.frozen-screen-check"
let loginPlist = appID + ".plist"
let supportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("Frozen Screen Check", isDirectory: true)
let profileURL = supportURL.appendingPathComponent("show-profile.json")

func bundledProfileURL() throws -> URL {
    guard let url = Bundle.main.url(forResource: "show-profile", withExtension: "json") else {
        throw CheckError.message("The app's show profile is missing. Reinstall the complete app bundle.")
    }
    return url
}

func displayCheckTime(_ value: String) -> String {
    guard let date = ISO8601DateFormatter().date(from: value) else { return "Time unavailable" }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US")
    formatter.timeZone = TimeZone(identifier: "America/New_York")
    formatter.dateFormat = "MMM d, h:mm:ss a z"
    return formatter.string(from: date)
}

final class CheckModel: ObservableObject {
    @Published var report: CheckReport?
    @Published var error: String?
    @Published var checking = false
    @Published var loginState = "Checking login setting…"
    @Published var loginEnabled = false
    @Published var loginApproval = false
    @Published var actionMessage: String?
    @Published var saveWarning: String?
    var didUpdate: (() -> Void)?
    private var pending: DispatchWorkItem?
    private var observerTokens: [NSObjectProtocol] = []
    private let session = VerificationSession(
        read: { try evaluate(profile: loadProfile(at: profileURL), displays: readDisplays()) },
        persist: { try encodedReport($0).write(to: supportURL.appendingPathComponent("last-report.json"), options: .atomic) }
    )

    var headline: String {
        if checking { return "Checking screens…" }
        if error != nil { return "Check unavailable" }
        guard let r = report else { return "Waiting for display information" }
        if r.state == .ready { return "All \(r.expectedCount) screens match" }
        return r.readyCount == r.expectedCount ? "Display setup needs attention" : "\(r.readyCount) of \(r.expectedCount) screens match"
    }

    func prepare() {
        do {
            try FileManager.default.createDirectory(at: supportURL, withIntermediateDirectories: true)
            if !FileManager.default.fileExists(atPath: profileURL.path) {
                try FileManager.default.copyItem(at: bundledProfileURL(), to: profileURL)
            }
        } catch { self.error = error.localizedDescription }
        refreshLogin()
        observerTokens.append(NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in self?.schedule() })
        observerTokens.append(NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in self?.schedule() })
    }

    func schedule(after seconds: Double = 2) {
        pending?.cancel(); checking = true; didUpdate?()
        let work = DispatchWorkItem { [weak self] in self?.check() }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    func check() {
        pending?.cancel(); pending = nil
        session.check()
        publishResult()
    }

    private func publishResult() {
        report = session.report; error = session.error; saveWarning = session.saveWarning
        checking = false; refreshLogin(); didUpdate?()
    }

    func refreshLogin() {
        let status = SMAppService.agent(plistName: loginPlist).status
        loginEnabled = status == .enabled
        loginApproval = status == .requiresApproval
        switch status {
        case .enabled: loginState = "Checks start at login"
        case .requiresApproval: loginState = "Login checks need macOS approval"
        case .notRegistered: loginState = "Login checks are off"
        case .notFound:
            let helper = Bundle.main.bundleURL.appendingPathComponent("Contents/Library/LaunchAgents/" + loginPlist)
            loginState = FileManager.default.fileExists(atPath: helper.path)
                ? "Login service is not registered" : "Login helper is missing; reinstall the app"
        @unknown default: loginState = "Login state unavailable"
        }
    }

    func changeLogin() {
        if loginApproval { SMAppService.openSystemSettingsLoginItems(); return }
        let path = Bundle.main.bundleURL.standardizedFileURL.path
        let userApps = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Applications").path + "/"
        guard path.hasPrefix("/Applications/") || path.hasPrefix(userApps) else {
            actionMessage = "Move Frozen Screen Check.app to Applications first, reopen it, then enable login checks."
            return
        }
        do {
            let service = SMAppService.agent(plistName: loginPlist)
            if loginEnabled { try service.unregister() } else { try service.register() }
            actionMessage = nil
        } catch { actionMessage = "Login setting: " + error.localizedDescription }
        refreshLogin(); didUpdate?()
    }

    func export() {
        guard report != nil, !checking else { return }
        let panel = NSSavePanel()
        panel.nameFieldStringValue = "Frozen-screen-check.json"
        panel.title = "Save screen verification"
        panel.allowedContentTypes = [.json]
        if panel.runModal() == .OK, let url = panel.url {
            guard url.resolvingSymlinksInPath().standardizedFileURL != profileURL.resolvingSymlinksInPath().standardizedFileURL else {
                actionMessage = "Choose a different file; an exported report cannot replace your show profile."
                return
            }
            pending?.cancel(); pending = nil
            do { try session.export(to: url); actionMessage = "Fresh report saved." }
            catch { actionMessage = error.localizedDescription }
            publishResult()
        }
    }

    func profileFolder() { NSWorkspace.shared.activateFileViewerSelecting([profileURL]) }
}

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
                    Label(row.state == .ready ? "MATCH" : (row.observations.isEmpty ? "MISSING" : "CHECK"),
                          systemImage: row.state == .ready ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                        .font(.caption.bold()).foregroundStyle(row.state == .ready ? Color.green : Color.orange)
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
                    Text(row.issues.joined(separator: " ")).font(.caption).foregroundStyle(.orange)
                }
                if !row.note.isEmpty { Text(row.note).font(.caption2).foregroundStyle(.secondary) }
            }
        }.padding(12).background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 9))
    }
}

struct DashboardView: View {
    @ObservedObject var model: CheckModel
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FROZEN / SCREEN CHECK").font(.caption.weight(.semibold)).tracking(1.5).foregroundStyle(.secondary)
                    Text(model.headline).font(.system(size: 25, weight: .bold))
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
            if let warning = model.saveWarning { Text(warning).font(.caption).foregroundStyle(.orange).textSelection(.enabled) }
            Divider()
            HStack {
                if let report = model.report {
                    Text("Checked \(displayCheckTime(report.checkedAt))").font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                Button("Profile…") { model.profileFolder() }
                Button("Export Report…") { model.export() }.disabled(model.report == nil || model.checking)
            }
            Text("A match confirms Mac output settings only—not cabling, projector reception or mapped content.")
                .font(.caption2).foregroundStyle(.secondary)
        }.padding(18).frame(minWidth: 640, minHeight: 560)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    let model = CheckModel()
    var window: NSWindow!
    var status: NSStatusItem!
    var summaryItem: NSMenuItem!

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
        window.minSize = NSSize(width: 680, height: 620)
        window.isReleasedWhenClosed = false; window.center()
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

if let other = NSRunningApplication.runningApplications(withBundleIdentifier: appID).first(where: { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }) {
    if invocation != .gui(login: true) { other.activate(options: [.activateAllWindows, .activateIgnoringOtherApps]) }
    exit(0)
}
let delegate = AppDelegate()
NSApplication.shared.delegate = delegate
NSApplication.shared.run()
