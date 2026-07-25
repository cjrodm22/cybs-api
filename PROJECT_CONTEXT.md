## 1. Descripción general del proyecto

Este proyecto es un backend de pruebas para integración de pasarelas de pago, desarrollado en Node.js, Express y TypeScript.

Actualmente el proyecto integra principalmente CyberSource/Visa para:

* Invoices.
* Payments sin 3DS.
* Payer Authentication 3DS.
* Payments con 3DS.
* Persistencia de sesiones 3DS y pagos en PostgreSQL.
* Registro de pagos aprobados y denegados.
* Preparación para agregar una segunda pasarela: PowerTranz.

El proyecto está en fase de laboratorio/testing. No es todavía una implementación productiva ni debe tratarse como un checkout PCI final.

---

## 2. Stack técnico actual

Backend:

* Node.js
* Express
* TypeScript
* Axios
* PostgreSQL
* Docker Compose
* pgAdmin
* CyberSource REST API
* HTTP Signature Authentication

Base de datos:

* PostgreSQL 16 en Docker.
* pgAdmin en Docker.
* Tablas principales actuales:

  * `payer_auth_sessions`
  * `payments`

Desarrollo local:

* Backend corre en `http://localhost:3000`.
* PostgreSQL expuesto en `localhost:5432`.
* pgAdmin expuesto en `http://localhost:8080`.
* Para callbacks 3DS se usa `ngrok` en ambiente local.

---

## 3. Estructura general del backend

La estructura actual del proyecto sigue una separación por responsabilidades:

```txt
src/
├── config/
│   └── env.ts
│
├── controllers/
│   ├── Invoice/
│   │   └── invoice.controller.ts
│   │
│   ├── payer-auth/
│   │   └── payer.controller.ts
│   │
│   └── payment/
│       ├── payment.controller.ts
│       ├── payment-3ds.controller.ts
│       ├── capture.controller.ts
│       ├── reversal.controller.ts
│       ├── refund.controller.ts
│       ├── credits.controller.ts
│       └── void.controller.ts
│
├── cybs/
│   ├── cybsClient.ts
│   └── httpSignature.ts
│
├── database/
│   └── pool.ts
│
├── dtos/
│   ├── payer-auth.dto.ts
│   ├── payment.dto.ts
│   └── payment-3ds-auth.dto.ts
│
├── repositories/
│   ├── payer-auth.repository.ts
│   └── payment.repository.ts
│
├── routes/
│   ├── invoice.routes.ts
│   ├── payer.routes.ts
│   └── payment.routes.ts
│
├── services/
│   ├── Invoice/
│   │   └── invoice.service.ts
│   │
│   ├── payer-auth/
│   │   └── payer.service.ts
│   │
│   └── payment/
│       ├── payment.service.ts
│       ├── payment-3ds.service.ts
│       ├── capture.service.ts
│       ├── reversal.service.ts
│       ├── refund.service.ts
│       ├── credit.service.ts
│       └── void.service.ts
│
├── validators/
│   └── payment-3ds.validator.ts
│
└── server.ts
```

---

## 4. Configuración de TypeScript

Archivo actual recomendado: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": [
    "node_modules",
    "dist",
    "docker",
    "postgres",
    "pgadmin",
    "coverage"
  ]
}
```

---

## 5. Variables de entorno

El proyecto usa `.env`.

Variables relevantes:

```env
# app
PORT=3000
NODE_ENV=development

# database for backend Node
DB_HOST=localhost
DB_PORT=5432
DB_USER=cjrodm
DB_PASSWORD=123456
DB_NAME=cybs_db

# postgres docker
POSTGRES_USER=cjrodm
POSTGRES_PASSWORD=123456
POSTGRES_DB=cybs_db

# pgAdmin
PGADMIN_DEFAULT_EMAIL=admin@cybs.com
PGADMIN_DEFAULT_PASSWORD=admin123

