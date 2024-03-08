const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('メタモンBotの説明'),
        
    async execute(interaction) {
        await interaction.reply({
            content : `# メタモンbotへようこそ😜\nこのbotはPiedPiperメンバーの過去の発言を学習し、その人の様に振る舞うbotです。\n\n## 使い方(簡単2ステップ)：\n1. 「/henshin」コマンドを変身させたいメンバーの**ユーザーネーム**を引数として実行する。(ex. 奈良だったら「aran1218」等。これはユーザーのアイコンをタップすると小さく書かれているのでそれを確認してください。)\n2. メタモンbotへメンションをつけて、応答してほしい内容を書いて送信する。\n\n## 注意点：\n- 雑談1・2チャンネルの過去メッセージを学習データとして用いるため、そこであまり発言していないユーザーはあまり真似できないかもです。\n\n是非楽しんでください〜🐦`,
            // ephemeral: true
        });
    },
};