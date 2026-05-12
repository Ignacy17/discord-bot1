require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const express = require('express');

// =====================
// KEEP ALIVE (Render)
// =====================
const app = express();

app.get('/', (req, res) => {
    res.send('Bot działa');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Keep alive server działa');
});

// =====================
// DISCORD BOT
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
});

// =====================
// VOICE SYSTEM
// =====================
client.on('voiceStateUpdate', async (oldState, newState) => {

    const joinToCreateChannelId = '1503778718751920238';
    const categoryId = '1503778558932156567';

    // wejście na kanał trigger
    if (!oldState.channelId && newState.channelId === joinToCreateChannelId) {

        const guild = newState.guild;
        const member = newState.member;

        const channel = await guild.channels.create({
            name: `kanał-${member.user.username}`,
            type: ChannelType.GuildVoice,
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.Connect,
                        PermissionsBitField.Flags.Speak,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.MoveMembers,
                    ],
                },
            ],
        });

        await member.voice.setChannel(channel);
    }

    // auto delete kanału gdy pusty
    if (oldState.channel && oldState.channel.members.size === 0) {
        if (oldState.channel.parentId === categoryId) {
            await oldState.channel.delete().catch(() => {});
        }
    }
});

// =====================
// LOGIN
// =====================
client.login(process.env.TOKEN);