# CyberSource
CYBS_HOST=apitest.cybersource.com
CYBS_MERCHANT_ID=
CYBS_KEY_ID=
CYBS_SHARED_SECRET=
```

Notas:

* El backend Node usa `DB_HOST=localhost` porque corre fuera de Docker.
* pgAdmin debe conectarse a PostgreSQL usando como host el nombre del servicio Docker, por ejemplo `cybs`.
* No hardcodear credenciales en código.
* No subir `.env` al repositorio.

---

## 6. Docker Compose actual

El proyecto usa PostgreSQL y pgAdmin en Docker.

Ejemplo funcional:

```yaml
services:
  cybs:
    image: postgres:16
    container_name: cybs-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./postgres:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4:8.14
    container_name: cybs-pgadmin
    restart: unless-stopped
    depends_on:
      - cybs
    ports:
      - "8080:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD}
    volumes:
      - cybs_pgadmin_data:/var/lib/pgadmin

volumes:
  cybs_pgadmin_data:
```

Importante:

* No usar `dpage/pgadmin4` sin tag porque puede fallar en algunos entornos.
* Se recomienda usar `dpage/pgadmin4:8.14`.
* En pgAdmin, para registrar el server PostgreSQL:

  * Host: `cybs`
  * Port: `5432`
  * Database: `cybs_db`
  * Username: `cjrodm`
  * Password: `123456`

---

## 7. CyberSource HTTP Signature

El proyecto usa autenticación HTTP Signature contra CyberSource.

Archivo principal:

```txt
src/cybs/httpSignature.ts
```

Los endpoints CyberSource requieren headers firmados:

* `host`
* `v-c-date`
* `request-target`
* `digest` para POST/PATCH con body
* `v-c-merchant-id`
* `signature`

El cliente Axios base está en:

```txt
src/cybs/cybsClient.ts
```

CyberSource sandbox host:

```txt
apitest.cybersource.com
```

---

## 8. Endpoints backend actuales

### Health check

```txt
GET /health
```

### Invoices

Base:

```txt
/api/invoices
```

Flujos probados:

* Crear invoice.
* Consultar invoices.
* Consultar invoice por ID.
* Delivery de invoice.
* Cancel/publish pueden estar pendientes o parcialmente implementados.

### Payments sin 3DS

Base:

```txt
/api/payments
```

Flujos probados:

* Payment simple / autorización.
* Capture.
* Reversal.
* Refund.
* Void / credits según servicios existentes.

### Payer Authentication 3DS

Base:

```txt
/api/risk
```

Endpoints principales:

```txt
POST /api/risk
POST /api/risk/authentications
POST /api/risk/authentication-results
POST /api/risk/return
```

Mapeo:

```txt
POST /api/risk
→ SetupPayerAuth
→ CyberSource: POST /risk/v1/authentication-setups

POST /api/risk/authentications
→ CheckEnrollmentPayerAuth
→ CyberSource: POST /risk/v1/authentications

POST /api/risk/authentication-results
→ ValidatePayerAuth
→ CyberSource: POST /risk/v1/authentication-results

POST /api/risk/return
→ handleChallengeReturnController
→ callback del challenge 3DS/Cardinal
```

### Payment con 3DS

Endpoint recomendado:

```txt
POST /api/payments/3ds
```

Este endpoint debe:

1. Recibir `payerAuthSessionId`.
2. Buscar los valores 3DS en PostgreSQL.
3. Validar ECI según marca.
4. Si el ECI es válido, construir el payment body de CyberSource automáticamente.
5. Enviar payment a CyberSource.
6. Guardar el resultado en `payments`.
7. Si el ECI no es válido, no enviar a CyberSource y guardar intento denegado internamente.

---

## 9. Flujo CyberSource Payer Authentication 3DS

El flujo probado manualmente con Postman y HTML es:

```txt
1. SetupPayerAuth
   ↓
2. Device Data Collection iframe oculto
   ↓
3. CheckEnrollment
   ↓
4. Si hay challenge, mostrar Step-Up iframe
   ↓
5. Cardinal/CyberSource hace POST al returnUrl
   ↓
6. Validate Authentication Result
   ↓
