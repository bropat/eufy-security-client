/**
 * Keyless decoder for eufy `v2_eufysecurity:` event / thumbnail images.
 *
 * The v2 wire format is NOT end-to-end encrypted and needs NO key, cipher, or
 * E2E private key. It is *head-only obfuscation*: only a small JPEG prefix
 * (~280-430 bytes, length varies per image) is AES-GCM encrypted (SOI +
 * APP0/JFIF + the two DQT quantization tables + SOF dimensions + the first DHT
 * table). Everything from the standard baseline DC-chrominance Huffman table
 * marker (`FF C4 00 1F 01`) onward — the rest of the DHT, the SOS, the entire
 * entropy-coded scan and the EOI — is left as plaintext, standard baseline JPEG.
 *
 * So we reconstruct a viewable JPEG by splicing a freshly built *standard*
 * libjpeg header (correct width/height + chroma subsampling) onto the blob's
 * plaintext tail. The encrypted prefix only ever held the quantization tables
 * (=> a small quality/colour shift if we substitute standard q85 tables) and
 * the image dimensions (=> the only thing that must be pinned exactly).
 *
 * Wire format:  v2_eufysecurity:<SERIAL>:<10-digit-pkt>:<binary-ciphertext>
 *
 * Reverse-engineered 2026-06-04; verified on 136 live blobs across every camera
 * model / resolution under HomeBase 3. On 2026-06-10 the reconstruction was
 * cross-checked against the app's OWN decoded output (carved from the running
 * app's heap): the keyless splice matches it, and push thumbnails are 288x176
 * 4:2:0 (other sizes — 256x144, 640x360, 4:4:4 snapshots — also occur, so the
 * geometry is auto-detected rather than assumed; see decodeV2ImageAuto).
 */

/** Standard baseline-JPEG DC-chrominance DHT marker — the first plaintext byte
 *  run in a v2 blob, and the splice point. */
const DC_CHROMA = Buffer.from([0xff, 0xc4, 0x00, 0x1f, 0x01]);

export const V2_PREFIX = "v2_eufysecurity:";

/**
 * Canonical standard libjpeg header (quality 85, 4:2:0), covering
 * SOI + APP0 + DQT(luma) + DQT(chroma) + SOF0 + DHT(DC-luma) + DHT(AC-luma).
 * It stops right before its own DC-chroma DHT, because the blob tail supplies
 * the DC-chroma + AC-chroma DHT, the SOS and the scan. Dimensions are a
 * placeholder (0x0101 x 0x0101) and the chroma sampling factor is patched at
 * runtime (see splice offsets below).
 */
const PREFIX_TEMPLATE = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb0043000503040404030504040405050506070c08070707070f0b0b090c110f1212110f111113161c1713141a1511111821181a1d1d1f1f1f13172224221e241c1e1f1effdb0043010505050706070e08080e1e1411141e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1effc00011080101010103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa",
  "hex"
);
// Byte offsets into PREFIX_TEMPLATE that we patch per image.
const OFF_HEIGHT = 163; // SOF0 height, big-endian uint16
const OFF_WIDTH = 165; //  SOF0 width,  big-endian uint16
const OFF_Y_SAMPLING = 169; // luma component sampling factor (0x22=4:2:0, 0x21=4:2:2, 0x11=4:4:4)
// Byte ranges of the two DQT tables (luma, chroma) within PREFIX_TEMPLATE, in the
// order jpeg-js reads them. Used to rescale the baked-in quality-85 tables (see
// buildJpegPrefix's qualityScale param).
const OFF_DQT_LUMA: [number, number] = [25, 89];
const OFF_DQT_CHROMA: [number, number] = [94, 158];

export type ChromaSubsampling = "4:2:0" | "4:2:2" | "4:4:4";
const Y_SAMPLING: Record<ChromaSubsampling, number> = { "4:2:0": 0x22, "4:2:2": 0x21, "4:4:4": 0x11 };

