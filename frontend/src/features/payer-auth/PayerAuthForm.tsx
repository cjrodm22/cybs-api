import type { FormValues } from "./types";

interface PayerAuthFormProps {
  form: FormValues;
  runningFlow: boolean;
  active: boolean;
  onUpdate: (key: keyof FormValues, value: string) => void;
  onRun: () => void;
  onReset: () => void;
}

export function PayerAuthForm({
  form,
  runningFlow,
  active,
  onUpdate,
  onRun,
  onReset,
}: PayerAuthFormProps) {
  return (
    <aside className="input-panel">
      <div className="section-heading">
        <span>01 / INPUT</span>
        <h2>Test parameters</h2>
      </div>
    
      <fieldset>
        <legend>Transaction</legend>
        <div className="field-row split-wide">
          <label>
            Amount
            <input
              value={form.amount}
              onChange={(event) =>
                onUpdate("amount", event.target.value)
              }
              inputMode="decimal"
            />
          </label>
          <label>
            Currency
            <input
              value={form.currency}
              onChange={(event) =>
                onUpdate(
                  "currency",
                  event.target.value.toUpperCase(),
                )
              }
              maxLength={3}
            />
          </label>
        </div>
      </fieldset>
    
      <fieldset>
        <legend>Cardholder</legend>
        <div className="field-row">
          <label>
            First name
            <input
              value={form.firstName}
              onChange={(event) =>
                onUpdate("firstName", event.target.value)
              }
              autoComplete="given-name"
            />
          </label>
          <label>
            Last name
            <input
              value={form.lastName}
              onChange={(event) =>
                onUpdate("lastName", event.target.value)
              }
              autoComplete="family-name"
            />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              onUpdate("email", event.target.value)
            }
            autoComplete="email"
          />
        </label>
        <label>
          Country (ISO 2)
          <input
            value={form.country}
            onChange={(event) =>
              onUpdate(
                "country",
                event.target.value.toUpperCase(),
              )
            }
            maxLength={2}
            autoComplete="country"
          />
        </label>
      </fieldset>
    
      <fieldset>
        <legend>Payment instrument</legend>
        <label>
          Card brand
          <select
            value={form.cardType}
            onChange={(event) =>
              onUpdate("cardType", event.target.value)
            }
          >
            <option value="001">Visa · 001</option>
            <option value="002">Mastercard · 002</option>
            <option value="003">
              American Express · 003
            </option>
          </select>
        </label>
        <label>
          Sandbox card number
          <input
            type="password"
            value={form.cardNumber}
            onChange={(event) =>
              onUpdate("cardNumber", event.target.value)
            }
            inputMode="numeric"
            autoComplete="off"
            placeholder="•••• •••• •••• ••••"
          />
        </label>
        <div className="field-row expiration-row">
          <label>
            Exp. month
            <input
              value={form.expirationMonth}
              onChange={(event) =>
                onUpdate(
                  "expirationMonth",
                  event.target.value,
                )
              }
              inputMode="numeric"
              maxLength={2}
            />
          </label>
          <label>
            Exp. year
            <input
              value={form.expirationYear}
              onChange={(event) =>
                onUpdate(
                  "expirationYear",
                  event.target.value,
                )
              }
              inputMode="numeric"
              maxLength={4}
            />
          </label>
        </div>
        <p className="security-note">
          <span>◆</span> PAN is kept in memory only, redacted from
          logs, and cleared after payment.
        </p>
      </fieldset>
    
      <fieldset>
        <legend>Challenge callback</legend>
        <label>
          ngrok return URL
          <input
            type="url"
            value={form.returnUrl}
            onChange={(event) =>
              onUpdate("returnUrl", event.target.value)
            }
            placeholder="https://example.ngrok-free.app/api/risk/return"
          />
        </label>
      </fieldset>
    
      <div className="primary-actions">
        <button
          className="primary-button"
          onClick={onRun}
          disabled={runningFlow || active}
        >
          <span>
            {runningFlow ? "RUNNING FLOW" : "RUN FULL FLOW"}
          </span>
          <b>→</b>
        </button>
        <button
          className="text-button"
          onClick={onReset}
          disabled={runningFlow}
        >
          Reset session
        </button>
      </div>
    </aside>
  );
}