7. Payment 3DS
```

---

## 10. SetupPayerAuth

Endpoint local:

```txt
POST http://localhost:3000/api/risk
```

CyberSource endpoint:

```txt
POST /risk/v1/authentication-setups
```

Este endpoint retorna principalmente:

```txt
referenceId
accessToken
deviceDataCollectionUrl
status
```

Acción en BD:

* Crea el primer registro en `payer_auth_sessions`.
* Guarda `reference_id`.
* Guarda `raw_response`.
* Guarda status inicial.

---

## 11. Device Data Collection

Se probó inicialmente con un HTML manual.

Concepto:

* Se crea un iframe oculto.
* Se hace POST del JWT/accessToken al `deviceDataCollectionUrl`.
* Se espera un mensaje tipo:

```json
{
  "MessageType": "profile.completed",
  "SessionId": "...",
  "Status": true
}
```

Este paso debe automatizarse en frontend.

---

## 12. CheckEnrollment

Endpoint local:

```txt
POST http://localhost:3000/api/risk/authentications
```

CyberSource endpoint:

```txt
POST /risk/v1/authentications
```

Body importante:

```json
{
  "consumerAuthenticationInformation": {
    "referenceId": "REFERENCE_ID_DEL_SETUP",
    "returnUrl": "https://NGROK_URL/api/risk/return",
    "deviceChannel": "Browser"
  }
}
```

Notas:

* `returnUrl` debe ser HTTPS público.
* En local se usa `ngrok`.
* Cada vez que cambia la URL de ngrok se debe repetir el flujo desde cero.
* Este endpoint puede retornar:

  * Autenticación frictionless.
  * Challenge requerido.
  * Fallo o estado pendiente.

Acción en BD:

* Actualiza `payer_auth_sessions` usando `reference_id`.
* Guarda:

  * `authentication_transaction_id`
  * `status`
  * `eci`
  * `commerce_indicator`
  * `cavv`
  * `xid`
  * `ucaf_authentication_data`
  * `ucaf_collection_indicator`
  * `directory_server_transaction_id`
  * `raw_response`

---

## 13. Challenge Return

Endpoint local:

```txt
POST /api/risk/return
```

Con ngrok:

```txt
POST https://NGROK_URL/api/risk/return
```

Controller actual esperado:

```ts
export async function handleChallengeReturnController(req, res) {
  console.log("====== 3DS RETURN ======");
  console.log(req.body);

  return res.send(`
    <html>
      <body>
        <h2>3DS Challenge Completed</h2>
      </body>
    </html>
  `);
}
```

Importante:

* `server.ts` debe tener `express.urlencoded({ extended: true })`.
* Cardinal suele enviar el callback como `application/x-www-form-urlencoded`.
* El returnUrl no es el resultado final.
* El returnUrl solo confirma que el challenge terminó y normalmente devuelve `TransactionId`.

---

## 14. Validate Authentication Result

Endpoint local:

```txt
POST http://localhost:3000/api/risk/authentication-results
```

CyberSource endpoint:

```txt
POST /risk/v1/authentication-results
```

Body usa:

```json
{
  "consumerAuthenticationInformation": {
    "authenticationTransactionId": "TRANSACTION_ID"
  }
}
```

Acción en BD:

* Actualiza `payer_auth_sessions` usando `authentication_transaction_id`.
* Guarda resultado final de autenticación.
* Puede devolver `status: AUTHENTICATION_SUCCESSFUL` pero ECI no válido para payment seguro.

Ejemplo relevante observado:

```json
{
  "status": "AUTHENTICATION_SUCCESSFUL",
  "consumerAuthenticationInformation": {
    "indicator": "internet",
    "eciRaw": "07",
    "authenticationResult": "6",
    "authenticationStatusMsg": "Issuer unable to perform authentication",
    "eci": "07"
  }
}
```

Regla importante:

* Aunque el status sea `AUTHENTICATION_SUCCESSFUL`, si ECI es `07` para Visa, no debe enviarse como payment 3DS seguro.

---

## 15. Reglas ECI para Payment 3DS

Antes de enviar un payment 3DS a CyberSource, se deben validar los valores ECI según marca.

Reglas actuales:

```txt
Mastercard:
  ECI permitido: 01 o 02
  commerceIndicator esperado: spa
  campos requeridos:
    - ucafAuthenticationData
    - ucafCollectionIndicator
    - directoryServerTransactionId

Visa:
  ECI permitido: 05 o 06
  commerceIndicator esperado: vbv
  campos requeridos:
    - cavv
    - xid
    - directoryServerTransactionId

