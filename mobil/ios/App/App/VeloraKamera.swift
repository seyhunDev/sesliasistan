import AVFoundation
import Capacitor
import Photos
import PhotosUI
import UIKit
import UniformTypeIdentifiers

// iPhone kamerası, üstünde akan sayaçla (web: src/features/raceMedia/RecPick.jsx). Seyhun 2026-10-22: "video çekilirken kalan süreyi
// görmedim, keşke görebilseydim". Kamera uygulamanın içinde açıldığı için Dynamic Island'daki sayaç görünmüyordu; burada iPhone'un
// kendi kamera ekranının (UIImagePickerController) üstüne büyük süre yazılır. Dokunuşlar kameraya geçer.
// Girdi: end (ms, sayacın sıfır anı; 0 = sayaç yok), paused, left (sn, durmuşsa), title.
// Sonuç: { path (web'in okuyabileceği adres), kind: photo | video, type, end (ms, kaydın bittiği an), asset (videonun Fotoğraflar'daki
// kimliği; Velora'dan silinince oradan da silinir, photosDelete) } ya da { cancel: true }
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
        // Seyhun 2026-10-28: "videoyu çektim, galeriye gittim, bomboş". Kopya hazırlanırken Medya'da hemen "Kaydediliyor" karesi görünsün
        plugin?.notifyListeners("cameraTaken", data: ["kind": info[.mediaURL] != nil ? "video" : "photo"])
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
                Task {
                    async let kimlik = Fotograflar.kaydet(asil)
                    let kucuk = tmp.appendingPathComponent("\(ad).mp4")
                    var hazir = true
                    do {
                        try await VideoKopya.hazirla(asil, kucuk, enCokBayt: 55 * 1024 * 1024, enCokBps: 5_000_000, enCokPx: 1920)
                    } catch {
                        NSLog("[kamera] kopya hazırlanamadı: \(error)")
                        hazir = false
                    }
                    let asset = await kimlik
                    if hazir {
                        self.cevap(kucuk, kind: "video", type: "video/mp4", at: at, saved: asset != nil, asset: asset)
                    } else {
                        self.cevap(asil, kind: "video", type: ext == "mp4" ? "video/mp4" : "video/quicktime", at: at, saved: asset != nil, asset: asset)
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
    // Seyhun 2026-10-26: "Kayıt uygulamaya alınamadı" (#825'ten sonra da). Sayfa canlı siteden (https) açık; capacitor:// adresindeki
    // dosyayı fetch ile okumak WebView'de düşüyor. Dosya artık adresle değil, eklentiden parça parça okunur (cameraRead).
    private func cevap(_ url: URL, kind: String, type: String, at: Date, saved: Bool = false, asset: String? = nil) {
        let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
        let path = plugin?.bridge?.portablePath(fromLocalURL: url)?.absoluteString ?? ""
        var r: [String: Any] = ["file": url.path, "size": size, "path": path, "kind": kind, "type": type, "name": url.lastPathComponent, "end": at.timeIntervalSince1970 * 1000, "saved": saved]
        if let asset { r["asset"] = asset }
        call.resolve(r)
    }
}

// Çekilen dosyanın bir parçası (base64). Girdi: file (camera'nın verdiği), offset, length. Son parçada dosya silinir.
// Yalnız geçici klasördeki velora- dosyaları okunur.
extension VeloraPlugin {
    @objc func cameraRead(_ call: CAPPluginCall) {
        let file = call.getString("file", "")
        let offset = call.getInt("offset", 0)
        let length = min(max(call.getInt("length", 0), 1), 8 * 1024 * 1024)
        let tmp = FileManager.default.temporaryDirectory.standardizedFileURL.path
        let url = URL(fileURLWithPath: file).standardizedFileURL
        guard url.path.hasPrefix(tmp), url.lastPathComponent.hasPrefix("velora-") else { return call.reject("Dosya okunamaz") }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let h = try FileHandle(forReadingFrom: url)
                defer { try? h.close() }
                try h.seek(toOffset: UInt64(offset))
                let data = try h.read(upToCount: length) ?? Data()
                let done = data.count < length
                if done { try? FileManager.default.removeItem(at: url) }
                call.resolve(["data": data.base64EncodedString(), "done": done])
            } catch {
                call.reject("Kayıt okunamadı: \(error.localizedDescription)")
            }
        }
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

// Çekilen videonun aslı iPhone'un Fotoğraflar'ına (yalnız ekleme izni). Sonuç Fotoğraflar'daki kimliği (kaydedilemezse nil).
enum Fotograflar {
    static func kaydet(_ url: URL) async -> String? {
        let durum = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard durum == .authorized || durum == .limited else { return nil }
        final class Kutu: @unchecked Sendable { var id: String? }
        let kimlik = Kutu()
        do {
            try await PHPhotoLibrary.shared().performChanges {
                kimlik.id = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)?.placeholderForCreatedAsset?.localIdentifier
            }
            return kimlik.id
        } catch {
            NSLog("[kamera] Fotoğraflar'a kaydedilemedi: \(error)")
            return nil
        }
    }

    // Seyhun 2026-10-26: Velora'dan silinen video Fotoğraflar'dan da silinsin. iPhone silmeden önce kendisi sorar ("Silinsin mi?").
    // Okuma izni ilk seferde istenir; "Sınırlı erişim"de de Velora'nın kaydettikleri görünür. Bulunamayan (elle silinmiş) atlanır.
    static func sil(_ kimlikler: [String]) async -> Int {
        let durum = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        guard durum == .authorized || durum == .limited else { return -1 }
        let bul = PHAsset.fetchAssets(withLocalIdentifiers: kimlikler, options: nil)
        guard bul.count > 0 else { return 0 }
        do {
            try await PHPhotoLibrary.shared().performChanges { PHAssetChangeRequest.deleteAssets(bul) }
            return bul.count
        } catch {
            NSLog("[kamera] Fotoğraflar'dan silinmedi: \(error)")
            return 0
        }
    }
}

