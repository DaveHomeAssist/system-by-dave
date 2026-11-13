import Foundation

struct ExpectedGroup: Codable {
    var id: String
    var name: String
    var model: String
    var color: String
    var vendor: UInt32
    var product: UInt32
    var count: Int
    var width: Int
    var height: Int
    var refreshRate: Double
    var note: String
    var target: String { "\(width) × \(height) · \(formatHz(refreshRate)) Hz" }
}

struct ShowProfile: Codable {
    var schemaVersion: Int
    var name: String
    var source: String
    var ignoreBuiltIn: Bool
    var refreshTolerance: Double
    var groups: [ExpectedGroup]

    func validate() throws {
        guard schemaVersion == 1, !name.isEmpty, !groups.isEmpty, groups.count <= 32,
              refreshTolerance.isFinite, refreshTolerance >= 0, refreshTolerance <= 1 else {
            throw CheckError.message("Invalid profile version, groups or refresh tolerance.")
        }
        var identifiers = Set<String>(), identities = Set<String>()
        for g in groups {
            guard !g.id.isEmpty, !g.name.isEmpty, g.vendor > 0, g.product > 0,
                  g.count > 0, g.count <= 16, g.width > 0, g.width <= 32768,
                  g.height > 0, g.height <= 32768, g.refreshRate.isFinite,
                  g.refreshRate > 0, g.refreshRate <= 1000,
                  identifiers.insert(g.id).inserted,
                  identities.insert("\(g.vendor):\(g.product)").inserted else {
                throw CheckError.message("Invalid or duplicate profile entry: \(g.name). Use one group with a count for identical models.")
            }
        }
    }
}

enum CheckError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let value) = self { return value }; return nil }
}

struct DisplayObservation: Codable, Equatable {
    var id: UInt32
    var name: String
    var vendor: UInt32
    var product: UInt32
    var serial: UInt32
    var uuid: String?
    var builtIn: Bool
    var active: Bool
    var mirrored: Bool
    var width: Int?
    var height: Int?
    var pixelWidth: Int?
    var pixelHeight: Int?
    var refreshRate: Double?
    var rotation: Double
    var interlaced: Bool? = nil
    var stretched: Bool? = nil

    var detail: String {
        guard let pw = pixelWidth, let ph = pixelHeight else { return "Display \(id): mode unavailable" }
        let hz = refreshRate.flatMap { $0 > 0 ? formatHz($0) : nil } ?? "unknown"
        var line = "Display \(id): \(pw) × \(ph) output · \(hz) Hz"
        if width != pw || height != ph { line += " · desktop \(width ?? 0) × \(height ?? 0)" }
        if mirrored { line += " · mirrored" }
        if !active { line += " · inactive" }
        if interlaced == true { line += " · interlaced" }
        if stretched == true { line += " · stretched" }
        if rotation != 0 { line += " · rotation \(formatHz(rotation))°" }
        return line
    }
}

enum CheckState: String, Codable { case ready, attention, unknown }

struct CheckRow: Codable, Identifiable {
    var id: String
    var name: String
    var model: String
    var color: String
    var target: String
    var state: CheckState
    var readyCount: Int
    var expectedCount: Int
    var observations: [DisplayObservation]
    var issues: [String]
    var note: String
}

struct CheckReport: Codable {
    var schemaVersion = 1
    var checkedAt: String
    var profileName: String
    var profileSource: String
    var state: CheckState
    var readyCount: Int
    var expectedCount: Int
    var rows: [CheckRow]
    var scope = "macOS display identity and output mode only; not projector input readback, image visibility, mapping or show readiness."
}

func formatHz(_ value: Double) -> String {
    value == value.rounded() ? String(format: "%.0f", value) : String(format: "%.2f", value)
}

func evaluate(profile: ShowProfile, displays: [DisplayObservation], at: Date = Date()) throws -> CheckReport {
    try profile.validate()
    guard Set(displays.map(\.id)).count == displays.count else {
        throw CheckError.message("macOS returned duplicate display IDs. Check again after the connection settles.")
    }
    let visible = displays.filter { !(profile.ignoreBuiltIn && $0.builtIn) }
    var used = Set<UInt32>()
    var rows: [CheckRow] = []
    for g in profile.groups {
        let matches = visible.filter { $0.vendor == g.vendor && $0.product == g.product }.sorted { $0.id < $1.id }
        var issues: [String] = []
        var ready = 0
        var unknown = false
        if matches.count != g.count { issues.append("Expected \(g.count); found \(matches.count).") }
        for d in matches {
            used.insert(d.id)
            var good = true
            if !d.active { issues.append("Display \(d.id) is inactive."); good = false }
            if d.mirrored { issues.append("Display \(d.id) is mirrored; extended output is required."); good = false }
            if d.interlaced == true { issues.append("Display \(d.id) is interlaced; progressive output is required."); good = false }
            if d.stretched == true { issues.append("Display \(d.id) uses a stretched mode."); good = false }
            if d.interlaced == nil || d.stretched == nil {
                issues.append("Display \(d.id): scan-mode flags are unavailable."); good = false; unknown = true
            }
            if d.pixelWidth == nil || d.pixelHeight == nil || d.width == nil || d.height == nil {
                issues.append("Display \(d.id): output mode is unavailable."); good = false; unknown = true
            } else if d.pixelWidth != g.width || d.pixelHeight != g.height {
                issues.append("Display \(d.id): output must be \(g.width) × \(g.height)."); good = false
            } else if d.width != g.width || d.height != g.height {
                issues.append("Display \(d.id): desktop scaling is enabled; unscaled output is required."); good = false
            }
            if let hz = d.refreshRate, hz.isFinite, hz > 0 {
                if abs(hz - g.refreshRate) > profile.refreshTolerance {
                    issues.append("Display \(d.id): refresh must be near \(formatHz(g.refreshRate)) Hz."); good = false
                }
            } else {
                issues.append("Display \(d.id): refresh rate is unknown."); good = false; unknown = true
            }
            if good { ready += 1 }
        }
        rows.append(CheckRow(id: g.id, name: g.name, model: g.model, color: g.color, target: g.target,
                             state: issues.isEmpty ? .ready : (unknown && matches.count == g.count ? .unknown : .attention),
                             readyCount: min(ready, g.count), expectedCount: g.count, observations: matches,
                             issues: issues, note: g.note))
    }
    for d in visible where !used.contains(d.id) {
        rows.append(CheckRow(id: "unexpected-\(d.id)", name: "Unrecognized output · \(d.name)", model: "ID \(d.vendor):\(d.product)",
                             color: "orange", target: "Not in the approved profile", state: .attention,
                             readyCount: 0, expectedCount: 0, observations: [d],
                             issues: ["Confirm this screen and update the profile if it belongs to the show."], note: ""))
    }
    return CheckReport(checkedAt: ISO8601DateFormatter().string(from: at), profileName: profile.name,
                       profileSource: profile.source, state: rows.allSatisfy { $0.state == .ready } ? .ready : .attention,
                       readyCount: rows.reduce(0) { $0 + $1.readyCount }, expectedCount: profile.groups.reduce(0) { $0 + $1.count }, rows: rows)
}