American Express:
  ECI permitido: 05 o 06
  commerceIndicator esperado: aesk
  campos requeridos:
    - cavv
    - xid
    - directoryServerTransactionId
```

Si el ECI no es válido:

* No enviar payment a CyberSource.
* Registrar intento en `payments`.
* `approval_code` debe quedar `null`.
* `message_response` debe ser `DENEGADO`.
* `denied_reason` debe guardar el motivo.

---

## 16. Payment 3DS recomendado

El frontend o Postman no deben mandar manualmente:

```txt
cavv
xid
ucafAuthenticationData
ucafCollectionIndicator
directoryServerTransactionId
commerceIndicator
```

El body ideal del endpoint backend debe ser:

```json
{
  "payerAuthSessionId": 1,
  "clientReferenceInformation": {
    "code": "PAYMENT-3DS-TEST-001"
  },
  "paymentInformation": {
    "card": {
      "number": "5200000000002805",
      "expirationMonth": "12",
      "expirationYear": "2029"
    }
  },
  "orderInformation": {
    "amountDetails": {
      "totalAmount": "10.00",
      "currency": "NIO"
    },
    "billTo": {
      "firstName": "Carlos",
      "lastName": "Rodriguez",
      "email": "cjrodm@outlook.es",
      "country": "NI"
    }
  }
}
```

El backend debe:

1. Buscar `payerAuthSessionId` en BD.
2. Validar ECI.
3. Construir internamente los campos 3DS.
4. Enviar payment a CyberSource solo si pasa validación.
5. Guardar el intento en `payments`.

---

## 17. DTOs relevantes

### Payer Auth DTO

```ts
export interface PayerAuthSessionDTO {
  referenceId?: string;
  authenticationTransactionId?: string;
  brand?: string;
  cardType?: string;
  eci?: string;
  commerceIndicator?: string;
  cavv?: string;
  xid?: string;
  ucafAuthenticationData?: string;
  ucafCollectionIndicator?: string;
  directoryServerTransactionId?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  rawResponse?: unknown;
}

export type CreatePayerAuthSessionDTO = PayerAuthSessionDTO;

export type UpdatePayerAuthSessionByReferenceIdDTO =
  PayerAuthSessionDTO & {
    referenceId: string;
  };

export type UpdatePayerAuthSessionByTransactionIdDTO =
  PayerAuthSessionDTO & {
    authenticationTransactionId: string;
  };
```

### Payment DTO

```ts
export interface CreatePaymentDTO {
  payerAuthSessionId: string | number;
  cybsPaymentId?: string | null;
  amount?: string | number;
  currency?: string;
  status?: string;
  responseCode?: string | null;
  approvalCode?: string | null;
  messageResponse?: "APROBADO" | "DENEGADO";
  deniedReason?: string | null;
  cardLastFour?: string | null;
  rawResponse?: unknown;
}

export interface Create3DSPaymentRequestDTO {
  payerAuthSessionId: string | number;

  clientReferenceInformation: {
    code: string;
  };

  paymentInformation: {
    card: {
      number: string;
      expirationMonth: string;
      expirationYear: string;
    };
  };

  orderInformation: {
    amountDetails: {
      totalAmount: string;
      currency: string;
    };
    billTo: {
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      address1?: string;
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
      phoneNumber?: string;
    };
  };
}
```

### Payment 3DS Auth DTO

```ts
export type PaymentBrand = "VISA" | "MASTERCARD" | "AMERICAN EXPRESS";

type Base3DSPaymentAuthDTO = {
  brand: PaymentBrand;
  directoryServerTransactionId: string;
  paSpecificationVersion?: string;
};

export type Visa3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "VISA";
  commerceIndicator: "vbv";
  cavv: string;
  xid: string;
  ucafAuthenticationData?: never;
  ucafCollectionIndicator?: never;
};

export type Amex3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "AMERICAN EXPRESS";
  commerceIndicator: "aesk";
  cavv: string;
  xid: string;
  ucafAuthenticationData?: never;
  ucafCollectionIndicator?: never;
};

