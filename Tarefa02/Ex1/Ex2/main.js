const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL 2 não é suportado.");

// --------------------------------------------------
// PALETA DE CORES (teclas 0 a 9) — igual ao exercício 1
// --------------------------------------------------
const colorPalette = [
    [1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0],
    [1.0, 1.0, 0.0], [1.0, 0.0, 1.0], [0.0, 1.0, 1.0],
    [1.0, 0.5, 0.0], [0.5, 0.0, 0.5], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0]
];
let currentColor = [0.0, 0.0, 1.0]; // azul, cor inicial

// --------------------------------------------------
// SHADERS — igual ao exercício 1
// --------------------------------------------------
const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec3 aColor;
out vec3 vColor;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 2.0;
    vColor = aColor;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;
void main() {
    outColor = vec4(vColor, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getAttribLocation(program, "aColor");

const verticesBuffer = gl.createBuffer();
const colorsBuffer = gl.createBuffer();

// --------------------------------------------------
// ALGORITMO DE BRESENHAM — igual ao exercício 1
// --------------------------------------------------
function bresenhamLine(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;

    let p = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
        points.push({ x, y });
        if (x === x1 && y === y1) break;
        const p2 = 2 * p;
        if (p2 > -dy) { p -= dy; x += sx; }
        if (p2 < dx) { p += dx; y += sy; }
    }
    return points;
}

// --------------------------------------------------
// NOVO: TRAÇAR TRIÂNGULO (3 chamadas de bresenhamLine)
// --------------------------------------------------
function bresenhamTriangle(p1, p2, p3) {
    const edge1 = bresenhamLine(p1.x, p1.y, p2.x, p2.y);
    const edge2 = bresenhamLine(p2.x, p2.y, p3.x, p3.y);
    const edge3 = bresenhamLine(p3.x, p3.y, p1.x, p1.y);
    return edge1.concat(edge2, edge3); // junta os pixels das 3 arestas
}

// --------------------------------------------------
// CONVERSÃO pixel -> WebGL — igual ao exercício 1
// --------------------------------------------------
function pixelToWebGL(x, y) {
    const webglX = (x / canvas.width) * 2 - 1;
    const webglY = -((y / canvas.height) * 2 - 1);
    return [webglX, webglY];
}

// --------------------------------------------------
// ESTADO DO PROGRAMA
// --------------------------------------------------
let mode = "line"; // "line" ou "triangle"
let currentPixels = bresenhamLine(300, 300, 300, 300); // linha inicial (0,0)-(0,0)
let clicks = []; // guarda os cliques acumulados do modo atual

// --------------------------------------------------
// DESENHO — igual ao exercício 1
// --------------------------------------------------
function uploadAndDraw() {
    const vertices = [];
    const colors = [];

    for (const point of currentPixels) {
        const [wx, wy] = pixelToWebGL(point.x, point.y);
        vertices.push(wx, wy);
        colors.push(currentColor[0], currentColor[1], currentColor[2]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(0.1, 0.1, 0.1, 1.0); // "apaga" a figura anterior
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, currentPixels.length);
}

// --------------------------------------------------
// MOUSE — número de cliques necessários depende do modo
// --------------------------------------------------
canvas.addEventListener("mousedown", (event) => {
    const x = event.offsetX;
    const y = event.offsetY;
    clicks.push({ x, y });

    const clicksNeeded = (mode === "line") ? 2 : 3;

    if (clicks.length === clicksNeeded) {
        if (mode === "line") {
            currentPixels = bresenhamLine(clicks[0].x, clicks[0].y, clicks[1].x, clicks[1].y);
        } else {
            currentPixels = bresenhamTriangle(clicks[0], clicks[1], clicks[2]);
        }
        uploadAndDraw();
        clicks = []; // reinicia a contagem para a próxima figura
    }
});

// --------------------------------------------------
// TECLADO — troca de modo (r/t) e cor (0-9)
// --------------------------------------------------
window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "r") {
        mode = "line";
        clicks = []; // descarta cliques pendentes do outro modo
    } else if (key === "t") {
        mode = "triangle";
        clicks = [];
    } else {
        const index = parseInt(event.key, 10);
        if (!isNaN(index) && index >= 0 && index <= 9) {
            currentColor = colorPalette[index];
            uploadAndDraw(); // redesenha a figura atual com a nova cor
        }
    }
});

// --------------------------------------------------
// DESENHO INICIAL
// --------------------------------------------------
uploadAndDraw();