// Bound profile reads so accidentally selecting a large file cannot exhaust
// memory or hold the native interface while JSONDecoder reads the entire file.
func loadProfile(at url: URL) throws -> ShowProfile {
    let limit = 256 * 1024
    let values = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
    guard values.isRegularFile == true, let size = values.fileSize, size <= limit else {
        throw CheckError.message("The show profile must be a JSON file no larger than 256 KB.")
    }
    let file = try FileHandle(forReadingFrom: url)
    defer { try? file.close() }
    let data = try file.read(upToCount: limit + 1) ?? Data()
    guard data.count <= limit else { throw CheckError.message("The show profile exceeds 256 KB.") }
    let profile = try JSONDecoder().decode(ShowProfile.self, from: data)
    try profile.validate()
    return profile
}

// The OS list API truncates at capacity without returning an error. Grow a
// full buffer instead of trusting a count read before a display reconnects.
func completeDisplayIDs(query: (Int) throws -> [UInt32]) throws -> [UInt32] {
    for capacity in [8, 16, 32, 64, 128, 256, 512, 1024] {
        let ids = try query(capacity)
        guard ids.count <= capacity, Set(ids).count == ids.count else {
            throw CheckError.message("The display list is inconsistent. Check again.")
        }
        if ids.count < capacity { return ids.sorted() }
    }
    throw CheckError.message("The display list exceeds the supported limit; no partial list was accepted.")
}

func stableDisplaySnapshot(capture: () throws -> [DisplayObservation]) throws -> [DisplayObservation] {
    var previous = try capture().sorted { $0.id < $1.id }
    for _ in 0..<3 {
        let current = try capture().sorted { $0.id < $1.id }
        if current == previous { return current }
        previous = current
    }
    throw CheckError.message("Displays are still changing. Check again after the connection settles.")
}

final class VerificationSession {
    private let read: () throws -> CheckReport
    private let persist: (CheckReport) throws -> Void
    private(set) var report: CheckReport?
    private(set) var error: String?
    private(set) var saveWarning: String?

    init(read: @escaping () throws -> CheckReport, persist: @escaping (CheckReport) throws -> Void) {
        self.read = read; self.persist = persist
    }

    func check() {
        report = nil; error = nil; saveWarning = nil
        let current: CheckReport
        do { current = try read(); report = current }
        catch { self.error = error.localizedDescription; return }
        do { try persist(current) }
        catch { saveWarning = "Readings are current, but the local report could not be saved: " + error.localizedDescription }
    }

    // Re-read after the Save dialog returns. Displays may have changed while
    // that dialog's nested event loop was open.
    func export(to url: URL) throws {
        check()
        guard let report else { throw CheckError.message(error ?? "Unable to verify displays.") }
        try encodedReport(report).write(to: url, options: .atomic)
    }
}

enum Invocation: Equatable {
    case gui(login: Bool)
    case json(profilePath: String?)
}

func parseInvocation(_ args: [String]) throws -> Invocation {
    var json = false, login = false
    var profile: String?
    var index = 0
    func invalid() -> CheckError {
        .message("Use --check-json [--profile path.json], --login, or no arguments.")
    }
    while index < args.count {
        switch args[index] {
        case "--check-json":
            guard !json else { throw invalid() }; json = true
        case "--login":
            guard !login else { throw invalid() }; login = true
        case "--profile":
            index += 1
            guard profile == nil, index < args.count, !args[index].isEmpty, !args[index].hasPrefix("--") else { throw invalid() }
            profile = args[index]
        default:
            // Legacy Launch Services may append a process serial number.
            guard args[index].hasPrefix("-psn_") else { throw invalid() }
        }
        index += 1
    }
    guard !(login && json), profile == nil || json else { throw invalid() }
    return json ? .json(profilePath: profile) : .gui(login: login)
}

func encodedReport(_ report: CheckReport) throws -> Data {
    let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    return try encoder.encode(report)
}
