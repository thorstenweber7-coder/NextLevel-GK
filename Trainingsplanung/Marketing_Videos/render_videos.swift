import Foundation
import AVFoundation
import CoreGraphics
import CoreImage
import CoreText
import ImageIO
import UniformTypeIdentifiers

// MARK: - Helpers & Color Palette (NextLevel Goalkeeping PRO Dark Theme)

struct RGBA {
    let r: CGFloat, g: CGFloat, b: CGFloat, a: CGFloat
    var cgColor: CGColor { CGColor(red: r, green: g, blue: b, alpha: a) }
    init(_ hex: UInt32, _ alpha: CGFloat = 1.0) {
        self.r = CGFloat((hex >> 16) & 0xFF) / 255.0
        self.g = CGFloat((hex >> 8) & 0xFF) / 255.0
        self.b = CGFloat(hex & 0xFF) / 255.0
        self.a = alpha
    }
}

let cSlate950 = RGBA(0x020617)
let cSlate900 = RGBA(0x0f172a)
let cSlate800 = RGBA(0x1e293b)
let cSlate700 = RGBA(0x334155)
let cSlate400 = RGBA(0x94a3b8)
let cSlate200 = RGBA(0xe2e8f0)
let cWhite    = RGBA(0xf8fafc)
let cEmerald  = RGBA(0x10b981)
let cEmeraldL = RGBA(0x34d399)
let cEmeraldD = RGBA(0x064e3b)
let cAmber    = RGBA(0xf59e0b)
let cPurple   = RGBA(0xa855f7)
let cCyan     = RGBA(0x06b6d4)
let cRose     = RGBA(0xf43f5e)
let cBlue     = RGBA(0x3b82f6)

func clamp01(_ x: Double) -> Double { max(0.0, min(1.0, x)) }
func easeOutCubic(_ t: Double) -> Double {
    let u = clamp01(t)
    return 1.0 - pow(1.0 - u, 3.0)
}
func easeInOutCubic(_ t: Double) -> Double {
    let u = clamp01(t)
    return u < 0.5 ? 4 * u * u * u : 1 - pow(-2 * u + 2, 3) / 2
}

func loadImage(_ path: String) -> CGImage? {
    let url = URL(fileURLWithPath: path)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

// MARK: - CoreGraphics Top-Down Drawing Primitives

func drawImageUpright(_ ctx: CGContext, _ img: CGImage, in rect: CGRect, alpha: CGFloat = 1.0) {
    ctx.saveGState()
    ctx.setAlpha(alpha)
    ctx.translateBy(x: rect.minX, y: rect.maxY)
    ctx.scaleBy(x: 1, y: -1)
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: rect.width, height: rect.height))
    ctx.restoreGState()
}

func drawImageAspectFill(_ ctx: CGContext, _ img: CGImage, in rect: CGRect, zoom: CGFloat = 1.0, panX: CGFloat = 0.0, panY: CGFloat = 0.0, alpha: CGFloat = 1.0) {
    let iw = CGFloat(img.width)
    let ih = CGFloat(img.height)
    let scale = max(rect.width / iw, rect.height / ih) * zoom
    let drawW = iw * scale
    let drawH = ih * scale
    let dx = rect.midX - drawW * 0.5 + panX
    let dy = rect.midY - drawH * 0.5 + panY
    ctx.saveGState()
    ctx.clip(to: rect)
    drawImageUpright(ctx, img, in: CGRect(x: dx, y: dy, width: drawW, height: drawH), alpha: alpha)
    ctx.restoreGState()
}

func fillRoundedRect(_ ctx: CGContext, _ rect: CGRect, radius: CGFloat, color: RGBA) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.saveGState()
    ctx.setFillColor(color.cgColor)
    ctx.addPath(path)
    ctx.fillPath()
    ctx.restoreGState()
}

func strokeRoundedRect(_ ctx: CGContext, _ rect: CGRect, radius: CGFloat, color: RGBA, lineWidth: CGFloat) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.saveGState()
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(lineWidth)
    ctx.addPath(path)
    ctx.strokePath()
    ctx.restoreGState()
}

func drawGradientOverlay(_ ctx: CGContext, rect: CGRect, topColor: RGBA, midColor: RGBA, bottomColor: RGBA) {
    ctx.saveGState()
    let cs = CGColorSpaceCreateDeviceRGB()
    let colors = [topColor.cgColor, midColor.cgColor, bottomColor.cgColor] as CFArray
    let locs: [CGFloat] = [0.0, 0.48, 1.0]
    if let grad = CGGradient(colorsSpace: cs, colors: colors, locations: locs) {
        ctx.drawLinearGradient(grad, start: CGPoint(x: rect.midX, y: rect.minY), end: CGPoint(x: rect.midX, y: rect.maxY), options: [])
    }
    ctx.restoreGState()
}

func drawRadialGlow(_ ctx: CGContext, center: CGPoint, radius: CGFloat, color: RGBA) {
    ctx.saveGState()
    let cs = CGColorSpaceCreateDeviceRGB()
    let colors = [color.cgColor, RGBA(0x000000, 0.0).cgColor] as CFArray
    let locs: [CGFloat] = [0.0, 1.0]
    if let grad = CGGradient(colorsSpace: cs, colors: colors, locations: locs) {
        ctx.drawRadialGradient(grad, startCenter: center, startRadius: 0, endCenter: center, endRadius: radius, options: [])
    }
    ctx.restoreGState()
}

enum TextAlign { case left, center, right }

func makeFont(size: CGFloat, bold: Bool, heavy: Bool = false) -> CTFont {
    let name: CFString = heavy ? "HelveticaNeue-CondensedBlack" as CFString : (bold ? "HelveticaNeue-Bold" as CFString : "HelveticaNeue-Medium" as CFString)
    return CTFontCreateWithName(name, size, nil)
}

func drawText(_ ctx: CGContext, _ text: String, x: CGFloat, y: CGFloat, size: CGFloat, color: RGBA, bold: Bool = false, heavy: Bool = false, align: TextAlign = .left, maxWidth: CGFloat? = nil) {
    let font = makeFont(size: size, bold: bold, heavy: heavy)
    let attrs: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color.cgColor
    ]
    let attrStr = NSAttributedString(string: text, attributes: attrs)
    let line = CTLineCreateWithAttributedString(attrStr)
    var bounds = CTLineGetBoundsWithOptions(line, .useOpticalBounds)
    var drawScale: CGFloat = 1.0
    if let mw = maxWidth, bounds.width > mw, bounds.width > 0 {
        drawScale = mw / bounds.width
        bounds.size.width *= drawScale
    }
    var drawX = x
    if align == .center { drawX = x - bounds.width * 0.5 }
    else if align == .right { drawX = x - bounds.width }

    ctx.saveGState()
    // Flip back to upright text coordinate space at baseline (y + size*0.85)
    ctx.translateBy(x: drawX, y: y + size * 0.85)
    ctx.scaleBy(x: drawScale, y: -drawScale)
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

func drawWrappedText(_ ctx: CGContext, _ text: String, centerX: CGFloat, topY: CGFloat, maxWidth: CGFloat, size: CGFloat, lineHeight: CGFloat, color: RGBA, bold: Bool = true, align: TextAlign = .center) -> CGFloat {
    let words = text.split(separator: " ").map(String.init)
    var lines: [String] = []
    var current = ""
    let font = makeFont(size: size, bold: bold)
    let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font]

    for w in words {
        let candidate = current.isEmpty ? w : "\(current) \(w)"
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: candidate, attributes: attrs))
        let width = CTLineGetBoundsWithOptions(line, .useOpticalBounds).width
        if width > maxWidth && !current.isEmpty {
            lines.append(current)
            current = w
        } else {
            current = candidate
        }
    }
    if !current.isEmpty { lines.append(current) }

    var y = topY
    for l in lines {
        drawText(ctx, l, x: centerX, y: y, size: size, color: color, bold: bold, align: align)
        y += lineHeight
    }
    return y
}

// MARK: - Authentic NextLevel Goalkeeping PRO UI Components

