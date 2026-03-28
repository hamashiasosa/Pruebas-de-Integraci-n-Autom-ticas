import http from 'k6/http';
import { check, sleep } from 'k6';

// Paso 2: Escenario de prueba (100 usuarios simultáneos)
export let options = {
    vus: 100,           // 100 usuarios virtuales concurrentes
    duration: '30s',    // Mantenidos durante 30 segundos
    thresholds: {
        http_req_duration: ['p(95)<500'], // El 95% debe responder en menos de 500ms
        http_req_failed: ['rate<0.01'],   // Margen de error menor al 1%
    },
};

// Paso 5: Personalización mediante Variables de Entorno
// Si no se pasa una variable al ejecutar, usará la URL por defecto.
const BASE_URL = __ENV.API_URL || 'https://test-api.k6.io/public/crocodiles/';

export default function () {
    // Petición HTTP GET
    let res = http.get(BASE_URL);
    
    // Validaciones
    check(res, {
        'status was 200': (r) => r.status === 200,
        'tiempo de respuesta menor a 1s': (r) => r.timings.duration < 1000,
    });
    
    // Simulación de tiempo de lectura del usuario
    sleep(1);
}