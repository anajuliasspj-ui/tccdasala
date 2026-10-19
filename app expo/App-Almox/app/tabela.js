// ============================================================
// TELA: TABELA (estoque do almoxarifado)
// Lista os produtos cadastrados no banco, mostra detalhes
// (categoria, quantidade, preço, descrição, imagem) e permite
// excluir um produto.
// ============================================================

// Componentes básicos do React Native.
// FlatList renderiza listas grandes de forma eficiente (só desenha o que aparece na tela).
// Modal cria uma janela que aparece por cima da tela (usada no popup da imagem)
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal, Alert} from 'react-native';
// Fontes personalizadas (Poppins para títulos, Montserrat para textos)
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
// Ícones (menu, fechar, logout, olho, lixeira, imagem)
import { MaterialIcons } from '@expo/vector-icons';
// Hooks do React: useState guarda valores que mudam, useCallback memoriza funções
import { useState, useCallback } from 'react';
// Armazenamento local do celular (guarda nome e tipo do usuário logado)
import AsyncStorage from '@react-native-async-storage/async-storage';
// router navega entre telas; useFocusEffect roda código quando a tela ganha foco
import { router, useFocusEffect } from 'expo-router';

export default function Tabela() {

  // Carrega as fontes. fontsLoaded fica true quando terminam de carregar
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Montserrat_400Regular,
  });

  // ---------- Estados da tela ----------
  // Guarda o ID do produto cujos detalhes estão abertos (null = nenhum aberto)
  const [produtoAberto, setProdutoAberto] = useState(null);
  // Controla se a sidebar está aberta (true) ou fechada (false)
  const [menuAberto, setMenuAberto] = useState(false);
  // Guarda o caminho da imagem que está aberta no popup (null = popup fechado)
  const [imagemAberta, setImagemAberta] = useState(null);
  // Lista de produtos que vem do banco de dados (começa vazia: [])
  const [produtos, setProdutos] = useState([]);
  // Dados do usuário logado (exibidos na sidebar)
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState(''); // 'admin' ou usuário comum

  // ---------- CARREGAR USUÁRIO LOGADO ----------
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

  // ---------- BUSCAR PRODUTOS DO BANCO ----------
  // Também roda toda vez que a tela ganha foco. Assim, ao voltar da tela Editar
  // (depois de uma entrada/saída), a tabela já aparece atualizada
  useFocusEffect(
  useCallback(() => {
    // Função assíncrona que consulta o servidor
    const buscarProdutos = async () => {
      // try/catch captura erros (ex.: servidor desligado)
      try {
        // Requisição GET (é o padrão do fetch quando não se informa o method).
        // O IP precisa ser o do computador que roda o Flask,
        // e o celular precisa estar na mesma rede Wi-Fi
        const resposta = await fetch('http://10.154.20.25:5000/tabela_app');
        // Lê a resposta do servidor em JSON
        const dados = await resposta.json();

        // O backend devolve { success: true, produtos: [...] }
        if (dados.success) {
          // map percorre a lista e cria uma nova, com os campos organizados.
          // Aqui o campo do banco "qtde" é renomeado para "quantidade"
          const produtosFormatados = dados.produtos.map((item) => ({
            id: item.id,
            responsavel: item.responsavel,
            nome: item.nome,
            categoria: item.categoria,
            quantidade: item.qtde,
            estoque_min: item.estoque_min,
            preco: item.preco,
            descricao: item.descricao,
            imagem: item.imagem,
          }));

          // Guarda a lista no estado e a tela é atualizada
          setProdutos(produtosFormatados);
        }
      } catch (erro) {
        // Cai aqui em erro de rede (servidor desligado, IP errado, sem Wi-Fi etc.)
        console.log('ERRO AO BUSCAR PRODUTOS:', erro);
      }
    };

    buscarProdutos();
  }, [])
);

