import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { ArrowLeft, Printer } from "lucide-react";
import type { Place } from "../types";
import { CATEGORY } from "../lib/categories";
import { href, shareUrl } from "../lib/url";

/** Builds the QR code as SVG path data (no innerHTML), one 1×1 square per dark module. */
function qrPath(text: string): { d: string; size: number } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, size: n };
}

/** Printable sign: post it at a building so people can scan for directions to it. */
export function QrSign({ place }: { place: Place }) {
  const p = place.properties;
  const url = shareUrl(href.route(p.id));
  const { d, size } = useMemo(() => qrPath(url), [url]);
  const cat = CATEGORY[p.category];
  const Q = 4; // quiet zone, in modules
  return (
    <div className="qr-page">
      <div className="qr-toolbar no-print">
        <a className="btn" href={href.place(p.id)}><ArrowLeft size={16} aria-hidden /> Back</a>
        <button className="btn primary" onClick={() => window.print()}><Printer size={16} aria-hidden /> Print</button>
      </div>
      <article className="qr-sign" aria-label={`QR sign for ${p.name}`}>
        <p className="eyebrow" style={{ color: cat.color }}><cat.Icon size={16} aria-hidden /> {cat.label}</p>
        <h1 className="serif">{p.name}</h1>
        <svg
          className="qr"
          viewBox={`${-Q} ${-Q} ${size + 2 * Q} ${size + 2 * Q}`}
          role="img"
          aria-label={`QR code linking to directions to ${p.name}`}
          shapeRendering="crispEdges"
        >
          <rect x={-Q} y={-Q} width={size + 2 * Q} height={size + 2 * Q} fill="#fff" />
          <path d={d} fill="#141413" />
        </svg>
        <p className="qr-cta serif">Scan for walking directions</p>
        <p className="qr-url">{url}</p>
        <p className="qr-foot">BUPC Navi · open campus map of BU Polangui · no login</p>
      </article>
    </div>
  );
}
