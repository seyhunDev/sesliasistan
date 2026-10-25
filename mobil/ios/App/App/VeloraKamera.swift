import AVFoundation
import Capacitor
import Photos
import UIKit
import UniformTypeIdentifiers

// iPhone kamerası, üstünde akan sayaçla (web: src/features/raceMedia/RecPick.jsx). Seyhun 2026-10-22: "video çekilirken kalan süreyi
// görmedim, keşke görebilseydim". Kamera uygulamanın içinde açıldığı için Dynamic Island'daki sayaç görünmüyordu; burada iPhone'un
// kendi kamera ekranının (UIImagePickerController) üstüne büyük süre yazılır. Dokunuşlar kameraya geçer.
// Girdi: end (ms, sayacın sıfır anı; 0 = sayaç yok), paused, left (sn, durmuşsa), title.
// Sonuç: { path (web'in okuyabileceği adres), kind: photo | video, type, end (ms, kaydın bittiği an) } ya da { cancel: true }
extension VeloraPlugin {
    @objc func camera(_ call: CAPPluginCall) {
        let end = call.getDouble("end", 0) / 1000
        let paused = call.getBool("paused", false)
        let left = call.getInt("left", 0)
        let title = call.getString("title", "")
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera), let vc = self.bridge?.viewController else {
                return call.reject("Kamera yok")
            }
            let p = UIImagePickerController()
            p.sourceType = .camera
            p.mediaTypes = [UTType.movie.identifier, UTType.image.identifier]
            p.cameraCaptureMode = .video
            p.videoQuality = .typeHigh
            p.videoMaximumDuration = 120
            let k = KameraYonetici(call: call, plugin: self)
            p.delegate = k
            KameraYonetici.etkin = k
            if end > 0 || paused {
                let o = SayacKatmani(frame: vc.view.bounds, end: end, paused: paused, left: left, title: title)
                p.cameraOverlayView = o
                k.katman = o
            }
            vc.present(p, animated: true)
        }
    }
}

final class KameraYonetici: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    static var etkin: KameraYonetici?
    let call: CAPPluginCall
    weak var plugin: VeloraPlugin?
    var katman: SayacKatmani?

    init(call: CAPPluginCall, plugin: VeloraPlugin) {
        self.call = call
        self.plugin = plugin
    }

    private func kapat(_ p: UIImagePickerController) {
        katman?.dur()
        p.dismiss(animated: true)
        KameraYonetici.etkin = nil
    }

    func imagePickerControllerDidCancel(_ p: UIImagePickerController) {
        kapat(p)
        call.resolve(["cancel": true])
    }

    func imagePickerController(_ p: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        kapat(p)
        let tmp = FileManager.default.temporaryDirectory
        let ad = "velora-\(Int(Date().timeIntervalSince1970 * 1000))"
        do {
            if let src = info[.mediaURL] as? URL {
                // Kaydın bittiği an: dosyanın yazıldığı zaman ("Videoyu Kullan"a basılana kadar geçen süre sayılmasın)
                let at = (try? FileManager.default.attributesOfItem(atPath: src.path)[.creationDate] as? Date) ?? Date()
                let ext = src.pathExtension.isEmpty ? "mov" : src.pathExtension.lowercased()
                let asil = tmp.appendingPathComponent("\(ad)-asil.\(ext)")
                try? FileManager.default.removeItem(at: asil)
                try FileManager.default.copyItem(at: src, to: asil)
                // Seyhun 2026-10-25: "1 dakikadan uzun kayıtlar ne telefona ne buluta yükleniyor". iPhone kamerasının 1080p videosu
                // saniyede 10-20 Mbit (1 dk ≈ 100 MB); web'deki küçültme video süresi kadar oynatarak çalışıyor, ekran kilitlenince ya da
                // uzun videoda takılıyordu, 60 MB sınırını aşan aslı da yüklenemiyordu. Şimdi: aslı iPhone'un Fotoğraflar'ına kaydedilir
                // (telefonda kalır), buluta gidecek 1080p kopya burada donanımla hazırlanır (videodan kısa sürer, 55 MB altına sığar).
                Fotograflar.kaydet(asil)
                Task {
                    do {
                        let kucuk = tmp.appendingPathComponent("\(ad).mp4")
                        try await VideoKopya.hazirla(asil, kucuk, enCokBayt: 55 * 1024 * 1024, enCokBps: 5_000_000, enCokPx: 1920)
                        self.cevap(kucuk, kind: "video", type: "video/mp4", at: at, saved: true)
                    } catch {
                        NSLog("[kamera] kopya hazırlanamadı: \(error)")
                        self.cevap(asil, kind: "video", type: ext == "mp4" ? "video/mp4" : "video/quicktime", at: at, saved: true)
                    }
                }
                return
            }
            if let img = info[.originalImage] as? UIImage, let data = img.jpegData(compressionQuality: 0.92) {
                let dst = tmp.appendingPathComponent("\(ad).jpg")
                try data.write(to: dst)
                return cevap(dst, kind: "photo", type: "image/jpeg", at: Date())
            }
            call.reject("Kayıt alınamadı")
        } catch {
            call.reject("Kayıt alınamadı: \(error.localizedDescription)")
        }
    }

    // saved: aslı Fotoğraflar'a kaydedildi (web "telefonda 7 gün" kopyası tutmasa da olur)
    private func cevap(_ url: URL, kind: String, type: String, at: Date, saved: Bool = false) {
        guard let path = plugin?.bridge?.portablePath(fromLocalURL: url)?.absoluteString else { return call.reject("Kayıt okunamadı") }
        call.resolve(["path": path, "kind": kind, "type": type, "name": url.lastPathComponent, "end": at.timeIntervalSince1970 * 1000, "saved": saved])
    }
}

