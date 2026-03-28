import http from 'k6/http';
import { check, sleep } from 'k6';
import encoding from 'k6/encoding';

// 1. Configuración de la carga de integración
export let options = {
    vus: 5,             // 5 hilos concurrentes simulando usuarios
    duration: '15s',    // Prueba corta de validación de integración
    thresholds: {
        http_req_failed: ['rate<0.01'], // Tolerancia de fallo menor al 1%
    },
};


const CLIENT_ID = __ENV.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = __ENV.PAYPAL_SECRET;


const BASE_URL = 'https://api-m.sandbox.paypal.com';

export default function () {
    // =========================================================
    // ESCENARIO 1: Módulo de Autenticación (Obtener Token)
    // =========================================================
    // La arquitectura de PayPal exige codificar credenciales en Base64
    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    const encodedCredentials = encoding.b64encode(credentials);

    const authHeaders = {
        headers: {
            'Authorization': `Basic ${encodedCredentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };
    
    let authRes = http.post(`${BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', authHeaders);

    check(authRes, {
        'Autenticación OK (Status 200)': (r) => r.status === 200,
        'Token extraído correctamente': (r) => r.json('access_token') !== undefined,
    });

    // =========================================================
    // ESCENARIO 2: Módulo de Órdenes (Crear Transacción)
    // =========================================================
    let accessToken = authRes.json('access_token');

    // Validación de seguridad: Solo continuamos si el módulo anterior respondió bien
    if (accessToken) {
        const orderPayload = JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
                amount: { currency_code: "USD", value: "150.00" } // Transacción de prueba
            }]
        });

        const orderHeaders = {
            headers: {
                'Content-Type': 'application/json',
                // Optimización: Request Chaining (Inyección dinámica del token)
                'Authorization': `Bearer ${accessToken}`, 
            },
        };

        let orderRes = http.post(`${BASE_URL}/v2/checkout/orders`, orderPayload, orderHeaders);

        check(orderRes, {
            'Integración: Orden creada (Status 201)': (r) => r.status === 201,
            'ID de orden retornado': (r) => r.json('id') !== undefined,
        });
    }

    sleep(1);
}