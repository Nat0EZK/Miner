import { Game } from './scenes/Game.js';

const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 180,
    backgroundColor: '#000000',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Game],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
};

new Phaser.Game(config);
