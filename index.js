const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const { Client, MessageMedia } = require('whatsapp-web.js');

// --- Helper Functions ---
const CONFIG_FILE = './config.json';
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

const readConfig = () => {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading config file! Make sure config.json exists.", error);
        return { owner_id: null, bot_enabled: false, timezone: "America/New_York" };
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

const client = new Client();

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
        timezone: config.timezone
    });
});

client.on('message', async message => {
    const senderId = message.author || message.from;
    const config = readConfig();

    // Bot State Handling
    if (!config.bot_enabled && !isOwner(senderId)) {
        return;
    }

    const chat = await message.getChat();
    const db = readDatabase();

    // Antilink Logic
    if (chat.isGroup && db.chats[chat.id._serialized] && db.chats[chat.id._serialized].antilink_enabled) {
        if (!isOwner(senderId)) {
            const participant = chat.participants.find(p => p.id._serialized === senderId);
            if (participant && !participant.isAdmin) {
                const linkRegex = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?");
                if (linkRegex.test(message.body)) {
                    await message.delete(true);
                    const chatSettings = db.chats[chat.id._serialized];
                    if (!chatSettings.warnings) { chatSettings.warnings = {}; }
                    if (!chatSettings.warnings[senderId]) { chatSettings.warnings[senderId] = 0; }
                    chatSettings.warnings[senderId]++;
                    const warningCount = chatSettings.warnings[senderId];
                    if (warningCount < 3) {
                        const contact = await message.getContact();
                        await chat.sendMessage(`⚠️ Advertencia ${warningCount}/3 para @${contact.id.user}. No se permiten enlaces.`, { mentions: [contact] });
                    } else {
                        const contact = await message.getContact();
                        await chat.sendMessage(`🚫 @${contact.id.user} ha sido expulsado por acumular 3 advertencias.`, { mentions: [contact] });
                        await chat.removeParticipants([senderId]);
                        chatSettings.warnings[senderId] = 0;
                    }
                    writeDatabase(db);
                }
            }
        }
    }

    // --- Owner Mention Logic ---
    if (message.mentionedIds.includes(config.owner_id) && !isOwner(senderId)) {
        message.reply('estás etiquetando a mi dueño el no hablo con gente loca');
    }

    if (message.body.startsWith('.')) {
        const [command, ...args] = message.body.substring(1).split(' ');

        switch (command) {
            case 'menu':
                const baseMenu = `🤖 *Menú de Comandos de RD-Bot* 🤖

*Diversión*
- \`.sticker\`: Crea un sticker de una imagen/GIF.
- \`.meme\`: Envía un meme al azar.
- \`.winfo <personaje>\`: Busca info de un personaje de anime.
- \`.harem-anime <tag>\`: Busca una imagen de anime SFW.

*Juegos*
- \`.acertijo\`
- \`.matematicas\`
- \`.ppt\`
- \`.trivia\`

*Grupos*
- \`.on antilink\`: Activa el sistema antilink (admins).
- \`.off antilink\`: Desactiva el sistema antilink (admins).
- \`.addgreeting\`: Añade este grupo a los saludos diarios (admins).
- \`.removegreeting\`: Quita este grupo de los saludos diarios (admins).`;

                const ownerMenu = `\n\n👑 *Comandos de Propietario* 👑
- \`.myid\`: Muestra tu ID de WhatsApp.
- \`.shutdown\`: Apaga el bot para todos.
- \`.activate\` / \`.actívate\`: Reactiva el bot.`;

                if (isOwner(senderId)) {
                    message.reply(baseMenu + ownerMenu);
                } else {
                    message.reply(baseMenu);
                }
                break;

            // --- Owner Commands ---
            case 'myid':
                message.reply(`Tu ID de WhatsApp es: ${senderId}\n\nCopia este ID y pégalo en el archivo 'config.json' en el campo "owner_id".`);
                break;
            case 'shutdown':
                if (isOwner(senderId)) {
                    let cfg = readConfig(); cfg.bot_enabled = false; writeConfig(cfg);
                    message.reply('🤖 El bot ha sido desactivado.');
                } else { message.reply('❌ No tienes permiso para usar este comando.'); }
                break;
            case 'activate':
            case 'actívate':
                if (isOwner(senderId)) {
                    let cfg = readConfig(); cfg.bot_enabled = true; writeConfig(cfg);
                    message.reply('🤖 El bot ha sido activado.');
                } else { message.reply('❌ No tienes permiso para usar este comando.'); }
                break;

            // --- Greeting Commands ---
            case 'addgreeting':
                if (chat.isGroup) {
                    const participant = chat.participants.find(p => p.id._serialized === senderId);
                    if ((participant && participant.isAdmin) || isOwner(senderId)) {
                        const db = readDatabase();
                        if (!db.greeting_chats) { db.greeting_chats = []; }
                        if (!db.greeting_chats.includes(chat.id._serialized)) {
                            db.greeting_chats.push(chat.id._serialized);
                            writeDatabase(db);
                            message.reply('✅ Este grupo ha sido añadido a la lista de saludos matutinos.');
                        } else { message.reply('Este grupo ya está en la lista de saludos.'); }
                    } else { message.reply('❌ Este comando solo puede ser usado por administradores del grupo.'); }
                } else { message.reply('❌ Este comando solo funciona en grupos.'); }
                break;
            case 'removegreeting':
                if (chat.isGroup) {
                    const participant = chat.participants.find(p => p.id._serialized === senderId);
                    if ((participant && participant.isAdmin) || isOwner(senderId)) {
                        const db = readDatabase();
                        if (db.greeting_chats && db.greeting_chats.includes(chat.id._serialized)) {
                            db.greeting_chats = db.greeting_chats.filter(id => id !== chat.id._serialized);
                            writeDatabase(db);
                            message.reply('✅ Este grupo ha sido eliminado de la lista de saludos matutinos.');
                        } else { message.reply('Este grupo no estaba en la lista de saludos.'); }
                    } else { message.reply('❌ Este comando solo puede ser usado por administradores del grupo.'); }
                } else { message.reply('❌ Este comando solo funciona en grupos.'); }
                break;

            // --- Fun Commands ---
            case 'sticker':
                try {
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg && quotedMsg.hasMedia) {
                        const media = await quotedMsg.downloadMedia();
                        await client.sendMessage(message.from, media, { sendMediaAsSticker: true, stickerAuthor: "RD-Bot" });
                    } else { message.reply('Responde a una imagen o GIF con .sticker para convertirlo.'); }
                } catch (e) { console.error(e); message.reply('Ocurrió un error al crear el sticker.'); }
                break;
            case 'meme':
                try {
                    const response = await axios.get('https://api.imgflip.com/get_memes');
                    const memes = response.data.data.memes;
                    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
                    const media = await MessageMedia.fromUrl(randomMeme.url);
                    await client.sendMessage(message.from, media, { caption: randomMeme.name });
                } catch (e) { console.error(e); message.reply('Ocurrió un error al obtener un meme.'); }
                break;

            // --- Gacha Anime ---
            case 'winfo':
                 if (args.length === 0) { message.reply('Por favor, proporciona el nombre de un personaje. Ejemplo: .winfo Naruto'); break; }
                try {
                    const characterName = args.join(' ');
                    const response = await axios.get(`https://api.jikan.moe/v4/characters?q=${characterName}&sfw`);
                    const character = response.data.data[0];
                    if (character) {
                        let about = character.about || 'No hay descripción disponible.';
                        if (about.length > 250) { about = about.substring(0, 250) + '...'; }
                        const info = `*Nombre:* ${character.name}\n*Apodos:* ${character.nicknames.join(', ') || 'N/A'}\n*Favoritos:* ${character.favorites}\n\n*Descripción:*\n${about}\n\n*Más información:* ${character.url}`;
                        const media = await MessageMedia.fromUrl(character.images.jpg.image_url);
                        await client.sendMessage(message.from, media, { caption: info });
                    } else { message.reply(`No se encontró ningún personaje con el nombre "${characterName}".`); }
                } catch (e) { console.error(e); message.reply('Ocurrió un error al buscar el personaje.'); }
                break;
            case 'play':
                if (args.length === 0) {
                    message.reply('Por favor, proporciona el enlace directo a un archivo de audio. Ejemplo: `.play https://example.com/audio.mp3`');
                    break;
                }
                try {
                    const url = args[0];
                    const media = await MessageMedia.fromUrl(url);
                    await client.sendMessage(message.from, media, { sendAudioAsVoice: true });
                } catch (e) {
                    console.error(e);
                    message.reply('No se pudo enviar el audio. Asegúrate de que el enlace sea un enlace directo a un archivo de audio válido (ej. .mp3).');
                }
                break;
            case 'harem-anime':
                 if (args.length === 0) { message.reply('Por favor, proporciona al menos un término de búsqueda. Ejemplo: `.harem-anime neko "long hair"`'); break; }
                try {
                    const tags = args.slice(0, 4).join(',');
                    const apiUrl = `https://api.nekosapi.com/v4/images/random?limit=1&rating=safe&tags=${encodeURIComponent(tags)}`;
                    const response = await axios.get(apiUrl);
                    const image = response.data.items[0];
                    if (image) {
                        const media = await MessageMedia.fromUrl(image.image_url);
                        const caption = `*Rating:* ${image.rating}\n*Tags:* ${image.tags.map(t => t.name).join(', ')}`;
                        await client.sendMessage(message.from, media, { caption: caption });
                    } else { message.reply(`No se encontraron imágenes con los tags: ${args.join(', ')}`); }
                } catch (e) { console.error(e); message.reply('Ocurrió un error al buscar la imagen.'); }
                break;
            case 'c': message.reply('Comando .c ejecutado.'); break;
            case 'regalar': message.reply('Comando .regalar ejecutado.'); break;
            case 'harem': message.reply('Comando .harem ejecutado.'); break;
            case 'rw': message.reply('Comando .rw ejecutado.'); break;
            case 'topwaifus': message.reply('Comando .topwaifus ejecutado.'); break;
            case 'wvideo': message.reply('Comando .wvideo ejecutado.'); break;

            // --- Juegos ---
            case 'acertijo': message.reply('Comando .acertijo ejecutado.'); break;
            case 'matematicas': message.reply('Comando .matematicas ejecutado.'); break;
            case 'ppt': case 'piedrapapeltijera': message.reply('Comando .piedrapapeltijera ejecutado.'); break;
            case 'trivia': message.reply('Comando .trivia ejecutado.'); break;

            // --- Grupos (Placeholders) ---
            case 'detect': message.reply('Comando .detect ejecutado.'); break;
            case 'avisos': message.reply('Comando .avisos ejecutado.'); break;
            case 'banearbot': message.reply('Comando .banearbot ejecutado.'); break;
            case 'daradmin': message.reply('Comando .daradmin ejecutado.'); break;
            case 'fantasmas': message.reply('Comando .fantasmas ejecutado.'); break;
            case 'kickfantasmas': message.reply('Comando .kickfantasmas ejecutado.'); break;

            default:
                message.reply(`Comando no reconocido: ${command}`);
        }
    }
});

client.initialize();