/** Build the standard JPEG header for a given geometry by patching the template.
 *  `qualityScale` rescales the baked-in quality-85 quantization tables — the encrypted
 *  header we can't recover held the camera's real tables, so this is a substitute; 1
 *  (default) keeps the original quality-85 tables byte-for-byte, unchanged from before. */
export function buildJpegPrefix(
  width: number,
  height: number,
  subsampling: ChromaSubsampling = "4:2:0",
  qualityScale = 1
): Buffer {
  const p = Buffer.from(PREFIX_TEMPLATE); // copy
  if (qualityScale !== 1) {
    for (const [start, end] of [OFF_DQT_LUMA, OFF_DQT_CHROMA]) {
      for (let i = start; i < end; i++) {
        p[i] = Math.max(1, Math.min(255, Math.round(PREFIX_TEMPLATE[i] * qualityScale)));
      }
    }
  }
  p.writeUInt16BE(height & 0xffff, OFF_HEIGHT);
  p.writeUInt16BE(width & 0xffff, OFF_WIDTH);
  p[OFF_Y_SAMPLING] = Y_SAMPLING[subsampling];
  return p;
}

/** Extract the binary ciphertext from a `v2_eufysecurity:SN:PKT:<binary>` blob. */
function v2Ciphertext(data: Buffer): Buffer | null {
  if (data.subarray(0, V2_PREFIX.length).toString("latin1") !== V2_PREFIX) return null;
  // Split on the first three colons only — the 4th field is raw binary that may contain 0x3a.
  let colon = 0;
  let idx = 0;
  for (let i = 0; i < data.length && colon < 3; i++) {
    if (data[i] === 0x3a) {
      colon++;
      idx = i + 1;
    }
  }
  return colon === 3 ? data.subarray(idx) : null;
}

/**
 * Reconstruct a viewable JPEG from a v2 blob at a *known* geometry.
 * Returns null if the input is not a v2 blob or has no plaintext tail.
 */
export function spliceV2Image(
  data: Buffer,
  width: number,
  height: number,
  subsampling: ChromaSubsampling = "4:2:0"
): Buffer | null {
  const ct = v2Ciphertext(data) ?? (data.indexOf(DC_CHROMA) >= 0 ? data : null);
  if (!ct) return null;
  const cut = ct.indexOf(DC_CHROMA);
  if (cut < 0) return null;
  return Buffer.concat([buildJpegPrefix(width, height, subsampling), ct.subarray(cut)]);
}

/** 16:9 then 4:3 size ladder, small→large, used for geometry auto-detection. */
const SIZE_LADDER: Array<[number, number]> = [
  [160, 90],
  [240, 135],
  [256, 144],
  [320, 180],
  [384, 216],
  [400, 225],
  [480, 270],
  [512, 288],
  [576, 324],
  [640, 360],
  [704, 396],
  [768, 432],
  [848, 480],
  [960, 540],
  [1024, 576],
  [1280, 720],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
  [176, 144],
  [320, 240],
  [352, 288],
  [480, 360],
  [640, 480],
  [800, 600],
  [1024, 768],
  [1280, 960],
];
const SUBSAMPLINGS: ChromaSubsampling[] = ["4:2:0", "4:4:4", "4:2:2"];
/**
 * Large captures (full-resolution snapshots, and combined dual-lens images that stack
 * two lens frames vertically into one tall picture) are much bigger than the small
 * single-lens motion thumbnail this module was originally verified against, so eufy
 * compresses them harder. Two effects follow, both gated on the detected image
 * exceeding LARGE_IMAGE_AREA_THRESHOLD so the small, already-verified thumbnail path
 * (256x144 = 36864px) is completely untouched:
 *
 *  - The baked-in quality-85 DQT tables are roughly 3.3x too fine for these larger
 *    images, collapsing contrast to a narrow grey band around 128 instead of using the
 *    full 0-255 range. LARGE_IMAGE_QUALITY_SCALE corrects for this (empirically tuned
 *    against real captures at ~522K and ~960K px).
 *  - The width search below needs a much wider net (see width refinement) — small
 *    thumbnails only ever drift a little from the nearest standard ladder size, but
 *    these larger/non-standard captures can land far from every ladder entry (observed:
 *    a stacked dual-lens frame at ~2x the true width, and a wide snapshot transposed).
 */
