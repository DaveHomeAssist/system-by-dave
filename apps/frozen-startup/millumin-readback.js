// Read accessibility state only. Never click controls or send playback commands.
function run() {
    const events = Application('System Events');
    const matches = events.processes.whose({name: 'Millumin5'})();
    if (matches.length !== 1) throw new Error('Millumin is not running');
    let budget = 1200;
    function read(element, depth) {
        if (--budget < 0 || depth > 10) throw new Error('Output panel exceeds inspection bounds');
        function property(name) {
            try { return element[name](); } catch (_) { return null; }
        }
        const result = {role: property('role'), name: property('name'), value: property('value')};
        result.children = element.uiElements().map(child => read(child, depth + 1));
        return result;
    }
    const windows = matches[0].windows();
    const documentWindows = [];
    for (const window of windows) {
        let document = null;
        try { document = window.attributes.byName('AXDocument').value(); } catch (_) {}
        documentWindows.push({name: window.name(), document: document, position: window.position(), size: window.size()});
    }
    const output = windows.filter(window => /output/i.test(window.name()));
    const result = {windows: documentWindows};
    if (output.length === 1) result.outputPanel = read(output[0], 0);
    return JSON.stringify(result);
}
