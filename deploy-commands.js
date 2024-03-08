// ライブラリ インポート
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// 接続情報(dotenvによるよru.envファイルからの読み込み)
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENTID;
const guildId = process.env.DISCORD_GUILDID;

// スラッシュコマンド読み込み
const commands = [];
// フォルダ読み込み
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => file.endsWith('utility'));

for (const folder of commandFolders) {
    // フォルダ内ファイル読み込み
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    // コマンドファイル内のスラッシュコマンドを取り出し、commandsリストに保管する
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[警告] ${filePath} のコマンドには必要な "data" または "execute" プロパティがありません。`);
        }
    }
}

// RESTモジュールの準備
const rest = new REST().setToken(token);

// スラッシュコマンドの登録を実行
(async () => {
    try {
        console.log(`${commands.length} つのスラッシュコマンドを登録中です...`);

        // commandsリストに保管されたスラッシュコマンドが全て登録される
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        // 全てのスラッシュコマンドの登録を解除する時は以下
        // await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
        //     .then(() => console.log('Successfully deleted all guild commands.'))
        //     .catch(console.error);

        console.log(`${data.length} 個のスラッシュコマンドを正常に登録しました！`);
    } catch (error) {
        // 登録失敗時のエラーログ
        console.error(error);
    }
})();