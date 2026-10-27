// TELA: LOGIN (primeira tela do app)
// O usuário digita e-mail e senha, o app envia para o backend Flask
// e, se estiver correto, guarda os dados do usuário no celular
// e vai para a tela de estoque.

// Componentes básicos do React Native
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity } from 'react-native';
// Fontes personalizadas (Inter, Montserrat e Poppins)
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
// LinearGradient cria um degradê de cores (usado por cima da imagem de fundo)
import { LinearGradient } from 'expo-linear-gradient';
// Armazenamento local do celular (aqui é usado para GRAVAR os dados do login)
import AsyncStorage from '@react-native-async-storage/async-storage';
// Hook do React: useState guarda valores que mudam
import { useState } from 'react';
// router navega entre telas
import { router } from 'expo-router';

export default function Login() {

  // Carrega as fontes. fontsLoaded fica true quando terminam de carregar
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Montserrat_400Regular,
    Montserrat_700Bold,
    Poppins_700Bold,
  });

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Controle de foco dos campos 
  // true quando o usuário está com o cursor naquele campo.
  // Serve para destacar a borda do campo enquanto ele digita
  const [emailFocus, setEmailFocus] = useState(false);
  const [senhaFocus, setSenhaFocus] = useState(false);

  // FAZER LOGIN 
  // Envia e-mail e senha para o servidor e trata a resposta
  const fazerLogin = async () => {
  // try/catch captura erros (ex.: servidor desligado)
  try {
    // Requisição POST para o backend (o IP precisa ser o do computador que roda o Flask,
    // e o celular precisa estar na mesma rede Wi-Fi)
    const resposta = await fetch('http://10.154.20.25:5000/login_app', {
      method: 'POST', // POST = enviar dados
      headers: {
        // Avisa ao servidor que o corpo da requisição está em formato JSON
        'Content-Type': 'application/json',
      },
      // JSON.stringify transforma o objeto JavaScript em texto JSON.
      // As chaves (email, senha) devem bater com o que o Flask espera
      body: JSON.stringify({
        email: email,
        senha: senha,
      }),
    });

    // Lê a resposta do servidor em JSON
    const dados = await resposta.json();

    // Logs para depuração (aparecem no terminal do Expo)
    console.log('STATUS:', resposta.status);
    console.log('RESPOSTA DO SERVIDOR:', dados);

    // resposta.ok é false quando o status não é 200-299 (ex.: 401 = não autorizado).
    // Mostra a mensagem do servidor, ou uma mensagem padrão, e interrompe
    if (!resposta.ok) {
      alert(dados.mensagem || 'Email ou senha incorretos');
      return;
    }

    // Login correto: grava os dados do usuário no celular.
    // As outras telas (estoque, editar, contas, cadastro) leem esses valores
    // com AsyncStorage.getItem para mostrar o nome na sidebar
    // e decidir se exibem os links de admin
    await AsyncStorage.setItem('tipoUsuario', dados.tipo);
    await AsyncStorage.setItem('nomeUsuario', dados.usuario);
    await AsyncStorage.setItem('emailUsuario', dados.email);

    // Vai para a tela de estoque (replace não deixa voltar para o login com o botão "voltar")
    router.replace('/tabela');

  } catch (erro) {
    // Cai aqui em erro de rede (servidor desligado, IP errado, sem Wi-Fi etc.)
    console.log(erro);
    alert('Não foi possível conectar ao servidor');
  }
};

  // Enquanto as fontes não carregam, não desenha nada (evita a tela "piscar").
  // Retornar null significa "não renderizar nada"
  if (!fontsLoaded) {
    return null;
  }


  // INTERFACE (JSX): o que aparece na tela
  return (
    <View style={styles.container}>

      {/* IMAGEM DE FUNDO: ocupa a tela toda (position absolute no estilo).
          require carrega uma imagem que está dentro do projeto.
          resizeMode "cover" preenche a área cortando o excesso, sem distorcer */}
      <Image
        source={require('../assets/industria.png')}
        style={styles.background}
        resizeMode="cover"
      />

      {/* DEGRADÊ por cima da imagem: de azul quase transparente (topo)
          para azul quase opaco (embaixo). Isso escurece a imagem e dá
          contraste para os textos.
          start e end definem a direção: x 0 → 0 e y 0 → 1 = de cima para baixo */}
      <LinearGradient
        colors={[
          'rgba(29, 50, 115, 0.25)',
          'rgba(82, 104, 168, 0.95)'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />

      {/* CONTEÚDO: textos de boas-vindas e o formulário, por cima do fundo */}
      <View style={styles.content}>

        {/* Textos de boas-vindas */}
        <Text style={styles.paragraph1}>
          BOAS-VINDAS
        </Text>

        <Text style={styles.paragraph2}>
          AO SENAI ALMOXARIFADO
        </Text>

        {/* CARD BRANCO com o formulário de login */}
        <View style={styles.inputContainer}>

          {/* Logo da FIEP no topo do card */}
          <Image
            source={require('../assets/fiep.png')}
            style={styles.logo}
          />

          {/* E-MAIL.
              value mostra o estado; onChangeText atualiza o estado a cada letra digitada.
              onFocus/onBlur ligam e desligam o destaque da borda.
              O estilo é um array: aplica input sempre e inputFocus só quando o campo está focado */}
          <Text style={styles.email}>
            Email
          </Text>

          <TextInput
            style={[
              styles.input,
              emailFocus && styles.inputFocus
            ]}
            placeholder="seunome@empresa.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocus(true)}   // ganhou foco: ativa o destaque
            onBlur={() => setEmailFocus(false)}   // perdeu foco: desativa o destaque
          />

          {/* SENHA */}
          <Text style={styles.senha}>
            Senha
          </Text>

          <TextInput
            style={[
              styles.input,
              senhaFocus && styles.inputFocus
            ]}
            placeholder="Digite sua senha"
            placeholderTextColor="#888"
            value={senha}
            onChangeText={setSenha}
            onFocus={() => setSenhaFocus(true)}
            onBlur={() => setSenhaFocus(false)}
          />

          {/* BOTÃO ENTRAR: chama fazerLogin ao ser pressionado */}
          <TouchableOpacity
            style={styles.button}
            onPress={fazerLogin}
          >
            <Text style={styles.buttonText}>
              ENTRAR
            </Text>
          </TouchableOpacity>

        </View>

      </View>

    </View>
  );
}
// ESTILOS
// StyleSheet.create organiza os estilos em um objeto.

