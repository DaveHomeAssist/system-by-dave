import AppKit
import SwiftUI

// The Command Line Tools include the State property wrapper but omit the Xcode State macro plug-in.
typealias ViewState<Value> = SwiftUI.State<Value>

@MainActor final class AppDelegate: NSObject, NSApplicationDelegate {
    func application(_ application: NSApplication, open urls: [URL]) { Workspace.shared.openFiles(urls) }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

@main struct EnvisionApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var model = Workspace.shared
    var body: some Scene {
        Window("Envision Studio", id: "envision") { Content(model: model) }
            .defaultSize(width: 1160, height: 750)
            .commands {
                CommandGroup(replacing: .newItem) {
                    Button("New Image Project…") { model.area = .generate; model.newProjectSheet = true }
                        .keyboardShortcut("n").disabled(model.busy || !model.reachable)
                    Button("Open…") { model.openFiles(chooseFiles("Open images or one editable project", types: [.png, .jpeg, .webP, .zip, .json], multiple: true)) }
                        .keyboardShortcut("o").disabled(model.busy)
                }
                CommandMenu("Workspace") {
                    Button("Generate") { model.area = .generate }.keyboardShortcut("1")
                    Button("Full Studio") { model.showStudio() }.keyboardShortcut("2")
                    Button("Compare Images") { model.area = .compare }.keyboardShortcut("3")
                    Divider()
                    Button("Library") { model.showStudio("library") }.disabled(model.activeProject == nil)
                    Button("Layout Editor") { model.showStudio("layout") }.disabled(model.activeProject == nil)
                    Button("Render Queue") { model.showStudio("queue") }
                    Button("Connection…") { model.connectionSheet = true }.disabled(model.busy)
                }
            }
    }
}

struct Content: View {
    @ObservedObject var model: Workspace
    @AppStorage("DarkAppearance") private var dark = false
    @ViewState private var webError: String?
    @ViewState private var webRetry = 0

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 7) {
                    Image(nsImage: NSApp.applicationIconImage).resizable().interpolation(.high)
                        .frame(width: 27, height: 27).accessibilityHidden(true)
                    Text("Envision").font(.title3.bold())
                }.padding(.bottom, 18).padding(.leading, 4)
                ForEach(WorkArea.allCases, id: \.self) { area in
                    Button {
                        if area == .studio { model.showStudio() } else { model.area = area }
                    } label: {
                        Label(area.rawValue, systemImage: area.icon)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 9).padding(.vertical, 9)
                            .background(model.area == area ? Color.accentColor.opacity(dark ? 0.23 : 0.13) : .clear, in: RoundedRectangle(cornerRadius: 7))
                    }.buttonStyle(.plain).accessibilityLabel(area.rawValue)
                }
                Spacer()
                Button { model.connectionSheet = true } label: { Label("Connection", systemImage: "network") }.buttonStyle(.plain).disabled(model.busy)
                Button { dark.toggle() } label: { Label(dark ? "Light mode" : "Dark mode", systemImage: dark ? "sun.max" : "moon") }
                    .buttonStyle(.plain).padding(.top, 8)
            }.padding(15).frame(width: 149).background(Color(nsColor: .controlBackgroundColor))
            Divider()
            ZStack {
                if let destination = model.studioURL, let origin = model.client?.origin {
                    VStack(spacing: 0) {
                        if let webError {
                            HStack {
                                Text(webError).font(.callout).textSelection(.enabled)
                                Spacer()
                                Button("Reload studio") { self.webError = nil; webRetry += 1 }
                            }.padding(9)
                        }
                        StudioWeb(destination: destination, origin: origin, navigation: model.studioNavigation, retry: webRetry) { webError = $0 }
                            .id(origin.url)
                    }.opacity(model.area == .studio ? 1 : 0).allowsHitTesting(model.area == .studio)
                        .accessibilityHidden(model.area != .studio)
                }
                switch model.area {
                case .generate: GenerateView(model: model)
                case .compare: CompareView(model: model)
                case .studio:
                    if model.studioURL == nil {
                        Button("Connect to studio…") { model.connectionSheet = true }
                    }
                }
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.frame(minWidth: 850, minHeight: 505)
            .tint(Color(red: dark ? 1 : 0.64, green: dark ? 0.58 : 0.27, blue: dark ? 0.35 : 0.11))
            .preferredColorScheme(dark ? .dark : .light)
            .sheet(isPresented: $model.connectionSheet) { ConnectionSheet(model: model) }
            .sheet(isPresented: $model.newProjectSheet) { NewProjectSheet(model: model) }
            .alert("Envision Studio", isPresented: Binding(get: { model.issue != nil }, set: { if !$0 { model.issue = nil } })) {
                Button("OK") { model.issue = nil }
            } message: { Text(model.issue ?? "") }
            .task(id: model.area.rawValue + (model.client?.origin.url.absoluteString ?? "")) {
                guard model.area == .generate else { return }
                while !Task.isCancelled {
                    await model.refresh()
                    do { try await Task.sleep(nanoseconds: 5_000_000_000) } catch { break }
                }
            }
    }
}

struct ConnectionSheet: View {
    @ObservedObject var model: Workspace
    @ViewState private var address = ""
    @ViewState private var validation = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Studio connection").font(.title2.bold())
            Text("Enter Dominic’s private HTTPS address, including the port. Tailscale connects this Mac to the studio.")
            TextField("https://studio.example.ts.net:8443", text: $address).textFieldStyle(.roundedBorder)
                .accessibilityLabel("Private studio address")
            if !validation.isEmpty { Text(validation).foregroundStyle(.red) }
            HStack {
                Spacer()
                Button("Cancel") { model.connectionSheet = false }.keyboardShortcut(.cancelAction)
                Button("Connect") {
                    do { _ = try StudioOrigin(address); Task { await model.connect(address) } }
                    catch { validation = error.localizedDescription }
                }.keyboardShortcut(.defaultAction).disabled(address.isEmpty || model.busy)
            }
        }.padding(22).frame(width: 430)
            .onAppear { address = model.client?.origin.url.absoluteString ?? "" }
    }
}

struct NewProjectSheet: View {
    @ObservedObject var model: Workspace
    @ViewState private var name = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("New image project").font(.title2.bold())
            TextField("Project name", text: $name).textFieldStyle(.roundedBorder)
            HStack {
                Spacer()
                Button("Cancel") { model.newProjectSheet = false }.keyboardShortcut(.cancelAction)
                Button("Create project") { Task { await model.createProject(name) } }
                    .keyboardShortcut(.defaultAction).disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.count > 100 || model.busy)
            }
        }.padding(22).frame(width: 350)
    }
}
