import { formatCOP, formatDate, PAYMENT_METHODS } from "@/lib/format";
import { companyLogoSrc } from "@/lib/branding";

export type ThermalReceiptLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  lineTotal: number;
};

export type ThermalReceiptCompany = {
  name: string;
  nit: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
} | null;

export type ThermalReceiptParty = {
  name: string;
  nit: string;
};

export type ThermalReceiptProps = {
  title: string;
  number: string;
  dateLabel: string;
  dateValue: Date | string | null;
  company: ThermalReceiptCompany;
  party: ThermalReceiptParty;
  items: ThermalReceiptLine[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  notes?: string | null;
  paymentMethod?: string | null;
  extraLine?: string | null;
  /** Paper width mm; default 80 */
  widthMm?: 58 | 80;
};

function paymentLabel(method?: string | null): string | null {
  if (!method) return null;
  return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
}

/** Narrow HTML receipt for thermal printers (80mm / 58mm). Print-only styling. */
export function ThermalReceipt(props: ThermalReceiptProps) {
  const widthMm = props.widthMm === 58 ? 58 : 80;
  const companyName = props.company?.name || "Buñuelandia";
  const logoSrc = companyLogoSrc(props.company?.logoUrl);
  const pay = paymentLabel(props.paymentMethod);

  return (
    <div className="thermal-receipt" data-width={widthMm}>
      <style>{`
        @page {
          size: ${widthMm}mm auto;
          margin: 2mm;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
        }
        .thermal-receipt {
          width: ${widthMm}mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 2mm;
          font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", Menlo, Consolas, monospace;
          font-size: ${widthMm === 58 ? "10px" : "11px"};
          line-height: 1.35;
          color: #000;
          background: #fff;
          box-sizing: border-box;
        }
        .thermal-receipt * { box-sizing: border-box; }
        .thermal-receipt .center { text-align: center; }
        .thermal-receipt .bold { font-weight: 700; }
        .thermal-receipt .muted { opacity: 0.85; }
        .thermal-receipt .logo {
          display: block;
          margin: 0 auto 4px;
          max-width: ${widthMm === 58 ? "28mm" : "32mm"};
          max-height: ${widthMm === 58 ? "28mm" : "32mm"};
          object-fit: contain;
        }
        .thermal-receipt hr {
          border: none;
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .thermal-receipt .row {
          display: flex;
          justify-content: space-between;
          gap: 4px;
        }
        .thermal-receipt .item { margin-bottom: 6px; }
        .thermal-receipt .item-desc { word-break: break-word; }
        .thermal-receipt .totals .row { margin: 2px 0; }
        .thermal-receipt .total-line { font-size: 1.15em; font-weight: 700; margin-top: 4px; }
        .thermal-screen-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin: 16px auto;
          max-width: 320px;
          padding: 0 12px;
        }
        .thermal-screen-actions button,
        .thermal-screen-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid #0b3d2e;
          background: #0b3d2e;
          color: #fff;
        }
        .thermal-screen-actions a.secondary {
          background: #fff;
          color: #0b3d2e;
        }
        @media print {
          .thermal-screen-actions { display: none !important; }
          .thermal-receipt {
            width: ${widthMm}mm;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" className="logo" />
      <div className="center bold">{companyName}</div>
      {props.company?.nit ? (
        <div className="center muted">NIT: {props.company.nit}</div>
      ) : null}
      {props.company?.address ? (
        <div className="center muted">{props.company.address}</div>
      ) : null}
      {props.company?.phone ? (
        <div className="center muted">Tel: {props.company.phone}</div>
      ) : null}

      <hr />
      <div className="center bold">{props.title}</div>
      <div className="center bold" style={{ fontSize: "1.15em" }}>
        {props.number}
      </div>
      <div>
        {props.dateLabel}: {formatDate(props.dateValue)}
      </div>
      {pay ? <div>Pago: {pay}</div> : null}
      {props.extraLine ? <div>{props.extraLine}</div> : null}

      <hr />
      <div className="bold">Cliente</div>
      <div>{props.party.name}</div>
      <div className="muted">CC/NIT: {props.party.nit}</div>

      <hr />
      {props.items.map((item, idx) => (
        <div className="item" key={idx}>
          <div className="item-desc">{item.description}</div>
          <div className="row">
            <span>
              {item.quantity} x {formatCOP(item.unitPrice)}
            </span>
            <span>{formatCOP(item.lineTotal)}</span>
          </div>
        </div>
      ))}

      <hr />
      <div className="totals">
        <div className="row">
          <span>Subtotal</span>
          <span>{formatCOP(props.subtotal)}</span>
        </div>
        <div className="row">
          <span>IVA</span>
          <span>{formatCOP(props.ivaTotal)}</span>
        </div>
        <div className="row total-line">
          <span>TOTAL</span>
          <span>{formatCOP(props.total)}</span>
        </div>
      </div>

      {props.notes ? (
        <>
          <hr />
          <div className="muted">Notas: {props.notes}</div>
        </>
      ) : null}

      <hr />
      <div className="center">¡Gracias por su compra!</div>
    </div>
  );
}
