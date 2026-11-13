import AppKit
import SwiftUI
import ServiceManagement
import UniformTypeIdentifiers

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
    private var debounce = CheckDebounce()
    private var observerTokens: [(NotificationCenter, NSObjectProtocol)] = []
    private let session: VerificationSession

    init(session: VerificationSession? = nil) {
        self.session = session ?? VerificationSession(
            read: { try evaluate(profile: loadProfile(at: profileURL), displays: readDisplays()) },
            persist: { try writePrivateReport($0, to: supportURL.appendingPathComponent("last-report.json")) }
        )
    }

    deinit {
        pending?.cancel()
        for (center, token) in observerTokens { center.removeObserver(token) }
    }

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
        let centers: [(NotificationCenter, Notification.Name)] = [
            (.default, NSApplication.didChangeScreenParametersNotification),
            (NSWorkspace.shared.notificationCenter, NSWorkspace.didWakeNotification)
        ]
        for (center, name) in centers {
            observerTokens.append((center, center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in self?.schedule() }))
        }
    }

    func schedule() {
        pending?.cancel(); actionMessage = nil; checking = true; didUpdate?()
        let seconds = debounce.delay(at: ProcessInfo.processInfo.systemUptime)
        let work = DispatchWorkItem { [weak self] in self?.check() }
        pending = work
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    func check() {
        pending?.cancel(); pending = nil; debounce.reset(); actionMessage = nil
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
            export(to: url)
        }
    }

    func export(to url: URL) {
        guard url.resolvingSymlinksInPath().standardizedFileURL != profileURL.resolvingSymlinksInPath().standardizedFileURL else {
            actionMessage = "Choose a different file; an exported report cannot replace your show profile."
            return
        }
        pending?.cancel(); pending = nil; debounce.reset()
        do { try session.export(to: url); actionMessage = "Fresh report saved." }
        catch { actionMessage = error.localizedDescription }
        publishResult()
    }

    func profileFolder() { NSWorkspace.shared.activateFileViewerSelecting([profileURL]) }
}

