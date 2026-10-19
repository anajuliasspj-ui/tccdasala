// ============================================================
// TELA: CONTAS (gerenciador de contas, só para admin)
// Lista os usuários cadastrados no banco, mostra detalhes
// (e-mail e tipo) e permite excluir um usuário.
// ============================================================

// Componentes básicos do React Native.
// FlatList renderiza listas grandes de forma eficiente (só desenha o que aparece na tela)
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
// Fontes personalizadas (Poppins para títulos, Montserrat para textos)
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat';
// Ícones (menu, fechar, logout, olho, lixeira)
import { MaterialIcons } from '@expo/vector-icons';
// Hooks do React: useState guarda valores que mudam, useEffect executa código
// em momentos específicos (ao abrir a tela, quando algo muda...)
import { useState, useEffect } from 'react';
// router navega entre telas; usePathname devolve o caminho da tela atual (ex.: '/contas')
import { router, usePathname } from 'expo-router';
// Armazenamento local do celular (guarda nome e tipo do usuário logado)
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Usuarios() {

  // Carrega as fontes. fontsLoaded fica true quando terminam de carregar
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Montserrat_400Regular,
  });

  // ---------- Estados da tela ----------
  // Guarda o ID do usuário cujos detalhes estão abertos (null = nenhum aberto)
  const [produtoAberto, setProdutoAberto] = useState(null);
  // Controla se a sidebar está aberta (true) ou fechada (false)
  const [menuAberto, setMenuAberto] = useState(false);
  // Dados do usuário logado (exibidos na sidebar)
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState(''); // 'admin' ou usuário comum
  // Lista de usuários que vem do banco de dados (começa vazia: [])
  const [usuarios, setUsuarios] = useState([]);

  // Descobre em qual tela estamos (ex.: '/contas', '/tabela')
  const pathname = usePathname();

  // ---------- BUSCAR USUÁRIOS DO BANCO ----------
  // useEffect roda quando a tela abre e sempre que o valor em [pathname] mudar
  useEffect(() => {

    // Função assíncrona que consulta o servidor
    const buscarUsuarios = async () => {

      // try/catch captura erros (ex.: servidor desligado)
      try {

        // Requisição GET (é o padrão do fetch quando não se informa o method)
        const resposta = await fetch(
          'http://10.154.20.25:5000/contas_app'
        );

        // Logs para depuração (aparecem no terminal do Expo)
        console.log('STATUS:', resposta.status);

        // Lê a resposta do servidor em JSON
        const dados = await resposta.json();

        console.log('USUÁRIOS:', dados);

        // O backend devolve { success: true, usuarios: [...] }.
        // Se deu certo, guarda a lista no estado e a tela é atualizada
        if (dados.success) {
          setUsuarios(dados.usuarios);
        }

      } catch (erro) {

        // Cai aqui em erro de rede (servidor desligado, IP errado, sem Wi-Fi etc.)
        console.log('Erro ao buscar usuários:', erro);

      }

    };

    // Só busca quando estiver na tela CONTAS
    if (pathname === '/contas') {
      buscarUsuarios();
    }

  }, [pathname]); // [pathname] = refaz a busca sempre que a tela mudar

  // ---------- EXCLUIR USUÁRIO ----------
  // Recebe o id do usuário e pede confirmação antes de apagar
  const excluirUser = (id) => {
    // Alert.alert aceita um terceiro parâmetro: a lista de botões do alerta
    Alert.alert(
      'Excluir usuário',
      'Tem certeza que deseja excluir este usuário?',
      [
        // Botão de cancelar: só fecha o alerta (style 'cancel' dá o visual padrão)
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive', // no iOS deixa o botão vermelho
          // onPress é async porque faz uma requisição ao servidor
          onPress: async () => {
            try {
              // Requisição DELETE. O id vai na URL (template string com crase e ${id})
              const resposta = await fetch(
                `http://10.154.20.25:5000/excluirUsuario/${id}`,
                { method: 'DELETE' }
              );

              const data = await resposta.json();
              console.log('RESPOSTA EXCLUIR:', data);

              if (data.success) {
                Alert.alert('Sucesso', 'Item excluído com sucesso!');

                // Remove da tabela sem precisar recarregar.
                // filter cria uma nova lista só com os usuários de id diferente do excluído.
                // A forma (usuariosAtuais) => ... garante que se usa o valor mais recente do estado
                setUsuarios((usuariosAtuais) =>
                  usuariosAtuais.filter((user) => user.id !== id)
                );
              } else {
                // Mostra o erro enviado pelo servidor, ou uma mensagem padrão
                Alert.alert('Erro', data.erro || 'Erro ao excluir o usuário.');
              }
            } catch (erro) {
              // Erro de rede
              console.log('ERRO AO EXCLUIR:', erro);
              Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
            }
          },
        },
      ]
    );
  };

  // ---------- CARREGAR USUÁRIO LOGADO ----------
  // Com [] no final, este efeito roda uma única vez, quando a tela é criada
  useEffect(() => {

    const carregarUsuario = async () => {

      // Lê os valores gravados no login
      const nome = await AsyncStorage.getItem('nomeUsuario');
      const tipo = await AsyncStorage.getItem('tipoUsuario');

      // Se não existir nada salvo, usa string vazia
      setNomeUsuario(nome || '');
      setTipoUsuario(tipo || '');

    };

    carregarUsuario();

  }, []);


  // Enquanto as fontes não carregam, não desenha nada (evita a tela "piscar").
  // Retornar null significa "não renderizar nada"
  if (!fontsLoaded) {
    return null;
  }


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
          <Text style={styles.sidebarTitulo}>
            USUÁRIO
          </Text>


          <Text style={styles.usuario}>
            {nomeUsuario}
          </Text>


          <Text style={styles.tipo}>
            {/* Operador ternário: se for admin mostra "Administrador", senão "Usuário" */}
            {tipoUsuario === 'admin'
              ? 'Administrador'
              : 'Usuário'}
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


      {/* TÍTULO da página */}
      <Text style={styles.titulo}>
        Boas-Vindas ao Gerenciador de Contas!
      </Text>

      {/* TABELA: caixa branca com borda laranja que contém cabeçalho e lista */}
      <View style={styles.tabela}>

        {/* CABEÇALHO: as três colunas (ID, NOME, AÇÃO) usam as mesmas larguras
            das linhas de usuário (15%, 65% e 20%), por isso ficam alinhadas */}
        <View style={styles.linha}>
          <View style={styles.id}>
            <Text style={styles.cabecalho}>
              ID
            </Text>
          </View>

          <View style={styles.nome}>
            <Text style={styles.cabecalho}>
              NOME
            </Text>
          </View>

          <View style={styles.acao}>
            <Text style={styles.cabecalho}>
              AÇÃO
            </Text>
          </View>
        </View>

        {/* LISTA DE USUÁRIOS.
            data = lista de dados; renderItem = como desenhar cada item.
            keyExtractor define a chave única de cada item (o React usa para identificá-los).
            O id é convertido em texto com toString(), pois a chave precisa ser string */}
        <FlatList
          data={usuarios}
          keyExtractor={(item) =>
            item.id.toString()
          }
          renderItem={({ item }) => (
            <>
              {/* LINHA DO USUÁRIO: id, nome e botões de ação */}
              <View style={styles.linha}>
                <View style={styles.id}>
                  <Text style={styles.texto}>
                    {item.id}
                  </Text>
                </View>

                <View style={styles.nome}>
                  <Text style={styles.texto}>
                    {item.nome}
                  </Text>
                </View>

                <View style={styles.acao}>
                  {/* Botão do olho: abre/fecha os detalhes deste usuário.
                      Se o id já estiver aberto, volta para null (fecha); senão guarda o id (abre) */}
                  <TouchableOpacity
                    style={styles.botao}
                    onPress={() =>
                      setProdutoAberto(
                        produtoAberto === item.id ? null : item.id
                      )
                    }
                  >
                    <MaterialIcons
                      name="visibility"
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  {/* Botão da lixeira: chama excluirUser passando o id deste usuário */}
                  <TouchableOpacity
                    style={styles.botaoExcluir}
                    onPress={() => excluirUser(item.id)}
                  >
                    <MaterialIcons
                      name="delete"
                      size={24}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* DETALHES: só aparece para o usuário cujo id está em produtoAberto */}
              {produtoAberto === item.id && (
                <View style={styles.detalhes}>
                  <Text style={styles.detalhe}>
                    {/* Text dentro de Text: o de dentro (negrito) herda o restante do estilo */}
                    <Text style={styles.negrito}>
                      E-MAIL:
                    </Text>
                    {/* {' '} insere um espaço em branco entre o rótulo e o valor */}
                    {' '}
                    {item.email}
                  </Text>

                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>
                      TIPO:
                    </Text>
                    {' '}
                    {item.tipo === 'admin'
                      ? 'Administrador'
                      : 'Usuário'}
                  </Text>
                </View>
              )}
            </>
          )}
        />
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

  // Título principal da página
  titulo: {
    fontSize: 25,
    textAlign: 'center',
    color: '#1D3273',
    marginBottom: 25,
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

  // Caixa da tabela (overflow 'hidden' corta o que passar das bordas arredondadas)
  tabela: {
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F28705',
    borderRadius: 8,
    overflow: 'hidden',
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

  // Nome do usuário logado na sidebar
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

  // Uma linha da tabela (colunas lado a lado, com linha laranja embaixo)
  linha: {
    flexDirection: 'row',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F28705',
  },

  // Coluna do ID: 15% da largura, conteúdo centralizado, linha laranja à direita
  id: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F28705',
  },

  // Coluna do NOME: 65% da largura (15% + 65% + 20% = 100%)
  nome: {
    width: '65%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F28705',
  },

// Coluna de AÇÃO: 20% da largura, botões lado a lado (flexDirection 'row')
acao: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // Texto do cabeçalho da tabela (ID, NOME, AÇÃO)
  cabecalho: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
  },

  // Texto das células da tabela
  texto: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },

  // Botão do olho (ver detalhes): quadrado azul pequeno com cantos arredondados
  botao: {
    width: 26,
    height: 26,
    backgroundColor: '#1D3273',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Botão da lixeira (mesmo visual do botão do olho)
  botaoExcluir: {
    width: 26,
    height: 26,
    backgroundColor: '#1D3273',
    borderRadius: 5,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
  },

  // Área de detalhes que aparece abaixo da linha do usuário
  detalhes: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F28705',
  },

  // Cada linha de detalhe (e-mail, tipo)
  detalhe: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 4,
  },

  // Texto em negrito dos rótulos "E-MAIL:" e "TIPO:"
  negrito: {
    fontWeight: 'bold',
  },
});
