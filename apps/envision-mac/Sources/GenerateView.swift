import AppKit
import SwiftUI

struct NetworkArtwork: View {
    let api: StudioClient
    let project: String
    let art: Artwork
    var thumbnail = false
    @ViewState private var pixels: NSImage?
    @ViewState private var failed = false
    var body: some View {
        Group {
            if let pixels {
                Image(nsImage: pixels).resizable().interpolation(.high).scaledToFit().accessibilityLabel(art.label)
            } else if failed {
                Label("Preview unavailable", systemImage: "photo").foregroundStyle(.secondary)
            } else { ProgressView().controlSize(.small) }
        }
        .task(id: "\(api.origin.url)|\(project)|\(art.hash)|\(thumbnail)") {
            pixels = nil
            failed = false
            do {
                let data = try await api.image(project: project, artwork: art, thumbnail: thumbnail)
                guard !Task.isCancelled else { return }
                pixels = NSImage(data: data)
                failed = pixels == nil
            } catch { if !Task.isCancelled { failed = true } }
        }
    }
}

struct GenerateView: View {
    private static let sample = Bundle.main.url(forResource: "Refraction", withExtension: "png").flatMap(NSImage.init(contentsOf:))
    private static let samplePrompt = "Cinematic product photograph of a single finely machined optical lens on a deep indigo optical workbench. A narrow ribbon of amber light refracts through the glass into a bright teal caustic on brushed black metal. The lens sits right of center with clean dark space on the left. Macro industrial photography, crisp glass edges, soft shadows, horizontal composition, no text."
    @ObservedObject var model: Workspace
    @ViewState private var advanced = false
    @ViewState private var refsOpen = false