func drawAppWindowFrame(_ ctx: CGContext, rect: CGRect, title: String, subtitle: String, badgeText: String, badgeColor: RGBA) {
    // Shadow glow
    drawRadialGlow(ctx, center: CGPoint(x: rect.midX, y: rect.midY), radius: rect.width * 0.72, color: RGBA(0x10b981, 0.14))
    fillRoundedRect(ctx, rect, radius: 26, color: RGBA(0x0f172a, 0.94))
    strokeRoundedRect(ctx, rect, radius: 26, color: RGBA(0x334155, 0.9), lineWidth: 2.0)

    // Header bar
    let headerH: CGFloat = 64
    let headerRect = CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: headerH)
    fillRoundedRect(ctx, CGRect(x: rect.minX + 1, y: rect.minY + 1, width: rect.width - 2, height: headerH), radius: 24, color: RGBA(0x1e293b, 0.85))
    // Traffic dots / indicator
    for (idx, col) in [cEmerald, cAmber, cCyan].enumerated() {
        fillRoundedRect(ctx, CGRect(x: rect.minX + 24 + CGFloat(idx) * 18, y: rect.minY + 26, width: 10, height: 10), radius: 5, color: col)
    }
    drawText(ctx, title, x: rect.minX + 90, y: rect.minY + 14, size: 22, color: cWhite, bold: true)
    drawText(ctx, subtitle, x: rect.minX + 90, y: rect.minY + 40, size: 14, color: cSlate400, bold: false)

    // Right badge
    let bw: CGFloat = 170
    let bRect = CGRect(x: rect.maxX - bw - 20, y: rect.minY + 16, width: bw, height: 32)
    fillRoundedRect(ctx, bRect, radius: 16, color: RGBA(0x064e3b, 0.85))
    strokeRoundedRect(ctx, bRect, radius: 16, color: badgeColor, lineWidth: 1.5)
    drawText(ctx, badgeText, x: bRect.midX, y: bRect.minY + 7, size: 14, color: cEmeraldL, bold: true, align: .center)

    // Divider
    ctx.setFillColor(RGBA(0x334155, 0.7).cgColor)
    ctx.fill(CGRect(x: rect.minX, y: headerRect.maxY, width: rect.width, height: 1.5))
}

func drawPlannerAndTacticalUI(_ ctx: CGContext, rect: CGRect, localT: Double, isPortrait: Bool) {
    drawAppWindowFrame(ctx, rect: rect, title: "Trainingsplaner & Taktikboard", subtitle: "5-Phasen-Struktur · 6-Stufen-Methodik", badgeText: "90 MIN · U17/U19", badgeColor: cEmerald)

    let pad: CGFloat = 22
    let inner = CGRect(x: rect.minX + pad, y: rect.minY + 80, width: rect.width - pad * 2, height: rect.height - 98)

    let phases: [(String, String, String, RGBA)] = [
        ("WarmUp", "15 Min", "Kognition · Schnelle Beine · BlazePods", cAmber),
        ("Analytisch", "20 Min", "6-Stufen-Reihe · Stufe 4: Abdruck + Position", cPurple),
        ("Situativ", "25 Min", "1vs1 Raumverteidigung · Taktikprinzipien", cEmerald),
        ("Integrativ", "20 Min", "Spielform 6+TW vs 6+TW · Umschalten", cCyan),
        ("CoolDown", "10 Min", "Regeneration & Debriefing", RGBA(0x14b8a6))
    ]

    let plannerRect: CGRect
    let boardRect: CGRect
    if isPortrait {
        plannerRect = CGRect(x: inner.minX, y: inner.minY, width: inner.width, height: inner.height * 0.50)
        boardRect   = CGRect(x: inner.minX, y: plannerRect.maxY + 18, width: inner.width, height: inner.height * 0.46)
    } else {
        plannerRect = CGRect(x: inner.minX, y: inner.minY, width: inner.width * 0.48, height: inner.height)
        boardRect   = CGRect(x: plannerRect.maxX + 22, y: inner.minY, width: inner.width * 0.49, height: inner.height)
    }

    // Draw 5 Phase Cards staggered
    let cardH = (plannerRect.height - 4 * 12) / 5.0
    for (i, p) in phases.enumerated() {
        let appear = easeOutCubic((localT - Double(i) * 0.22) / 0.55)
        let slideX = CGFloat(1.0 - appear) * 40.0
        let cr = CGRect(x: plannerRect.minX + slideX, y: plannerRect.minY + CGFloat(i) * (cardH + 12), width: plannerRect.width, height: cardH)
        ctx.saveGState()
        ctx.setAlpha(CGFloat(appear))
        fillRoundedRect(ctx, cr, radius: 14, color: RGBA(0x1e293b, 0.92))
        strokeRoundedRect(ctx, cr, radius: 14, color: p.3, lineWidth: 1.5)
        // Left color stripe
        fillRoundedRect(ctx, CGRect(x: cr.minX, y: cr.minY, width: 7, height: cr.height), radius: 3.5, color: p.3)
        drawText(ctx, p.0, x: cr.minX + 20, y: cr.minY + 10, size: isPortrait ? 20 : 19, color: cWhite, bold: true)
        drawText(ctx, p.2, x: cr.minX + 20, y: cr.minY + (isPortrait ? 38 : 35), size: isPortrait ? 14 : 13, color: cSlate400, bold: false, maxWidth: cr.width - 110)
        // Duration badge
        let dr = CGRect(x: cr.maxX - 88, y: cr.midY - 14, width: 74, height: 28)
        fillRoundedRect(ctx, dr, radius: 10, color: RGBA(0x0f172a, 0.9))
        drawText(ctx, p.1, x: dr.midX, y: dr.minY + 5, size: 14, color: p.3, bold: true, align: .center)
        ctx.restoreGState()
    }

    // Draw Animated Tactical Pitch Canvas
    fillRoundedRect(ctx, boardRect, radius: 18, color: RGBA(0x15803d, 1.0))
    ctx.saveGState()
    let clipPath = CGPath(roundedRect: boardRect, cornerWidth: 18, cornerHeight: 18, transform: nil)
    ctx.addPath(clipPath)
    ctx.clip()
    // Pitch stripes
    let stripes = 8
    let sw = boardRect.height / CGFloat(stripes)
    for s in 0..<stripes where s % 2 == 0 {
        ctx.setFillColor(RGBA(0x16a34a, 0.7).cgColor)
        ctx.fill(CGRect(x: boardRect.minX, y: boardRect.minY + CGFloat(s) * sw, width: boardRect.width, height: sw))
    }
    // Penalty box & goal lines
    ctx.setStrokeColor(RGBA(0xffffff, 0.85).cgColor)
    ctx.setLineWidth(2.5)
    let boxW = boardRect.width * 0.68
    let boxH = boardRect.height * 0.42
    ctx.stroke(CGRect(x: boardRect.midX - boxW * 0.5, y: boardRect.minY + 18, width: boxW, height: boxH))
    let sixW = boardRect.width * 0.34
    let sixH = boardRect.height * 0.16
    ctx.stroke(CGRect(x: boardRect.midX - sixW * 0.5, y: boardRect.minY + 18, width: sixW, height: sixH))
    // Goal frame
    ctx.setLineWidth(5.0)
    ctx.stroke(CGRect(x: boardRect.midX - boardRect.width * 0.14, y: boardRect.minY + 8, width: boardRect.width * 0.28, height: 10))

    // Animated tactical sequence loop
    let animP = (localT * 0.35).truncatingRemainder(dividingBy: 1.0)
    let gkStart = CGPoint(x: boardRect.midX - boardRect.width * 0.12, y: boardRect.minY + boardRect.height * 0.22)
    let gkEnd   = CGPoint(x: boardRect.midX + boardRect.width * 0.10, y: boardRect.minY + boardRect.height * 0.34)
    let gkPos   = CGPoint(x: gkStart.x + (gkEnd.x - gkStart.x) * CGFloat(easeInOutCubic(animP)),
                          y: gkStart.y + (gkEnd.y - gkStart.y) * CGFloat(easeInOutCubic(animP)))

    // BlazePods glowing
    let pod1 = CGPoint(x: boardRect.midX - boardRect.width * 0.22, y: boardRect.minY + boardRect.height * 0.48)
    let pod2 = CGPoint(x: boardRect.midX + boardRect.width * 0.22, y: boardRect.minY + boardRect.height * 0.48)
    let pulse = CGFloat(0.5 + 0.5 * sin(localT * 6.0))
    drawRadialGlow(ctx, center: pod1, radius: 24 + pulse * 10, color: RGBA(0x06b6d4, 0.75))
    drawRadialGlow(ctx, center: pod2, radius: 24 + (1 - pulse) * 10, color: RGBA(0x10b981, 0.75))
    fillRoundedRect(ctx, CGRect(x: pod1.x - 8, y: pod1.y - 8, width: 16, height: 16), radius: 8, color: cCyan)
    fillRoundedRect(ctx, CGRect(x: pod2.x - 8, y: pod2.y - 8, width: 16, height: 16), radius: 8, color: cEmeraldL)

    // Pass / Shot dashed tactical arrows
    let shooter = CGPoint(x: boardRect.midX + boardRect.width * 0.24, y: boardRect.maxY - boardRect.height * 0.18)
    let passer  = CGPoint(x: boardRect.midX - boardRect.width * 0.25, y: boardRect.maxY - boardRect.height * 0.22)
    ctx.setStrokeColor(cAmber.cgColor)
    ctx.setLineWidth(3.0)
    ctx.setLineDash(phase: CGFloat(-localT * 30), lengths: [10, 6])
    ctx.move(to: passer)
    ctx.addLine(to: shooter)
    ctx.strokePath()

    ctx.setStrokeColor(cRose.cgColor)
    ctx.setLineDash(phase: 0, lengths: [])
    ctx.move(to: shooter)
    ctx.addLine(to: gkEnd)
    ctx.strokePath()

    // Player markers
    for (pt, label, col) in [(passer, "T1", cAmber), (shooter, "T2", cRose), (gkPos, "TW", cEmerald)] {
        fillRoundedRect(ctx, CGRect(x: pt.x - 18, y: pt.y - 18, width: 36, height: 36), radius: 18, color: col)
        strokeRoundedRect(ctx, CGRect(x: pt.x - 18, y: pt.y - 18, width: 36, height: 36), radius: 18, color: cWhite, lineWidth: 2.5)
        drawText(ctx, label, x: pt.x, y: pt.y - 9, size: 15, color: cSlate950, bold: true, align: .center)
    }

    // Bottom overlay label inside board
    fillRoundedRect(ctx, CGRect(x: boardRect.minX + 14, y: boardRect.maxY - 42, width: 250, height: 28), radius: 10, color: RGBA(0x0f172a, 0.86))
    drawText(ctx, "ANIMATION AKTIV · 1vs1 BLOCK", x: boardRect.minX + 26, y: boardRect.maxY - 36, size: 13, color: cEmeraldL, bold: true)
    ctx.restoreGState()
    strokeRoundedRect(ctx, boardRect, radius: 18, color: RGBA(0x34d399, 0.55), lineWidth: 2.0)
}

