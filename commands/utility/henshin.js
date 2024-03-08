const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');
var admin = require("firebase-admin");

async function lots_of_messages_getter(interaction, channelId, user_name, limit = 1000) {
    const sum_messages = [];
    let last_id;
    let progress = 0

    while (true) {
        // console.log(`Progress: ${progress / limit * 100}%`);
        interaction.editReply({
            content: `Progress: ${progress / limit * 100}%`
        });

        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        // メッセージを取得
        const messages = await interaction.client.channels.cache.get(channelId).messages.fetch(options); // 雑談1・2チャンネルからデータ収集
        // const messages = await interaction.client.channel.messages.fetch(options); // スラッシュコマンド発動時のチャンネル
        // console.log(messages);
        // 指定されたユーザーが発言したメッセージのみに限定
        const mentionFilter = await messages.filter(msg => user_name == msg.author.username);
        // メッセージのテキストの部分だけ抽出
        const messages_filterd = mentionFilter.map(msg => {
            return msg.content
        });
        sum_messages.push(...messages_filterd);
        last_id = messages.last().id;

        if (messages.size != 100 || sum_messages.length >= limit) {
            console.log(`messages.length: ${messages.size}`)
            console.log(`sum_messages: ${sum_messages.length}`)
            break;
        }
        progress += messages_filterd.length;
    }

    return sum_messages;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('henshin')
        .setDescription('指定のメンバーの過去の発言を学習させる')
        .addStringOption((option) => option
            .setName('学習対象のメンバーのユーザーネーム')
            .setDescription('学習対象のメンバーのユーザーネーム')
            .setRequired(true) //trueで必須、falseで任意
        )
        .addIntegerOption((option) => option
            .setName('最大学習発言数')
            .setDescription('学習させる過去発言の最大数')
            .setRequired(false) //trueで必須、falseで任意
        ),

    async execute(interaction) {
        console.log('学習中...');

        // メンションで指定されているユーザーを取得
        const user_name = interaction.options.getString("学習対象のメンバーのユーザーネーム");

        // データベースに接続
        const db = admin.firestore();

        // メンバーのテキストデータを持ってくる
        const member_content = await db.collection('members').doc(user_name).get();

        // if (fs.existsSync(`henshin/${user_name}.txt`)) {
        //     interaction.reply({
        //         content: `メタモンは　${user_name}に　へんしんを　した！`,
        //         // ephemeral: true
        //     });
        //     return;
        // }

        // 既に学習済みの場合はスキップ
        if (member_content.exists) {
            interaction.client.metamon = user_name;
            interaction.client.content = member_content.data()["content"];
            interaction.reply({
                content: `メタモンは　${user_name}に　へんしんを　した！`,
                // ephemeral: true
            });
            return;
        } else { // 学習済みでない場合、新規学習を行わずに例外処理を行う
            interaction.reply({
                content: `メタモンは　${user_name}に　へんしん　できなかった！\nユーザーネームを　まちがえてるかも！`,
                // ephemeral: true
            });
            return;
        }

        // 指定されたメッセージの数を取得
        const upper = interaction.options.getString("最大学習発言数") ?? 1000;

        await interaction.deferReply(); // { ephemeral: true }

        // 指定された数のメッセージを取得
        // const messages = await interaction.channel.messages.fetch({ limit: upper });
        let messages1 = await lots_of_messages_getter(interaction, '1005877517502119957', user_name, limit = upper);
        let messages2 = await lots_of_messages_getter(interaction, '1134795519311495188', user_name, limit = upper);
        let messages = messages1.concat(messages2);
        messages = messages.join(',').replace(/\<.*?\>/g, '');

        // 取得したデータをclientに記録する
        interaction.client.metamon = user_name;
        interaction.client.content = messages;

        // txtファイルへ書き込み
        db.collection('members').doc(user_name).set(data, (err) => {
            if (err) throw err;
            console.log(`メタモンは　${user_name}に　へんしんを　した！`);
        });
        // fs.writeFileSync(`henshin/${user_name}.txt`, messages, (err) => {
        //     if (err) throw err;
        //     console.log(`メタモンは　${user_name}に　へんしんを　した！`);
        // });

        interaction.editReply({
            content: `メタモンは　${user_name}に　へんしんを　した！`,
            // ephemeral: true
        });

        return;
    }
};