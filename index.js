const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { Client, MessageMedia } = require('whatsapp-web.js');
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async message => {
    if (message.body.startsWith('.')) {
        const [command, ...args] = message.body.substring(1).split(' ');

        switch (command) {
            // Fun Commands
            case 'sticker':
                try {
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg && quotedMsg.hasMedia) {
                        const media = await quotedMsg.downloadMedia();
                        await client.sendMessage(message.from, media, { sendMediaAsSticker: true, stickerAuthor: "RD-Bot" });
                    } else {
                        message.reply('Responde a una imagen o GIF con .sticker para convertirlo.');
                    }
                } catch (error) {
                    console.error(error);
                    message.reply('Ocurrió un error al crear el sticker.');
                }
                break;
            case 'meme':
                try {
                    const response = await axios.get('https://api.imgflip.com/get_memes');
                    const memes = response.data.data.memes;
                    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
                    const media = await MessageMedia.fromUrl(randomMeme.url);
                    await client.sendMessage(message.from, media, { caption: randomMeme.name });
                } catch (error) {
                    console.error(error);
                    message.reply('Ocurrió un error al obtener un meme.');
                }
                break;
            case 'winfo':
                if (args.length === 0) {
                    message.reply('Por favor, proporciona el nombre de un personaje. Ejemplo: .winfo Naruto');
                    break;
                }
                try {
                    const characterName = args.join(' ');
                    const response = await axios.get(`https://api.jikan.moe/v4/characters?q=${characterName}&sfw`);
                    const character = response.data.data[0];

                    if (character) {
                        let about = character.about || 'No hay descripción disponible.';
                        if (about.length > 250) {
                            about = about.substring(0, 250) + '...';
                        }
                        const info = `*Nombre:* ${character.name}\n` +
                                     `*Apodos:* ${character.nicknames.join(', ') || 'N/A'}\n` +
                                     `*Favoritos:* ${character.favorites}\n\n` +
                                     `*Descripción:*\n${about}\n\n` +
                                     `*Más información:* ${character.url}`;
                        const media = await MessageMedia.fromUrl(character.images.jpg.image_url);
                        await client.sendMessage(message.from, media, { caption: info });
                    } else {
                        message.reply(`No se encontró ningún personaje con el nombre "${characterName}".`);
                    }
                } catch (error) {
                    console.error(error);
                    message.reply('Ocurrió un error al buscar el personaje.');
                }
                break;
            case 'harem-anime':
                 if (args.length === 0) {
                    message.reply('Por favor, proporciona al menos un término de búsqueda. Ejemplo: `.harem-anime neko "long hair"`');
                    break;
                }
                try {
                    const tags = args.slice(0, 4).join(',');
                    const apiUrl = `https://api.nekosapi.com/v4/images/random?limit=1&rating=safe&tags=${encodeURIComponent(tags)}`;
                    const response = await axios.get(apiUrl);
                    const image = response.data.items[0];

                    if (image) {
                        const media = await MessageMedia.fromUrl(image.image_url);
                        const caption = `*Rating:* ${image.rating}\n*Tags:* ${image.tags.map(t => t.name).join(', ')}`;
                        await client.sendMessage(message.from, media, { caption: caption });
                    } else {
                        message.reply(`No se encontraron imágenes con los tags: ${args.join(', ')}`);
                    }
                } catch (error) {
                    console.error(error);
                    message.reply('Ocurrió un error al buscar la imagen.');
                }
                break;

            // Gacha Anime (Placeholders)
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
            case 'wvideo':
                message.reply('Comando .wvideo ejecutado.');
                break;

            // Juegos (Placeholders)
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
