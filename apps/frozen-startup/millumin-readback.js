// Local Millumin adapter. Only the named output controls are operated.
function run(argv) {
    const action = argv[0] || 'observe';
    if (!['observe', 'document', 'position'].includes(action)) throw new Error('Unsupported inspection action');
    const payload = argv[1] ? JSON.parse(argv[1]) : {};
    const events = Application('System Events');
    const matches = events.processes.whose({name: 'Millumin5'})();
    if (matches.length !== 1) throw new Error('Millumin is not running');
    const process = matches[0];
    function value(element, property) {
        try { return element[property](); } catch (_) { return null; }
    }
    function descendants(element, depth) {
        if (depth > 12) throw new Error('Output panel is too deeply nested');
        let result = [element];
        for (const child of element.uiElements()) result = result.concat(descendants(child, depth + 1));
        if (result.length > 1500) throw new Error('Output panel is too large');
        return result;
    }
    const documents = process.windows().filter(w => {
        try { return Boolean(w.attributes.byName('AXDocument').value()); } catch (_) { return false; }
    });
    if (documents.length === 0 && action === 'document') return JSON.stringify({document: null});
    if (documents.length !== 1) throw new Error('Expected one open Millumin document');
    const document = documents[0];
    if (action === 'document') return JSON.stringify({document: document.attributes.byName('AXDocument').value()});
    if (action === 'position') {
        document.position = payload.position;
        return JSON.stringify({position: document.position()});
    }
    // Setup Output is a sheet. Opening it changes editor focus, not output routing.
    let opened = false;
    if (document.sheets.length === 0) {
        process.frontmost = true;
        process.menuBars[0].menuBarItems.byName('Output').menus[0].menuItems.byName('Setup Output…').click();
        delay(0.2);
        opened = true;
    }
    if (document.sheets.length !== 1) throw new Error('Output setup sheet unavailable');
    const sheet = document.sheets[0];
    const nodes = descendants(sheet, 0);
    const tables = nodes.filter(e => value(e, 'role') === 'AXTable');
    if (tables.length !== 1) throw new Error('Canvas table unavailable');
    const rows = tables[0].rows();
    const selectedBefore = rows.findIndex(r => value(r, 'selected') === true);
    try {
        const fullscreen = nodes.filter(e => value(e, 'role') === 'AXCheckBox' && value(e, 'name') === 'Fullscreen');
        if (fullscreen.length !== 1) throw new Error('Fullscreen control unavailable');
        const popups = nodes.filter(e => value(e, 'role') === 'AXPopUpButton' && value(e, 'value') !== '(this one)');
        if (popups.length !== 1) throw new Error('Multiple outputs require explicit support');
        const routes = [];
        for (const row of rows) {
            const fields = descendants(row, 0).filter(e => value(e, 'role') === 'AXTextField');
            if (fields.length !== 1) throw new Error('Canvas label unavailable');
            const canvas = fields[0].value();
            events.select(row);
            delay(0.05);

            routes.push({canvas: canvas, selectedDisplay: popups[0].value()});
        }
        return JSON.stringify({document: document.attributes.byName('AXDocument').value(),
            modified: value(document.attributes.byName('AXEdited'), 'value'),
            position: document.position(), size: document.size(),
            fullscreenRequested: Boolean(fullscreen[0].value()), routes: routes});
    } finally {
        if (selectedBefore >= 0) events.select(rows[selectedBefore]);
        if (opened) {
            const ok = descendants(sheet, 0).filter(e => value(e, 'role') === 'AXButton' && value(e, 'name') === 'OK');
            if (ok.length === 1) ok[0].click();
        }
    }
}
