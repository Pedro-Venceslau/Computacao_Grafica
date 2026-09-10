const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// VERTICES E CORES
// --------------------------------------------------

function verticesBarra(){
    return new Float32Array([
        -0.05,  0.2,
        -0.05, -0.2,
         0.05,  0.2,
         0.05,  0.2,
        -0.05, -0.2,
         0.05, -0.2
    ]);
}

function verticesBola(){
    let vertices = [];
    let numSegments = 30;
    let radius = 0.05;

    for (let i = 0; i < numSegments; i++) {
        let theta1 = (i / numSegments) * 2 * Math.PI;
        let theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0);
        vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
        vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
    }

    return new Float32Array(vertices);
}

let verticesBarraDireita = verticesBarra();
let corBarraDireita = new Float32Array([0.0, 0.0, 1.0]);

let verticesBarraEsquerda = verticesBarra();
let corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]);

let verticesBolaCentro = verticesBola();
let corBolaCentro = new Float32Array([1.0, 0.0, 0.0]);

// --------------------------------------------------
// DIMENSÕES (usadas no movimento e na colisão)
// --------------------------------------------------

const BARRA_X_ESQUERDA = -0.9;
const BARRA_X_DIREITA = 0.9;
const BARRA_METADE_ALTURA = 0.2; // vem dos vértices: 0.2 a -0.2
const BARRA_METADE_LARGURA = 0.05;
const BOLA_RAIO = 0.05;
const LIMITE_VERTICAL_BARRA = 1.0 - BARRA_METADE_ALTURA; // não deixa sair da tela
const VELOCIDADE_BARRA = 0.02;

// --------------------------------------------------
// TRANSFORMAÇÕES
// --------------------------------------------------

let MbarraEsquerda = m3.translation(BARRA_X_ESQUERDA, 0.0);
let MbarraDireita = m3.translation(BARRA_X_DIREITA, 0.0);
let MbolaCentro = m3.identity();

// --------------------------------------------------
// BUFFER
// --------------------------------------------------

const verticesBuffer = gl.createBuffer();

// --------------------------------------------------
// VERTEX SHADER
// --------------------------------------------------

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;
out vec3 vColor;
void main() {
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// --------------------------------------------------
// FRAGMENT SHADER
// --------------------------------------------------

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main() {
    outColor = vec4(uColor, 1.0);
}
`;

// --------------------------------------------------
// COMPILAR SHADERS
// --------------------------------------------------

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

// --------------------------------------------------
// LOCAL DOS ATRIBUTOS E DO UNIFORM
// --------------------------------------------------

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

// --------------------------------------------------
// LIMPAR TELA
// --------------------------------------------------

gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// DESENHAR
// --------------------------------------------------

const numComponents = 2;

function drawScene(){
    atualizaAnimacao();

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    drawBarraEsquerda();
    drawBarraDireita();
    drawBolaCentro();

    requestAnimationFrame(drawScene);
}

function drawBarraEsquerda(){
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBarraEsquerda, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBarraEsquerda);
    gl.uniformMatrix3fv(transformLocation, false, MbarraEsquerda);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBarraEsquerda.length / numComponents);
}

function drawBarraDireita(){
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBarraDireita, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBarraDireita);
    gl.uniformMatrix3fv(transformLocation, false, MbarraDireita);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBarraDireita.length / numComponents);
}

function drawBolaCentro(){
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBolaCentro, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBolaCentro);
    gl.uniformMatrix3fv(transformLocation, false, MbolaCentro);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBolaCentro.length / numComponents);
}

// --------------------------------------------------
// PARÂMETROS ANIMAÇÃO
// --------------------------------------------------

let tyBE = 0.0; // posição vertical da barra esquerda
let tyBD = 0.0; // posição vertical da barra direita
let txBola = 0.0;
let tyBola = 0.0;
let txBola_offset = 0.005;
let tyBola_offset = 0.005;

// --------------------------------------------------
// TECLADO — controle das barras
// --------------------------------------------------

const teclasPressionadas = {};

window.addEventListener("keydown", (event) => {
    teclasPressionadas[event.key] = true;
});

window.addEventListener("keyup", (event) => {
    teclasPressionadas[event.key] = false;
});

function moverBarras(){
    // Barra esquerda: W (sobe) / S (desce)
    if (teclasPressionadas["w"] || teclasPressionadas["W"]) {
        tyBE += VELOCIDADE_BARRA;
    }
    if (teclasPressionadas["s"] || teclasPressionadas["S"]) {
        tyBE -= VELOCIDADE_BARRA;
    }

    // Barra direita: seta pra cima / seta pra baixo
    if (teclasPressionadas["ArrowUp"]) {
        tyBD += VELOCIDADE_BARRA;
    }
    if (teclasPressionadas["ArrowDown"]) {
        tyBD -= VELOCIDADE_BARRA;
    }

    // Trava as barras dentro da tela (não deixa sair por cima/baixo)
    tyBE = Math.max(-LIMITE_VERTICAL_BARRA, Math.min(LIMITE_VERTICAL_BARRA, tyBE));
    tyBD = Math.max(-LIMITE_VERTICAL_BARRA, Math.min(LIMITE_VERTICAL_BARRA, tyBD));

    // Recalcula a matriz — X fixo, só Y muda (movimento só vertical)
    MbarraEsquerda = m3.translation(BARRA_X_ESQUERDA, tyBE);
    MbarraDireita = m3.translation(BARRA_X_DIREITA, tyBD);
}

// --------------------------------------------------
// COLISÃO — bola com as barras
// --------------------------------------------------

function checaColisaoComBarra(barraX, barraY){
    const dentroDoX = Math.abs(txBola - barraX) <= (BARRA_METADE_LARGURA + BOLA_RAIO);
    const dentroDoY = Math.abs(tyBola - barraY) <= (BARRA_METADE_ALTURA + BOLA_RAIO);
    return dentroDoX && dentroDoY;
}

// --------------------------------------------------
// ATUALIZA ANIMAÇÃO (chamado a cada frame)
// --------------------------------------------------

function atualizaAnimacao(){
    moverBarras();

    // Movimento horizontal da bola
    txBola += txBola_offset;

    // Colisão com a barra esquerda
    if (checaColisaoComBarra(BARRA_X_ESQUERDA, tyBE) && txBola_offset < 0) {
        txBola_offset = -txBola_offset;
    }

    // Colisão com a barra direita
    if (checaColisaoComBarra(BARRA_X_DIREITA, tyBD) && txBola_offset > 0) {
        txBola_offset = -txBola_offset;
    }

    // Se passou reto pela barra (ninguém rebateu), volta ao centro
    if (txBola > 1.0 || txBola < -1.0) {
        txBola = 0.0;
        tyBola = 0.0;
    }

    // Movimento vertical da bola (quica nas bordas de cima/baixo)
    tyBola += tyBola_offset;
    if (tyBola > 1.0 || tyBola < -1.0)
        tyBola_offset = -tyBola_offset;

    MbolaCentro = m3.translation(txBola, tyBola);
}

// --------------------------------------------------
// INÍCIO DO DESENHO
// --------------------------------------------------

drawScene();