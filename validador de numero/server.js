// server.js atualizado e completo
import express from 'express';
import wppconnect from '@wppconnect-team/wppconnect';
import cors from 'cors';
import open from 'open';
import e from 'cors';


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'))

// 🔹 Integração com WPPConnect
let clientInstance;

wppconnect.create({
  session: 'minha-sessao',
  headless: true,
  useChrome: true,
  puppeteerOptions: { userDataDir: './tokens' }
}).then(client => {
  clientInstance = client;
  console.log('✅ WPPConnect iniciado!');
}).catch(err => {
  console.error('❌ Erro ao iniciar WPPConnect:', err);
});

// 🔹 Enviar mensagem via WhatsApp
app.post('/analise', async (req, res) => {
  const { number } = req.body;

  try {
    const status = await clientInstance.checkNumberStatus(number);
    if (!status?.id?._serialized.endsWith('@c.us')) {
      return res.status(400).json({ success: false, message: 'Número inválido no WhatsApp' });
    }

    return res.json({ success: true, message: 'Número com WhatsApp' });
    
  } catch (error) {
    console.error('Erro ao verificar número:', error);
    res.status(500).json({ success: false, message: 'Erro ao verificar número', error });
  }
});

// 🔹 Start do servidor
app.listen(3002, () => {
  console.log('🚀 Backend rodando em http://localhost:3002');
   open('http://localhost:3002/whatsapp-validator.html');
});