const LARGE_IMAGE_AREA_THRESHOLD = 100_000;
const LARGE_IMAGE_QUALITY_SCALE = 10 / 3;

/**
 * Decode a v2 blob WITHOUT knowing its dimensions, by brute-forcing the size
 * ladder and using `jpeg-js` (an optional, pure-JS, dynamically-imported
 * dependency) to find the geometry where the entropy-coded scan exactly fills
 * the frame (no premature-EOI fill) with the correct chroma subsampling.
 *
 * The fastest production path is to pass the dimensions from event metadata to
 * {@link spliceV2Image} directly and skip this brute-force entirely.
 *
 * @returns the reconstructed JPEG + detected geometry, or null if undetectable
 *          / `jpeg-js` is not installed.
 */
export async function decodeV2ImageAuto(data: Buffer): Promise<{
  jpeg: Buffer;
  width: number;
  height: number;
  subsampling: ChromaSubsampling;
  /** true when even the best geometry still looks like colour garbage (atypical/corrupt blob). */
  lowConfidence: boolean;
} | null> {
  let jpegDecode: (d: Buffer | Uint8Array, opts?: unknown) => { width: number; height: number; data: Uint8Array };
  try {
    // Indirect the specifier so TS/bundlers treat jpeg-js as a truly optional
    // runtime dependency (no static module-resolution / type requirement).
    const specifier = "jpeg-js";
    const mod: any = await import(specifier);
    jpegDecode = (mod.decode ?? mod.default?.decode).bind(mod);
  } catch {
    return null; // jpeg-js not available — caller should pass explicit dimensions
  }

  const ct = v2Ciphertext(data) ?? (data.indexOf(DC_CHROMA) >= 0 ? data : null);
  if (!ct) return null;
  const cut = ct.indexOf(DC_CHROMA);
  if (cut < 0) return null;
  const tail = ct.subarray(cut);

  let best: { jpeg: Buffer; width: number; height: number; subsampling: ChromaSubsampling; spread: number } | null =
    null;
  for (const subsampling of SUBSAMPLINGS) {
    let filled: { jpeg: Buffer; width: number; height: number; img: DecodedImage } | null = null;
    for (const [w, h] of SIZE_LADDER) {
      const jpeg = Buffer.concat([buildJpegPrefix(w, h, subsampling), tail]);
      let img: DecodedImage;
      try {
        img = jpegDecode(jpeg, { maxResolutionInMP: 100, maxMemoryUsageInMB: 512, tolerantDecoding: true });
      } catch {
        continue;
      }
      // "Filled" = the bottom 3% of rows carry real variation (not the grey
      //  0x80 premature-EOI fill). The LARGEST fully-filled frame is the
      //  correct geometry for this subsampling (a smaller frame also fills,
      //  just ignoring trailing scan data — so keep the max-area candidate,
      //  not merely the last one seen).
      if (rowsAreFilled(img) && (!filled || w * h > filled.width * filled.height)) {
        filled = { jpeg, width: w, height: h, img };
      }
    }
    if (!filled) continue;
    // A wrong chroma-subsampling guess misreads the chroma planes and produces
    // saturated colour speckle, so the natural decode is the one with the
    // lowest mean colour-spread |R-G|+|G-B|+|B-R|. (Outdoor scenes are nearly
    // grey/brown ⇒ low spread; garbage ⇒ high.)
    const spread = colorSpread(filled.img);
    if (!best || spread < best.spread) {
      best = { jpeg: filled.jpeg, width: filled.width, height: filled.height, subsampling, spread };
    }
  }
  if (!best) return null;

  // The SIZE_LADDER only holds standard resolutions, but eufy images often use
  // NON-standard dimensions — so the ladder lands on the nearest standard size and
  // is wrong in two ways that need different fixes:
  //
  //  • WIDTH (e.g. a 288 thumbnail snapped to the ladder's 256, or 1272 vs 1280):
  //    a wrong width shears every row. We find the true width by minimising
  //    row-to-row difference (shear raises it) over a ±25% band around the ladder
  //    guess. The per-image vdiff MINIMUM is reliable even for small detailed
  //    thumbnails — validated against the app's own 288x176 render (2026-06-10).
  //
  //  • HEIGHT (any size, e.g. 256×192 snapped to 256×144): the ladder height can be
  //    SHORTER than the real image, cutting off the bottom (the ladder frame still
  //    "fills" because its last row is mid-image). We always re-pin the height to
  //    where the scan actually ends — this is safe for everything (a true 256×144
  //    thumbnail's scan ends at 144, so it stays 144).
  {
    const ss = best.subsampling;
    const [mcw, mch] = MCU_SIZE[ss];
    // Large captures (see LARGE_IMAGE_AREA_THRESHOLD) get the corrected quality scale
    // AND a much wider width search — both gated the same way so the small,
    // already-verified thumbnail path is completely unaffected.
    const isLarge = best.width * best.height > LARGE_IMAGE_AREA_THRESHOLD;
    const qs = isLarge ? LARGE_IMAGE_QUALITY_SCALE : 1;
    const decodeAt = (w: number, h: number) => {
      try {
        return jpegDecode(Buffer.concat([buildJpegPrefix(w, h, ss, qs), tail]), {
          maxResolutionInMP: 400,
          maxMemoryUsageInMB: 1024,
          tolerantDecoding: true,
        });
      } catch {
        return null;
      }
    };

    // --- width refinement (all images) ---
    // eufy uses NON-standard widths (288, 552, 1272…) that aren't on the ladder,
    // so the ladder lands on the nearest standard width (256, 576, 1280) and the
    // error shears the image ("the content runs diagonally down"). The true width
    // minimises row-to-row difference. For small thumbnails the ladder is at most
    // ~12% off (256 vs the true 288), so a ±25% band around it is enough. Larger /
    // non-standard captures (full snapshots, combined dual-lens images) can land FAR
    // from every ladder entry — e.g. a stacked dual-lens frame was observed at exactly
    // 2x the true width, and a wide night snapshot was observed transposed (width and
    // height swapped) — so those get a wider ±50% net instead of a band anchored on a
    // guess that may already be badly wrong. The per-image vdiff MINIMUM is reliable
    // even for small detailed thumbnails (absolute vdiff is not comparable across
    // images, but the minimum within one image's sweep is).
    // NOTE: vdiff is systematically biased toward very narrow widths (adjacent decoded
    // rows become near-duplicate horizontal slices of the same true row, which is
    // smoother than genuine vertical row-to-row content) — the search must stay
    // bounded well clear of that degenerate region, not go unbounded.
    const area = best.width * best.height;
    let width = best.width;
    let bestV = Infinity;
    const band = isLarge ? 0.5 : 0.25;
    const lo = Math.max(mcw * 4, Math.round((best.width * (1 - band)) / mcw) * mcw);
    const hi = Math.round((best.width * (1 + band)) / mcw) * mcw;
    for (let w = lo; w <= hi; w += mcw) {
      const h = Math.min(2560, Math.max(mch * 2, Math.round(area / w / mch) * mch));
      const img = decodeAt(w, h);
      if (!img) continue;
      const fh = contentBottomRow(img);
      if (fh < mch * 2) continue;
      const v = verticalRowDiff(img, fh);
      if (v < bestV) {
        bestV = v;
        width = w;
      }
    }

    // --- height refinement (always) ---
    // At the correct width, a frame TALLER than the real image hits the embedded
    // EOI and the decode throws ("unexpected ffd9"); a frame ≤ the real height
    // decodes fine. So the true height is the largest non-throwing height —
    // binary-search it. (Some images instead pad the extra rows without throwing;
    // for those the search hits the cap and we trim to the content bottom below.)
    const HCAP = Math.ceil((isLarge ? 2560 : 2000) / mch);
    let loH = 1;
    let hiH = HCAP;
    let maxHm = 1;
    while (loH <= hiH) {
      const mid = (loH + hiH) >> 1;
      if (decodeAt(width, mid * mch)) {
        maxHm = mid;
        loH = mid + 1;
      } else {
        hiH = mid - 1;
      }
    }
    let height = maxHm * mch;
    if (maxHm >= HCAP) {
      // Decoder padded instead of throwing — trim to the real content bottom.
      const fin = decodeAt(width, height);
      if (fin) {
        const fh = contentBottomRow(fin);
        if (fh > mch) height = Math.ceil((fh + 1) / mch) * mch;
      }
    }

    if (width !== best.width || height !== best.height || qs !== 1) {
      best = {
        jpeg: Buffer.concat([buildJpegPrefix(width, height, ss, qs), tail]),
        width,
        height,
        subsampling: ss,
        spread: best.spread,
      };
    }
  }

  // A high colour-spread even on the best candidate means none of the geometries
  // produced a clean image (atypical/low-light/corrupt blob) — surface that so
  // callers can choose to skip rather than show garbage.
  const lowConfidence = best.spread > 70;
  return {
    jpeg: best.jpeg,
    width: best.width,
    height: best.height,
    subsampling: best.subsampling,
    lowConfidence,
  };
}