func drawLiveModeUI(_ ctx: CGContext, rect: CGRect, localT: Double, isPortrait: Bool) {
    drawAppWindowFrame(ctx, rect: rect, title: "Live-Modus am Platz", subtitle: "Offlinefähige PWA · Debriefing & Wettkämpfe", badgeText: "OFFLINE BEREIT", badgeColor: cEmeraldL)

    let pad: CGFloat = 24
    let inner = CGRect(x: rect.minX + pad, y: rect.minY + 82, width: rect.width - pad * 2, height: rect.height - 100)

    let hudRect: CGRect
    let compRect: CGRect
    if isPortrait {
        hudRect  = CGRect(x: inner.minX, y: inner.minY, width: inner.width, height: inner.height * 0.42)
        compRect = CGRect(x: inner.minX, y: hudRect.maxY + 20, width: inner.width, height: inner.height * 0.54)
    } else {
        hudRect  = CGRect(x: inner.minX, y: inner.minY, width: inner.width * 0.47, height: inner.height)
        compRect = CGRect(x: hudRect.maxX + 22, y: inner.minY, width: inner.width * 0.50, height: inner.height)
    }

    // 1. Live Timer HUD + Platzbelag-Belastungssteuerung
    fillRoundedRect(ctx, hudRect, radius: 18, color: RGBA(0x1e293b, 0.9))
    strokeRoundedRect(ctx, hudRect, radius: 18, color: RGBA(0x10b981, 0.5), lineWidth: 1.5)
    drawText(ctx, "AKTIVE PHASE: SITUATIV · 1vs1", x: hudRect.minX + 22, y: hudRect.minY + 18, size: 15, color: cEmeraldL, bold: true)

    // Ticking countdown timer
    let remaining = max(0, 1125 - Int(localT * 3))
    let mins = remaining / 60
    let secs = remaining % 60
    let timeStr = String(format: "%02d:%02d", mins, secs)
    drawText(ctx, timeStr, x: hudRect.midX, y: hudRect.minY + 52, size: isPortrait ? 78 : 74, color: cWhite, bold: true, heavy: true, align: .center)

    // Progress bar
    let barY = hudRect.minY + (isPortrait ? 148 : 148)
    let barW = hudRect.width - 44
    fillRoundedRect(ctx, CGRect(x: hudRect.minX + 22, y: barY, width: barW, height: 10), radius: 5, color: cSlate700)
    let prog = CGFloat(0.35 + 0.45 * clamp01(localT / 9.0))
    fillRoundedRect(ctx, CGRect(x: hudRect.minX + 22, y: barY, width: barW * prog, height: 10), radius: 5, color: cEmerald)

    // Pitch surface & Load chips
    let chipY = barY + 26
    let cw = (hudRect.width - 56) / 2.0
    let c1 = CGRect(x: hudRect.minX + 22, y: chipY, width: cw, height: 64)
    let c2 = CGRect(x: c1.maxX + 12, y: chipY, width: cw, height: 64)
    fillRoundedRect(ctx, c1, radius: 12, color: RGBA(0x0f172a, 0.9))
    strokeRoundedRect(ctx, c1, radius: 12, color: cAmber, lineWidth: 1.5)
    drawText(ctx, "PLATZBELAG", x: c1.minX + 14, y: c1.minY + 10, size: 12, color: cSlate400, bold: true)
    drawText(ctx, "Kunstrasen (1.20x)", x: c1.minX + 14, y: c1.minY + 32, size: 16, color: cAmber, bold: true, maxWidth: cw - 24)

    fillRoundedRect(ctx, c2, radius: 12, color: RGBA(0x0f172a, 0.9))
    strokeRoundedRect(ctx, c2, radius: 12, color: cCyan, lineWidth: 1.5)
    drawText(ctx, "BELASTUNG (RPE)", x: c2.minX + 14, y: c2.minY + 10, size: 12, color: cSlate400, bold: true)
    drawText(ctx, "RPE 8/10 · Hoch", x: c2.minX + 14, y: c2.minY + 32, size: 16, color: cCyan, bold: true, maxWidth: cw - 24)

    // 2. Live Competition Board (Gamification)
    fillRoundedRect(ctx, compRect, radius: 18, color: RGBA(0x1e293b, 0.9))
    strokeRoundedRect(ctx, compRect, radius: 18, color: RGBA(0xf43f5e, 0.55), lineWidth: 1.5)
    drawText(ctx, "LIVE-WETTKAMPF · TORSCHUSS-DUELL", x: compRect.minX + 22, y: compRect.minY + 18, size: 16, color: cRose, bold: true)
    drawText(ctx, "GAMIFICATION · RUNDE 3", x: compRect.maxX - 22, y: compRect.minY + 20, size: 13, color: cSlate400, bold: true, align: .right)

    let animScore = easeOutCubic((localT - 0.5) / 3.5)
    let keepers: [(String, Double, RGBA)] = [
        ("Lukas M. (#1)", 14.0 + 4.0 * animScore, cEmerald),
        ("Noah K. (#12)", 12.0 + 3.0 * animScore, cCyan),
        ("Jonas B. (#22)", 10.0 + 2.0 * animScore, cAmber)
    ]

    let rowTop = compRect.minY + 62
    let rowH: CGFloat = (compRect.height - 82) / 3.0
    for (idx, k) in keepers.enumerated() {
        let ry = rowTop + CGFloat(idx) * rowH
        let rr = CGRect(x: compRect.minX + 20, y: ry, width: compRect.width - 40, height: rowH - 14)
        fillRoundedRect(ctx, rr, radius: 14, color: RGBA(0x0f172a, 0.88))
        drawText(ctx, "\(idx + 1).  \(k.0)", x: rr.minX + 18, y: rr.minY + 12, size: 18, color: cWhite, bold: true)
        drawText(ctx, "\(Int(k.1.rounded())) PKT", x: rr.maxX - 18, y: rr.minY + 12, size: 20, color: k.2, bold: true, align: .right)
        // Animated bar
        let bRect = CGRect(x: rr.minX + 18, y: rr.maxY - 22, width: rr.width - 36, height: 10)
        fillRoundedRect(ctx, bRect, radius: 5, color: cSlate800)
        let frac = CGFloat(clamp01(k.1 / 20.0))
        fillRoundedRect(ctx, CGRect(x: bRect.minX, y: bRect.minY, width: bRect.width * frac, height: 10), radius: 5, color: k.2)
    }
}

