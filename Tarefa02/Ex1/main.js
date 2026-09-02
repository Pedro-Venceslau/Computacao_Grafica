const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL 2 não é suportado.");

// --------------------------------------------------
// PALETA DE CORES (teclas 0 a 9)
// --------------------------------------------------
const colorPalette = [
    [1.0, 0.0, 0.0], // 0 vermelho
    [0.0, 1.0, 0.0], // 1 verde
    [0.0, 0.0, 1.0], // 2 azul
    [1.0, 1.0, 0.0], // 3 amarelo
    [1.0, 0.0, 1.0], // 4 magenta
    [0.0, 1.0, 1.0], // 5 ciano
    [1.0, 0.5, 0.0], // 6 laranja
    [0.5, 0.0, 0.5], // 7 roxo
    [1.0, 1.0, 1.0], // 8 branco
    [0.0, 0.0, 0.0]  // 9 preto
];
let currentColor = [0.0, 0.0, 1.0]; // azul, cor inicial pedida no exercício

// --------------------------------------------------
// SHADERS (mesma base do desenhador de pontos)
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
// ALGORITMO DE BRESENHAM (retas em qualquer direção)
// --------------------------------------------------
function bresenhamLine(x0, y0, x1, y1) {
    const points = [];

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1; // direção do passo em x (+1 ou -1)
    const sy = (y0 < y1) ? 1 : -1; // direção do passo em y (+1 ou -1)

    let p = dx - dy; // parâmetro de decisão (mesma ideia do slide, generalizada)
    let x = x0;
    let y = y0;

    while (true) {
        points.push({ x, y });
        if (x === x1 && y === y1) break;

        const p2 = 2 * p;
        if (p2 > -dy) {
            p -= dy;
            x += sx;
        }
        if (p2 < dx) {
            p += dx;
            y += sy;
        }
    }

    return points;
}

// --------------------------------------------------
// CONVERSÃO: pixel do canvas -> coordenada WebGL
// --------------------------------------------------
function pixelToWebGL(x, y) {
    const webglX = (x / canvas.width) * 2 - 1;
    const webglY = -((y / canvas.height) * 2 - 1);
    return [webglX, webglY];
}

// --------------------------------------------------
// ESTADO DA RETA ATUAL
// --------------------------------------------------
let currentPixels = bresenhamLine(300, 300, 300, 300); // linha inicial (0,0)-(0,0)
let clickStage = 0; // 0 = esperando primeiro clique, 1 = esperando segundo clique
let firstClick = null;

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

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, currentPixels.length);
}

// --------------------------------------------------
// INTERAÇÃO COM O MOUSE (dois cliques = uma reta)
// --------------------------------------------------
canvas.addEventListener("mousedown", (event) => {
    const x = event.offsetX;
    const y = event.offsetY;

    if (clickStage === 0) {
        firstClick = { x, y };
        clickStage = 1;
    } else {
        currentPixels = bresenhamLine(firstClick.x, firstClick.y, x, y);
        uploadAndDraw();
        clickStage = 0; // pronto pra próxima reta
    }
});

// --------------------------------------------------
// INTERAÇÃO COM O TECLADO (0-9 mudam a cor)
// --------------------------------------------------
window.addEventListener("keydown", (event) => {
    const index = parseInt(event.key, 10);
    if (!isNaN(index) && index >= 0 && index <= 9) {
        currentColor = colorPalette[index];
        uploadAndDraw(); // redesenha a reta atual com a nova cor
    }
});

// --------------------------------------------------
// DESENHO INICIAL
// --------------------------------------------------
uploadAndDraw();