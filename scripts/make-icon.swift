import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let dir = root.appendingPathComponent("build/AppIcon.iconset")
try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
for size in [16, 32, 128, 256, 512] {
  for scale in [1, 2] {
    let n = size * scale
    let bitmap = NSBitmapImageRep(
      bitmapDataPlanes: nil, pixelsWide: n, pixelsHigh: n, bitsPerSample: 8, samplesPerPixel: 4,
      hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let context = NSGraphicsContext.current!.cgContext
    context.scaleBy(x: CGFloat(n) / 1024, y: CGFloat(n) / 1024)
    func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) {
      NSColor(red: r / 255, green: g / 255, blue: b / 255, alpha: 1).setFill()
    }
    color(29, 39, 40)
    NSBezierPath(
      roundedRect: NSRect(x: 40, y: 40, width: 944, height: 944), xRadius: 212, yRadius: 212
    ).fill()
    func polygon(_ points: [[CGFloat]]) {
      let p = NSBezierPath()
      p.move(to: NSPoint(x: points[0][0], y: 1024 - points[0][1]))
      for v in points.dropFirst() { p.line(to: NSPoint(x: v[0], y: 1024 - v[1])) }
      p.close()
      p.fill()
    }
    color(255, 195, 99)
    polygon([[252, 231], [683, 178], [814, 289], [383, 345]])
    color(168, 82, 32)
    polygon([[252, 231], [383, 345], [383, 819], [252, 700]])
    color(238, 140, 42)
    polygon([[383, 345], [814, 289], [814, 755], [383, 819]])
    color(35, 48, 47)
    polygon([
      [469, 403], [650, 382], [720, 426], [720, 517], [679, 551], [728, 590], [728, 692],
      [469, 723],
    ])
    color(255, 179, 78)
    polygon([[541, 463], [632, 451], [646, 465], [646, 505], [541, 518]])
    polygon([[541, 585], [641, 572], [654, 587], [654, 636], [541, 650]])
    NSGraphicsContext.restoreGraphicsState()
    let data = bitmap.representation(using: .png, properties: [:])!
    try data.write(
      to: dir.appendingPathComponent("icon_\(size)x\(size)\(scale==2 ? "@2x" : "").png"))
    if n == 512 { try data.write(to: root.appendingPathComponent("public/icon.png")) }
  }
}
