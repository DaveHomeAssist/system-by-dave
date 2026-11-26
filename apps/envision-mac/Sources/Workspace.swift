import AppKit
import SwiftUI
import UniformTypeIdentifiers

enum WorkArea: String, CaseIterable {
    case generate = "Generate", studio = "Studio", compare = "Compare"
    var icon: String {
        switch self { case .generate: return "camera.aperture"; case .studio: return "square.grid.2x2"; case .compare: return "rectangle.split.2x1" }
    }
}

struct Direction: Codable {
    var prompt = ""
    var canvas = Canvas.sizes[0].id
    var count = 1
    var seed = ""
    var strength = 0.55
    var starting = ""
    var composition = ""
    var style = ""
    var retryFingerprint: String?
    var retryKey: String?
}

@MainActor final class Workspace: ObservableObject {
    static let shared = Workspace()
    private let defaults = UserDefaults.standard
    @Published private(set) var client: StudioClient?
    @Published var area: WorkArea = .generate
    @Published var connectionSheet = false
    @Published var newProjectSheet = false
    @Published var projects: [ProjectRow] = []
    @Published var projectID = ""
    @Published var draft = Direction() { didSet { persistDraft() } }
    @Published var artworks: [Artwork] = []
    @Published var selectedID = ""
    @Published var jobs: [Job] = []
    @Published var workerStatus = "Connecting"
    @Published var reachable = false
    @Published var busy = false
    @Published var notice = ""
    @Published var issue: String?
    @Published var studioURL: URL?
    @Published var studioNavigation = 0
    @Published var comparison = Comparison()
    private var updating = false
    private var lastResult: String?

    init() {
        if let saved = defaults.string(forKey: "StudioOrigin"), let origin = try? StudioOrigin(saved) {
            activate(origin)
        } else {
            workerStatus = "Set up connection"
            restoreDraft()
        }
    }
    var activeProject: ProjectRow? { projects.first { $0.id == projectID } }
    var selected: Artwork? { artworks.first { $0.id == selectedID } }
    var projectJobs: [Job] { jobs.filter { $0.project == projectID } }
    var pendingCount: Int { projectJobs.filter(\.pending).count }
    private var lastProjectKey: String { "project:" + (client?.origin.url.absoluteString ?? "") }
    private var draftKey: String { lastProjectKey + ":draft:" + projectID }

