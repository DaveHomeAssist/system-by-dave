// Frozen Startup Checks: a native window that runs startup.py and shows its live check stream.
// It contains no projector, network or Millumin control of its own. All machine work stays in
// startup.py and its explicitly configured bridge.
import AppKit
import WebKit

struct Config: Decodable {
    var python: String?
    var startup: String
    var profile: String
    var bridge: String?
    var fixture: String?
    var receiptDirectory: String
    var mode: String?          // "startup" (default) or "warm"
}

final class Controller: NSObject, NSApplicationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var config: Config?
    var configError: String?
    var process: Process?
    var buffer = Data()
    var lastReceipt: URL?
    var sawTerminalEvent = false
    var stderrTail = ""
    var pageReady = false
    var pendingRun = false
    let expandedSize = NSSize(width: 1280, height: 860)
    let bannerSize = NSSize(width: 760, height: 150)

    // MARK: Startup

    func applicationDidFinishLaunching(_ notification: Notification) {
        loadConfig()
        let content = WKUserContentController()
        content.add(self, name: "frozen")
        let settings = WKWebViewConfiguration()
        settings.userContentController = content
        web = WKWebView(frame: .zero, configuration: settings)
        window = NSWindow(contentRect: NSRect(origin: .zero, size: expandedSize),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Frozen Startup Checks"
        window.contentView = web
        window.delegate = self
        window.isReleasedWhenClosed = false
        place(size: expandedSize)
        let page = resources().appendingPathComponent("web/index.html")
        web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        pendingRun = true
    }

    func resources() -> URL {
        if let env = ProcessInfo.processInfo.environment["FROZEN_CHECKS_RESOURCES"] { return URL(fileURLWithPath: env) }
        return Bundle.main.resourceURL ?? URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent()
    }

    func loadConfig() {
        let args = CommandLine.arguments
        var path = ProcessInfo.processInfo.environment["FROZEN_CHECKS_CONFIG"]
        if let i = args.firstIndex(of: "--config"), i + 1 < args.count { path = args[i + 1] }
        let file = path ?? (NSHomeDirectory() + "/Library/Application Support/FrozenStartup/checks-app.json")
        do {
            let decoded = try JSONDecoder().decode(Config.self, from: Data(contentsOf: URL(fileURLWithPath: file)))
            guard (decoded.bridge == nil) != (decoded.fixture == nil) else {
                configError = "The configuration must name exactly one of bridge or fixture: \(file)"; return
            }
            config = decoded
        } catch {
            configError = "Configuration unavailable at \(file). No checks were run."
        }
    }

    // The window lives only on the primary (menu bar) display, which is the BenQ control screen.
    // It is never placed on, or allowed to cover, a projector output.
    func place(size: NSSize) {
        guard let screen = NSScreen.screens.first else { return }
        let area = screen.visibleFrame
        let width = min(size.width, area.width - 40), height = min(size.height, area.height - 40)
        let origin = NSPoint(x: area.minX + 20, y: area.maxY - height - 20)
        window.setFrame(NSRect(origin: origin, size: NSSize(width: width, height: height)), display: true, animate: false)
    }

    func windowDidMove(_ notification: Notification) { keepOnPrimary() }
    func windowDidResize(_ notification: Notification) { keepOnPrimary() }
    func keepOnPrimary() {
        guard let primary = NSScreen.screens.first, !primary.visibleFrame.contains(window.frame) else { return }
        place(size: window.frame.size)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // MARK: Page messages

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "ready":
            pageReady = true
            if pendingRun { pendingRun = false; startCheck() }
        case "retry": startCheck()
        case "crew": recordCrew(body)
        case "collapse": place(size: bannerSize)
        case "expand": place(size: expandedSize)
        default: break
        }
    }

    func send(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event), let json = String(data: data, encoding: .utf8) else { return }
        sendLine(json)
    }

    func sendLine(_ json: String) {
        // Each line is JSON produced by startup.py or JSONSerialization, which is a valid JavaScript literal.
        web.evaluateJavaScript("window.frozenStartup && window.frozenStartup.receive(\(json))", completionHandler: nil)
    }

    // MARK: Running startup.py

    func baseArguments(_ c: Config) -> [String] {
        var args = ["-B", c.startup, "--profile", c.profile, "--events", "-"]
        if let bridge = c.bridge { args += ["--bridge", bridge] } else if let fixture = c.fixture { args += ["--fixture", fixture] }
        return args
    }

    func startCheck() {
        guard let c = config else { send(["type": "unavailable", "message": configError ?? "Configuration unavailable."]); return }
        guard process == nil else { send(["type": "busy", "busy": true]); return }
        let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "")
        let receipt = URL(fileURLWithPath: c.receiptDirectory).appendingPathComponent("run-\(stamp).json")
        lastReceipt = receipt
        var args = baseArguments(c) + ["--receipt", receipt.path]
        if c.mode == "warm" { args.append("--warm") }
        launch(c, args)
    }

    func recordCrew(_ body: [String: Any]) {
        guard let c = config, let receipt = lastReceipt, process == nil else { send(["type": "busy", "busy": false]); return }
        let checks = body["checks"] as? [String: Bool] ?? [:]
        var evidence: [String: Any] = ["runID": body["runID"] as? String ?? "", "operator": body["operator"] as? String ?? ""]
        for key in ["surfacesAtoD", "approvedShow", "testCardsRemoved", "openingLookRestored", "warningsReviewed"] { evidence[key] = checks[key] == true }
        let file = receipt.deletingPathExtension().appendingPathExtension("crew.json")
        do {
            let data = try JSONSerialization.data(withJSONObject: evidence, options: [.prettyPrinted, .sortedKeys])
            try data.write(to: file, options: .atomic)
        } catch {
            send(["type": "unavailable", "message": "The crew check could not be saved: \(error.localizedDescription)"]); return
        }
        launch(c, baseArguments(c) + ["--receipt", receipt.path, "--verify-ready", "--crew-evidence", file.path])
    }

    func launch(_ c: Config, _ args: [String]) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: c.python ?? "/usr/bin/python3")
        task.arguments = args
        let out = Pipe(), err = Pipe()
        task.standardOutput = out
        task.standardError = err
        buffer = Data(); stderrTail = ""; sawTerminalEvent = false
        out.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let chunk = handle.availableData
            DispatchQueue.main.async { self?.consume(chunk) }
        }
        err.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let chunk = handle.availableData
            DispatchQueue.main.async { self?.stderrTail = String((self?.stderrTail ?? "") + (String(data: chunk, encoding: .utf8) ?? "")).suffix(600).description }
        }
        task.terminationHandler = { [weak self] finished in
            DispatchQueue.main.async {
                out.fileHandleForReading.readabilityHandler = nil
                err.fileHandleForReading.readabilityHandler = nil
                self?.consume(out.fileHandleForReading.readDataToEndOfFile())
                self?.finish(status: finished.terminationStatus)
            }
        }
        do {
            try task.run()
            process = task
            send(["type": "busy", "busy": true])
        } catch {
            send(["type": "unavailable", "message": "Python could not start at \(task.executableURL?.path ?? "?")."])
        }
    }

    func consume(_ chunk: Data) {
        buffer.append(chunk)
        while let newline = buffer.firstIndex(of: 0x0A) {
            let line = buffer.subdata(in: buffer.startIndex..<newline)
            buffer.removeSubrange(buffer.startIndex...newline)
            guard let text = String(data: line, encoding: .utf8), !text.isEmpty,
                  let object = try? JSONSerialization.jsonObject(with: line) as? [String: Any] else { continue }
            if let type = object["type"] as? String, ["result", "readiness", "unavailable"].contains(type) { sawTerminalEvent = true }
            sendLine(text)
        }
    }

    func finish(status: Int32) {
        process = nil
        if !sawTerminalEvent {
            let detail = stderrTail.trimmingCharacters(in: .whitespacesAndNewlines)
            send(["type": "unavailable", "message": detail.isEmpty ? "The startup check stopped (exit \(status))." : detail])
        }
        send(["type": "busy", "busy": false])
    }
}

let app = NSApplication.shared
let controller = Controller()
app.delegate = controller
app.setActivationPolicy(.regular)
app.run()