// Girdi: ids (Fotoğraflar kimlikleri, camera sonucundaki asset). Sonuç { deleted } (-1: izin yok, 0: silinmedi ya da vazgeçildi)
extension VeloraPlugin {
    @objc func photosDelete(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") as? [String] ?? []).filter { !$0.isEmpty }
        if ids.isEmpty { return call.resolve(["deleted": 0]) }
        Task { call.resolve(["deleted": await Fotograflar.sil(ids)]) }
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

// Galeriden video (Seyhun 2026-11-08 "galerimde zaten var, iki defa kullanmaya gerek yok"; web: LiveVideos.jsx, nativeIos.js):
// galleryPick Fotoğraflar seçicisini açar (çoklu, yalnız video), videonun kopyasını almaz; her seçilen için { asset (Fotoğraflar
// kimliği), dur (sn), at (çekim anı, ms), th (küçük resim, JPEG data adresi) } döner. Sonuç { items, miss } ya da { cancel: true };
// miss: "Sınırlı erişim"de okunamayan seçim sayısı. Okuma izni ilk seferde istenir.
// galleryOpen({ asset }) oynatmak ya da YouTube'a yüklemek için geçici dosya hazırlar (camera sonucuyla aynı biçim; web cameraRead ile
// okur, son parçada dosya silinir). 250 MB'tan büyük video 1080p, en çok 250 MB kopyaya küçültülür (web'de bellekte tutulacak).
extension VeloraPlugin {
    @objc func galleryPick(_ call: CAPPluginCall) {
        Task { @MainActor in
            let durum = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            guard durum == .authorized || durum == .limited else { return call.reject("Fotoğraflar'a erişim izni yok. Ayarlar › Velora › Fotoğraflar") }
            guard let vc = self.bridge?.viewController else { return call.reject("Seçici açılamadı") }
            var c = PHPickerConfiguration(photoLibrary: .shared())
            c.filter = .videos
            c.selectionLimit = 0
            c.preferredAssetRepresentationMode = .current
            let p = PHPickerViewController(configuration: c)
            let y = GaleriYonetici(call: call)
            p.delegate = y
            GaleriYonetici.etkin = y
            vc.present(p, animated: true)
        }
    }

    @objc func galleryOpen(_ call: CAPPluginCall) {
        let kimlik = call.getString("asset", "")
        Task {
            let durum = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            guard durum == .authorized || durum == .limited else { return call.reject("Fotoğraflar'a erişim izni yok") }
            guard let a = PHAsset.fetchAssets(withLocalIdentifiers: [kimlik], options: nil).firstObject else { return call.reject("Video Fotoğraflar'da bulunamadı") }
            let kaynaklar = PHAssetResource.assetResources(for: a)
            guard let r = kaynaklar.first(where: { $0.type == .fullSizeVideo }) ?? kaynaklar.first(where: { $0.type == .video }) else { return call.reject("Video okunamadı") }
            let tmp = FileManager.default.temporaryDirectory
            let ad = "velora-g\(Int(Date().timeIntervalSince1970 * 1000))"
            let ext = (r.originalFilename as NSString).pathExtension.lowercased()
            let asil = tmp.appendingPathComponent("\(ad)-asil.\(ext.isEmpty ? "mov" : ext)")
            try? FileManager.default.removeItem(at: asil)
            let o = PHAssetResourceRequestOptions()
            o.isNetworkAccessAllowed = true // iCloud'daki video indirilir
            do {
                try await PHAssetResourceManager.default().writeData(for: r, toFile: asil, options: o)
            } catch {
                return call.reject("Video okunamadı: \(error.localizedDescription)")
            }
            let at = a.creationDate ?? Date()
            let boyut = (try? FileManager.default.attributesOfItem(atPath: asil.path)[.size] as? NSNumber)?.intValue ?? 0
            let sinir = 250 * 1024 * 1024
            if boyut > sinir {
                let kucuk = tmp.appendingPathComponent("\(ad).mp4")
                do {
                    try await VideoKopya.hazirla(asil, kucuk, enCokBayt: sinir, enCokBps: 8_000_000, enCokPx: 1920)
                    try? FileManager.default.removeItem(at: asil)
                    return self.galeriCevap(call, kucuk, type: "video/mp4", at: at)
                } catch {
                    NSLog("[galeri] küçültülemedi: \(error)")
                }
            }
            self.galeriCevap(call, asil, type: ext == "mp4" ? "video/mp4" : "video/quicktime", at: at)
        }
    }

    private func galeriCevap(_ call: CAPPluginCall, _ url: URL, type: String, at: Date) {
        let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
        call.resolve(["file": url.path, "size": size, "kind": "video", "type": type, "name": url.lastPathComponent, "end": at.timeIntervalSince1970 * 1000])
    }
}

final class GaleriYonetici: NSObject, PHPickerViewControllerDelegate {
    static var etkin: GaleriYonetici?
    let call: CAPPluginCall

    init(call: CAPPluginCall) {
        self.call = call
    }

    func picker(_ p: PHPickerViewController, didFinishPicking sonuclar: [PHPickerResult]) {
        p.dismiss(animated: true)
        GaleriYonetici.etkin = nil
        let kimlikler = sonuclar.compactMap { $0.assetIdentifier }
        if sonuclar.isEmpty { return call.resolve(["cancel": true]) }
        let call = self.call
        DispatchQueue.global(qos: .userInitiated).async {
            let bul = PHAsset.fetchAssets(withLocalIdentifiers: kimlikler, options: nil)
            var sira: [String: PHAsset] = [:]
            bul.enumerateObjects { a, _, _ in sira[a.localIdentifier] = a }
            let o = PHImageRequestOptions()
            o.isSynchronous = true
            o.deliveryMode = .highQualityFormat
            o.resizeMode = .fast
            o.isNetworkAccessAllowed = true
            var items: [[String: Any]] = []
            for k in kimlikler {
                guard let a = sira[k] else { continue }
                var th = ""
                PHImageManager.default().requestImage(for: a, targetSize: CGSize(width: 480, height: 480), contentMode: .aspectFill, options: o) { img, _ in
                    if let d = img?.jpegData(compressionQuality: 0.7) { th = "data:image/jpeg;base64," + d.base64EncodedString() }
                }
                items.append(["asset": k, "dur": Int(a.duration.rounded()), "at": (a.creationDate ?? Date()).timeIntervalSince1970 * 1000, "th": th])
            }
            call.resolve(["items": items, "miss": sonuclar.count - items.count])
        }
    }
}
