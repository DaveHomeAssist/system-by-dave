import Foundation
import Darwin

// Inspect the opened descriptor, not a path that may change between stat and
// open. Nonblocking open also prevents a mistakenly selected FIFO from hanging
// the application before it can be rejected as a non-regular file.
func loadProfile(at url: URL) throws -> ShowProfile {
    let limit = 256 * 1024
    let fd = open(url.path, O_RDONLY | O_NONBLOCK | O_CLOEXEC)
    guard fd >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    let file = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
    defer { try? file.close() }
    var info = stat()
    guard fstat(fd, &info) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    guard info.st_mode & S_IFMT == S_IFREG, info.st_size >= 0, info.st_size <= limit else {
        throw CheckError.message("The show profile must be a regular JSON file no larger than 256 KB.")
    }
    let data = try file.read(upToCount: limit + 1) ?? Data()
    guard data.count <= limit else { throw CheckError.message("The show profile exceeds 256 KB.") }
    let profile = try JSONDecoder().decode(ShowProfile.self, from: data)
    try profile.validate()
    return profile
}

// Reports contain display identifiers. Create a private sibling before writing
// bytes, then rename atomically; failure leaves the old report intact. Renaming
// replaces a destination symlink instead of following it to another file.
func writePrivateReport(_ report: CheckReport, to url: URL) throws {
    let data = try encodedReport(report)
    let temporary = url.deletingLastPathComponent().appendingPathComponent(".screen-check-\(UUID().uuidString).tmp")
    let fd = open(temporary.path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0o600)
    guard fd >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
    let file = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
    defer { try? file.close(); try? FileManager.default.removeItem(at: temporary) }
    try file.write(contentsOf: data)
    try file.close()
    guard rename(temporary.path, url.path) == 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
}

// An OS-held lock has no stale PID to recover after a crash. It also closes the
// race where two starting processes each see the other and both decide to exit.
final class InstanceLease {
    private let descriptor: Int32
    private init(descriptor: Int32) { self.descriptor = descriptor }
    deinit { close(descriptor) }

    static func acquire(at url: URL) throws -> InstanceLease? {
        let fd = open(url.path, O_RDWR | O_CREAT | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK, 0o600)
        guard fd >= 0 else { throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno)) }
        var info = stat()
        guard fstat(fd, &info) == 0, info.st_mode & S_IFMT == S_IFREG else {
            close(fd); throw CheckError.message("The instance lock is not a regular file.")
        }
        if flock(fd, LOCK_EX | LOCK_NB) == 0 { return InstanceLease(descriptor: fd) }
        let code = errno; close(fd)
        if code == EWOULDBLOCK { return nil }
        throw NSError(domain: NSPOSIXErrorDomain, code: Int(code))
    }
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
        try writePrivateReport(report, to: url)
    }
}

