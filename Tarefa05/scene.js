// ==================================================
// CLASS - SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl, program);

        this.helicopterBody = new HelicopterBody();
        this.helicopterTopShaft = new HelicopterTopShaft();
        this.helicopterTail = new HelicopterTail();
        this.helicopterPropellers = new HelicopterPropellers();
        this.helicopterTailPropeller = new HelicopterTailPropeller();

        // ----------------------------------------------------
        // POSIÇÃO DO HELICÓPTERO (controlada pelas setas)
        // ----------------------------------------------------
        this.posX = 0.0;
        this.posY = 0.0;
        this.posZ = 0.0;
        this.velocidade = 0.02;
        this.limite = 0.8; // trava para não sair da tela

        // ----------------------------------------------------
        // ÂNGULOS DE ROTAÇÃO DAS HÉLICES (giram continuamente)
        // ----------------------------------------------------
        this.anguloHeliceSuperior = 0.0;
        this.anguloHeliceCauda = 0.0;
        this.velocidadeHeliceSuperior = 0.3;
        this.velocidadeHeliceCauda = 0.5;

        // Posição aproximada do eixo da hélice de cauda,
        // com base nos vértices dela (não fica na origem)
        this.hubCaudaX = 0.7;
        this.hubCaudaY = 0.0;
        this.hubCaudaZ = 0.06;

        this.teclasPressionadas = {};
        this.configurarTeclado();
    }

    configurarTeclado() {
        window.addEventListener("keydown", (event) => {
            this.teclasPressionadas[event.key] = true;
        });
        window.addEventListener("keyup", (event) => {
            this.teclasPressionadas[event.key] = false;
        });
    }

    moverHelicoptero() {
        if (this.teclasPressionadas["ArrowUp"])    this.posY += this.velocidade;
        if (this.teclasPressionadas["ArrowDown"])  this.posY -= this.velocidade;
        if (this.teclasPressionadas["ArrowLeft"])  this.posX -= this.velocidade;
        if (this.teclasPressionadas["ArrowRight"]) this.posX += this.velocidade;

        this.posX = Math.max(-this.limite, Math.min(this.limite, this.posX));
        this.posY = Math.max(-this.limite, Math.min(this.limite, this.posY));
    }

    update() {

        this.moverHelicoptero();

        this.anguloHeliceSuperior += this.velocidadeHeliceSuperior;
        this.anguloHeliceCauda += this.velocidadeHeliceCauda;

        // Corpo, haste e cauda: rígidos, só seguem a posição
        const transformCorpo = m4.translation(this.posX, this.posY, this.posZ);
        this.helicopterBody.update(transformCorpo);
        this.helicopterTopShaft.update(transformCorpo);
        this.helicopterTail.update(transformCorpo);

        // Hélice superior: já centralizada na origem -> gira em Y e segue a posição
        let transformHeliceSuperior = m4.yRotation(this.anguloHeliceSuperior);
        transformHeliceSuperior = m4.translate(transformHeliceSuperior, this.posX, this.posY, this.posZ);
        this.helicopterPropellers.update(transformHeliceSuperior);

        // Hélice de cauda: leva o eixo pra origem -> gira -> devolve -> segue a posição
        let transformHeliceCauda = m4.translation(-this.hubCaudaX, -this.hubCaudaY, -this.hubCaudaZ);
        transformHeliceCauda = m4.zRotate(transformHeliceCauda, this.anguloHeliceCauda);
        transformHeliceCauda = m4.translate(transformHeliceCauda, this.hubCaudaX, this.hubCaudaY, this.hubCaudaZ);
        transformHeliceCauda = m4.translate(transformHeliceCauda, this.posX, this.posY, this.posZ);
        this.helicopterTailPropeller.update(transformHeliceCauda);
    }

    draw() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        this.helicopterBody.draw(this.renderer);
        this.helicopterTopShaft.draw(this.renderer);
        this.helicopterTail.draw(this.renderer);
        this.helicopterPropellers.draw(this.renderer);
        this.helicopterTailPropeller.draw(this.renderer);
    }

    execute() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.execute());
    }

    init() {
        requestAnimationFrame(() => this.execute());
    }
}