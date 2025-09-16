const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', message => {
    if (message.body.startsWith('.')) {
        const [command, ...args] = message.body.substring(1).split(' ');

        switch (command) {
            // Gacha Anime
            case 'c':
                message.reply('Comando .c ejecutado.');
                break;
            case 'regalar':
                message.reply('Comando .regalar ejecutado.');
                break;
            case 'harem':
                message.reply('Comando .harem ejecutado.');
                break;
            case 'rw':
                message.reply('Comando .rw ejecutado.');
                break;
            case 'topwaifus':
                message.reply('Comando .topwaifus ejecutado.');
                break;
            case 'winfo':
                message.reply('Comando .winfo ejecutado.');
                break;
            case 'wvideo':
                message.reply('Comando .wvideo ejecutado.');
                break;

            // Juegos
            case 'acertijo':
                message.reply('Comando .acertijo ejecutado.');
                break;
            case 'matematicas':
                message.reply('Comando .matematicas ejecutado.');
                break;
            case 'ppt':
            case 'piedrapapeltijera':
                message.reply('Comando .piedrapapeltijera ejecutado.');
                break;
            case 'trivia':
                message.reply('Comando .trivia ejecutado.');
                break;

            // Grupos
            case 'on':
                if (args.length > 0) {
                    message.reply(`Comando .on ${args[0]} ejecutado.`);
                } else {
                    message.reply('El comando .on necesita un argumento.');
                }
                break;
            case 'off':
                if (args.length > 0) {
                    message.reply(`Comando .off ${args[0]} ejecutado.`);
                } else {
                    message.reply('El comando .off necesita un argumento.');
                }
                break;
            case 'detect':
                message.reply('Comando .detect ejecutado.');
                break;
            case 'avisos':
                message.reply('Comando .avisos ejecutado.');
                break;
            case 'banearbot':
                message.reply('Comando .banearbot ejecutado.');
                break;
            case 'daradmin':
                message.reply('Comando .daradmin ejecutado.');
                break;
            case 'fantasmas':
                message.reply('Comando .fantasmas ejecutado.');
                break;
            case 'kickfantasmas':
                message.reply('Comando .kickfantasmas ejecutado.');
                break;

            default:
                message.reply(`Comando no reconocido: ${command}`);
        }
    }
});

client.initialize();