/** Luma MCU block dimensions per chroma-subsampling mode (used for width/height refinement). */
const MCU_SIZE: Record<ChromaSubsampling, [number, number]> = {
  "4:2:0": [16, 16],
  "4:2:2": [16, 8],
  "4:4:4": [8, 8],
};

/** Index of the lowest row that still carries real content (not the grey ~0x80
 *  premature-EOI fill). Used to pin the true image height. */
function contentBottomRow(img: DecodedImage): number {
  const { width, height, data } = img;
  for (let y = height - 1; y >= 0; y--) {
    let cnt = 0;
    for (let x = 0; x < width; x++) if (Math.abs(data[(y * width + x) * 4] - 128) > 6) cnt++;
    if (cnt > width * 0.04) return y;
  }
  return -1;
}

/** Mean vertical (row-to-row) luma difference over the filled region. A correct
 *  width keeps rows aligned (low); a wrong width shears each row (high). */
function verticalRowDiff(img: DecodedImage, fh: number): number {
  const { width, data } = img;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < fh - 1; y++) {
    for (let x = 0; x < width; x += 2) {
      sum += Math.abs(data[(y * width + x) * 4] - data[((y + 1) * width + x) * 4]);
      n++;
    }
  }
  return n ? sum / n : 1e9;
}

type DecodedImage = { width: number; height: number; data: Uint8Array };

function rowsAreFilled(img: DecodedImage): boolean {
  const { width, height, data } = img; // RGBA
  if (height < 4) return false;
  const startRow = Math.floor(height * 0.97);
  let nonFill = 0;
  let samples = 0;
  for (let y = startRow; y < height; y++) {
    let min = 255;
    let max = 0;
    for (let x = 0; x < width; x++) {
      const v = data[(y * width + x) * 4]; // R channel
      if (v < min) min = v;
      if (v > max) max = v;
      samples++;
    }
    if (max - min > 8) nonFill++;
  }
  return samples > 0 && nonFill > 0;
}

/** Mean per-pixel colour spread |R-G|+|G-B|+|B-R|. Natural (near-grey) scenes are
 *  low; a wrong chroma-subsampling guess yields saturated speckle and a high value. */
function colorSpread(img: DecodedImage): number {
  const { width, height, data } = img;
  const total = width * height || 1;
  let sum = 0;
  for (let p = 0; p < total; p += 2) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
  }
  return sum / Math.ceil(total / 2);
}