export type Mastercard3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "MASTERCARD";
  commerceIndicator: "spa";
  ucafAuthenticationData: string;
  ucafCollectionIndicator: string;
  cavv?: never;
  xid?: never;
};

export type Secure3DSPaymentAuthDTO =
  | Visa3DSPaymentAuthDTO
  | Amex3DSPaymentAuthDTO
  | Mastercard3DSPaymentAuthDTO;
```

---

## 18. Repositories actuales

### payer-auth.repository.ts

Debe manejar:

```txt
createPayerAuthSession()
updatePayerAuthSessionByReferenceId()
updatePayerAuthSessionByTransactionId()
```

Responsabilidad:

* Insertar sesión inicial.
* Actualizar por `reference_id`.
* Actualizar por `authentication_transaction_id`.
* No debe hacer validaciones de negocio.
* Solo persistencia.

### payment.repository.ts

Debe manejar:

```txt
findPayerAuth3DSValuesBySessionId()
createPayment()
```

Responsabilidad:

* Buscar los valores 3DS desde `payer_auth_sessions`.
* Guardar intentos de pago en `payments`.
* No debe decidir si un pago es válido o no.
* La validación debe estar en `payment-3ds.validator.ts` o service.

---

## 19. Tabla payer_auth_sessions

Columnas esperadas:

```txt
id
reference_id
authentication_transaction_id
brand
card_type
eci
commerce_indicator
cavv
xid
ucaf_authentication_data
ucaf_collection_indicator
directory_server_transaction_id
status
amount
currency
raw_response
created_at
updated_at
```

Recomendado agregar si no existen:

```txt
authentication_result
authentication_status_msg
```

Porque `status` no siempre cuenta toda la historia. Por ejemplo, CyberSource puede devolver `AUTHENTICATION_SUCCESSFUL` con ECI 07 y mensaje `Issuer unable to perform authentication`.

---

## 20. Tabla payments

Columnas esperadas:

```txt
id
cybs_payment_id
payer_auth_session_id
amount
currency
status
response_code
approval_code
message_response
denied_reason
card_last_four
raw_response
created_at
```

Notas:

* `cybs_payment_id` debe permitir `NULL`, porque si el payment es rechazado internamente por ECI inválido, no se enviará a CyberSource.
* `approval_code` debe quedar `NULL` cuando sea denegado.
* `message_response` debe ser:

  * `APROBADO` si existe `approval_code`.
  * `DENEGADO` si no existe `approval_code`.
* `denied_reason` debe indicar por qué no se procesó.
* `card_last_four` puede guardarse para soporte.
* Nunca guardar tarjeta completa, CVV, expirationMonth ni expirationYear.

---

## 21. Seguridad y datos sensibles

Reglas obligatorias:

* No guardar número completo de tarjeta.
* No guardar CVV.
* No loguear número completo de tarjeta.
* No guardar datos de tarjeta en `raw_response`.
* Solo guardar últimos 4 dígitos de la tarjeta.
* Si se guarda algo relacionado a tarjeta, debe ser:

  * marca
  * BIN si CyberSource lo devuelve
  * last4
  * tipo de tarjeta
* No subir `.env`.
* No exponer secrets en frontend.
* Toda firma HTTP Signature debe hacerse en backend.
* El frontend nunca debe conocer `sharedSecret`, `keyId` ni credenciales de CyberSource.

---

## 22. Frontend solicitado

Se desea crear un frontend de laboratorio/UAT para automatizar las pruebas que actualmente se hacen con Postman y HTML manual.

Tecnología recomendada:

* React
* Vite
* TypeScript
* CSS simple o Tailwind opcional

El frontend debe consumir el backend existente.

URL backend local:

```txt
http://localhost:3000
```

---

## 23. Objetivo inicial del frontend

Crear una interfaz que permita:

1. Seleccionar pasarela:

   * CyberSource
   * PowerTranz en el futuro

2. Seleccionar flujo:

   * Payment sin 3DS.
   * Payment con 3DS.
   * Invoice.

3. Completar datos básicos:

   * Monto.
   * Moneda.
   * Nombre.
   * Apellido.
   * Email.
   * País.
   * Número de tarjeta.
   * Mes de expiración.
   * Año de expiración.
   * Tipo/marca si aplica.

4. Ejecutar flujo CyberSource 3DS completo:

   * SetupPayerAuth.
   * Device Data Collection.
   * CheckEnrollment.
   * Mostrar challenge si aplica.
   * Validate Authentication.
   * Payment 3DS.

5. Mostrar:

   * Estado de cada paso.
   * Response resumido.
   * `payerAuthSessionId`.
   * ECI.
   * commerceIndicator.
   * approvalCode.
   * messageResponse.
   * deniedReason.

---

## 24. Flujo frontend CyberSource 3DS esperado

El frontend debe automatizar este flujo:

```txt
Usuario llena formulario
  ↓
