import AppKit
import SwiftUI
import WebKit

struct StudioWeb: NSViewRepresentable {
    let destination: URL
    let origin: StudioOrigin
    let navigation: Int
    let retry: Int
    let report: (String?) -> Void

    func makeCoordinator() -> Host { Host(origin: origin, report: report) }
    func makeNSView(context: Context) -> WKWebView {
        let web = WKWebView()
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true
        web.setAccessibilityLabel("Private Envision studio")
        return web
    }
    func updateNSView(_ web: WKWebView, context: Context) {
        let host = context.coordinator
        guard origin.contains(destination), host.navigation != navigation || host.retry != retry else { return }
        let soft = host.retry == retry && origin.contains(web.url) && web.url?.path == destination.path
        host.navigation = navigation
        host.retry = retry
        if soft && web.url?.fragment == destination.fragment { return }
        if soft {
            Task { @MainActor in
                do {
                    _ = try await web.callAsyncJavaScript("window.location.hash = target", arguments: ["target": destination.fragment ?? ""], in: nil, contentWorld: .page)
                } catch { host.report(error.localizedDescription) }
            }
        } else { web.load(URLRequest(url: destination)) }
    }

    @MainActor final class Host: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
        let origin: StudioOrigin
        let report: (String?) -> Void
        var navigation = -1
        var retry = -1
        struct Save {
            let staged: URL
            let target: URL
            let replacing: Bool
        }
        var saves: [ObjectIdentifier: Save] = [:]
        init(origin: StudioOrigin, report: @escaping (String?) -> Void) {
            self.origin = origin
            self.report = report
        }

        func webView(_ web: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let url = action.request.url
            let blobDownload = action.shouldPerformDownload && url?.scheme == "blob"
                && origin.contains(URL(string: String((url?.absoluteString ?? "").dropFirst(5))))
            guard origin.contains(url) || blobDownload else { decisionHandler(.cancel); return }
            decisionHandler(action.shouldPerformDownload ? .download : .allow)
        }
        func webView(_ web: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }
        func webView(_ web: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            download.delegate = self
        }
        func download(_ download: WKDownload, willPerformHTTPRedirection response: HTTPURLResponse,
                      newRequest request: URLRequest, decisionHandler: @escaping (WKDownload.RedirectPolicy) -> Void) {
            decisionHandler(origin.contains(request.url) ? .allow : .cancel)
        }
        func webView(_ web: WKWebView, didFinish navigation: WKNavigation!) { report(nil) }
        func webView(_ web: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            if (error as NSError).code != NSURLErrorCancelled { report(error.localizedDescription) }
        }
        func webView(_ web: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            if (error as NSError).code != NSURLErrorCancelled { report(error.localizedDescription) }
        }
        func webViewWebContentProcessDidTerminate(_ web: WKWebView) {
            report("The studio window stopped responding. Reopen the connection to reload it.")
        }
        func webView(_ web: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping ([URL]?) -> Void) {
            guard origin.contains(frame.request.url) else { completionHandler(nil); return }
            let panel = NSOpenPanel()
            panel.canChooseDirectories = false
            panel.allowsMultipleSelection = parameters.allowsMultipleSelection
            panel.begin { choice in completionHandler(choice == .OK ? panel.urls : nil) }
        }
        func webView(_ web: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard origin.contains(frame.request.url) else { completionHandler(false); return }
            let alert = NSAlert()
            alert.messageText = message
            alert.addButton(withTitle: "Continue")
            alert.addButton(withTitle: "Cancel").keyEquivalent = "\u{1b}"
            completionHandler(alert.runModal() == .alertFirstButtonReturn)
        }
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                      completionHandler: @escaping (URL?) -> Void) {
            let panel = NSSavePanel()
            panel.nameFieldStringValue = (suggestedFilename as NSString).lastPathComponent
            panel.begin { [self] choice in
                guard choice == .OK, let url = panel.url else { completionHandler(nil); return }
                do {
                    let dir = try FileManager.default.url(for: .itemReplacementDirectory, in: .userDomainMask, appropriateFor: url, create: true)
                    let staged = dir.appendingPathComponent("download")
                    saves[ObjectIdentifier(download)] = Save(staged: staged, target: url, replacing: FileManager.default.fileExists(atPath: url.path))
                    completionHandler(staged)
                } catch { report(error.localizedDescription); completionHandler(nil) }
            }
        }
        func downloadDidFinish(_ download: WKDownload) {
            guard let save = saves.removeValue(forKey: ObjectIdentifier(download)) else { return }
            let fm = FileManager.default
            defer { try? fm.removeItem(at: save.staged.deletingLastPathComponent()) }
            do {
                if save.replacing && fm.fileExists(atPath: save.target.path) {
                    _ = try fm.replaceItemAt(save.target, withItemAt: save.staged)
                } else { try fm.moveItem(at: save.staged, to: save.target) }
            } catch { report("Could not save the download. \(error.localizedDescription)") }
        }
        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            if let save = saves.removeValue(forKey: ObjectIdentifier(download)) {
                try? FileManager.default.removeItem(at: save.staged.deletingLastPathComponent())
                report("Download stopped. \(error.localizedDescription)")
            }
        }
    }
}