// Kameranın üstünde büyük süre: sıfıra kalan (2:59) ya da sıfırdan beri (+1:35); durmuşsa sabit. Dokunuşları kameraya bırakır.
final class SayacKatmani: UIView {
    private let etiket = UILabel()
    private let ust = UILabel()
    private var zaman: Timer?
    private let end: TimeInterval
    private let paused: Bool
    private let left: Int

    init(frame: CGRect, end: TimeInterval, paused: Bool, left: Int, title: String) {
        self.end = end
        self.paused = paused
        self.left = left
        super.init(frame: frame)
        isUserInteractionEnabled = false
        autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let kutu = UIView()
        kutu.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        kutu.layer.cornerRadius = 16
        kutu.translatesAutoresizingMaskIntoConstraints = false
        addSubview(kutu)
        ust.text = title
        ust.font = .systemFont(ofSize: 13, weight: .semibold)
        ust.textColor = UIColor.white.withAlphaComponent(0.8)
        etiket.font = .monospacedDigitSystemFont(ofSize: 44, weight: .bold)
        etiket.textColor = .white
        let yigin = UIStackView(arrangedSubviews: [ust, etiket])
        yigin.axis = .vertical
        yigin.alignment = .center
        yigin.translatesAutoresizingMaskIntoConstraints = false
        kutu.addSubview(yigin)
        NSLayoutConstraint.activate([
            kutu.centerXAnchor.constraint(equalTo: centerXAnchor),
            kutu.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 64),
            yigin.leadingAnchor.constraint(equalTo: kutu.leadingAnchor, constant: 18),
            yigin.trailingAnchor.constraint(equalTo: kutu.trailingAnchor, constant: -18),
            yigin.topAnchor.constraint(equalTo: kutu.topAnchor, constant: 6),
            yigin.bottomAnchor.constraint(equalTo: kutu.bottomAnchor, constant: -6),
        ])
        guncelle()
        if !paused {
            let t = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.guncelle() }
            RunLoop.main.add(t, forMode: .common)
            zaman = t
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) yok") }

    func dur() {
        zaman?.invalidate()
        zaman = nil
    }

    private static func mmss(_ s: Int) -> String { String(format: "%d:%02d", s / 60, s % 60) }

    private func guncelle() {
        if paused {
            etiket.text = SayacKatmani.mmss(max(0, left))
            return
        }
        let kalan = end - Date().timeIntervalSince1970
        etiket.text = kalan > 0 ? SayacKatmani.mmss(Int(ceil(kalan))) : "+" + SayacKatmani.mmss(Int(-kalan))
        etiket.textColor = kalan > 0 && kalan <= 60 ? UIColor(red: 1, green: 0.45, blue: 0.4, alpha: 1) : .white
    }
}

