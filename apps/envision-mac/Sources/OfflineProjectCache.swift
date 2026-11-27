import Foundation
import ImageIO
import UniformTypeIdentifiers

private struct CachedArtwork: Codable {
    let id: String
    let hash: String
    let label: String
    let role: String
    let width: Int
    let height: Int
    let parent: String?

    init(_ artwork: Artwork) {
        id = artwork.id
        hash = artwork.hash
        label = artwork.label
        role = artwork.role
        width = artwork.width
        height = artwork.height
        parent = artwork.parent
    }

    var artwork: Artwork {
        Artwork(id: id, hash: hash, label: label, role: role, width: width, height: height,
                parent: parent, recipe: nil)
    }
}

private struct CachedProject: Codable {
    let id: String
    let name: String
    let kind: String
    let brief: String
    let artworks: [CachedArtwork]
    let selectedID: String
    let selectedHash: String
    let savedAt: Date

    var row: ProjectRow { ProjectRow(id: id, name: name, kind: kind, archived: false) }
    var info: ProjectInfo {
        ProjectInfo(id: id, versions: artworks.map(\.artwork), data: ProjectContent(brief: brief))
    }
}

final class OfflineProjectCache {
    static let onThisMac = OfflineProjectCache()
    private let root: URL
    private let fm: FileManager
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(directory: URL? = nil, fileManager: FileManager = .default) {
        fm = fileManager
        if let directory {
            root = directory
        } else {
            let support = try? fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
            root = (support ?? fileManager.temporaryDirectory)
                .appendingPathComponent("Envision Studio", isDirectory: true)
                .appendingPathComponent("Offline Projects", isDirectory: true)
        }
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    private func valid(_ text: String, length: Int) -> Bool {
        text.utf8.count == length && text.utf8.allSatisfy { (48...57).contains($0) || (97...102).contains($0) }
    }
    private func folder(_ id: String) throws -> URL {
        guard valid(id, length: 32) else { throw StudioError("The project identifier is invalid.") }
        return root.appendingPathComponent(id, isDirectory: true)
    }
    private func manifest(_ id: String) throws -> URL { try folder(id).appendingPathComponent("project.json") }
    private func image(_ id: String, hash: String) throws -> URL {
        guard valid(hash, length: 64) else { throw StudioError("The artwork identifier is invalid.") }
        return try folder(id).appendingPathComponent(hash + ".image")
    }
    private func read(_ id: String) -> CachedProject? {
        guard let url = try? manifest(id), let data = try? Data(contentsOf: url, options: .mappedIfSafe),
              data.count <= 2 * 1_048_576, let value = try? decoder.decode(CachedProject.self, from: data),
              value.id == id, valid(value.selectedHash, length: 64), let art = try? image(id, hash: value.selectedHash),
              (try? art.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true
        else { return nil }
        return value
    }

    private func isImage(_ data: Data) -> Bool {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil), CGImageSourceGetCount(source) == 1,
              let type = CGImageSourceGetType(source) as String?,
              [UTType.png.identifier, UTType.jpeg.identifier, UTType.webP.identifier].contains(type),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int,
              (1...4096).contains(width), (1...4096).contains(height), width * height <= 16_777_216
        else { return false }
        return true
    }

    func ids() -> Set<String> {
        let keys: [URLResourceKey] = [.isDirectoryKey]
        let entries = (try? fm.contentsOfDirectory(at: root, includingPropertiesForKeys: keys,
                                                   options: [.skipsHiddenFiles])) ?? []
        return Set(entries.compactMap { url in
            guard valid(url.lastPathComponent, length: 32), read(url.lastPathComponent) != nil else { return nil }
            return url.lastPathComponent
        })
    }
    func rows() -> [ProjectRow] { ids().compactMap(read).map(\.row).sorted { $0.name < $1.name } }
    func snapshot(_ id: String) -> (ProjectInfo, String)? {
        guard let cached = read(id) else { return nil }
        return (cached.info, cached.selectedID)
    }
    func artwork(project id: String, hash: String) -> Data? {
        guard read(id)?.selectedHash == hash, let url = try? image(id, hash: hash),
              let data = try? Data(contentsOf: url, options: .mappedIfSafe),
              (1...(40 * 1_048_576)).contains(data.count), isImage(data) else { return nil }
        return data
    }
    func save(project: ProjectRow, brief: String, artworks: [Artwork], selected: Artwork, bytes: Data) throws {
        guard !project.archived, artworks.contains(where: { $0.id == selected.id }),
              (1...(40 * 1_048_576)).contains(bytes.count), isImage(bytes) else {
            throw StudioError("The selected project cannot be stored offline.")
        }
        let directory = try folder(project.id)
        try fm.createDirectory(at: directory, withIntermediateDirectories: true,
                               attributes: [.posixPermissions: 0o700])
        let art = try image(project.id, hash: selected.hash)
        try bytes.write(to: art, options: [.atomic])
        try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: art.path)
        let value = CachedProject(id: project.id, name: project.name, kind: project.kind, brief: brief,
                                  artworks: artworks.map(CachedArtwork.init), selectedID: selected.id,
                                  selectedHash: selected.hash, savedAt: Date())
        let data = try encoder.encode(value)
        try data.write(to: manifest(project.id), options: [.atomic])
        try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: try manifest(project.id).path)
    }
    func remove(_ id: String) throws {
        let directory = try folder(id)
        if fm.fileExists(atPath: directory.path) { try fm.removeItem(at: directory) }
    }
}
