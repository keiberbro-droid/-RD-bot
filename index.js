const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const { Client, MessageMedia } = require('whatsapp-web.js');

// --- Helper Functions ---
const DB_FILE = './database.json';

const readDatabase = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log("Database not found, creating a new one.");
        return { chats: {} };
    }
};

const writeDatabase = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};
// ---------------------------------

const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async message => {
    const chat = await message.getChat();
    const db = readDatabase();
    const senderId = message.author || message.from;

    // --- Antilink Logic ---
    if (chat.isGroup && db.chats[chat.id._serialized] && db.chats[chat.id._serialized].antilink_enabled) {
        // This logic is still potentially buggy and needs a real fix.
        // For now, proceeding with the assumption that chat.participants is available.
        const participant = chat.participants.find(p => p.id._serialized === senderId);
        if (participant && !participant.isAdmin) {
            const linkRegex = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?");
            if (linkRegex.test(message.body)) {
                await message.delete(true);

                const chatSettings = db.chats[chat.id._serialized];
                if (!chatSettings.warnings) {
                    chatSettings.warnings = {};
                }
                if (!chatSettings.warnings[senderId]) {
                    chatSettings.warnings[senderId] = 0;
                }

                chatSettings.warnings[senderId]++;
                const warningCount = chatSettings.warnings[senderId];

                if (warningCount < 3) {
                    const contact = await message.getContact();
                    await chat.sendMessage(`⚠️ Advertencia ${warningCount}/3 para @${contact.id.user}. No se permiten enlaces.`, { mentions: [contact] });
                } else {
                    const contact = await message.getContact();
                    await chat.sendMessage(`🚫 @${contact.id.user} ha sido expulsado por acumular 3 advertencias.`, { mentions: [contact] });
                    await chat.removeParticipants([senderId]);
                    chatSettings.warnings[senderId] = 0; // Reset warnings
                }
                writeDatabase(db);
            }
        }
    }

    if (message.body.startsWith('.')) {
        const [command, ...args] = message.body.substring(1).split(' ');

        switch (command) {
            // --- Fun Commands ---
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

            // --- Gacha Anime ---
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

            // --- Juegos ---
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

            // --- Grupos ---
            case 'on':
                if (args[0] === 'antilink') {
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === senderId);
                        if (participant && participant.isAdmin) {
                            if (!db.chats[chat.id._serialized]) {
                                db.chats[chat.id._serialized] = {};
                            }
                            db.chats[chat.id._serialized].antilink_enabled = true;
                            writeDatabase(db);
                            message.reply('✅ El sistema Antilink ha sido activado.');
                        } else {
                            message.reply('❌ Este comando solo puede ser usado por administradores del grupo.');
                        }
                    } else {
                        message.reply('❌ Este comando solo funciona en grupos.');
                    }
                } else {
                     message.reply('Comando .on no reconocido. ¿Quizás querías decir ".on antilink"?');
                }
                break;
            case 'off':
                if (args[0] === 'antilink') {
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === senderId);
                        if (participant && participant.isAdmin) {
                            if (db.chats[chat.id._serialized]) {
                                db.chats[chat.id._serialized].antilink_enabled = false;
                                writeDatabase(db);
                                message.reply('✅ El sistema Antilink ha sido desactivado.');
                            } else {
                                message.reply('El sistema Antilink ya estaba desactivado.');
                            }
                        } else {
                            message.reply('❌ Este comando solo puede ser usado por administradores del grupo.');
                        }
                    } else {
                        message.reply('❌ Este comando solo funciona en grupos.');
                    }
                } else {
                    message.reply('Comando .off no reconocido. ¿Quizás querías decir ".off antilink"?');
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
