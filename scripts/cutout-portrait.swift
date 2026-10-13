// Cuts the person out of a photo (transparent background) using macOS's built-in
// subject lifting (Vision), crops to them, and scales it down. No dependencies.
// The About page's DNA portrait needs this: it draws bright pixels as bright
// letters, so a bright wall behind you would outshine you.
//
//   swift scripts/cutout-portrait.swift <photo> <out.png> [height=640] [crop]
//
// crop: "x,y,w,h" as fractions of the cut-out (0..1, from the top left), e.g.
// "0.2,0,0.66,0.66" keeps head and collar. The face then fills the portrait.
//
// Needs macOS 14 or later.
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: swift scripts/cutout-portrait.swift <photo> <out.png> [height] [x,y,w,h]")
  exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let height = args.count > 3 ? Double(args[3]) ?? 640 : 640
let crop = args.count > 4 ? args[4].split(separator: ",").compactMap { Double($0) } : []

guard let image = CIImage(contentsOf: input, options: [.applyOrientationProperty: true]) else {
  print("Could not read \(input.path)")
  exit(1)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: image)
try handler.perform([request])
guard let result = request.results?.first, !result.allInstances.isEmpty else {
  print("No person or subject found in the photo")
  exit(1)
}

// The subject on transparency, cropped to its bounds.
let masked = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
var cutout = CIImage(cvPixelBuffer: masked)
if crop.count == 4 {
  // Core Image's origin is the bottom left, so flip y.
  let e = cutout.extent
  let rect = CGRect(x: e.minX + crop[0] * e.width, y: e.minY + (1 - crop[1] - crop[3]) * e.height, width: crop[2] * e.width, height: crop[3] * e.height)
  cutout = cutout.cropped(to: rect).transformed(by: CGAffineTransform(translationX: -rect.minX, y: -rect.minY))
}
let scale = min(1, height / cutout.extent.height)
let scaled = cutout.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

let context = CIContext()
try context.writePNGRepresentation(of: scaled, to: output, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("Wrote \(output.path) (\(Int(scaled.extent.width))×\(Int(scaled.extent.height)))")
