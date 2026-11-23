import AppKit
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(calibratedRed: 0.035, green: 0.095, blue: 0.15, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: 1024, height: 1024), xRadius: 200, yRadius: 200).fill()
let colors: [NSColor] = [.systemPink, .systemTeal, .systemYellow, .systemGreen]
let points = [(135, 550), (535, 550), (135, 220), (535, 220)]
for (index, point) in points.enumerated() {
    let x = CGFloat(point.0), y = CGFloat(point.1)
    colors[index].setFill()
    NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 354, height: 240), xRadius: 28, yRadius: 28).fill()
    NSColor.white.withAlphaComponent(0.75).setStroke()
    let stand = NSBezierPath(); stand.lineWidth = 18; stand.move(to: NSPoint(x: x + 177, y: y)); stand.line(to: NSPoint(x: x + 177, y: y - 32)); stand.stroke()
}
NSColor.white.setStroke()
let check = NSBezierPath(); check.lineWidth = 42; check.lineCapStyle = .round; check.lineJoinStyle = .round
check.move(to: NSPoint(x: 360, y: 122)); check.line(to: NSPoint(x: 465, y: 50)); check.line(to: NSPoint(x: 670, y: 182)); check.stroke()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
