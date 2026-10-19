// ============================================================
// TELA: CADASTRO (cadastro de novos usuários, só para admin)
// Envia usuário, e-mail e senha para o backend Flask criar a conta.
// ============================================================

// Componentes básicos do React Native
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
// Card da biblioteca React Native Paper (caixa com sombra/borda para agrupar conteúdo)
import { Card } from 'react-native-paper';
// useFonts carrega as fontes. Aqui ele vem do pacote "inter", mas é a mesma função
// do expo-font (o pacote de fontes apenas a reexporta)
import { useFonts } from '@expo-google-fonts/inter';
// Fontes usadas nos textos
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
// Ícones (menu, fechar, logout)
import { MaterialIcons } from '@expo/vector-icons';
// Hooks do React: useState guarda valores que mudam, useCallback memoriza funções
import { useState, useCallback } from 'react';
// Armazenamento local do celular (guarda nome e tipo do usuário logado)
import AsyncStorage from '@react-native-async-storage/async-storage';
// router navega entre telas; useFocusEffect roda código quando a tela ganha foco
import { router, useFocusEffect } from 'expo-router';

export default function Cadastro() {

    // Carrega as fontes. fontsLoaded fica true quando terminam de carregar
    const [fontsLoaded] = useFonts({
        Poppins_700Bold,
        Montserrat_400Regular,
        Montserrat_700Bold
    });

    // ---------- Campos do formulário ----------
    const [usuario, setUsuario] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    
    // ---------- Controle de foco dos campos ----------
    // true quando o usuário está com o cursor naquele campo.
    // Serve para mudar a borda do campo (destaque azul) enquanto digita
    const [usuarioFocus, setUsuarioFocus] = useState(false);
    const [emailFocus, setEmailFocus] = useState(false);
    const [senhaFocus, setSenhaFocus] = useState(false);

    // ---------- Dados do usuário logado (exibidos na sidebar) ----------
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [tipoUsuario, setTipoUsuario] = useState(''); // 'admin' ou usuário comum

    // Toda vez que a tela ganha foco, busca os dados do usuário salvos no celular.
    // useCallback evita recriar a função a cada renderização.
    useFocusEffect(
      useCallback(() => {
        const carregarUsuario = async () => {
          // Lê os valores gravados no login
          const nome = await AsyncStorage.getItem('nomeUsuario');
          const tipo = await AsyncStorage.getItem('tipoUsuario');

          // Se não existir nada salvo, usa string vazia
          setNomeUsuario(nome || '');
          setTipoUsuario(tipo || '');
        };

        carregarUsuario();
      }, []) // [] = a função só é criada uma vez
    );

    // ---------- CADASTRAR USUÁRIO ----------
    // Valida os campos e envia os dados para o servidor
    const cadastrarUsuario = async () => {
    // try/catch captura erros (ex.: servidor desligado)
    try {

    // Validação: todos os campos são obrigatórios.
    // "!usuario" é true quando a string está vazia
    if (!usuario || !email || !senha) {
    Alert.alert('Atenção', 'Preencha todos os campos.');
    return; // interrompe a função aqui
    }

    // Envia os dados para o backend (o IP precisa ser o do computador que roda o Flask,
    // e o celular precisa estar na mesma rede Wi-Fi)
    const resposta = await fetch('http://10.154.20.25:5000/cadastro_app', {
    method: 'POST', // POST = enviar dados para criar algo
    headers: {
    // Avisa ao servidor que o corpo da requisição está em formato JSON
    'Content-Type': 'application/json',
    },
    // JSON.stringify transforma o objeto JavaScript em texto JSON.
    // As chaves (user, email, senha) devem bater com o que o Flask espera
    body: JSON.stringify({
    user: usuario,
    email: email,
    senha: senha,
    }),
    });

    // Lê a resposta do servidor em JSON
    const dados = await resposta.json();

    // Logs para depuração (aparecem no terminal do Expo)
    console.log('STATUS:', resposta.status);
    console.log('RESPOSTA DO SERVIDOR:', dados);
    
    // resposta.ok é false quando o status não é 200-299.
    // Mostra a mensagem enviada pelo servidor, ou uma mensagem padrão
    if (!resposta.ok) {
    Alert.alert('Erro', dados.mensagem || 'Não foi possível cadastrar.');
    return;
    }

    // Deu certo: mostra a mensagem de sucesso retornada pelo servidor
    Alert.alert('Sucesso', dados.mensagem);

    // Limpa os campos do formulário
    setUsuario('');
    setEmail('');
    setSenha('');

    // Vai para a tela de contas (replace não deixa voltar para cá)
    router.replace('/contas');

    } catch (erro) {
    // Cai aqui em erro de rede (servidor desligado, IP errado, sem Wi-Fi etc.)
    console.log('ERRO:', erro);
    Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    }
    };

  // Controla se a sidebar está aberta (true) ou fechada (false).
  // Aqui foi usado "var"; o padrão atual é "const", como nos outros estados
  var [menuAberto, setMenuAberto] = useState(false);

  // ============================================================
  // INTERFACE (JSX): o que aparece na tela
  // ============================================================
  return (
    <View style={styles.background}>

      {/* NAVBAR: barra azul superior com menu e links */}
      <View style={styles.navbar}>
        {/* Botão hambúrguer: inverte o valor de menuAberto (abre/fecha a sidebar) */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuAberto(!menuAberto)}
        >
          <MaterialIcons
            name="menu"
            size={30}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Links de navegação visíveis para todos.
            router.push empilha a tela (dá para voltar) */}
        <TouchableOpacity onPress={() => router.push('/tabela')}>
          <Text style={styles.link}>ESTOQUE</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/editar')}>
          <Text style={styles.link}>EDITAR</Text>
        </TouchableOpacity>

        {/* Renderização condicional: só mostra se o usuário for admin.
            O <> </> (Fragment) agrupa elementos sem criar uma View extra */}
        {tipoUsuario === 'admin' && (
          <>
            <TouchableOpacity
              onPress={() => router.push('/contas')}
            >
              <Text style={styles.link}>
                CONTAS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/cadastro')}
            >
              <Text style={styles.link}>
                CADASTRO
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* SIDEBAR: menu lateral com dados do usuário (só aparece se menuAberto for true) */}
      {menuAberto && (
        <View style={styles.sidebar}>
          {/* Botão X para fechar a sidebar */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setMenuAberto(false)}
          >
            <MaterialIcons
              name="close"
              size={25}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Informações do usuário logado */}
          <Text style={styles.sidebarTitulo}>USUÁRIO</Text>
          <Text style={styles.usuario}>{nomeUsuario}</Text>
          <Text style={styles.tipo}>
            {/* Operador ternário: se for admin mostra "Administrador", senão "Usuário" */}
            {tipoUsuario === 'admin' ? 'Administrador' : 'Usuário'}
          </Text>

          {/* Botão de logout: replace troca a tela e impede voltar com o botão "voltar" */}
          <TouchableOpacity
            style={styles.logout}
            onPress={() => router.replace('/login')}
          >
            <MaterialIcons
              name="logout"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.logoutTexto}>DESLOGAR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTEÚDO PRINCIPAL: título e formulário */}
      <View>
        <Text style={styles.titulo}>
          {"Boas-vindas ao\nCadastro de Usuários!"} {/* \n serve pra quebrar a linha, "Cadastro de Usuários!" fica embaixo de "Boas-vindas ao"*/}
        </Text>

        {/* FORMULÁRIO DE CADASTRO DE USUÁRIOS (dentro de um Card do React Native Paper) */}
        <Card style={styles.card}>

          {/* USUÁRIO.
              value mostra o estado; onChangeText atualiza o estado a cada letra digitada.
              onFocus/onBlur ligam e desligam o destaque da borda.
              O estilo é um array: aplica input_user sempre e inputFocus só quando o campo está focado */}
          <Text style={styles.label}>USUÁRIO</Text>

          <TextInput
            placeholder="Digite o usuário"
            style={[
              styles.input_user,
              usuarioFocus && styles.inputFocus
            ]}
            value={usuario}
            onChangeText={setUsuario}
            onFocus={() => setUsuarioFocus(true)}   // ganhou foco: ativa o destaque
            onBlur={() => setUsuarioFocus(false)}   // perdeu foco: desativa o destaque
          />

          {/* E-MAIL (keyboardType abre o teclado com "@" e ".com") */}
          <Text style={styles.label}>E-MAIL</Text>

          <TextInput
            placeholder="Digite o email"
            style={[
              styles.input_email,
              emailFocus && styles.inputFocus
            ]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
          />

          {/* SENHA (secureTextEntry esconde o que é digitado com bolinhas) */}
          <Text style={styles.label}>SENHA</Text>

          <TextInput
            placeholder="Digite a senha"
            style={[
              styles.input_senha,
              senhaFocus && styles.inputFocus
            ]}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            onFocus={() => setSenhaFocus(true)}
            onBlur={() => setSenhaFocus(false)}
          />


                {/* BOTÃO CADASTRAR: chama cadastrarUsuario ao ser pressionado */}
                <TouchableOpacity
                    style={styles.botao}
                    onPress={cadastrarUsuario}
                    >
                    <Text style={styles.btntexto}>CADASTRAR</Text>
                    </TouchableOpacity>

                </Card>
            </View>
            </View>
        );
        }

