import { Database } from 'bun:sqlite';
import { BaseInteraction, Events, GatewayIntentBits } from 'discord.js';

import { BotClient } from './classes/BotClient';
import { config } from './utils.ts';
import { BotInteraction } from './classes/BotInteraction.ts';

const db = new Database('neurobot.db');

const client = new BotClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.MessageContent,
    ],
    allowedMentions: {
        parse: [],
        repliedUser: true,
    },
}, db);

client.once(Events.ClientReady, async () => {
    console.log('Ready!');

    await client.loadInteractions();
});

client.on(Events.InteractionCreate, async (interaction: BaseInteraction) => {
    let botInteraction: BotInteraction | undefined;
    if ('commandName' in interaction) {
        botInteraction = client.interactions.get(<string>interaction.commandName);
        if (!botInteraction) console.error(`Interaction ${interaction.commandName} not found`);
    } else if ('customId' in interaction) {
        botInteraction = client.interactions.get(<string>interaction.customId);
        if (!botInteraction) console.error(`Interaction by custom ID ${interaction.customId} not found`);
    } else {
        console.error('Unknown interaction', interaction);
    }
    if (!botInteraction) return;

    if (interaction.isChatInputCommand()) {
        try {
            await botInteraction.onChatInteraction?.(interaction);
        } catch (err) {
            console.error(err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred executing this command.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred executing this command.', ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        try {
            await botInteraction.onButton?.(interaction);
        } catch (err) {
            console.error(err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred executing this button command.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred executing this button command.', ephemeral: true });
            }
        }
    } else if (interaction.isAutocomplete()) {
        try {
            await botInteraction.onAutocomplete?.(interaction);
        } catch (err) {
            console.error(err);
        }
    } else if (interaction.isMessageContextMenuCommand()) {
        try {
            await botInteraction.onContextMenuInteraction?.(interaction);
        } catch (err) {
            console.error(err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred executing this interaction.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred executing this interaction.', ephemeral: true });
            }
        }
    }
});

client.login(config.token);

process.on('SIGINT', async () => {
    console.info('\nGoodbye');
    await client.destroy();
    process.exit(0);
});
