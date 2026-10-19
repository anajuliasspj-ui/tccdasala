// ============================================================
// TELA: EDITAR (entrada e saída de produtos do almoxarifado)
// Permite registrar a entrada ou saída de um produto, enviando
// os dados (e opcionalmente uma imagem) para o backend Flask.
// ============================================================

// Componentes básicos do React Native
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, FlatList, Modal, Alert, ScrollView} from 'react-native';
// Fontes personalizadas (Poppins para títulos, Montserrat para textos)
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
// Ícones (menu, fechar, logout, imagem)
import { MaterialIcons } from '@expo/vector-icons';
// Hooks do React: useState guarda valores que mudam, useCallback memoriza funções
import { useState, useCallback } from 'react';
// Armazenamento local do celular (guarda nome e tipo do usuário logado)
import AsyncStorage from '@react-native-async-storage/async-storage';
// Classe File do Expo, usada para anexar a imagem no envio
import { File } from 'expo-file-system';
// router navega entre telas; useFocusEffect roda código quando a tela ganha foco
import { router, useFocusEffect } from 'expo-router';
// Biblioteca para escolher imagens da galeria
import * as ImagePicker from 'expo-image-picker';

export default function Editar() {

  // Carrega as fontes. Enquanto não carregam, fontsLoaded fica false
  const [fontsLoaded] = useFonts({
      Poppins_700Bold,
      Montserrat_400Regular,
      Montserrat_700Bold
  });

  // Controla se a barra lateral (sidebar) está aberta (true) ou fechada (false)
  const [menuAberto, setMenuAberto] = useState(false);

  // Tipo da operação: 'entrada' ou 'saida'
  const [tipo, setTipo] = useState('entrada');

  // ---------- Campos do formulário do produto ----------
  // Cada campo tem um estado: o valor atual e a função que o altera
  const [nome, setNome] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(''); 
  const [preco, setPreco] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [estoqueMin, setEstoqueMin] = useState('');
  const [imagem, setImagem] = useState(null); // imagem escolhida (null = nenhuma)

  // ---------- Dados do usuário logado ----------
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
  
          // Se não existir nada salvo, usa string vazia ('' é o valor padrão)
          setNomeUsuario(nome || '');
          setTipoUsuario(tipo || '');
        };
  
        carregarUsuario();
      }, []) // [] = a função só é criada uma vez
    );

  // Indica se o envio está em andamento (desabilita o botão e muda o texto)
  const [carregando, setCarregando] = useState(false);

  // ---------- Escolher imagem da galeria ----------
  // Pede permissão de acesso às fotos e abre a galeria
  const escolherImagem = async () => {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

  // Se o usuário negou a permissão, avisa e interrompe a função (return)
  if (!permissao.granted) {
    Alert.alert(
      'Permissão necessária',
      'Permita o acesso às fotos para escolher uma imagem.'
    );
    return;
  }

  // Abre a galeria: só imagens, com edição (corte) e qualidade 80%
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  // Se o usuário não cancelou, guarda a primeira imagem escolhida
  if (!resultado.canceled) {
    setImagem(resultado.assets[0]);
  }
};

  // ---------- CONFIRMAR OPERAÇÃO ----------
  // Valida os campos e envia os dados para o servidor
  const confirmarOperacao = async () => {

    // Campos obrigatórios: nome, quantidade e responsável.
    // "!nome" é true quando a string está vazia
    if (!nome || !quantidade || !responsavel) {
      Alert.alert(
        'Atenção',
        'Preencha o nome, a quantidade e o responsável'
      );
      return;
    }

    // Converte a quantidade (texto) para número inteiro e valida
    const quantidadeNumero = parseInt(quantidade);

    // isNaN = "não é um número"; também bloqueia zero e negativos
    if (isNaN(quantidadeNumero) || quantidadeNumero <= 0) {
      Alert.alert(
        'Atenção',
        'Digite uma quantidade válida'
      );
      return;
    }

    // Converte o preço para decimal. replace troca vírgula por ponto
    // (parseFloat só entende ponto). Se o campo estiver vazio, usa 0
     const precoNumero = preco ? parseFloat(preco.replace(',', '.')) : 0;

    if (isNaN(precoNumero) || precoNumero < 0) {
      Alert.alert(
        'Atenção',
         'Digite um preço válido'
        );
      return;
    }

      // Ativa o estado de carregamento (bloqueia cliques repetidos)
      setCarregando(true);

      // try/catch/finally: tenta executar, trata erros e sempre limpa no final
      try {

        // FormData permite enviar texto e arquivo juntos (multipart/form-data)
        const formulario = new FormData();

        // O primeiro valor é o nome do campo e deve bater com o que o Flask espera
        formulario.append('nome', nome);
        formulario.append('categoria', categoria);
        formulario.append('qtde', quantidade);
        formulario.append('responsavel', responsavel);
        formulario.append('estoque_min', estoqueMin || '0'); // se vazio, envia '0'
        formulario.append('preco', String(precoNumero));
        formulario.append('descricao', descricao);
        formulario.append('tipo', tipo);

        // Só anexa a imagem se o usuário escolheu uma
        // (?. evita erro caso imagem seja null)
        if (imagem?.uri) {
          const arquivo = new File(imagem.uri);

          formulario.append('imagem', arquivo);
        }

        // Envia para o backend. O IP precisa ser o do computador que roda o Flask,
        // e o celular precisa estar na mesma rede Wi-Fi
        const resposta = await fetch(
          'http://10.154.20.25:5000/entrada_app',
          {
            method: 'POST',
            body: formulario,
          }
        );

        // Lê a resposta do servidor em JSON
        const dados = await resposta.json();

        // Logs para depuração (aparecem no terminal do Expo)
        console.log('STATUS:', resposta.status);
        console.log('RESPOSTA:', dados);

        // resposta.ok é false quando o status não é 200-299.
        // Mostra o erro enviado pelo servidor, ou uma mensagem padrão
        if (!resposta.ok) {
          Alert.alert(
            'Erro',
            dados.erro || 'Não foi possível realizar a operação'
          );
          return;
        }

        // Mensagem de sucesso conforme o tipo da operação (operador ternário)
        Alert.alert(
          'Sucesso',
          tipo === 'entrada'
            ? 'Entrada realizada com sucesso!'
            : 'Saída realizada com sucesso!'
        );

        // Limpa os campos do formulário
        setNome('');
        setResponsavel('');
        setDescricao('');
        setCategoria('');
        setPreco('');
        setQuantidade('');
        setEstoqueMin('');
        setImagem(null);

        // Vai para a tela da tabela de estoque (replace não deixa voltar para cá)
        router.replace('/tabela');

      } catch (erro) {

        // Cai aqui em erro de rede (servidor desligado, IP errado, sem Wi-Fi etc.)
        console.log('ERRO:', erro);

        Alert.alert(
          'Erro',
          'Não foi possível conectar ao servidor'
        );

      } finally {

        // O finally roda sempre, dando certo ou errado: desliga o carregamento
        setCarregando(false);

      }
};

  // ============================================================
  // INTERFACE (JSX): o que aparece na tela
  // ============================================================
  return (
    <View style={styles.container}>

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
        <TouchableOpacity
          onPress={() => router.push('/tabela')}
        >
          <Text style={styles.link}>
            ESTOQUE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/editar')}
        >
          <Text style={styles.link}>
            EDITAR
          </Text>
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

            <Text style={styles.logoutTexto}>
              DESLOGAR
            </Text>

          </TouchableOpacity>

        </View>

      )}

      {/* CONTEÚDO: área rolável com o formulário */}

      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >

        {/* TÍTULO da página (\n quebra a linha) */}

        <Text style={styles.titulo}>
          {'Boas-vindas ao\nEditar almoxarifado!'}
        </Text>

        {/* BOTÕES ENTRADA / SAÍDA.
            O estilo é um array: aplica botaoTipo sempre e botaoSelecionado
            só quando o tipo atual for igual ao do botão */}

        <View style={styles.botoesTipo}>
          <TouchableOpacity
            style={[
              styles.botaoTipo,
              tipo === 'entrada' && styles.botaoSelecionado
            ]}
            onPress={() => setTipo('entrada')}
          >

            <Text style={styles.textoBotao}>
              ENTRADA
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botaoTipo,
              tipo === 'saida' && styles.botaoSelecionado
            ]}
            onPress={() => setTipo('saida')}
          >

            <Text style={styles.textoBotao}>
              SAÍDA
            </Text>

          </TouchableOpacity>

        </View>

        {/* CARD: caixa branca com borda laranja que contém o formulário */}
        <View style={styles.card}>

          {/* Título do card muda conforme o tipo da operação */}
          <Text style={styles.produtosTitulo}>
            {tipo === 'entrada'
              ? 'ENTRADA DE PRODUTO'
              : 'SAÍDA DE PRODUTO'}
          </Text>

          {/* NOME (obrigatório).
              value mostra o estado; onChangeText atualiza o estado a cada letra digitada */}
          <Text style={styles.label}>
            NOME
          </Text>

          <TextInput
            style={styles.campo}
            placeholder="Digite o nome"
            placeholderTextColor="#8A8A8A"
            value={nome}
            onChangeText={setNome}
          />

          {/* RESPONSÁVEL (obrigatório) */}
          <Text style={styles.label}>
            RESPONSÁVEL
          </Text>

          <TextInput
            style={styles.campo}
            placeholder="Digite o responsável"
            placeholderTextColor="#8A8A8A"
            value={responsavel}
            onChangeText={setResponsavel}
          />

          {/* CATEGORIA */}
          <Text style={styles.label}>
            CATEGORIA
          </Text>

          <TextInput
            style={styles.campo}
            placeholder="Digite a categoria"
            placeholderTextColor="#8A8A8A"
            value={categoria}
            onChangeText={setCategoria}
          />

            {/* PREÇO (teclado decimal; aceita vírgula ou ponto) */}
            <Text style={styles.label}>
              PREÇO
            </Text>

            <TextInput
              style={styles.campo}
              placeholder="Digite o preço"
              placeholderTextColor="#8A8A8A"
              value={preco}
              onChangeText={setPreco}
              keyboardType="decimal-pad"
            />
                
          {/* QUANTIDADE (obrigatória, teclado numérico) */}
          <Text style={styles.label}>
            QUANTIDADE
          </Text>

          <TextInput
            style={styles.campo}
            placeholder="Digite a quantidade"
            placeholderTextColor="#8A8A8A"
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="numeric"
          />

          {/* ESTOQUE MÍNIMO (se vazio, é enviado como 0) */}
          <Text style={styles.label}>
            ESTOQUE MÍNIMO
          </Text>

          <TextInput
            style={styles.campo}
            placeholder="Digite o estoque mínimo"
            placeholderTextColor="#8A8A8A"
            value={estoqueMin}
            onChangeText={setEstoqueMin}
            keyboardType="numeric"
          />

          {/* DESCRIÇÃO (campo maior; multiline permite várias linhas) */}
          <Text style={styles.label}>
            DESCRIÇÃO
          </Text>

          <TextInput
            style={[
              styles.campo,
              styles.campoDescricao
            ]}
            placeholder="Descrição do produto"
            placeholderTextColor="#8A8A8A"
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />

          {/* IMAGEM: botão que chama escolherImagem para abrir a galeria */}
          <Text style={styles.label}>
            IMAGEM
          </Text>

          <TouchableOpacity
            style={styles.botaoImagem}
            onPress={escolherImagem}
          >
            <MaterialIcons
              name="image"
              size={22}
              color="#FFFFFF"
            />

            {/* O texto muda se já houver uma imagem escolhida */}
            <Text style={styles.textoImagem}>
              {imagem ? 'ALTERAR IMAGEM' : 'ADICIONAR IMAGEM'}
            </Text>
          </TouchableOpacity>

          {/* Pré-visualização: só aparece se existir uma imagem escolhida */}
          {imagem && (
            <Image
              source={{ uri: imagem.uri }}
              style={styles.previewImagem}
              resizeMode="cover"
            />
          )}

          {/* BOTÃO CONFIRMAR: chama confirmarOperacao.
              Enquanto carregando for true, fica desabilitado e com opacidade menor */}
          <TouchableOpacity
            style={[
              styles.botaoConfirmar,
              carregando && styles.botaoDesabilitado
            ]}
            onPress={confirmarOperacao}
            disabled={carregando}
          >

            <Text style={styles.textoConfirmar}>
              {carregando
                ? 'ENVIANDO...'
                : 'CONFIRMAR'}
            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#F0F1F2',
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

  // Botão hambúrguer do menu
  menuButton: {
    marginRight: 10,
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

  // Estilo extra para o tipo de usuário (não está sendo usado no JSX)
  tipoUsuario: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 30,
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
    gap: 10, // espaço entre o ícone e o texto
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },

  logoutTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },

  // Espaço extra no fim da área rolável
  conteudo: {
    paddingBottom: 40,
  },

  // Título principal da página
  titulo: {
    fontSize: 25,
    textAlign: 'center',
    color: '#1D3273',
    marginBottom: 25,
    fontFamily: 'Poppins_700Bold',
  },

  // Linha que contém os botões ENTRADA e SAÍDA (centralizados, lado a lado)
  botoesTipo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },

  // Botão ENTRADA/SAÍDA no estado normal (azul mais claro)
  botaoTipo: {
    minWidth: 110,
    height: 42,
    borderRadius: 5,
    borderColor: '#1D3273',
    borderWidth: 2,
    backgroundColor: '#51608C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
  },

  // Estado selecionado: azul escuro com borda laranja (sobrescreve o botaoTipo)
  botaoSelecionado: {
    backgroundColor: '#1D3273',
    borderColor: '#F28705',
  },

  textoBotao: {
    fontSize: 15,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Card branco do formulário com borda laranja
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 22,
    borderWidth: 2,
    borderColor: '#F28705',
  },

  // Título dentro do card
  produtosTitulo: {
    color: '#1D3273',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },

  // Rótulo acima de cada campo
  label: {
    color: '#1D3273',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },

  // Estilo padrão dos campos de texto
  campo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A64A3',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: '#333333',
  },

  // Campo de descrição: mais alto e com texto alinhado ao topo
  campoDescricao: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  // Botão de adicionar/alterar imagem
  botaoImagem: {
    height: 45,
    backgroundColor: '#1D3273',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 5,
  },

  textoImagem: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Pré-visualização da imagem escolhida
  previewImagem: {
    width: '100%',
    height: 180,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4A64A3',
  },

  // Botão CONFIRMAR
  botaoConfirmar: {
    height: 45,
    backgroundColor: '#1D3273',
    borderRadius: 6,
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // Aparência do botão enquanto está enviando (mais transparente)
  botaoDesabilitado: {
    opacity: 0.6,
  },

  textoConfirmar: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

});