func drawDiagnosticsAndPeriodizationUI(_ ctx: CGContext, rect: CGRect, localT: Double, isPortrait: Bool) {
    drawAppWindowFrame(ctx, rect: rect, title: "Periodisierung & 4-Säulen-Diagnostik", subtitle: "Technik · Taktik · Athletik (BlazePod & PHV) · Mental", badgeText: "SAISON 2026/27", badgeColor: cPurple)

    let pad: CGFloat = 22
    let inner = CGRect(x: rect.minX + pad, y: rect.minY + 80, width: rect.width - pad * 2, height: rect.height - 98)

    let radarRect: CGRect
    let metricsRect: CGRect
    if isPortrait {
        radarRect   = CGRect(x: inner.minX, y: inner.minY, width: inner.width, height: inner.height * 0.47)
        metricsRect = CGRect(x: inner.minX, y: radarRect.maxY + 16, width: inner.width, height: inner.height * 0.50)
    } else {
        radarRect   = CGRect(x: inner.minX, y: inner.minY, width: inner.width * 0.45, height: inner.height)
        metricsRect = CGRect(x: radarRect.maxX + 20, y: inner.minY, width: inner.width * 0.52, height: inner.height)
    }

    // 1. Animated Tactics Radar Chart
    fillRoundedRect(ctx, radarRect, radius: 18, color: RGBA(0x1e293b, 0.9))
    strokeRoundedRect(ctx, radarRect, radius: 18, color: RGBA(0x334155, 0.9), lineWidth: 1.5)
    drawText(ctx, "TAKTIK- & MENTAL-RADAR", x: radarRect.minX + 20, y: radarRect.minY + 16, size: 15, color: cEmeraldL, bold: true)

    let center = CGPoint(x: radarRect.midX, y: radarRect.midY + 14)
    let maxR = min(radarRect.width, radarRect.height) * 0.32
    let axes = ["1vs1", "Flanken", "Ferndistanz", "Spielaufbau", "Resilienz", "Leadership"]
    let vals: [Double] = [0.88, 0.76, 0.84, 0.92, 0.86, 0.80]
    let grow = easeOutCubic((localT - 0.2) / 1.4)

    // Grid rings
    ctx.saveGState()
    for ring in 1...4 {
        let r = maxR * CGFloat(ring) / 4.0
        ctx.beginPath()
        for i in 0..<axes.count {
            let ang = -CGFloat.pi / 2 + CGFloat(i) * (2 * CGFloat.pi / CGFloat(axes.count))
            let pt = CGPoint(x: center.x + cos(ang) * r, y: center.y + sin(ang) * r)
            if i == 0 { ctx.move(to: pt) } else { ctx.addLine(to: pt) }
        }
        ctx.closePath()
        ctx.setStrokeColor(RGBA(0x475569, 0.6).cgColor)
        ctx.setLineWidth(1.2)
        ctx.strokePath()
    }
    // Axis labels
    for (i, label) in axes.enumerated() {
        let ang = -CGFloat.pi / 2 + CGFloat(i) * (2 * CGFloat.pi / CGFloat(axes.count))
        let lx = center.x + cos(ang) * (maxR + 26)
        let ly = center.y + sin(ang) * (maxR + 20) - 8
        drawText(ctx, label, x: lx, y: ly, size: 13, color: cSlate200, bold: true, align: .center)
    }
    // Data polygon
    ctx.beginPath()
    for (i, v) in vals.enumerated() {
        let ang = -CGFloat.pi / 2 + CGFloat(i) * (2 * CGFloat.pi / CGFloat(axes.count))
        let r = maxR * CGFloat(v * grow)
        let pt = CGPoint(x: center.x + cos(ang) * r, y: center.y + sin(ang) * r)
        if i == 0 { ctx.move(to: pt) } else { ctx.addLine(to: pt) }
    }
    ctx.closePath()
    ctx.setFillColor(RGBA(0x10b981, 0.35).cgColor)
    ctx.setStrokeColor(cEmeraldL.cgColor)
    ctx.setLineWidth(3.0)
    ctx.drawPath(using: .fillStroke)
    ctx.restoreGState()

    // 2. Right/Bottom: Athletiktest (BlazePod + CMJ + PHV) + Makro/Meso/Mikro Bar
    fillRoundedRect(ctx, metricsRect, radius: 18, color: RGBA(0x1e293b, 0.9))
    strokeRoundedRect(ctx, metricsRect, radius: 18, color: RGBA(0x334155, 0.9), lineWidth: 1.5)
    drawText(ctx, "7-TEILIGER ATHLETIKTEST & PHV", x: metricsRect.minX + 20, y: metricsRect.minY + 16, size: 15, color: cCyan, bold: true)

    let kpis: [(String, String, Double, RGBA)] = [
        ("BlazePod Reaktion", "412 ms · Top 15%", 0.86, cCyan),
        ("CMJ Sprungkraft", "48.5 cm · +3.2 cm", 0.82, cEmerald),
        ("5m Antritt (1vs1)", "1.04 s · Benchmark", 0.90, cAmber),
        ("Biologisches Alter", "Post-PHV (+0.8 J)", 0.78, cPurple)
    ]
    let kTop = metricsRect.minY + 48
    let kH = (metricsRect.height - 130) / 4.0
    for (i, k) in kpis.enumerated() {
        let p = easeOutCubic((localT - 0.35 - Double(i) * 0.2) / 0.8)
        let ry = kTop + CGFloat(i) * kH
        drawText(ctx, k.0, x: metricsRect.minX + 20, y: ry, size: 15, color: cWhite, bold: true)
        drawText(ctx, k.1, x: metricsRect.maxX - 20, y: ry, size: 15, color: k.3, bold: true, align: .right)
        let br = CGRect(x: metricsRect.minX + 20, y: ry + 24, width: metricsRect.width - 40, height: 9)
        fillRoundedRect(ctx, br, radius: 4.5, color: cSlate900)
        fillRoundedRect(ctx, CGRect(x: br.minX, y: br.minY, width: br.width * CGFloat(k.2 * p), height: 9), radius: 4.5, color: k.3)
    }

    // Periodisierung Mini-Timeline at bottom of metrics card
    let pBox = CGRect(x: metricsRect.minX + 18, y: metricsRect.maxY - 72, width: metricsRect.width - 36, height: 56)
    fillRoundedRect(ctx, pBox, radius: 12, color: RGBA(0x0f172a, 0.92))
    drawText(ctx, "PERIODISIERUNG: MAKRO → MESO (6 WO.) → MIKRO", x: pBox.minX + 14, y: pBox.minY + 8, size: 12, color: cSlate400, bold: true)
    let blocks: [(String, RGBA)] = [("1vs1", cEmerald), ("Flanken", cAmber), ("Athletik", cPurple), ("Spielaufbau", cCyan)]
    let bw = (pBox.width - 28 - 3 * 8) / 4.0
    for (idx, b) in blocks.enumerated() {
        let br = CGRect(x: pBox.minX + 14 + CGFloat(idx) * (bw + 8), y: pBox.minY + 28, width: bw, height: 20)
        fillRoundedRect(ctx, br, radius: 6, color: b.1)
        drawText(ctx, b.0, x: br.midX, y: br.minY + 2, size: 11, color: cSlate950, bold: true, align: .center)
    }
}

// MARK: - Video Scene Definition & Renderer

enum SceneVisualType {
    case hook(bgKey: String, kicker: String, headline: String, subline: String)
    case problem(bgKey: String, kicker: String, headline: String, bullets: [String])
    case plannerBoard(bgKey: String, kicker: String, headline: String)
    case liveMode(bgKey: String, kicker: String, headline: String)
    case diagnostics(bgKey: String, kicker: String, headline: String)
    case pricing(bgKey: String, kicker: String, headline: String)
    case ctaEndcard(bgKey: String)
}

struct SceneSpec {
    let duration: Double
    let voPath: String
    let voDelay: Double
    let caption: String
    let visual: SceneVisualType
}

// MARK: - Audio Mixing (WAV Loader + Procedural Cinematic Sports-Tech Underscore)

