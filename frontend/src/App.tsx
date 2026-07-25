import { useState } from "react";
import { API_BASE_URL } from "./api/http";
import { InvoiceFlow } from "./features/invoices/InvoiceFlow";
import { Non3DSPaymentFlow } from "./features/payments/Non3DSPaymentFlow";
import { PayerAuthFlow } from "./features/payer-auth/PayerAuthFlow";
import { useBackendHealth } from "./hooks/useBackendHealth";

type FlowType = "invoice" | "payment" | "3ds";

export default function App() {
  const [flowType, setFlowType] = useState<FlowType>("3ds");
  const [completedCount, setCompletedCount] = useState(0);
  const health = useBackendHealth();

  function selectFlow(nextFlow: FlowType) {
    if (nextFlow !== "3ds") setCompletedCount(0);
    setFlowType(nextFlow);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CyberSource 3DS Lab home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>CYBS</strong>
            <small>PAYMENT TEST LAB</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="environment-tag">SANDBOX</span>
          <span className={"health-dot " + health} aria-label={"Backend " + health} />
          <span className="api-label">{API_BASE_URL}</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="kicker">
              <span>Payment operations</span>
              <b>CyberSource sandbox</b>
            </p>
            <h1>
              CyberSource
              <br />
              <em>test console.</em>
            </h1>
            <p className="hero-copy">
              Create invoices, run direct authorizations, or inspect the
              complete 3DS browser authentication sequence from one controlled
              workspace.
            </p>
          </div>
          {flowType === "3ds" ? (
            <div className="flow-meter" aria-label={completedCount + " of 6 steps complete"}>
              <div className="meter-number">
                <span>{String(completedCount).padStart(2, "0")}</span>
                <small>/ 06</small>
              </div>
              <div className="meter-track">
                <i style={{ width: ((completedCount / 6) * 100) + "%" }} />
              </div>
              <p>FLOW COMPLETION</p>
            </div>
          ) : (
            <div className="selected-flow-summary">
              <span>ACTIVE FLOW</span>
              <strong>{flowType === "invoice" ? "INVOICE" : "CARD / NON-3DS"}</strong>
              <p>Single-operation test</p>
            </div>
          )}
        </section>

        <nav className="flow-selector" aria-label="Transaction Type">
          <div>
            <span>TRANSACTION TYPE</span>
            <strong>Select a test flow</strong>
          </div>
          <div className="flow-tabs" role="tablist">
            <button role="tab" aria-selected={flowType === "invoice"} className={flowType === "invoice" ? "selected" : ""} onClick={() => selectFlow("invoice")}>
              <b>01</b>
              <span>Create Invoice</span>
            </button>
            <button role="tab" aria-selected={flowType === "payment"} className={flowType === "payment" ? "selected" : ""} onClick={() => selectFlow("payment")}>
              <b>02</b>
              <span>Card Payment · non 3DS</span>
            </button>
            <button role="tab" aria-selected={flowType === "3ds"} className={flowType === "3ds" ? "selected" : ""} onClick={() => selectFlow("3ds")}>
              <b>03</b>
              <span>Card Payment · 3DS</span>
            </button>
          </div>
        </nav>

        {flowType === "invoice" && <InvoiceFlow />}
        {flowType === "payment" && <Non3DSPaymentFlow />}
        {flowType === "3ds" && (
          <PayerAuthFlow onCompletedCountChange={setCompletedCount} />
        )}
      </main>

      <footer>
        <span>CYBERSOURCE SANDBOX · TECHNICAL TESTING ONLY</span>
        <span>NO CREDENTIALS OR CARD DATA ARE PERSISTED</span>
      </footer>
    </div>
  );
}