    private var referenceOptions: [Artwork] {
        var seen = Set<String>()
        return model.artworks.filter { seen.insert($0.hash).inserted }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center) {
                Text("Generate images").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Spacer()
                Label(model.workerStatus, systemImage: model.reachable ? "cpu" : "network.slash")
                    .font(.callout).foregroundStyle(.secondary)
                Button("Queue") { model.showStudio("queue") }
            }
            HSplitView {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Project").font(.headline)
                            HStack {
                                Picker("Image project", selection: Binding(get: { model.projectID }, set: { model.chooseProject($0, carryUnassignedPrompt: true) })) {
                                    Text("Select a project").tag("")
                                    ForEach(model.projects) { project in Text(project.name).tag(project.id) }
                                }.labelsHidden()
                                Button("New…") { model.newProjectSheet = true }.disabled(!model.reachable)
                            }
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Prompt").font(.headline)
                                Spacer()
                                Menu("Recall prompt") {
                                    if let text = model.selected?.recipe?.prompt {
                                        Button("Selected artwork") { model.recallPrompt(text) }.disabled(text == model.draft.prompt)
                                    }
                                    if !model.projectBrief.isEmpty {
                                        Button("Project brief") { model.recallPrompt(model.projectBrief) }.disabled(model.projectBrief == model.draft.prompt)
                                    }
                                    Button("Studio sample") { model.recallPrompt(Self.samplePrompt) }.disabled(Self.samplePrompt == model.draft.prompt)
                                }.fixedSize()
                                .alert(item: $model.promptReplacement) { pending in
                                    Alert(title: Text("Replace the current prompt?"),
                                          message: Text("This replaces the text in your draft."),
                                          primaryButton: .default(Text("Replace prompt")) { model.replacePrompt(pending) },
                                          secondaryButton: .cancel())
                                }
                            }
                            ZStack(alignment: .topLeading) {
                                TextEditor(text: $model.draft.prompt).font(.body)
                                    .scrollContentBackground(.hidden).padding(5)
                                    .accessibilityLabel("Image prompt")
                                if model.draft.prompt.isEmpty {
                                    Text("Describe the subject, framing, light, and finish.")
                                        .foregroundStyle(.secondary).padding(10).allowsHitTesting(false)
                                }
                            }.frame(minHeight: 124, maxHeight: 160)
                                .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 8))
                                .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.secondary.opacity(0.32)))
                        }
                        HStack(alignment: .top, spacing: 14) {
                            VStack(alignment: .leading, spacing: 5) {
                                Text("Canvas").font(.headline)
                                Picker("Canvas size", selection: $model.draft.canvas) {
                                    ForEach(Canvas.sizes) { size in Text(size.label).tag(size.id) }
                                }.labelsHidden()
                            }
                            VStack(alignment: .leading, spacing: 5) {
                                Text("Images").font(.headline)
                                Picker("Number of images", selection: $model.draft.count) {
                                    ForEach(1...4, id: \.self) { Text(String($0)).tag($0) }
                                }.labelsHidden().frame(width: 60)
                            }
                        }
                        Divider()
                        DisclosureGroup("References and revisions", isExpanded: $refsOpen) {
                            VStack(alignment: .leading, spacing: 8) {
                                Picker("Starting image", selection: $model.draft.starting) {
                                    Text("Generate from prompt").tag("")
                                    ForEach(model.artworks) { art in Text(art.label).tag(art.id) }
                                }
                                Picker("Composition", selection: $model.draft.composition) {
                                    Text("None").tag("")
                                    ForEach(referenceOptions) { art in Text(art.label).tag(art.hash) }
                                }
                                Picker("Style", selection: $model.draft.style) {
                                    Text("None").tag("")
                                    ForEach(referenceOptions) { art in Text(art.label).tag(art.hash) }
                                }
                                Button("Add reference image…") {
                                    let files = chooseFiles("Add a composition reference", types: [.png, .jpeg, .webP])
                                    if let file = files.first { Task { await model.attachReference(file) } }
                                }.disabled(!model.reachable || model.projectID.isEmpty)
                                if !model.draft.starting.isEmpty || !model.draft.composition.isEmpty {
                                    Slider(value: $model.draft.strength, in: 0.1...1, step: 0.05) { Text("Strength") }
                                }
                            }.padding(.top, 8)
                        }
                        DisclosureGroup("Seed and model", isExpanded: $advanced) {
                            VStack(alignment: .leading, spacing: 7) {
                                TextField("Random seed", text: $model.draft.seed).accessibilityLabel("Seed")
                                Text("SDXL Turbo · 4 steps").font(.caption).foregroundStyle(.secondary)
                            }.padding(.top, 6)
                        }
                        Button {
                            Task { await model.generate() }
                        } label: {
                            Label(model.busy ? "Working…" : (model.draft.starting.isEmpty ? "Generate on Walter" : "Revise on Walter"), systemImage: "sparkles")
                                .frame(maxWidth: .infinity)
                        }.buttonStyle(.borderedProminent).controlSize(.large)
                            .keyboardShortcut(.return, modifiers: .command)
                            .disabled(model.busy || !model.reachable || model.projectID.isEmpty || model.draft.prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        if model.client == nil || !model.reachable {
                            Button("Connect to studio…") { model.connectionSheet = true }
                        } else if model.projectID.isEmpty {
                            Text("Choose a project to keep this image and its revisions.").font(.callout).foregroundStyle(.secondary)
                        }
                        if let job = model.projectJobs.first {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(job.pending ? "Render \(job.state)" : "Last render · \(job.state)").font(.callout.bold())
                                if let progress = job.progress, job.pending && !progress.isEmpty { Text(progress).font(.caption) }
                                if let error = job.error, job.state == "failed" { Text(error).font(.callout).foregroundStyle(.red) }
                            }.accessibilityElement(children: .combine)
                        }
                        if !model.notice.isEmpty { Text(model.notice).font(.caption).foregroundStyle(.secondary).textSelection(.enabled) }
                    }.frame(maxWidth: .infinity, alignment: .leading).padding(.trailing, 14).padding(.vertical, 5)
                    .disabled(model.busy)
                }.frame(minWidth: 294, idealWidth: 348, maxWidth: 435)
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(model.selected == nil ? "Studio sample" : "Artwork").font(.headline)
                        Spacer()
                        Button("Library") { model.showStudio("library") }.disabled(model.activeProject == nil)
                        Button("Layout") { model.showStudio("layout") }.disabled(model.activeProject == nil)
                    }
                    ZStack {
                        RoundedRectangle(cornerRadius: 9).fill(Color(nsColor: .underPageBackgroundColor))
                        if let art = model.selected, let api = model.client {
                            NetworkArtwork(api: api, project: model.projectID, art: art).padding(8)
                        } else if let sample = Self.sample {
                            Image(nsImage: sample).resizable().scaledToFit().accessibilityLabel("Refraction study, generated on Walter")
                        } else { Image(systemName: "camera.aperture").font(.system(size: 64)).foregroundStyle(.secondary) }
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                    if let art = model.selected {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(art.label).lineLimit(2).help(art.label)
                                HStack(spacing: 8) {
                                    Text("\(art.width) × \(art.height)")
                                    if let seconds = art.recipe?.engineSeconds {
                                        Text("Render \(seconds.formatted(.number.precision(.fractionLength(1)))) s")
                                    }
                                }.font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Revise this") { model.draft.starting = art.id; refsOpen = true }
                            Button("Save PNG…") { Task { await model.savePNG() } }
                        }.disabled(model.busy || !model.reachable)
                    } else {
                        Text("Refraction study · Generated on Walter").font(.caption).foregroundStyle(.secondary)
                    }
                    if model.artworks.count > 1, let api = model.client {
                        ScrollView(.horizontal) {
                            HStack(spacing: 7) {
                                ForEach(model.artworks.prefix(24)) { art in
                                    Button {
                                        model.selectedID = art.id
                                    } label: {
                                        NetworkArtwork(api: api, project: model.projectID, art: art, thumbnail: true)
                                            .frame(width: 68, height: 56).padding(3)
                                            .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(model.selectedID == art.id ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: model.selectedID == art.id ? 2 : 1))
                                    }.buttonStyle(.plain).accessibilityLabel("Select \(art.label)").help(art.label)
                                }
                            }.padding(.vertical, 3)
                        }.frame(height: 78)
                    }
                }.padding(.leading, 14).frame(minWidth: 315)
            }
        }.padding(20)
    }
}
