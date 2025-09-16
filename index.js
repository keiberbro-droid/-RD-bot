const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const cron = require('node-cron');
const { Client, MessageMedia } = require('whatsapp-web.js');
const client = new Client();

// --- Database Helper Functions ---
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

const CONFIG_FILE = './config.json';

const readConfig = () => {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading config file! Make sure config.json exists.", error);
        return { owner_id: null, bot_enabled: false };
    }
};

const writeConfig = (data) => {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
};

const isOwner = (authorId) => {
    const config = readConfig();
    return authorId === config.owner_id;
};
// ---------------------------------

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');

    const config = readConfig();
    // Schedule the daily greeting message
    cron.schedule('0 6 * * *', () => {
        console.log('Running daily greeting job...');
        const db = readDatabase();
        if (db.greeting_chats && db.greeting_chats.length > 0) {
            db.greeting_chats.forEach(chatId => {
                client.sendMessage(chatId, '☀️ buenos días mis pequeños saltamontes ☀️').catch(err => {
                    console.error(`Failed to send greeting to ${chatId}:`, err);
                });
            });
        }
    }, {
        scheduled: true,
        timezone: config.timezone || "America/New_York"
    });
});

client.on('message', async message => {
    const senderId = message.author || message.from;

    // --- Bot State Handling ---
    const config = readConfig();
    if (!config.bot_enabled && !isOwner(senderId)) {
        return; // Ignore all messages if bot is disabled, except from the owner
    }

    const chat = await message.getChat();
    const db = readDatabase();

    // --- Antilink Logic ---
    if (chat.isGroup && db.chats[chat.id._serialized] && db.chats[chat.id._serialized].antilink_enabled) {
        const participant = chat.participants.find(p => p.id._serialized === senderId);
        // Check if the sender is not an admin and not the owner
        if (participant && !participant.isAdmin && !isOwner(senderId)) {
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
                    const warningMessage = `⚠️ Advertencia ${warningCount}/3. No se permiten enlaces.`;
                    await chat.sendMessage(warningMessage);
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

	if(message.body.startsWith('.')) {
        const [command, ...args] = message.body.substring(1).split(' ');

        switch(command) {
            case 'addgreeting':
                {
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === senderId);
                        if ((participant && participant.isAdmin) || isOwner(senderId)) {
                            const db = readDatabase();
                            if (!db.greeting_chats) {
                                db.greeting_chats = [];
                            }
                            if (!db.greeting_chats.includes(chat.id._serialized)) {
                                db.greeting_chats.push(chat.id._serialized);
                                writeDatabase(db);
                                message.reply('✅ Este grupo ha sido añadido a la lista de saludos matutinos.');
                            } else {
                                message.reply('Este grupo ya está en la lista de saludos.');
                            }
                        } else {
                            message.reply('❌ Este comando solo puede ser usado por administradores del grupo.');
                        }
                    } else {
                        message.reply('❌ Este comando solo funciona en grupos.');
                    }
                }
                break;
            case 'removegreeting':
                {
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === senderId);
                        if ((participant && participant.isAdmin) || isOwner(senderId)) {
                            const db = readDatabase();
                            if (db.greeting_chats && db.greeting_chats.includes(chat.id._serialized)) {
                                db.greeting_chats = db.greeting_chats.filter(id => id !== chat.id._serialized);
                                writeDatabase(db);
                                message.reply('✅ Este grupo ha sido eliminado de la lista de saludos matutinos.');
                            } else {
                                message.reply('Este grupo no estaba en la lista de saludos.');
                            }
                        } else {
                            message.reply('❌ Este comando solo puede ser usado por administradores del grupo.');
                        }
                    } else {
                        message.reply('❌ Este comando solo funciona en grupos.');
                    }
                }
                break;
            case 'shutdown':
                if (isOwner(senderId)) {
                    let config = readConfig();
                    config.bot_enabled = false;
                    writeConfig(config);
                    message.reply('🤖 El bot ha sido desactivado.');
                } else {
                    message.reply('❌ No tienes permiso para usar este comando.');
                }
                break;
            case 'activate':
            case 'actívate':
                if (isOwner(senderId)) {
                    let config = readConfig();
                    config.bot_enabled = true;
                    writeConfig(config);
                    message.reply('🤖 El bot ha sido activado.');
                } else {
                    message.reply('❌ No tienes permiso para usar este comando.');
                }
                break;
            case 'myid':
                message.reply(`Tu ID de WhatsApp es: ${senderId}\n\nCopia este ID y pégalo en el archivo 'config.json' en el campo "owner_id".`);
                break;
            case 'sticker':
                try {
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg && quotedMsg.hasMedia) {
                        const media = await quotedMsg.downloadMedia();
                        await client.sendMessage(message.from, media, { sendMediaAsSticker: true, stickerAuthor: "RD-Bot", stickerName: "Hecho con RD-Bot" });
                    } else {
                        message.reply('Debes responder a una imagen o GIF con el comando .sticker');
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
            // Gacha Anime
            case 'winfo':
                if (args.length === 0) {
                    message.reply('Por favor, proporciona el nombre de un personaje. Ejemplo: .winfo Naruto');
                    break;
                }
                try {
                    const characterName = args.join(' ');
                    const response = await axios.get(`https://api.jikan.moe/v4/characters?q=${characterName}`);
                    const character = response.data.data[0];

                    if (character) {
                        let about = character.about || 'No hay descripción disponible.';
                        if (about.length > 250) {
                            about = about.substring(0, 250) + '...';
                        }

                        const info = `*Nombre:* ${character.name}\n` +
                                     `*Kanji:* ${character.name_kanji || 'N/A'}\n` +
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
                if (args[0] === 'antilink') {
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === message.author);
                        if (participant && participant.isAdmin) {
                            const db = readDatabase();
                            if (!db.chats[chat.id._serialized]) {
                                db.chats[chat.id._serialized] = { warnings: {} };
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
                } else if (args.length > 0) {
                    message.reply(`Comando .on ${args[0]} ejecutado.`);
                } else {
                    message.reply('El comando .on necesita un argumento.');
                }
                break;
            case 'off':
                if (args[0] === 'antilink') {
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === message.author);
                        if (participant && participant.isAdmin) {
                            const db = readDatabase();
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
                    // Keep placeholder for other .off commands if any
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