// ============================================================
// ESTILOS
// StyleSheet.create organiza os estilos em um objeto.
// Cores principais: azul #1D3273 e laranja #F28705
// ============================================================
const styles = StyleSheet.create({

    // Container principal: flex 1 ocupa a tela toda, com fundo cinza claro
    background: {
        flex: 1,
        backgroundColor: '#F0F1F2',
    },
    // Botão hambúrguer do menu
    menuButton: {
        marginRight: 10,
    },
    // Título principal (marginBottom grande empurra o card para baixo)
    titulo: {
    fontSize: 25,
    textAlign: 'center',
    color: '#1D3273',
    marginBottom: 105,
    fontFamily: 'Poppins_700Bold',
    },
    // Barra de navegação superior (flexDirection 'row' deixa os itens lado a lado)
    navbar: {
        height: 60,
        backgroundColor: '#1D3273',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingLeft: 10,
        marginTop: 30,
        marginBottom: 30,
        zIndex: 10,
    },
    // Links da navbar (ESTOQUE, EDITAR, CONTAS, CADASTRO)
    link: {
      color: '#FFFFFF',
      fontSize: 14,
      marginLeft: 22,
      fontFamily: 'Poppins_700Bold',
    },

    // Menu lateral: position 'absolute' o coloca sobre a tela,
    // e zIndex alto o deixa na frente dos outros elementos
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 30,
        width: 250,
        height: '100%',
        backgroundColor: '#1D3273',
        zIndex: 100,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    // Título "USUÁRIO" da sidebar
    sidebarTitulo: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 30,
    },
    // Nome do usuário na sidebar
    usuario: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 5,
    },
    // Texto "Administrador" / "Usuário" na sidebar
    tipo: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: 30,
    },
    // Botão de logout com linha separadora no topo (borderTop)
    logout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // espaço entre o ícone e o texto
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.3)',
    },
    logoutTexto: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    // Botão X no canto superior direito da sidebar
    closeButton: {
        position: 'absolute',
        right: 10,
        top: 2,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Card branco do formulário com borda laranja
    // (overflow 'hidden' corta o que passar das bordas arredondadas)
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        justifyContent: 'center',
        marginLeft: 40,
        marginRight: 40,
        borderWidth: 2,
        borderColor: '#F28705',
        borderRadius: 8,
        overflow: 'hidden',
    },
    // Rótulo acima de cada campo (alinhado com a largura dos inputs)
    label: {
      color: '#1D3273',
      fontFamily: 'Poppins_700Bold',
      fontSize: 14,
      marginBottom: 5,
      width: 240,
      alignSelf: 'center',
    },

  // Estilo genérico de input (não está sendo usado no JSX,
  // pois cada campo usa input_user, input_email ou input_senha)
  input: {
    width: 240,
    height: 40,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 0,
    marginBottom: 20,
    paddingHorizontal: 10,
},