func readWavSamplesMono16(_ path: String) -> [Float] {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)), data.count > 44 else { return [] }
    // Find "data" chunk
    var offset = 12
    while offset + 8 < data.count {
        let chunkId = String(bytes: data[offset..<(offset+4)], encoding: .ascii) ?? ""
        let chunkSize = Int(data[offset+4]) | (Int(data[offset+5]) << 8) | (Int(data[offset+6]) << 16) | (Int(data[offset+7]) << 24)
        offset += 8
        if chunkId == "data" {
            let end = min(data.count, offset + chunkSize)
            let count = (end - offset) / 2
            var out = [Float](repeating: 0, count: count)
            data.withUnsafeBytes { raw in
                let ptr = raw.baseAddress!.advanced(by: offset).assumingMemoryBound(to: Int16.self)
                for i in 0..<count {
                    out[i] = Float(ptr[i]) / 32768.0
                }
            }
            return out
        }
        offset += chunkSize
    }
    return []
}

func buildMixedAudio(scenes: [SceneSpec], totalDuration: Double, bpm: Double, sampleRate: Int = 44100) -> [Int16] {
    let totalFrames = Int(totalDuration * Double(sampleRate))
    var voTrack = [Float](repeating: 0, count: totalFrames)
    var sceneCuts: [Double] = []

    var cursor = 0.0
    for sc in scenes {
        sceneCuts.append(cursor)
        let samples = readWavSamplesMono16(sc.voPath)
        let startIdx = Int((cursor + sc.voDelay) * Double(sampleRate))
        for i in 0..<samples.count {
            let dst = startIdx + i
            if dst >= 0 && dst < totalFrames {
                voTrack[dst] += samples[i]
            }
        }
        cursor += sc.duration
    }

    // Compute smooth VO envelope for ducking
    var voEnv = [Float](repeating: 0, count: totalFrames)
    var env: Float = 0
    for i in 0..<totalFrames {
        let a = abs(voTrack[i])
        env = a > env ? (env * 0.995 + a * 0.005) : (env * 0.9997 + a * 0.0003)
        voEnv[i] = min(1.0, env * 5.0)
    }

    // Synthesize stereo interleaved Int16: Warm cinematic D-minor sports-tech pad + gentle pulse
    let chords: [[Double]] = [
        [73.42, 146.83, 174.61, 220.00], // Dm
        [58.27, 116.54, 146.83, 174.61], // Bb
        [65.41, 130.81, 164.81, 196.00], // C
        [55.00, 110.00, 130.81, 164.81]  // Am
    ]
    let beatDur = 60.0 / bpm
    var interleaved = [Int16](repeating: 0, count: totalFrames * 2)

    for i in 0..<totalFrames {
        let t = Double(i) / Double(sampleRate)
        let chordIdx = Int(t / (beatDur * 8.0)) % chords.count
        let chord = chords[chordIdx]

        // Warm stereo pad
        var padL = 0.0
        var padR = 0.0
        for (idx, f) in chord.enumerated() {
            let w = (idx == 0) ? 0.42 : 0.18
            padL += sin(2.0 * .pi * f * t) * w
            padR += sin(2.0 * .pi * (f * 1.003) * t + 0.4) * w
        }

        // Subtle sports-tech rhythmic pulse (kick + sub-pulse)
        let beatPos = t.truncatingRemainder(dividingBy: beatDur)
        let kickEnv = exp(-beatPos * 18.0)
        let kickFreq = 52.0 + 75.0 * exp(-beatPos * 28.0)
        let kick = sin(2.0 * .pi * kickFreq * beatPos) * kickEnv * 0.24

        // Gentle hi-pulse on eighth notes
        let eighthPos = t.truncatingRemainder(dividingBy: beatDur * 0.5)
        let pulseTone = sin(2.0 * .pi * 440.0 * t) * exp(-eighthPos * 45.0) * 0.025

        // Fade in / out
        let fadeIn = clamp01(t / 1.0)
        let fadeOut = clamp01((totalDuration - t) / 2.2)
        let duck = 1.0 - 0.58 * Double(voEnv[i])
        let musicGain = 0.22 * fadeIn * fadeOut * duck

        let vo = Double(voTrack[i]) * 0.92
        let outL = max(-0.98, min(0.98, vo + (padL * 0.55 + kick + pulseTone) * musicGain))
        let outR = max(-0.98, min(0.98, vo + (padR * 0.55 + kick + pulseTone) * musicGain))

        interleaved[i * 2]     = Int16(outL * 32767.0)
        interleaved[i * 2 + 1] = Int16(outR * 32767.0)
    }
    return interleaved
}

// MARK: - Main Video Export Engine

