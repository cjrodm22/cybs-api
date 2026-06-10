# CYBS API

Mini backend local para pruebas de integración con CyberSource / Visa.

El objetivo del proyecto es comprender y probar el consumo de endpoints de CyberSource desde Node.js, iniciando con HTTP Signature y preparando la futura migración a JWT y Message-Level Encryption (MLE).

## Tecnologías

- Node.js
- TypeScript
- Express
- Axios
- dotenv
- CORS
- tsx

## Estructura sugerida

```txt
cybs-api/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   ├── invoice.routes.ts
│   │   └── payment.routes.ts
│   ├── controllers/
│   │   ├── invoice.controller.ts
│   │   └── payment.controller.ts
│   ├── services/
│   │   ├── invoice.service.ts
│   │   └── payment.service.ts
│   ├── cybs/
│   │   ├── httpSignature.ts
│   │   └── cybsClient.ts
│   └── config/
│       └── env.ts
├── certs/
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

## Variables de entorno

El proyecto utiliza variables de entorno para almacenar la configuración de CyberSource.

Crear un archivo `.env` basado en `.env.example`.

Ejemplo:

```env
PORT=3000
NODE_ENV=development

CYBS_HOST=apitest.cybersource.com
CYBS_MERCHANT_ID=
CYBS_KEY_ID=
CYBS_SHARED_SECRET=
```

## Hallazgos durante la integración

### HTTP Signature

- GET no requiere header `digest`.
- POST requiere header `digest`.
- El `request-target` debe incluir query params cuando existan.
- El digest debe generarse utilizando el body final que será enviado a CyberSource.
- Variables dinámicas en Postman (por ejemplo `{{$guid}}`) pueden generar firmas inválidas si el digest se calcula antes de resolver las variables.
- El `sharedSecret` debe decodificarse desde Base64 antes de generar la firma HMAC SHA256.

### Invoices

#### Create Invoice

- El endpoint permite crear facturas en estado Draft o Sent dependiendo de la configuración enviada.
- Los identificadores dinámicos de productos deben resolverse antes de generar el digest.

#### Delivery

- CyberSource requiere enviar un body mínimo:

```json
{}
```

- En algunos casos fue necesario agregar el header:

```http
Connection: close
```

para evitar que la petición quedara abierta indefinidamente.

#### Cancelation

- El endpoint utiliza el número de factura (`invoiceNumber`) como identificador.
- La operación se realiza mediante:

```http
POST /invoicing/v2/invoices/{id}/cancelation
```

### Payments

#### Authorization

- Genera un `paymentId` que será utilizado posteriormente para operaciones de captura, reversa o devolución.
  -El pago puede ser enviado con autorización y captura en un solo paso enviando "capture": true en el objeto: "processingInformation"

#### Increment an Authorization

- Utilice este servicio para autorizar cargos adicionales en una transacción relacionada con el alojamiento o el alquiler de vehículos.
- Incluya el identificador (ID) proporcionado en la autorización original en la solicitud PATCH para añadir cargos adicionales a dicha autorización.

#### Reversal

- Revierte una autorización.
- El `paymentId` debe manejarse como `string`.
- No convertir el identificador a `number`.
- El body debe enviarse desde `req.body`.

#### Capture

- Permite convertir una autorización en una transacción capturada para liquidación.
- Endpoint:

```http
POST /pts/v2/payments/{paymentId}/captures
```

#### Refund

- Refund a Payment y Refund a capture son operaciones diferentes.
- Refund a Payment solo reembolsa si la autorización y captura se solicitaron al mismo tiempo

- El endpoint utilizado es:

```http
POST /pts/v2/payments/{paymentId}/refunds
```

- Refund a capture permite el reembolso si la captura se realizó de forma independiente

- El endpoint utilizado es:

```http
POST /pts/v2/payments/captures/{paymentId}/refunds
```

#### Credit

- Credit no corresponde a un Refund.
- Credit permite enviar fondos directamente a una tarjeta sin referenciar una transacción previa.
- Endpoint:

```http
POST /pts/v2/credits
```

#### Void a Payment

- Se utiliza para cancelar una autorización y captura que fueron realizadas juntas

#### Void a Capture

- Se utiliza para cancelar una captura que fue realizar por separado de la autorización

#### Void a Refund

- Se utiliza para cancelar una reembolso de una venta.

#### Void a credits

- Se utiliza para cancelar un credito a una tarjeta.

## Estado actual del proyecto

### Invoices

- [x] Get invoices
- [x] Get invoice detail
- [x] Create invoice
- [x] Delivery invoice
- [x] Cancelation invoice
- [x] Publication invoice

### Payments

- [x] Authorization
- [x] Reversal
- [x] Refund
- [x] Credit
- [x] Captures
- [x] Voids

### Próximos pasos

- [ ] JWT Authentication
- [ ] Message-Level Encryption (MLE)
- [ ] Migración de HTTP Signature a JWT