// Estilo de campo ativo (também não está sendo usado; o que vale é o inputFocus)
inputAtivo: {
    borderWidth: 2,
    borderColor: '#1D3273',
},
    // Botão CADASTRAR (alignSelf 'center' centraliza dentro do card)
    botao: {
        marginBottom: 10,
        backgroundColor: '#1D3273',
        alignSelf: 'center',
        justifyContent: 'center',
        width: 240,
        height: 40,
        borderRadius: 5,
    },
    // Texto do botão
    btntexto: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
        alignSelf: 'center',
    },
    // Campo de usuário (borda cinza clara no estado normal)
    input_user: {
      width: 240,
      height: 40,
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 5,
      borderWidth: 1,
      borderColor: '#D4D4D4',
      marginBottom: 20,
      paddingHorizontal: 10,
    },

// Campo de e-mail (mesmo estilo do campo de usuário)
input_email: {
  width: 240,
  height: 40,
  alignSelf: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#D4D4D4',
  marginBottom: 20,
  paddingHorizontal: 10,
},

// Campo de senha (mesmo estilo do campo de usuário)
input_senha: {
  width: 240,
  height: 40,
  alignSelf: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#D4D4D4',
  marginBottom: 20,
  paddingHorizontal: 10,
},

// Borda azul e mais grossa aplicada quando o campo está focado.
// Vem depois do input_*, então sobrescreve a borda cinza
inputFocus: {
  borderColor: '#1D3273',
  borderWidth: 2,
},

    // Repetição do estilo inputFocus acima. Em um objeto JavaScript, a chave repetida
    // sobrescreve a anterior, então esta cópia pode ser apagada sem mudar nada
    inputFocus: {
      borderColor: '#1D3273',
      borderWidth: 2,
    },

});
