export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.image('groundBase', 'assets/groundBase.png');
    this.load.spritesheet('miner', 'assets/miner.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('minerdown', 'assets/minerdown.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('spike', 'assets/spike.png');
    this.load.image('copper', 'assets/copper.png');
    this.load.image('silver', 'assets/silver.png');
    this.load.image('gold', 'assets/gold.png');
    this.load.spritesheet('bat', 'assets/bat.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    // --- RESET / FLAGS ---
    this.gameOver = false; // <--- importante: inicializar la bandera en create()
    // (siempre que reinicies la escena, create() se ejecuta y deja gameOver en false)

    this.gameWidth = this.scale.width;
    this.gameHeight = this.scale.height;
    this.groundY = this.gameHeight - 16;

    // Fondo
    this.background = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'background').setOrigin(0, 0);

    // Suelo visual
    this.groundBase = this.add.tileSprite(0, this.groundY + 16, this.gameWidth, 16, 'groundBase').setOrigin(0, 0);
    this.ground = this.add.tileSprite(0, this.groundY, this.gameWidth, 16, 'ground').setOrigin(0, 0);

    // Collider invisible del suelo
    this.groundCollider = this.physics.add.staticImage(this.gameWidth / 2, this.groundY + 8, null);
    this.groundCollider.displayWidth = this.gameWidth;
    this.groundCollider.displayHeight = 16;
    this.groundCollider.setVisible(false);
    this.groundCollider.refreshBody();

    // Jugador
    this.player = this.physics.add.sprite(50, this.groundY - 12, 'miner');
    this.player.setScale(1.5);
    this.player.body.setSize(10, 16);
    this.player.body.setOffset((18 * 1.5 - 20) / 2, 0);
    this.player.setGravityY(700);
    this.player.setCollideWorldBounds(true);
    this.player.y = this.groundCollider.y - (this.groundCollider.displayHeight / 2) - (this.player.displayHeight / 2);

    // Animaciones jugador
    this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('miner', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'down', frames: this.anims.generateFrameNumbers('minerdown', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    this.player.play('run');

    // Animación murciélago
    this.anims.create({ key: 'fly', frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.isSwipeDown = false;

    // Swipe touch
    this.input.on('pointerdown', (pointer) => { this.swipeStartY = pointer.y; });
    this.input.on('pointerup', (pointer) => {
      const deltaY = pointer.y - this.swipeStartY;
      if (Math.abs(deltaY) < 10) return;
      if (deltaY < 0) {
        if (this.player.body.blocked.down) {
          this.player.setVelocityY(-220);
          this.player.play('run', true);
          this.player.body.setSize(10, 16);
          this.player.body.setOffset((18 * 1.5 - 20) / 2, 0);
          this.isSwipeDown = false;
        }
      } else {
        this.isSwipeDown = true;
      }
    });

    // Grupos
    this.spikes = this.physics.add.group();
    this.minerals = this.physics.add.group();
    this.bats = this.physics.add.group();

    // Colisiones
    this.physics.add.collider(this.player, this.groundCollider);
    this.physics.add.collider(this.minerals, this.groundCollider);
    this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
    this.physics.add.overlap(this.player, this.minerals, this.collectMineral, null, this);
    this.physics.add.overlap(this.player, this.bats, this.hitSpike, null, this);

    // Spawner obstáculos
    this.time.addEvent({ delay: 1200, callback: this.spawnObstacle, callbackScope: this, loop: true });

    // Spawner minerales
    this.time.addEvent({ delay: 1800, callback: this.spawnMineral, callbackScope: this, loop: true });

    // SCORE
    this.score = 0;
    let scoreElement = document.getElementById('score-text');
    if (!scoreElement) {
      const gameContainer = this.game.canvas.parentNode;
      scoreElement = document.createElement('div');
      scoreElement.id = 'score-text';
      scoreElement.style.position = 'absolute';
      scoreElement.style.top = '25px';
      scoreElement.style.left = '35px';
      scoreElement.style.fontFamily = 'Arial, sans-serif';
      scoreElement.style.fontSize = '40px';
      scoreElement.style.fontWeight = 'bold';
      scoreElement.style.color = '#FFD700';
      scoreElement.style.textShadow = '2px 2px 4px black';
      scoreElement.style.userSelect = 'none';
      scoreElement.style.pointerEvents = 'none';
      gameContainer.appendChild(scoreElement);
    }
    this.scoreElement = scoreElement;
    this.scoreElement.style.display = 'block';
    this.scoreElement.innerText = '0';
  }

  update() {
    if (this.gameOver) return;

    this.background.tilePositionX += 0.5;
    this.ground.tilePositionX += 1;
    this.groundBase.tilePositionX += 1;

    const isOnGround = this.player.body.blocked.down;

    // Salto teclado
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && isOnGround) {
      this.player.setVelocityY(-220);
      this.player.play('run', true);
      this.player.body.setSize(10, 16);
      this.player.body.setOffset((18 * 1.5 - 20) / 2, 0);
      this.isSwipeDown = false;
    }

    // Agacharse
    if ((this.cursors.down.isDown && isOnGround) || (this.isSwipeDown && isOnGround)) {
      if (this.player.anims.currentAnim.key !== 'down') {
        this.player.play('down');
        this.player.body.setSize(9, 8);
        this.player.body.setOffset(5, 8);
      }
    } else {
      if (this.player.anims.currentAnim.key !== 'run') {
        this.player.play('run');
        this.player.body.setSize(10, 16);
        this.player.body.setOffset((18 * 1.5 - 20) / 2, 0);
      }
      if (this.isSwipeDown && !isOnGround) {
        this.isSwipeDown = false;
      }
    }

    // Eliminar fuera de pantalla
    this.spikes.getChildren().forEach(s => { if (s.x < -20) s.destroy(); });
    this.minerals.getChildren().forEach(m => { if (m.x < -20) m.destroy(); });
    this.bats.getChildren().forEach(b => { if (b.x < -20) b.destroy(); });
  }

  spawnObstacle() {
    const choice = Phaser.Utils.Array.GetRandom(['spike', 'bat']);
    if (choice === 'spike') this.spawnSpike();
    else this.spawnBat();
  }

  spawnSpike() {
    const spike = this.spikes.create(this.gameWidth + 10, this.groundY - 6, 'spike');
    spike.setScale(0.5 * 1.5);
    spike.body.allowGravity = false;
    spike.setVelocityX(-100);
    spike.body.setSize(spike.width * 0.5 * 1.5, spike.height * 0.5 * 1.5);
  }

  spawnMineral() {
    const types = ['copper', 'silver', 'gold'];
    const type = Phaser.Utils.Array.GetRandom(types);
    const y = Phaser.Math.Between(this.groundY - 50, this.groundY - 10);
    const mineral = this.minerals.create(this.gameWidth + 10, y, type);
    mineral.body.allowGravity = false;
    mineral.setVelocityX(-100);
  }

  spawnBat() {
    const y = Phaser.Math.Between(this.groundY - 30, this.groundY - 25);
    const bat = this.bats.create(this.gameWidth + 10, y, 'bat');
    bat.setScale(1.5);
    bat.body.allowGravity = false;
    bat.setVelocityX(-100);
    bat.body.setSize(12 * 1.5, 6 * 1.5);
    bat.body.setOffset(0, 5 * 0.6);
    bat.flipX = true;
    bat.play('fly');
  }

  collectMineral(player, mineral) {
    let points = 0;
    switch (mineral.texture.key) {
      case 'copper': points = 5; break;
      case 'silver': points = 10; break;
      case 'gold': points = 20; break;
    }
    this.score += points;
    mineral.destroy();
    this.scoreElement.innerText = `${this.score}`;
    this.scoreElement.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' });
  }

  hitSpike() {
    if (this.gameOver) return;
    this.gameOver = true;

    // Pausar todo (física) — mantenemos la pausa para que la escena "se congele"
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.player.anims.stop();

    // Ocultar puntaje
    if (this.scoreElement) this.scoreElement.style.display = 'none';

    // Texto principal
    const perdisteText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 30,
      '¡Perdiste!',
      {
        fontFamily: 'Arial',
        fontSize: '48px',
        color: '#b30000',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Texto secundario
    const restartText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 40,
      'Toca para volver a jugar',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Esperar click o toque — al recibirlo, primero reanudo física por si quedó pausada,
    // luego reinicio la escena (create() volverá a poner gameOver = false y mostrar score).
    this.input.once('pointerdown', () => {
      // Asegurar que la física esté activa antes de reiniciar
      if (this.physics.world.isPaused) this.physics.resume();
      this.scene.restart();
    });
  }
}