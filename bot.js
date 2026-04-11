require('dotenv').config(); // odczyt z .env
const express = require('express'); // serwer do pingowania
const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ChannelType 
} = require('discord.js');

// ==================== KONFIG ====================
const BOT_TOKEN = process.env.BOT_TOKEN; // Token bota ustaw w Render → Environment Variables
const GUILD_ID = '1409881397857878079';

const TEMP_VC_CHANNEL_ID = '1491471416342876293';
const VC_CATEGORY_ID = '1491471869898002482';
const TEXT_CATEGORY_ID = '1491501687716974684';

const userVoiceChannelMap = new Map();
const userTextChannelMap = new Map();

// ==================== CLIENT ====================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ] 
});

// ==================== READY ====================
client.once('ready', async () => {
    console.log(`[READY] Bot działa jako ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('removevoicechannel')
            .setDescription('Usuwa Twój prywatny VC'),

        new SlashCommandBuilder()
            .setName('editvoicechannel')
            .setDescription('Edytuj VC')
            .addSubcommand(sub => 
                sub.setName('adduser')
                   .setDescription('Dodaje użytkownika do VC')
                   .addUserOption(opt => opt.setName('user').setDescription('Użytkownik do dodania').setRequired(true))
            )
            .addSubcommand(sub => 
                sub.setName('removeuser')
                   .setDescription('Usuwa użytkownika z VC')
                   .addUserOption(opt => opt.setName('user').setDescription('Użytkownik do usunięcia').setRequired(true))
            ),

        new SlashCommandBuilder()
            .setName('createtextchannel')
            .setDescription('Tworzy prywatny kanał tekstowy'),

        new SlashCommandBuilder()
            .setName('deletetextchannel')
            .setDescription('Usuwa prywatny kanał tekstowy'),

        new SlashCommandBuilder()
            .setName('edittextchannel')
            .setDescription('Edytuj kanał tekstowy')
            .addSubcommand(sub => 
                sub.setName('adduser')
                   .setDescription('Dodaje użytkownika do tekstowego kanału')
                   .addUserOption(opt => opt.setName('user').setDescription('Użytkownik do dodania').setRequired(true))
            )
            .addSubcommand(sub => 
                sub.setName('removeuser')
                   .setDescription('Usuwa użytkownika z tekstowego kanału')
                   .addUserOption(opt => opt.setName('user').setDescription('Użytkownik do usunięcia').setRequired(true))
            )
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
        console.log('[INFO] Komendy zarejestrowane');
    } catch (err) {
        console.error('[ERROR] Rejestracja komend:', err);
    }
});

// ==================== COMMANDS ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, guild } = interaction;
    const vc = guild.channels.cache.get(userVoiceChannelMap.get(user.id));
    const tc = guild.channels.cache.get(userTextChannelMap.get(user.id));

    // ===== VOICE REMOVE =====
    if (commandName === 'removevoicechannel') {
        if (!vc) return interaction.reply({ content: 'Nie masz VC', ephemeral: true });
        await interaction.reply({ content: 'Usunięto VC', ephemeral: true });
        try { await vc.delete(); } catch(err) { console.error(err); }
        userVoiceChannelMap.delete(user.id);
    }

    // ===== VOICE EDIT =====
    if (commandName === 'editvoicechannel') {
        if (!vc) return interaction.reply({ content: 'Nie masz VC', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');
        if (!target) return interaction.reply({ content: 'Nie znaleziono użytkownika', ephemeral: true });

        try {
            if (sub === 'adduser') await vc.permissionOverwrites.edit(target.id, { Connect: true });
            if (sub === 'removeuser') await vc.permissionOverwrites.edit(target.id, { Connect: false });
            await interaction.reply({ content: 'Gotowe', ephemeral: true });
        } catch(err) {
            console.error(err);
            interaction.reply({ content: 'Błąd podczas edycji VC', ephemeral: true });
        }
    }

    // ===== TEXT CREATE =====
    if (commandName === 'createtextchannel') {
        if (tc) return interaction.reply({ content: 'Masz już kanał', ephemeral: true });
        try {
            const channel = await guild.channels.create({
                name: `${user.username}-text`,
                type: ChannelType.GuildText,
                parent: TEXT_CATEGORY_ID,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
            userTextChannelMap.set(user.id, channel.id);
            await interaction.reply({ content: `Stworzono: ${channel}`, ephemeral: true });
        } catch(err) {
            console.error(err);
            interaction.reply({ content: 'Błąd przy tworzeniu kanału', ephemeral: true });
        }
    }

    // ===== TEXT DELETE =====
    if (commandName === 'deletetextchannel') {
        if (!tc) return interaction.reply({ content: 'Nie masz kanału', ephemeral: true });
        await interaction.reply({ content: 'Usunięto kanał', ephemeral: true });
        try { await tc.delete(); } catch(err) { console.error(err); }
        userTextChannelMap.delete(user.id);
    }

    // ===== TEXT EDIT =====
    if (commandName === 'edittextchannel') {
        if (!tc) return interaction.reply({ content: 'Nie masz kanału', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('user');
        if (!target) return interaction.reply({ content: 'Nie znaleziono użytkownika', ephemeral: true });

        try {
            if (sub === 'adduser') await tc.permissionOverwrites.edit(target.id, { ViewChannel: true });
            if (sub === 'removeuser') await tc.permissionOverwrites.edit(target.id, { ViewChannel: false });
            await interaction.reply({ content: 'Gotowe', ephemeral: true });
        } catch(err) {
            console.error(err);
            interaction.reply({ content: 'Błąd podczas edycji kanału', ephemeral: true });
        }
    }
});

// ==================== VOICE AUTO ====================
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (newState.channelId === TEMP_VC_CHANNEL_ID) {
            if (userVoiceChannelMap.has(newState.member.id)) return;

            const channel = await newState.guild.channels.create({
                name: `${newState.member.user.username}-VC`,
                type: ChannelType.GuildVoice,
                parent: VC_CATEGORY_ID,
                permissionOverwrites: [
                    { id: newState.guild.id, deny: [PermissionsBitField.Flags.Connect] },
                    { id: newState.member.id, allow: [PermissionsBitField.Flags.Connect] }
                ]
            });

            userVoiceChannelMap.set(newState.member.id, channel.id);
            await newState.setChannel(channel);
        }

        if (oldState.channel &&
            oldState.channel.parentId === VC_CATEGORY_ID &&
            oldState.channel.members.size === 0) {
            try { await oldState.channel.delete(); } catch(err) { console.error(err); }
        }
    } catch(err) {
        console.error('[voiceStateUpdate error]', err);
    }
});

// ==================== EXPRESS SERWER DO UPTIME ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot działa!'));
app.listen(PORT, () => console.log(`Serwer pingowy na porcie ${PORT}`));

// ==================== ERROR FIX ====================
process.on('unhandledRejection', err => console.error('[UnhandledRejection]', err));

// ==================== LOGIN ====================
client.login(BOT_TOKEN);