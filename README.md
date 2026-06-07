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

## Notas importantes:

- GET no firma digest.
- POST sí firma digest.
- request-target debe incluir query params si existen.
- Si el body usa variables, se debe firmar el body ya resuelto.
- Para Invoice Delivery usar body: {}
- Para Invoice Delivery agregar header: Connection: close