func renderVideo(
    outputPath: String,
    width: Int,
    height: Int,
    fps: Int32,
    bpm: Double,
    scenes: [SceneSpec],
    images: [String: CGImage],
    logo: CGImage?
) throws {
    let url = URL(fileURLWithPath: outputPath)
    try? FileManager.default.removeItem(at: url)

    let totalDuration = scenes.reduce(0.0) { $0 + $1.duration }
    let totalFrames = Int(round(totalDuration * Double(fps)))
    let isPortrait = height > width
    let W = CGFloat(width)
    let H = CGFloat(height)

    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)

    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: isPortrait ? 9_000_000 : 11_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: Int(fps * 2)
        ]
    ]
    let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    videoInput.expectsMediaDataInRealTime = false

    let pbAttrs: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: videoInput, sourcePixelBufferAttributes: pbAttrs)
    writer.add(videoInput)

    let audioSettings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVNumberOfChannelsKey: 2,
        AVSampleRateKey: 44100.0,
        AVEncoderBitRateKey: 192_000
    ]
    let audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
    audioInput.expectsMediaDataInRealTime = false
    writer.add(audioInput)

    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    // Precompute audio track
    let audioSamples = buildMixedAudio(scenes: scenes, totalDuration: totalDuration, bpm: bpm)

    var asbd = AudioStreamBasicDescription(
        mSampleRate: 44100.0,
        mFormatID: kAudioFormatLinearPCM,
        mFormatFlags: kAudioFormatFlagIsSignedInteger | kAudioFormatFlagIsPacked,
        mBytesPerPacket: 4,
        mFramesPerPacket: 1,
        mBytesPerFrame: 4,
        mChannelsPerFrame: 2,
        mBitsPerChannel: 16,
        mReserved: 0
    )
    var formatDesc: CMAudioFormatDescription?
    CMAudioFormatDescriptionCreate(allocator: kCFAllocatorDefault, asbd: &asbd, layoutSize: 0, layout: nil, magicCookieSize: 0, magicCookie: nil, extensions: nil, formatDescriptionOut: &formatDesc)

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue

    var sceneStarts: [Double] = []
    var acc = 0.0
    for s in scenes { sceneStarts.append(acc); acc += s.duration }

    print("Rendering \(outputPath) (\(width)x\(height), \(totalFrames) frames, \(String(format: "%.1f", totalDuration))s)...")
    fflush(stdout)

    let group = DispatchGroup()
    let videoQueue = DispatchQueue(label: "video.render.queue")
    let audioQueue = DispatchQueue(label: "audio.render.queue")

    // Concurrent Video Track Writer
    group.enter()
    var frameIdx = 0
    var videoFinished = false
    videoInput.requestMediaDataWhenReady(on: videoQueue) {
        while videoInput.isReadyForMoreMediaData && frameIdx < totalFrames {
            autoreleasepool {
                var pbOpt: CVPixelBuffer?
                CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pbOpt)
                guard let pb = pbOpt else { frameIdx += 1; return }
                CVPixelBufferLockBaseAddress(pb, [])

                if let base = CVPixelBufferGetBaseAddress(pb),
                   let ctx = CGContext(data: base, width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: colorSpace, bitmapInfo: bitmapInfo) {

                    // Top-down coordinate system
                    ctx.translateBy(x: 0, y: H)
                    ctx.scaleBy(x: 1, y: -1)
                    ctx.interpolationQuality = .high

                    let t = Double(frameIdx) / Double(fps)

                    // Find active scene
                    var scIdx = scenes.count - 1
                    for i in 0..<scenes.count {
                        if t >= sceneStarts[i] && t < sceneStarts[i] + scenes[i].duration {
                            scIdx = i
                            break
                        }
                    }
                    let sc = scenes[scIdx]
                    let localT = t - sceneStarts[scIdx]
                    let sceneProg = clamp01(localT / sc.duration)
                    let fadeIn = easeOutCubic(localT / 0.45)
                    let fadeOut = (scIdx == scenes.count - 1) ? clamp01((sc.duration - localT) / 0.8) : clamp01((sc.duration - localT) / 0.35)
                    let sceneAlpha = CGFloat(min(fadeIn, fadeOut))

                    // Fill dark slate base
                    ctx.setFillColor(cSlate950.cgColor)
                    ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

                    // Render active scene
                    func drawBG(_ key: String, darken: CGFloat = 0.55, zoomStart: CGFloat = 1.02, zoomEnd: CGFloat = 1.12) {
                        if let img = images[key] {
                            let z = zoomStart + (zoomEnd - zoomStart) * CGFloat(sceneProg)
                            let panX = CGFloat(sin(sceneProg * .pi * 0.5) * (isPortrait ? 18.0 : 28.0))
                            drawImageAspectFill(ctx, img, in: CGRect(x: 0, y: 0, width: W, height: H), zoom: z, panX: panX, panY: 0, alpha: sceneAlpha)
                        }
                        drawGradientOverlay(ctx, rect: CGRect(x: 0, y: 0, width: W, height: H),
                                            topColor: RGBA(0x020617, darken + 0.15),
                                            midColor: RGBA(0x0f172a, darken),
                                            bottomColor: RGBA(0x020617, min(0.95, darken + 0.30)))
                    }

                    // Top persistent subtle brand watermark (except CTA endcard)
                    func drawTopBrandBar() {
                        let topY: CGFloat = isPortrait ? 78 : 34
                        let leftX: CGFloat = isPortrait ? 52 : 54
                        if let lg = logo {
                            drawImageUpright(ctx, lg, in: CGRect(x: leftX, y: topY, width: 42, height: 42), alpha: 0.95)
                        }
                        drawText(ctx, "NEXTLEVEL GOALKEEPING", x: leftX + 54, y: topY + 4, size: 17, color: cWhite, bold: true)
                        drawText(ctx, "PRO", x: leftX + 278, y: topY + 4, size: 17, color: cEmeraldL, bold: true)
                        drawText(ctx, "VOM PLATZ FÜR DEN PLATZ", x: leftX + 54, y: topY + 25, size: 12, color: cSlate400, bold: true)
                    }

                    switch sc.visual {
                    case .hook(let bgKey, let kicker, let headline, let subline):
                        drawBG(bgKey, darken: 0.42, zoomStart: 1.00, zoomEnd: 1.14)
                        drawRadialGlow(ctx, center: CGPoint(x: W * 0.5, y: H * 0.38), radius: W * 0.55, color: RGBA(0x10b981, 0.18 * Double(sceneAlpha)))
                        drawTopBrandBar()

                        let lift = CGFloat(1.0 - easeOutCubic(localT / 0.55)) * 42.0
                        let cy = isPortrait ? H * 0.36 : H * 0.34
                        let kw: CGFloat = isPortrait ? 440 : 460
                        let kRect = CGRect(x: W * 0.5 - kw * 0.5, y: cy - 66 + lift, width: kw, height: 40)
                        fillRoundedRect(ctx, kRect, radius: 20, color: RGBA(0x064e3b, 0.85))
                        strokeRoundedRect(ctx, kRect, radius: 20, color: cEmeraldL, lineWidth: 1.5)
                        drawText(ctx, kicker, x: W * 0.5, y: kRect.minY + 9, size: 17, color: cEmeraldL, bold: true, align: .center)

                        let headSize: CGFloat = isPortrait ? 68 : 74
                        _ = drawWrappedText(ctx, headline, centerX: W * 0.5, topY: cy + lift, maxWidth: W * 0.86, size: headSize, lineHeight: headSize * 1.12, color: cWhite, bold: true, align: .center)
                        drawText(ctx, subline, x: W * 0.5, y: cy + (isPortrait ? 190 : 145) + lift, size: isPortrait ? 28 : 26, color: cEmeraldL, bold: true, align: .center)

                    case .problem(let bgKey, let kicker, let headline, let bullets):
                        drawBG(bgKey, darken: 0.55, zoomStart: 1.04, zoomEnd: 1.13)
                        drawTopBrandBar()

                        let topY: CGFloat = isPortrait ? H * 0.20 : H * 0.20
                        drawText(ctx, kicker, x: isPortrait ? W * 0.5 : 80, y: topY, size: 20, color: cAmber, bold: true, align: isPortrait ? .center : .left)
                        _ = drawWrappedText(ctx, headline, centerX: isPortrait ? W * 0.5 : 80, topY: topY + 34, maxWidth: isPortrait ? W * 0.86 : W * 0.58, size: isPortrait ? 52 : 54, lineHeight: isPortrait ? 60 : 62, color: cWhite, bold: true, align: isPortrait ? .center : .left)

                        let cardTop = isPortrait ? H * 0.41 : H * 0.46
                        for (i, b) in bullets.enumerated() {
                            let a = easeOutCubic((localT - 0.35 - Double(i) * 0.45) / 0.55)
                            let dx = CGFloat(1.0 - a) * 50.0
                            let cardW: CGFloat = isPortrait ? W - 110 : W * 0.52
                            let cardX: CGFloat = isPortrait ? 55 + dx : 80 + dx
                            let cr = CGRect(x: cardX, y: cardTop + CGFloat(i) * (isPortrait ? 105 : 86), width: cardW, height: isPortrait ? 84 : 70)
                            ctx.saveGState()
                            ctx.setAlpha(CGFloat(a) * sceneAlpha)
                            fillRoundedRect(ctx, cr, radius: 18, color: RGBA(0x0f172a, 0.86))
                            strokeRoundedRect(ctx, cr, radius: 18, color: RGBA(0x334155, 0.9), lineWidth: 1.5)
                            fillRoundedRect(ctx, CGRect(x: cr.minX + 18, y: cr.midY - 8, width: 16, height: 16), radius: 8, color: cEmerald)
                            drawText(ctx, b, x: cr.minX + 52, y: cr.midY - 14, size: isPortrait ? 25 : 23, color: cWhite, bold: true, maxWidth: cr.width - 74)
                            ctx.restoreGState()
                        }

                    case .plannerBoard(let bgKey, let kicker, let headline):
                        drawBG(bgKey, darken: 0.72)
                        drawTopBrandBar()
                        let titleY: CGFloat = isPortrait ? 155 : 96
                        drawText(ctx, kicker, x: W * 0.5, y: titleY, size: 18, color: cEmeraldL, bold: true, align: .center)
                        drawText(ctx, headline, x: W * 0.5, y: titleY + 26, size: isPortrait ? 40 : 42, color: cWhite, bold: true, align: .center, maxWidth: W * 0.9)

                        let uiRect = isPortrait
                            ? CGRect(x: 48, y: 265, width: W - 96, height: 1120)
                            : CGRect(x: 110, y: 188, width: W - 220, height: 730)
                        ctx.saveGState()
                        ctx.setAlpha(sceneAlpha)
                        drawPlannerAndTacticalUI(ctx, rect: uiRect, localT: localT, isPortrait: isPortrait)
                        ctx.restoreGState()

                    case .liveMode(let bgKey, let kicker, let headline):
                        drawBG(bgKey, darken: 0.68)
                        drawTopBrandBar()
                        let titleY: CGFloat = isPortrait ? 155 : 96
                        drawText(ctx, kicker, x: W * 0.5, y: titleY, size: 18, color: cRose, bold: true, align: .center)
                        drawText(ctx, headline, x: W * 0.5, y: titleY + 26, size: isPortrait ? 40 : 42, color: cWhite, bold: true, align: .center, maxWidth: W * 0.9)

                        let uiRect = isPortrait
                            ? CGRect(x: 48, y: 265, width: W - 96, height: 1100)
                            : CGRect(x: 110, y: 188, width: W - 220, height: 720)
                        ctx.saveGState()
                        ctx.setAlpha(sceneAlpha)
                        drawLiveModeUI(ctx, rect: uiRect, localT: localT, isPortrait: isPortrait)
                        ctx.restoreGState()

                    case .diagnostics(let bgKey, let kicker, let headline):
                        drawBG(bgKey, darken: 0.72)
                        drawTopBrandBar()
                        let titleY: CGFloat = isPortrait ? 155 : 96
                        drawText(ctx, kicker, x: W * 0.5, y: titleY, size: 18, color: cCyan, bold: true, align: .center)
                        drawText(ctx, headline, x: W * 0.5, y: titleY + 26, size: isPortrait ? 40 : 42, color: cWhite, bold: true, align: .center, maxWidth: W * 0.9)

                        let uiRect = isPortrait
                            ? CGRect(x: 48, y: 265, width: W - 96, height: 1120)
                            : CGRect(x: 110, y: 188, width: W - 220, height: 730)
                        ctx.saveGState()
                        ctx.setAlpha(sceneAlpha)
                        drawDiagnosticsAndPeriodizationUI(ctx, rect: uiRect, localT: localT, isPortrait: isPortrait)
                        ctx.restoreGState()

                    case .pricing(let bgKey, let kicker, let headline):
                        drawBG(bgKey, darken: 0.62, zoomStart: 1.12, zoomEnd: 1.03)
                        drawTopBrandBar()
                        drawRadialGlow(ctx, center: CGPoint(x: W * 0.5, y: H * 0.45), radius: W * 0.55, color: RGBA(0x10b981, 0.22 * Double(sceneAlpha)))

                        let cardW: CGFloat = isPortrait ? W - 110 : 880
                        let cardH: CGFloat = isPortrait ? 520 : 440
                        let card = CGRect(x: W * 0.5 - cardW * 0.5, y: H * 0.46 - cardH * 0.5, width: cardW, height: cardH)
                        fillRoundedRect(ctx, card, radius: 32, color: RGBA(0x0f172a, 0.92))
                        strokeRoundedRect(ctx, card, radius: 32, color: cEmerald, lineWidth: 2.5)

                        drawText(ctx, kicker, x: card.midX, y: card.minY + 46, size: 22, color: cEmeraldL, bold: true, align: .center)
                        drawText(ctx, headline, x: card.midX, y: card.minY + 90, size: isPortrait ? 46 : 50, color: cWhite, bold: true, align: .center, maxWidth: cardW - 60)
                        drawText(ctx, "AB 3,99 € / MONAT", x: card.midX, y: card.minY + (isPortrait ? 195 : 175), size: isPortrait ? 64 : 68, color: cEmeraldL, bold: true, heavy: true, align: .center)
                        drawText(ctx, "Für Einzeltrainer & ganze Vereins-Torwartabteilungen", x: card.midX, y: card.minY + (isPortrait ? 290 : 268), size: isPortrait ? 24 : 25, color: cSlate200, bold: false, align: .center, maxWidth: cardW - 60)

                        let pRect = CGRect(x: card.midX - 240, y: card.maxY - 96, width: 480, height: 52)
                        fillRoundedRect(ctx, pRect, radius: 26, color: RGBA(0x064e3b, 0.9))
                        strokeRoundedRect(ctx, pRect, radius: 26, color: cEmeraldL, lineWidth: 1.5)
                        drawText(ctx, "14 TAGE KOSTENLOS & UNVERBINDLICH TESTEN", x: pRect.midX, y: pRect.minY + 15, size: 17, color: cWhite, bold: true, align: .center)

                    case .ctaEndcard(let bgKey):
                        drawBG(bgKey, darken: 0.78, zoomStart: 1.08, zoomEnd: 1.02)
                        drawRadialGlow(ctx, center: CGPoint(x: W * 0.5, y: H * 0.42), radius: W * 0.58, color: RGBA(0x10b981, 0.26))

                        let scaleIn = easeOutCubic(localT / 0.7)
                        let cy = isPortrait ? H * 0.34 : H * 0.25

                        if let lg = logo {
                            let ls: CGFloat = (isPortrait ? 180 : 150) * CGFloat(0.88 + 0.12 * scaleIn)
                            drawImageUpright(ctx, lg, in: CGRect(x: W * 0.5 - ls * 0.5, y: cy - ls * 0.5, width: ls, height: ls), alpha: sceneAlpha)
                        }

                        let tTop = cy + (isPortrait ? 120 : 102)
                        drawText(ctx, "NEXTLEVEL GOALKEEPING PRO", x: W * 0.5, y: tTop, size: isPortrait ? 52 : 60, color: cWhite, bold: true, heavy: true, align: .center, maxWidth: W * 0.9)
                        drawText(ctx, "VOM PLATZ FÜR DEN PLATZ.", x: W * 0.5, y: tTop + (isPortrait ? 72 : 76), size: isPortrait ? 28 : 30, color: cEmeraldL, bold: true, align: .center)
                        drawText(ctx, "Ab 3,99 € / Monat  ·  14 Tage kostenlos testen", x: W * 0.5, y: tTop + (isPortrait ? 140 : 138), size: isPortrait ? 27 : 28, color: cSlate200, bold: true, align: .center)

                        let btnW: CGFloat = isPortrait ? W - 120 : 780
                        let btnH: CGFloat = isPortrait ? 96 : 88
                        let btn = CGRect(x: W * 0.5 - btnW * 0.5, y: tTop + (isPortrait ? 215 : 206), width: btnW, height: btnH)
                        let pulseGlow = 0.22 + 0.10 * sin(localT * 4.5)
                        drawRadialGlow(ctx, center: CGPoint(x: btn.midX, y: btn.midY), radius: btnW * 0.55, color: RGBA(0x10b981, pulseGlow))
                        fillRoundedRect(ctx, btn, radius: btnH * 0.5, color: cEmerald)
                        strokeRoundedRect(ctx, btn, radius: btnH * 0.5, color: cWhite, lineWidth: 2.5)
                        drawText(ctx, "nextlevel-gk.de/torwarttrainer", x: btn.midX, y: btn.midY - (isPortrait ? 19 : 18), size: isPortrait ? 34 : 34, color: cSlate950, bold: true, align: .center)
                    }

                    if !sc.caption.isEmpty {
                        let capBoxW: CGFloat = isPortrait ? W - 96 : W * 0.78
                        let capBoxH: CGFloat = isPortrait ? 156 : 86
                        let capY: CGFloat = isPortrait ? H - 365 : H - 116
                        let capRect = CGRect(x: W * 0.5 - capBoxW * 0.5, y: capY, width: capBoxW, height: capBoxH)
                        ctx.saveGState()
                        ctx.setAlpha(sceneAlpha)
                        fillRoundedRect(ctx, capRect, radius: 22, color: RGBA(0x020617, 0.84))
                        strokeRoundedRect(ctx, capRect, radius: 22, color: RGBA(0x10b981, 0.55), lineWidth: 1.5)
                        let capFontSize: CGFloat = isPortrait ? 31 : 25
                        _ = drawWrappedText(ctx, sc.caption, centerX: W * 0.5, topY: capRect.minY + (isPortrait ? 26 : 16), maxWidth: capBoxW - 48, size: capFontSize, lineHeight: capFontSize * 1.25, color: cWhite, bold: true, align: .center)
                        ctx.restoreGState()
                    }

                    let progW = W * CGFloat(t / totalDuration)
                    ctx.setFillColor(cEmerald.cgColor)
                    ctx.fill(CGRect(x: 0, y: H - 6, width: progW, height: 6))
                }

                CVPixelBufferUnlockBaseAddress(pb, [])
                let pts = CMTime(value: CMTimeValue(frameIdx), timescale: fps)
                adaptor.append(pb, withPresentationTime: pts)
                frameIdx += 1
                if frameIdx % 360 == 0 || frameIdx == totalFrames {
                    print("  Video progress: \(Int(Double(frameIdx) * 100.0 / Double(totalFrames)))% (\(frameIdx)/\(totalFrames))")
                    fflush(stdout)
                }
            }
        }
        if frameIdx >= totalFrames && !videoFinished {
            videoFinished = true
            videoInput.markAsFinished()
            group.leave()
        }
    }

    // Concurrent Audio Track Writer
    group.enter()
    let totalAudioFrames = audioSamples.count / 2
    let chunkFrames = 4096
    var offsetFrame = 0
    var audioFinished = false
    audioInput.requestMediaDataWhenReady(on: audioQueue) {
        while audioInput.isReadyForMoreMediaData && offsetFrame < totalAudioFrames {
            let count = min(chunkFrames, totalAudioFrames - offsetFrame)
            let byteCount = count * 4
            var blockBuf: CMBlockBuffer?
            CMBlockBufferCreateWithMemoryBlock(allocator: kCFAllocatorDefault, memoryBlock: nil, blockLength: byteCount, blockAllocator: kCFAllocatorDefault, customBlockSource: nil, offsetToData: 0, dataLength: byteCount, flags: 0, blockBufferOut: &blockBuf)
            if let bb = blockBuf {
                audioSamples.withUnsafeBytes { raw in
                    let ptr = raw.baseAddress!.advanced(by: offsetFrame * 4)
                    CMBlockBufferReplaceDataBytes(with: ptr, blockBuffer: bb, offsetIntoDestination: 0, dataLength: byteCount)
                }
                var sampleBuf: CMSampleBuffer?
                let pts = CMTime(value: CMTimeValue(offsetFrame), timescale: 44100)
                CMAudioSampleBufferCreateReadyWithPacketDescriptions(
                    allocator: kCFAllocatorDefault,
                    dataBuffer: bb,
                    formatDescription: formatDesc!,
                    sampleCount: count,
                    presentationTimeStamp: pts,
                    packetDescriptions: nil,
                    sampleBufferOut: &sampleBuf
                )
                if let sb = sampleBuf {
                    audioInput.append(sb)
                }
            }
            offsetFrame += count
        }
        if offsetFrame >= totalAudioFrames && !audioFinished {
            audioFinished = true
            audioInput.markAsFinished()
            group.leave()
        }
    }

    group.wait()

    let sema = DispatchSemaphore(value: 0)
    writer.finishWriting { sema.signal() }
    sema.wait()

    if writer.status != .completed {
        throw writer.error ?? NSError(domain: "Render", code: 1, userInfo: [NSLocalizedDescriptionKey: "AVAssetWriter failed"])
    }
    print("DONE -> \(outputPath)")
    fflush(stdout)
}