// Çekilen videonun aslı iPhone'un Fotoğraflar'ına (yalnız ekleme izni)
enum Fotograflar {
    static func kaydet(_ url: URL) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { durum in
            guard durum == .authorized || durum == .limited else { return }
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
            }) { ok, err in
                if !ok { NSLog("[kamera] Fotoğraflar'a kaydedilemedi: \(String(describing: err))") }
            }
        }
    }
}

// Buluta gidecek kopya: en çok enCokPx (uzun kenar), bit hızı süreye göre enCokBayt'a sığacak kadar (en çok enCokBps), H.264 + ses (AAC).
// Donanım kodlayıcıyla videodan kısa sürer. Yön (dikey/yatay) korunur.
enum VideoKopya {
    enum Hata: Error { case iz, okuma, yazma(String) }

    static func hazirla(_ src: URL, _ dst: URL, enCokBayt: Int, enCokBps: Int, enCokPx: CGFloat) async throws {
        try? FileManager.default.removeItem(at: dst)
        let asset = AVURLAsset(url: src)
        let sure = try await asset.load(.duration).seconds
        guard let vt = try await asset.loadTracks(withMediaType: .video).first else { throw Hata.iz }
        let at = try await asset.loadTracks(withMediaType: .audio).first
        let boy = try await vt.load(.naturalSize)
        let yon = try await vt.load(.preferredTransform)
        let k = min(1, enCokPx / max(boy.width, boy.height, 1))
        let w = Int((boy.width * k / 2).rounded()) * 2
        let h = Int((boy.height * k / 2).rounded()) * 2
        let sigan = sure > 0 ? Int(Double(enCokBayt * 8) / sure * 0.88) - 160_000 : enCokBps
        let bps = max(1_000_000, min(enCokBps, sigan))

        let yazar = try AVAssetWriter(outputURL: dst, fileType: .mp4)
        yazar.shouldOptimizeForNetworkUse = true
        let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: w,
            AVVideoHeightKey: h,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bps,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoMaxKeyFrameIntervalKey: 60,
            ],
        ])
        vIn.transform = yon
        vIn.expectsMediaDataInRealTime = false
        guard yazar.canAdd(vIn) else { throw Hata.yazma("video") }
        yazar.add(vIn)

        let okur = try AVAssetReader(asset: asset)
        let vOut = AVAssetReaderTrackOutput(track: vt, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
        vOut.alwaysCopiesSampleData = false
        guard okur.canAdd(vOut) else { throw Hata.okuma }
        okur.add(vOut)

        // Ses: okunabilir ve yazılabilirse ikisi birden eklenir (biri eksik kalırsa okuma takılmasın diye)
        var ses: (AVAssetReaderTrackOutput, AVAssetWriterInput)?
        if let at {
            let o = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
            let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVNumberOfChannelsKey: 2,
                AVSampleRateKey: 44_100,
                AVEncoderBitRateKey: 128_000,
            ])
            i.expectsMediaDataInRealTime = false
            if okur.canAdd(o), yazar.canAdd(i) {
                okur.add(o)
                yazar.add(i)
                ses = (o, i)
            }
        }

        guard okur.startReading() else { throw okur.error ?? Hata.okuma }
        guard yazar.startWriting() else { throw yazar.error ?? Hata.yazma("başlat") }
        yazar.startSession(atSourceTime: .zero)

        let kuyruk = DispatchQueue(label: "velora.video.kopya")
        await withTaskGroup(of: Void.self) { g in
            g.addTask { await aktar(vOut, vIn, kuyruk) }
            if let ses { g.addTask { await aktar(ses.0, ses.1, kuyruk) } }
        }
        if okur.status == .failed { yazar.cancelWriting(); throw okur.error ?? Hata.okuma }
        await yazar.finishWriting()
        if yazar.status != .completed { throw yazar.error ?? Hata.yazma("bitir") }
    }

    private static func aktar(_ out: AVAssetReaderTrackOutput, _ inp: AVAssetWriterInput, _ q: DispatchQueue) async {
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            var bitti = false
            inp.requestMediaDataWhenReady(on: q) {
                if bitti { return }
                while inp.isReadyForMoreMediaData {
                    guard let b = out.copyNextSampleBuffer(), inp.append(b) else {
                        bitti = true
                        inp.markAsFinished()
                        c.resume()
                        return
                    }
                }
            }
        }
    }
}