// ---------- EXCLUIR ITEM ----------
// Recebe o id do produto e pede confirmação antes de apagar
const excluirItem = (id) => {
  // Alert.alert aceita um terceiro parâmetro: a lista de botões do alerta
  Alert.alert(
    'Excluir item',
    'Tem certeza que deseja excluir este item?',
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
              `http://10.154.20.25:5000/excluir/${id}`,
              { method: 'DELETE' }
            );

            const data = await resposta.json();
            console.log('RESPOSTA EXCLUIR:', data);

            if (data.success) {
              Alert.alert('Sucesso', 'Item excluído com sucesso!');

              // Remove da tabela sem precisar recarregar.
              // filter cria uma nova lista só com os produtos de id diferente do excluído.
              // A forma (produtosAtuais) => ... garante que se usa o valor mais recente do estado
              setProdutos((produtosAtuais) =>
                produtosAtuais.filter((item) => item.id !== id)
              );
            } else {
              // Mostra o erro enviado pelo servidor, ou uma mensagem padrão
              Alert.alert('Erro', data.erro || 'Erro ao excluir o item.');
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

  // ============================================================
  // INTERFACE (JSX): o que aparece na tela
  // ============================================================
  return (
    <View style={styles.background}>

{/* POPUP DA IMAGEM: janela por cima da tela.
    visible só é true quando existe uma imagem escolhida (imagemAberta diferente de null).
    transparent deixa ver a tela por trás; animationType "fade" faz aparecer suavemente.
    onRequestClose fecha o popup com o botão "voltar" do Android */}
<Modal
  visible={imagemAberta !== null}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setImagemAberta(null)}
>
  {/* Fundo escuro semitransparente que cobre a tela toda */}
  <View style={styles.fundoPopup}>
    {/* Caixa branca centralizada que contém a imagem */}
    <View style={styles.popup}>

      {/* Botão X para fechar o popup (volta o estado para null) */}
      <TouchableOpacity
        style={styles.fecharPopup}
        onPress={() => setImagemAberta(null)}
      >
        <MaterialIcons
          name="close"
          size={25}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* A imagem só é desenhada se imagemAberta tiver valor.
          O banco guarda só o caminho (ex.: /static/foto.png), então
          o endereço do servidor é colocado na frente para formar a URL completa.
          resizeMode "contain" mostra a imagem inteira, sem cortar */}
      {imagemAberta && (
        <Image
          source={{
            uri: `http://10.154.20.25:5000${imagemAberta}`
          }}
          style={styles.imagemPopup}
          resizeMode="contain"
        />
      )}

    </View>
  </View>
</Modal>

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

      {/* TÍTULO da página (\n quebra a linha) */}
      <Text style={styles.titulo}>
        {"Boas-vindas ao\nAlmoxarifado!"}
      </Text>

      {/* TABELA: caixa branca com borda laranja que contém cabeçalho e lista */}
      <View style={styles.tabela}>

        {/* CABEÇALHO: as quatro colunas usam as mesmas larguras das linhas
            de produto (15%, 30%, 35% e 20%), por isso ficam alinhadas */}
        <View style={styles.linha}>
          <View style={styles.id}>
            <Text style={styles.cabecalho}>ID</Text>
          </View>
          <View style={styles.nome}>
            <Text style={styles.cabecalho}>NOME</Text>
          </View>
          <View style={styles.responsavel}>
            <Text style={styles.cabecalho}>RESPONSÁVEL</Text>
          </View>
          <View style={styles.acao}>
            <Text style={styles.cabecalho}>AÇÃO</Text>
          </View>
        </View>

        {/* LISTA DE PRODUTOS.
            data = lista de dados; renderItem = como desenhar cada item.
            keyExtractor define a chave única de cada item (o React usa para identificá-los).
            O id é convertido em texto com toString(), pois a chave precisa ser string */}
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <>
              {/* LINHA DO PRODUTO: id, nome, responsável e botões de ação */}
              <View style={styles.linha}>
                <View style={styles.id}>
                  <Text style={styles.texto}>{item.id}</Text>
                </View>

                <View style={styles.nome}>
                  <Text style={styles.texto}>{item.nome}</Text>
                </View>

                <View style={styles.responsavel}>
                  <Text style={styles.texto}>{item.responsavel}</Text>
                </View>

                <View style={styles.acao}>
                  {/* Botão do olho: abre/fecha os detalhes deste produto.
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
                  {/* Botão da lixeira: chama excluirItem passando o id deste produto */}
                  <TouchableOpacity
                      style={styles.botaoExcluir}
                      onPress={() => excluirItem(item.id)}
                    >
                      <MaterialIcons
                        name="delete"
                        size={24}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                </View>
              </View>

              {/* DETALHES A MAIS: só aparece para o produto cujo id está em produtoAberto.
                  Text dentro de Text: o de dentro (negrito) herda o restante do estilo */}
              {produtoAberto === item.id && (
                <View style={styles.detalhes}>
                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>CATEGORIA:</Text> {item.categoria}
                  </Text>

                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>QUANTIDADE:</Text> {item.quantidade}
                  </Text>

                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>QUANT MÍN:</Text> {item.estoque_min}
                  </Text>

                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>PREÇO:</Text> {item.preco}
                  </Text>

                  <Text style={styles.detalhe}>
                    <Text style={styles.negrito}>DESCRIÇÃO:</Text> {item.descricao}
                  </Text>

                  {/* Botão da imagem: guarda o caminho da imagem do produto em imagemAberta,
                      o que faz o Modal (popup) aparecer */}
                  <TouchableOpacity
                    style={styles.botaoImagem}
                    onPress={() => setImagemAberta(item.imagem)}
                  >
                    <MaterialIcons
                      name="image"
                      size={18}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
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
  // Links da navbar (ESTOQUE, EDITAR, CONTAS, CADASTRO)
  link: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 25,
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
  // Coluna do ID: 15% da largura (15% + 30% + 35% + 20% = 100%)
  id: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F28705',
  },
  // Coluna do NOME: 30% da largura
  nome: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F28705',
  },
  // Coluna do RESPONSÁVEL: 35% da largura
  responsavel: {
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F28705',
  },
  // Texto do cabeçalho da tabela
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
  // Coluna de AÇÃO: 20% da largura, botões lado a lado (flexDirection 'row')
  acao: {
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  // Botão que abre a imagem do produto (dentro dos detalhes)
  botaoImagem: {
    width: 40,
    height: 40,
    backgroundColor: '#1D3273',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  // Área de detalhes que aparece abaixo da linha do produto
  detalhes: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F28705',
  },
  // Cada linha de detalhe (categoria, quantidade, preço...)
  detalhe: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 4,
  },
  // Texto em negrito dos rótulos ("CATEGORIA:", "QUANTIDADE:"...)
  negrito: {
    fontWeight: 'bold',
  },
  // Fundo escuro do popup: cobre a tela toda e centraliza a caixa branca
  fundoPopup: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // preto com 50% de transparência
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Caixa branca do popup (80% da largura e 60% da altura da tela)
  popup: {
    width: '80%',
    height: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Botão X do popup, posicionado no canto superior direito
  fecharPopup: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#1D3273',
    borderRadius: 15,
    padding: 5,
  },
  // Imagem dentro do popup (ocupa 80% da altura da caixa)
  imagemPopup: {
    width: '100%',
    height: '80%',
  },
});
