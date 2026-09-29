// Cuts the subject out of a photo, the way the iPhone lifts a person out of a picture in Photos:
// the background goes transparent, the result is a PNG cropped to the subject.
//
//   swift scripts/cutout.swift IN.jpg OUT.png
//
// macOS 14 or later (Apple's Vision framework does the work). Feed the result to the newspaper as a cut-out.
import AppKit
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: swift scripts/cutout.swift IN OUT.png\n".data(using: .utf8)!)
  exit(64)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])

guard let image = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true]) else {
  FileHandle.standardError.write("cannot read \(args[1])\n".data(using: .utf8)!)
  exit(66)
}

let handler = VNImageRequestHandler(ciImage: image, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
do {
  try handler.perform([request])
} catch {
  FileHandle.standardError.write("vision failed: \(error)\n".data(using: .utf8)!)
  exit(70)
}
guard let result = request.results?.first, !result.allInstances.isEmpty else {
  FileHandle.standardError.write("no subject found in \(args[1])\n".data(using: .utf8)!)
  exit(65)
}

do {
  let buffer = try result.generateMaskedImage(
    ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
  let cutout = CIImage(cvPixelBuffer: buffer)
  let context = CIContext()
  guard
    let png = context.pngRepresentation(
      of: cutout, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  else {
    FileHandle.standardError.write("could not encode the PNG\n".data(using: .utf8)!)
    exit(70)
  }
  try png.write(to: outURL)
  print("\(outURL.lastPathComponent): \(Int(cutout.extent.width))x\(Int(cutout.extent.height))")
} catch {
  FileHandle.standardError.write("cut-out failed: \(error)\n".data(using: .utf8)!)
  exit(70)
}