    private func persistDraft() {
        guard let data = try? JSONEncoder().encode(draft) else { return }
        defaults.set(data, forKey: draftKey)
    }
    private func restoreDraft() {
        let restored = defaults.data(forKey: draftKey).flatMap { try? JSONDecoder().decode(Direction.self, from: $0) }
        draft = restored ?? Direction()
    }
    private func activate(_ origin: StudioOrigin) {
        let firstConnectionDraft = client == nil && !draft.prompt.isEmpty ? draft : nil
        client = StudioClient(origin)
        defaults.set(origin.url.absoluteString, forKey: "StudioOrigin")
        reachable = false
        workerStatus = "Connecting"
        projects = []
        jobs = []
        artworks = []
        selectedID = ""
        studioURL = nil
        lastResult = nil
        projectID = defaults.string(forKey: lastProjectKey) ?? ""
        if let firstConnectionDraft, defaults.data(forKey: draftKey) == nil {
            draft = firstConnectionDraft
            defaults.removeObject(forKey: "project::draft:")
        } else { restoreDraft() }
    }
    func connect(_ address: String) async {
        do {
            let origin = try StudioOrigin(address)
            if client?.origin != origin { activate(origin) }
            connectionSheet = false
            await refresh()
            if area == .studio { showStudio() }
        } catch { issue = error.localizedDescription }
    }
    func chooseProject(_ id: String, carryUnassignedPrompt: Bool = false) {
        guard id != projectID else { return }
        let unassigned = projectID.isEmpty && carryUnassignedPrompt && !draft.prompt.isEmpty ? draft : nil
        projectID = id
        defaults.set(id, forKey: lastProjectKey)
        selectedID = ""
        artworks = []
        lastResult = nil
        notice = ""
        if let unassigned, defaults.data(forKey: draftKey) == nil {
            draft = unassigned
            defaults.removeObject(forKey: lastProjectKey + ":draft:")
        } else { restoreDraft() }
        Task { await refreshArt() }
    }
    func refresh() async {
        guard let api = client, !updating, !busy else { return }
        let requestedProject = projectID
        updating = true
        defer { updating = false }
        do {
            let state: Dashboard = try await api.read("state")
            let recent: [Job] = try await api.read("jobs")
            guard api === client, requestedProject == projectID, !busy, !Task.isCancelled else { return }
            projects = state.projects.filter { !$0.archived }
            jobs = recent
            if workerStatus == "Dominic unavailable" { notice = "" }
            reachable = true
            let workers = state.workers.filter { $0.online && ($0.profiles ?? []).contains("sdxl-turbo-local") && ($0.workflows ?? ["turbo-v1"]).contains("turbo-v2") }
            if workers.isEmpty { workerStatus = "Walter offline · jobs wait" }
            else if workers.allSatisfy({ $0.paused == true }) { workerStatus = "Walter paused" }
            else if workers.contains(where: { $0.busy == true }) { workerStatus = "Walter rendering" }
            else { workerStatus = "Walter ready" }
            if !projectID.isEmpty && !projects.contains(where: { $0.id == projectID }) { chooseProject("") }
            await refreshArt()
        } catch {
            guard api === client, !Task.isCancelled else { return }
            reachable = false
            workerStatus = "Dominic unavailable"
            notice = "Check Tailscale and the studio address. Your prompt is saved on this Mac."
        }
    }
    func refreshArt() async {
        guard let api = client, !projectID.isEmpty else { return }
        let id = projectID
        do {
            let info: ProjectInfo = try await api.read("projects/\(id)")
            guard api === client, id == projectID, !Task.isCancelled else { return }
            artworks = info.versions.filter { $0.role != "mask" }
            let result = projectJobs.first(where: { $0.state == "succeeded" })?.result
            if let result, result != lastResult, artworks.contains(where: { $0.id == result }) {
                selectedID = result
            } else if !artworks.contains(where: { $0.id == selectedID }) {
                selectedID = artworks.first?.id ?? ""
            }
            lastResult = result
        } catch {
            if api === client && id == projectID && !Task.isCancelled { notice = "Could not refresh the artwork. \(error.localizedDescription)" }
        }
    }
    func createProject(_ name: String) async {
        guard let api = client, !busy else { return }
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty && clean.count <= 100 else { issue = "Use a project name between 1 and 100 characters."; return }
        busy = true
        do {
            let created: ProjectID = try await api.post("projects", json: ["name": clean, "kind": "image"])
            chooseProject(created.id, carryUnassignedPrompt: true)
            newProjectSheet = false
        } catch { issue = error.localizedDescription }
        busy = false
        await refresh()
    }
    func generate() async {
        guard let api = client, !projectID.isEmpty, !busy else { return }
        let prompt = draft.prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty && prompt.count <= 6000 else { issue = "Enter an image prompt of up to 6,000 characters."; return }
        let seedText = draft.seed.trimmingCharacters(in: .whitespacesAndNewlines)
        let seed = Int64(seedText)
        guard seedText.isEmpty || (seed.map { (0...4_503_599_627_370_492).contains($0) } ?? false) else {
            issue = "Enter a nonnegative seed up to 4503599627370492 or leave it blank."
            return
        }
        let size = Canvas.sizes.first { $0.id == draft.canvas } ?? Canvas.sizes[0]
        let refs = ["composition": draft.composition, "style": draft.style].filter { !$0.value.isEmpty }
        let id = projectID
        var body: [String: Any] = ["operation": draft.starting.isEmpty ? "generate" : "revise",
                                  "prompt": prompt, "size": [size.width, size.height], "count": draft.count,
                                  "strength": draft.strength, "refs": refs, "profile": "sdxl-turbo-local"]
        if let seed { body["seed"] = seed }
        if !draft.starting.isEmpty { body["parent"] = draft.starting }
        busy = true
        do {
            let fingerprint = try JSONSerialization.data(withJSONObject: body, options: .sortedKeys).base64EncodedString()
            if draft.retryFingerprint != fingerprint || draft.retryKey == nil {
                draft.retryFingerprint = fingerprint
                draft.retryKey = UUID().uuidString
            }
            body["key"] = draft.retryKey
            let batch: Batch = try await api.post("projects/\(id)/jobs", json: body)
            draft.retryKey = nil
            draft.retryFingerprint = nil
            notice = batch.jobs.count == 1 ? "Image queued on Walter." : "\(batch.jobs.count) images queued on Walter."
        } catch { issue = error.localizedDescription }
        busy = false
        await refresh()
    }
    func attachReference(_ file: URL) async {
        guard let api = client, !projectID.isEmpty, !busy else { return }
        let id = projectID
        busy = true
        do {
            let asset: Upload = try await api.upload(file, to: "projects/\(id)/assets", limit: 40 * 1_048_576)
            if id == projectID { draft.composition = asset.hash; notice = "Composition reference added." }
        } catch { issue = error.localizedDescription }
        busy = false
        await refreshArt()
    }
    func savePNG() async {
        guard let api = client, let artwork = selected, !busy else { return }
        busy = true
        defer { busy = false }
        do {
            let result = try await api.png(project: projectID, version: artwork.id)
            let panel = NSSavePanel()
            panel.allowedContentTypes = [.png]
            panel.nameFieldStringValue = result.filename
            if panel.runModal() == .OK, let url = panel.url {
                try result.data.write(to: url, options: .atomic)
                notice = "Saved \(url.lastPathComponent)."
            }
        } catch { issue = error.localizedDescription }
    }
    func showStudio(_ section: String? = nil, project: String? = nil) {
        area = .studio
        guard let client else { connectionSheet = true; return }
        if studioURL != nil && section == nil { return }
        var parts = URLComponents(url: client.origin.url, resolvingAgainstBaseURL: false)!
        let id = project ?? projectID
        if let section, ["create","library","layout"].contains(section), !id.isEmpty {
            parts.fragment = "project/\(id)/\(section)"
        } else { parts.fragment = section == "queue" ? "queue" : "projects" }
        parts.path = "/"
        studioURL = parts.url
        studioNavigation += 1
    }
    func importProject(_ file: URL) async {
        guard !busy else { issue = "Finish the current operation, then reopen the project file."; return }
        guard let api = client else { issue = "Connect to Dominic before importing a project."; return }
        busy = true
        do {
            let limit = (file.pathExtension.lowercased() == "zip" ? 96 : 40) * 1_048_576
            let imported: ProjectID = try await api.upload(file, to: "imports", limit: limit)
            chooseProject(imported.id)
            showStudio("layout", project: imported.id)
        } catch { issue = error.localizedDescription }
        busy = false
        await refresh()
    }
    func openFiles(_ files: [URL]) {
        guard !files.isEmpty else { return }
        if files.allSatisfy({ Comparison.supports($0) }) {
            area = .compare
            do { try comparison.open(files) } catch { issue = error.localizedDescription }
        } else if files.count == 1 && ["zip", "json"].contains(files[0].pathExtension.lowercased()) {
            Task { await importProject(files[0]) }
        } else { issue = "Choose one editable project or up to two PNG, JPEG or WebP images." }
    }
}