// MARK: - Main Execution

let cwd = FileManager.default.currentDirectoryPath
let assetDir = "\(cwd)/Marketing_Videos/assets"
let voDir = "\(assetDir)/vo"

var imgs: [String: CGImage] = [:]
for key in ["bg_floodlight_gk", "bg_coach_sideline", "bg_stadium_tactics", "bg_reaction_lights", "bg_gloves_focus"] {
    if let im = loadImage("\(assetDir)/\(key).jpg") {
        imgs[key] = im
    } else {
        print("WARNING: Could not load \(key).jpg")
    }
}
let logo = loadImage("\(cwd)/src/assets/Logo.png")

// Version 1: 9:16 Social Media (60.0s exact)
let scenes9x16: [SceneSpec] = [
    SceneSpec(duration: 5.2,  voPath: "\(voDir)/v1_9x16_0.wav", voDelay: 0.15,
              caption: "Zettelwirtschaft & Excel-Chaos? Damit ist jetzt endlich Schluss.",
              visual: .hook(bgKey: "bg_floodlight_gk", kicker: "FÜR AMBITIONIERTE TORWARTTRAINER", headline: "SCHLUSS MIT ZETTELCHAOS.", subline: "Struktur statt Bauchgefühl.")),
    SceneSpec(duration: 8.2,  voPath: "\(voDir)/v1_9x16_1.wav", voDelay: 0.25,
              caption: "Systematische Entwicklung – auch wenn im Vereinsalltag die Zeit knapp ist.",
              visual: .problem(bgKey: "bg_coach_sideline", kicker: "DER VEREINSALLTAG", headline: "Hoher Anspruch. Wenig Zeit.",
                               bullets: ["Klare Struktur statt Zettel-Suche", "Methodik für jede Altersklasse", "Messbare Entwicklung für jeden Keeper"])),
    SceneSpec(duration: 8.6,  voPath: "\(voDir)/v1_9x16_2.wav", voDelay: 0.25,
              caption: "5-Phasen-Planer, 6-stufige Methodische Reihe & animiertes Taktikboard.",
              visual: .plannerBoard(bgKey: "bg_stadium_tactics", kicker: "PLANUNG IN MINUTEN", headline: "Methodik & Taktikboard")),
    SceneSpec(duration: 9.8,  voPath: "\(voDir)/v1_9x16_3.wav", voDelay: 0.25,
              caption: "Offline-Live-Modus: Timer, Platzbelag-Load & Live-Wettkämpfe.",
              visual: .liveMode(bgKey: "bg_reaction_lights", kicker: "DIREKT AM PLATZ · OFFLINE", headline: "Live-Modus & Gamification")),
    SceneSpec(duration: 11.1, voPath: "\(voDir)/v1_9x16_4.wav", voDelay: 0.25,
              caption: "Periodisierung & 4 Säulen: Technik, Taktik-Radar, Mental & BlazePod-Athletik.",
              visual: .diagnostics(bgKey: "bg_gloves_focus", kicker: "GANZHEITLICHE DIAGNOSTIK", headline: "Periodisierung & 4 Säulen")),
    SceneSpec(duration: 6.3,  voPath: "\(voDir)/v1_9x16_5.wav", voDelay: 0.25,
              caption: "Vom Platz für den Platz – für Einzeltrainer & Vereine ab 3,99 € / Monat.",
              visual: .pricing(bgKey: "bg_floodlight_gk", kicker: "VOM PLATZ FÜR DEN PLATZ", headline: "NextLevel Goalkeeping PRO")),
    SceneSpec(duration: 10.8, voPath: "\(voDir)/v1_9x16_6.wav", voDelay: 0.30,
              caption: "",
              visual: .ctaEndcard(bgKey: "bg_stadium_tactics"))
]

