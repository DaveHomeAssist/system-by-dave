import Foundation

struct StudioError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
    init(_ message: String) { self.message = message }
}

struct StudioOrigin: Equatable {
    let url: URL

    init(_ text: String) throws {
        guard var parts = URLComponents(string: text.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme?.lowercased() == "https", let host = parts.host, !host.isEmpty,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
              parts.path.isEmpty || parts.path == "/", parts.port.map({ (1...65535).contains($0) }) ?? true
        else { throw StudioError("Enter the private HTTPS studio address, including its port.") }
        parts.scheme = "https"
        parts.host = host.lowercased()
        parts.path = ""
        guard let url = parts.url else { throw StudioError("The studio address is invalid.") }
        self.url = url
    }

    func contains(_ other: URL?) -> Bool {
        guard let other else { return false }
        return other.scheme?.lowercased() == "https" && other.host?.lowercased() == url.host?.lowercased()
            && (other.port ?? 443) == (url.port ?? 443) && other.user == nil && other.password == nil
    }
}

private final class SameOrigin: NSObject, URLSessionTaskDelegate {
    let origin: StudioOrigin
    init(_ origin: StudioOrigin) { self.origin = origin }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(origin.contains(request.url) ? request : nil)
    }
}

struct ProjectRow: Decodable, Identifiable {
    let id: String
    let name: String
    let kind: String
    let archived: Bool
}
struct Worker: Decodable {
    let online: Bool
    let paused: Bool?
    let busy: Bool?
    let profiles: [String]?
    let workflows: [String]?
}
struct Dashboard: Decodable {
    let projects: [ProjectRow]
    let workers: [Worker]
    let pending: Int
}
struct Artwork: Decodable, Identifiable {
    let id: String
    let hash: String
    let label: String
    let role: String
    let width: Int
    let height: Int
}
struct ProjectInfo: Decodable {
    let id: String
    let versions: [Artwork]
}
struct ProjectID: Decodable { let id: String }
struct Upload: Decodable { let id: String; let hash: String }
struct Batch: Decodable { let jobs: [String] }
struct Job: Decodable, Identifiable {
    let id: String
    let project: String
    let state: String
    let progress: String?
    let error: String?
    let result: String?
    var pending: Bool { state == "queued" || state == "running" }
}
struct Canvas: Identifiable, Hashable {
    let name: String
    let width: Int
    let height: Int
    var id: String { "\(width)x\(height)" }
    var label: String { "\(name) · \(width) × \(height)" }
    static let sizes = [Canvas(name: "Square", width: 512, height: 512), Canvas(name: "Wide", width: 768, height: 432),
                        Canvas(name: "Portrait", width: 640, height: 800), Canvas(name: "Landscape", width: 800, height: 640),
                        Canvas(name: "Vertical", width: 432, height: 768)]
}

final class StudioClient {
    let origin: StudioOrigin
    private let session: URLSession

    init(_ origin: StudioOrigin) {
        self.origin = origin
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 18
        configuration.timeoutIntervalForResource = 120
        session = URLSession(configuration: configuration, delegate: SameOrigin(origin), delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }

    func route(_ path: String) -> URL {
        origin.url.appendingPathComponent("api/v1").appendingPathComponent(path)
    }

    private func send(_ path: String, method: String = "GET", body: Data? = nil,
                      type: String? = nil) async throws -> (Data, HTTPURLResponse) {
        var request = URLRequest(url: route(path))
        request.httpMethod = method
        request.httpBody = body
        if method != "GET" {
            request.setValue("studio", forHTTPHeaderField: "X-Envision")
            request.setValue(origin.url.absoluteString, forHTTPHeaderField: "Origin")
            request.setValue(type, forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, origin.contains(http.url) else {
            throw StudioError("Unexpected response from the studio.")
        }
        guard (200..<300).contains(http.statusCode) else {
            let details = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            throw StudioError(details?["error"] as? String ?? "Studio returned HTTP \(http.statusCode). Check the private address and Tailscale connection.")
        }
        return (data, http)
    }

    func read<T: Decodable>(_ path: String) async throws -> T {
        let (data, _) = try await send(path)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func post<T: Decodable>(_ path: String, json: [String: Any]) async throws -> T {
        let body = try JSONSerialization.data(withJSONObject: json)
        let (data, _) = try await send(path, method: "POST", body: body, type: "application/json")
        return try JSONDecoder().decode(T.self, from: data)
    }

    func upload<T: Decodable>(_ file: URL, to path: String, limit: Int) async throws -> T {
        let values = try file.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
        guard values.isRegularFile == true, let size = values.fileSize, size > 0, size <= limit else {
            throw StudioError("Choose a file smaller than \(limit / 1_048_576) MiB.")
        }
        let boundary = "envision-\(UUID().uuidString)"
        let name = file.lastPathComponent.components(separatedBy: CharacterSet.controlCharacters.union(CharacterSet(charactersIn: "\"\\"))).joined(separator: "_")
        let content = try Data(contentsOf: file, options: .mappedIfSafe)
        guard content.count <= limit else { throw StudioError("The file grew beyond the import limit.") }
        var body = Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(name)\"\r\nContent-Type: application/octet-stream\r\n\r\n".utf8)
        body.append(content)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))
        let (data, _) = try await send(path, method: "POST", body: body, type: "multipart/form-data; boundary=\(boundary)")
        return try JSONDecoder().decode(T.self, from: data)
    }

    func image(project: String, artwork: Artwork, thumbnail: Bool = false) async throws -> Data {
        if !thumbnail { return try await send("projects/\(project)/media/\(artwork.hash)").0 }
        var parts = URLComponents(url: route("projects/\(project)/media/\(artwork.hash)"), resolvingAgainstBaseURL: false)!
        parts.queryItems = [URLQueryItem(name: "thumb", value: "1")]
        let (data, response) = try await session.data(from: parts.url!)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200, origin.contains(http.url) else {
            throw StudioError("Artwork preview is unavailable.")
        }
        return data
    }

    func png(project: String, version: String) async throws -> (data: Data, filename: String) {
        let (data, response) = try await send("projects/\(project)/versions/\(version)/png")
        guard data.starts(with: [137,80,78,71,13,10,26,10]) else { throw StudioError("The studio did not return a PNG.") }
        let filename = (response.suggestedFilename ?? "Envision.png") as NSString
        return (data, filename.lastPathComponent)
    }
}
