import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let inputPath = "/Users/thorsten/Desktop/Antigravity/Trainingsplanung/Logo.jpg"
guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: inputPath) as CFURL, nil),
      let cgImg = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("Failed to load \(inputPath)")
    exit(1)
}

let width = cgImg.width
let height = cgImg.height
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bytesPerPixel = 4
let bytesPerRow = bytesPerPixel * width
let bitsPerComponent = 8

var rawData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
guard let context = CGContext(
    data: &rawData,
    width: width,
    height: height,
    bitsPerComponent: bitsPerComponent,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
) else {
    print("Failed to create CGContext")
    exit(1)
}

context.draw(cgImg, in: CGRect(x: 0, y: 0, width: width, height: height))

// Sample corners to find background color
var cornerColors: [[Double]] = []
let samplePoints = [
    (0, 0), (5, 5), (10, 10), (width - 1, 0), (width - 10, 10),
    (0, height - 1), (10, height - 10), (width - 1, height - 1), (width - 10, height - 10)
]
for (x, y) in samplePoints {
    let offset = (y * width + x) * bytesPerPixel
    let r = Double(rawData[offset])
    let g = Double(rawData[offset + 1])
    let b = Double(rawData[offset + 2])
    cornerColors.append([r, g, b])
}

print("Sampled background corner colors:")
for c in cornerColors {
    print("RGB: \(c)")
}

let avgR = cornerColors.reduce(0.0) { $0 + $1[0] } / Double(cornerColors.count)
let avgG = cornerColors.reduce(0.0) { $0 + $1[1] } / Double(cornerColors.count)
let avgB = cornerColors.reduce(0.0) { $0 + $1[2] } / Double(cornerColors.count)
print("Average background color: R=\(avgR), G=\(avgG), B=\(avgB)")