// Version 2: 16:9 YouTube & Homepage (60.0s exact)
let scenes16x9: [SceneSpec] = [
    SceneSpec(duration: 7.8,  voPath: "\(voDir)/v2_16x9_0.wav", voDelay: 0.55,
              caption: "Gutes Torwarttraining entsteht durch Klarheit, Methodik und einen roten Faden.",
              visual: .hook(bgKey: "bg_floodlight_gk", kicker: "NEXTLEVEL GOALKEEPING PRO", headline: "KLARHEIT. METHODIK. STRUKTUR.", subline: "Dein roter Faden über die gesamte Saison.")),
    SceneSpec(duration: 9.2,  voPath: "\(voDir)/v2_16x9_1.wav", voDelay: 0.45,
              caption: "Belastung, Technik und Entwicklung sauber dokumentieren – ohne Papierkram.",
              visual: .problem(bgKey: "bg_coach_sideline", kicker: "ZWISCHEN PLATZ, SPIELTAG & VEREIN", headline: "Professionell arbeiten – trotz engem Zeitplan.",
                               bullets: ["Einheitliche Trainingsmethodik im gesamten Verein", "Belastung & Entwicklung zentral dokumentiert", "Jederzeit bereit – auf Laptop, Tablet & Smartphone"])),
    SceneSpec(duration: 12.4, voPath: "\(voDir)/v2_16x9_2.wav", voDelay: 0.45,
              caption: "Makro-, Meso- & Mikroplanung, 5-Phasen-Struktur, 6-Stufen-Reihe & Taktikboard.",
              visual: .plannerBoard(bgKey: "bg_stadium_tactics", kicker: "MODERNE TORWARTMETHODIK", headline: "Trainingsplaner & Animiertes Taktikboard")),
    SceneSpec(duration: 9.4,  voPath: "\(voDir)/v2_16x9_3.wav", voDelay: 0.45,
              caption: "Offlinefähiger Live-Modus mit Timer, Debriefing, Platzbelag-Load & Live-Wettkämpfen.",
              visual: .liveMode(bgKey: "bg_reaction_lights", kicker: "LIVE-MODUS AM PLATZ", headline: "Timer · Belastungssteuerung · Wettkampf-Board")),
    SceneSpec(duration: 10.0, voPath: "\(voDir)/v2_16x9_4.wav", voDelay: 0.45,
              caption: "4 Diagnostik-Säulen: Technik, Taktik, Athletik (BlazePod & PHV) & Mentalität.",
              visual: .diagnostics(bgKey: "bg_gloves_focus", kicker: "MESSBARE ENTWICKLUNG", headline: "4-Säulen-Diagnostik & Saison-Periodisierung")),
    SceneSpec(duration: 11.2, voPath: "\(voDir)/v2_16x9_5.wav", voDelay: 0.45,
              caption: "",
              visual: .ctaEndcard(bgKey: "bg_stadium_tactics"))
]

do {
    try renderVideo(
        outputPath: "\(cwd)/Marketing_Videos/NextLevel_Goalkeeping_PRO_9x16_Social.mp4",
        width: 1080, height: 1920, fps: 30, bpm: 114.0,
        scenes: scenes9x16, images: imgs, logo: logo
    )
    try renderVideo(
        outputPath: "\(cwd)/Marketing_Videos/NextLevel_Goalkeeping_PRO_16x9_YouTube_Web.mp4",
        width: 1920, height: 1080, fps: 30, bpm: 98.0,
        scenes: scenes16x9, images: imgs, logo: logo
    )
} catch {
    fputs("ERROR: \(error)\n", stderr)
    exit(1)
}