Frontend llama POST /api/risk
  ↓
Backend retorna accessToken + deviceDataCollectionUrl + referenceId
  ↓
Frontend crea iframe oculto para Device Data Collection
  ↓
Frontend espera profile.completed
  ↓
Frontend llama POST /api/risk/authentications
  ↓
Si no hay challenge y la autenticación es frictionless:
    → frontend llama POST /api/payments/3ds con payerAuthSessionId

Si hay challenge:
    → frontend muestra iframe visible
    → usuario completa reto
    → backend recibe /api/risk/return por ngrok
    → frontend permite llamar authentication-results
    → frontend llama POST /api/risk/authentication-results
    → frontend llama POST /api/payments/3ds con payerAuthSessionId
```

Nota:

* En la primera versión puede mantenerse un botón manual para “Validar authentication-results” después del challenge.
* No es obligatorio automatizar todo al 100% en la primera pantalla.
* Se puede hacer paso a paso con botones:

  * Step 1 Setup
  * Step 2 Device Collection
  * Step 3 Check Enrollment
  * Step 4 Challenge
  * Step 5 Validate
  * Step 6 Payment 3DS

---

## 25. Device Collection HTML lógico

El frontend debe crear dinámicamente un iframe oculto y enviar el JWT/accessToken:

```html
<iframe
  name="collectionIframe"
  width="10"
  height="10"
  style="display:none">
</iframe>

<form
  method="POST"
  target="collectionIframe"
  action="deviceDataCollectionUrl">
  <input type="hidden" name="JWT" value="accessToken" />
</form>
```

Debe escuchar `window.message` para detectar:

```json
{
  "MessageType": "profile.completed",
  "SessionId": "...",
  "Status": true
}
```

---

## 26. Step-Up Challenge HTML lógico

Cuando `CheckEnrollment` devuelva challenge, se debe usar el `accessToken` del enrollment, no el de Setup.

El frontend debe mostrar un iframe visible:

```html
<iframe
  name="stepUpIframe"
  width="390"
  height="400">
</iframe>

<form
  method="POST"
  target="stepUpIframe"
  action="https://centinelapistag.cardinalcommerce.com/V2/Cruise/StepUp">
  <input type="hidden" name="JWT" value="ACCESS_TOKEN_DEL_ENROLLMENT" />
  <input type="hidden" name="MD" value="test-md-001" />
</form>
```

---

## 27. Consideraciones ngrok

Para challenge local, el body de `CheckEnrollment` debe incluir:

```txt
returnUrl: https://NGROK_URL/api/risk/return
```

Notas:

* Si cambia el túnel de ngrok, hay que actualizar el returnUrl.
* Si cambia el returnUrl, se debe repetir el flujo desde Setup.
* No usar ngrok en producción.

---

## 28. PowerTranz como segunda pasarela

Se desea agregar PowerTranz como segunda opción de pago en el futuro.

No mezclar PowerTranz dentro de los servicios actuales de CyberSource.

Arquitectura recomendada:

```txt
Frontend
  ↓
POST /api/checkout/payment
  ↓
Checkout Orchestrator
  ↓
