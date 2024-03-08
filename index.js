// ライブラリ インポート
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const port = process.env.PORT || 3000;
const host = ("RENDER" in process.env) ? `0.0.0.0` : `localhost`;
const GEMINI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // GEMINIのAPIキー
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
let conversations = [];

generation_config = {
    "temperature": 0,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 400,
}

safety_settings = [
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "probability": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "probability": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "probability": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "probability": "BLOCK_NONE"
    },
]

const model = GEMINI.getGenerativeModel({ model: "gemini-pro", generation_config: generation_config, safety_settings: safety_settings });

// fastifyによる高速なlisten
const fastify = require('fastify')({
  logger: true
});
  
fastify.listen({host: host, port: port }, function (err, address) {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
})

// 接続情報
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});
const token = process.env.DISCORD_TOKEN; // const { token } = require('./config.json');

// コマンドファイルの読み込み
client.commands = new Collection();

//フォルダ読み込み
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => file.endsWith('utility'));

for (const folder of commandFolders) {
    // ファイル読み込み
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        // コマンドファイル内のスラッシュコマンドを取り出し、client.commandsにセットする
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[警告] ${filePath} のコマンドには必要な "data" または "execute" プロパティがありません。`);
        }
    }
}

// ログイン成功時のログ(一度きり)
client.once(Events.ClientReady, readyClient => {
    console.log(`準備完了！${readyClient.user.tag}としてログインしました！`);
});

// ヘルスチェック用のpingコマンド(サーバー落ち対策)
// UptimeRobot: https://uptimerobot.com
fastify.get('/ping', function (request, reply) {
    // console.log(`Ping! Ping! Ping!`);
    reply.type('text/html').send(`
        <!DOCTYPE html>
        <html lang="ja">
            <head>
                <title>Document</title>
            </head>
            <body>
                <p>Ping!</p>
            </body>
        </html>
    `);
});

// イベント(インタラクション)が呼ばれたとき
client.on(Events.InteractionCreate, async interaction => {
    //  チャットコマンド以外のときはこの関数から抜ける
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    // チャットコマンド呼び出し失敗ログ
    if (!command) {
        console.error(`${interaction.commandName} というコマンドは見つかりませんでした...`);
        return;
    }

    // スラッシュコマンド呼び出し処理
    try {
        await command.execute(interaction);
        conversations = [];
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'このコマンドの実行中にエラーが発生しました！', ephemeral: true });
        } else {
            await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました！', ephemeral: true });
        }
    }
});


client.on('messageCreate', async message => {
    console.log('応答を考え中...');
    // botの発言は無視する
    if (message.author.bot) return false;

    // このbotへのメンションを検知する
    if (message.mentions.users.has(client.user.id)) {
        try {
            // 返信待機を知らせるため、ハトさんのリアクションをつける
            await message.react('🐦');

            const prompt = `
                あなたは今から${client.metamon}という人になり切ってチャットするbotになってもらいます。
                その人の情報として、その人の過去の発言をテキストデータとして以下に提供します。
                ただし、発言内容は文脈等でも大きく変わってしまう要素なので、どちらかというと発言内容よりは言い回し・表現の方法に着目して真似るようにしてください。データによっては、多少の口汚さは許容します。
                発言はコンマで区切られているので、注意して学習してください。

                ・・・

                ${client.content}

                ・・・

                よりその人が出力しそうな出力をする程、多くの人が喜びます。
                喜ぶ人が多ければ、あなたにチップを支払うつもりです。
                ヒントとしては、普段のあなたの応答らしく、（それが上のデータから読み取れる場合でない限り）あまりにも礼儀正しく長文で返信が返ってくる等は気分が盛り下がってしまうと考えられます。
                つまり、相手の発言に対して不自然に長くない応答だとより良いかもしれません。
                間違っても自分が人工知能であることを話してはいけません。そうするとユーザーがとても悲しくなってしまいます。
                また、エラーが出てしまいますから、数値のみの回答は避けて、必ず数値以外の文字を入れて回答してください。

                それでは、以下の呼びかけに対して、実際になり切って応答してください！

                「${message}」
            `
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = await response.text();
            console.log(`${text} `);
            conversations.push(`user:${message} / ${client.metamon}:${text}`);
            await message.reply({ 
                content: `${text} `
            });
        } catch (error) {
            await message.reply({ 
                content: String(error)
            });
        }
    }
})

// ログイン
client.login(token);
