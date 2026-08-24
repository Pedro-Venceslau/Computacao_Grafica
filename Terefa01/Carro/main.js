const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL 2 não é suportado.");


const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform vec2 uTranslation;
uniform vec2 uScale;
void main() {
    vec2 position = aPosition * uScale + uTranslation;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() {
    outColor = uColor;
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
const translationLocation = gl.getUniformLocation(program, "uTranslation");
const scaleLocation = gl.getUniformLocation(program, "uScale");
const colorLocation = gl.getUniformLocation(program, "uColor");

// Quadrado unitário (-1 a 1) 
const squareVertices = new Float32Array([
    -1,  1,   1,  1,   1, -1,
    -1,  1,  -1, -1,   1, -1
]);

// Círculo unitário — triângulos saindo do centro
function createCircleVertices(sides) {
    const vertices = [0, 0]; // centro
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        vertices.push(Math.cos(angle), Math.sin(angle));
    }
    return new Float32Array(vertices);
}
const circleVertices = createCircleVertices(32);
const circleVertexCount = 34; // centro + 32 lados + fechamento

const squareBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);

const circleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);

function drawShape(buffer, vertexCount, mode, translation, scale, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2fv(translationLocation, translation);
    gl.uniform2fv(scaleLocation, scale);
    gl.uniform4fv(colorLocation, color);

    gl.drawArrays(mode, 0, vertexCount);
}

gl.clearColor(0.9, 0.9, 0.9, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.useProgram(program);

// Carroceria (retângulo maior, embaixo)
drawShape(squareBuffer, 6, gl.TRIANGLES, [0.0, -0.2], [0.6, 0.25], [0.2, 0.4, 0.9, 1.0]);

// Cabine (retângulo menor, centralizado em cima)
drawShape(squareBuffer, 6, gl.TRIANGLES, [0.0, 0.15], [0.3, 0.2], [0.2, 0.4, 0.9, 1.0]);

// Rodas: pneu preto por fora + roda cinza por dentro
function drawWheel(x, y) {
    drawShape(circleBuffer, circleVertexCount, gl.TRIANGLE_FAN, [x, y], [0.15, 0.15], [0.05, 0.05, 0.05, 1.0]);
    drawShape(circleBuffer, circleVertexCount, gl.TRIANGLE_FAN, [x, y], [0.08, 0.08], [0.6, 0.6, 0.6, 1.0]);
}

drawWheel(-0.35, -0.4);
drawWheel(0.35, -0.4);