CyberSource Provider | PowerTranz Provider
```

El frontend debe eventualmente enviar algo como:

```json
{
  "gateway": "CYBERSOURCE",
  "flow": "3DS",
  "amount": "10.00",
  "currency": "NIO",
  "card": {},
  "billing": {}
}
```

o:

```json
{
  "gateway": "POWERTRANZ",
  "flow": "3DS",
  "amount": "10.00",
  "currency": "NIO",
  "card": {},
  "billing": {}
}
```

Pero en la primera versión del frontend, se puede consumir directamente:

```txt
/api/payments/3ds
/api/risk
/api/risk/authentications
/api/risk/authentication-results
```

PowerTranz puede agregarse después con su propio servicio:

```txt
src/services/powertranz/
```

---

## 29. Recomendación de arquitectura futura

Crear una capa checkout común:

```txt
src/
├── services/
│   ├── checkout/
│   │   └── checkout.service.ts
│   │
│   ├── cybersource/
│   │   ├── cybersource-payment.service.ts
│   │   ├── cybersource-payer-auth.service.ts
│   │   └── cybersource-invoice.service.ts
│   │
│   └── powertranz/
│       ├── powertranz-client.ts
│       ├── powertranz-payment.service.ts
│       └── powertranz-3ds.service.ts
│
├── controllers/
│   └── checkout.controller.ts
│
├── routes/
│   └── checkout.routes.ts
```

Pero por ahora no refactorizar agresivamente. Primero crear frontend funcional contra los endpoints actuales.

---

## 30. Instrucciones para Codex

Prioridad actual:

1. No romper backend existente.
2. Crear frontend React/Vite/TypeScript.
3. Consumir endpoints actuales.
4. Automatizar primero CyberSource 3DS.
5. No mover carpetas del backend sin autorización.
6. No cambiar nombres de endpoints sin autorización.
7. No modificar HTTP Signature.
8. No exponer credenciales en frontend.
9. No guardar ni mostrar tarjeta completa después de enviarla.
10. No loguear datos sensibles.

Primera tarea recomendada para Codex:

```txt
Create a React + Vite + TypeScript frontend for this backend.
The frontend must provide a CyberSource 3DS testing screen that executes:
SetupPayerAuth → Device Data Collection → CheckEnrollment → Challenge if required → Validate Authentication → Payment 3DS.
Use the current backend endpoints documented in PROJECT_CONTEXT.md.
Do not change backend logic unless strictly necessary.
```

---

## 31. Comportamiento esperado en la pantalla 3DS

La pantalla debe mostrar un panel de pasos:

```txt
Step 1: Setup Payer Authentication
Step 2: Device Data Collection
Step 3: Check Enrollment
Step 4: Challenge
Step 5: Validate Authentication
Step 6: Payment 3DS
```

Cada paso debe mostrar:

```txt
PENDING
RUNNING
SUCCESS
FAILED
```

También debe mostrar campos relevantes:

```txt
referenceId
payerAuthSessionId
authenticationTransactionId
status
eci
commerceIndicator
brand
challengeRequired
approvalCode
messageResponse
deniedReason
```

---

## 32. Recomendación visual para frontend

No se requiere diseño avanzado todavía. Crear una UI limpia tipo dashboard técnico:

* Layout de dos columnas:

  * Formulario a la izquierda.
  * Resultados y logs a la derecha.
* Card por cada paso.
* Botón para ejecutar flujo completo.
* Botones individuales para debug.
* Mostrar JSON response colapsable.
* Mostrar iframe de challenge solo cuando sea necesario.

---

## 33. Testing cards usadas

Tarjetas utilizadas en pruebas CyberSource sandbox:

```txt
Visa:
  type: 001
  commerceIndicator: vbv
  ECI esperado exitoso: 05 o 06

Mastercard:
  type: 002
  commerceIndicator: spa
  ECI esperado exitoso: 01 o 02

American Express:
  type: 003
  commerceIndicator: aesk
  ECI esperado exitoso: 05 o 06
```

Importante:

* No asumir que todo `AUTHENTICATION_SUCCESSFUL` permite payment.
* Validar ECI siempre.

---

## 34. Estado actual del proyecto

Al momento de este contexto:

* El backend ya fue probado con Postman.
* El commit actual representa un punto estable.
* Se probaron:

  * Invoices.
  * Payments sin 3DS.
  * Payment con 3DS.
  * Payer Authentication.
  * Persistencia en PostgreSQL.
  * pgAdmin funcional.
* El siguiente objetivo es frontend de pruebas.
* Más adelante se quiere agregar PowerTranz como segunda pasarela.
