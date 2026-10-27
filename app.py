# BACKEND (Flask + MySQL) do sistema de almoxarifado
# Serve duas coisas:
#   1) o site (rotas que devolvem páginas HTML, usam sessão/login)
#   2) o aplicativo (rotas que terminam em "_app" e devolvem JSON)
# Importações do Flask:
# Flask = cria o aplicativo | render_template = devolve uma página HTML da pasta templates
# request = lê os dados que chegam | jsonify = devolve uma resposta em JSON
# redirect = manda o usuário para outra rota | session = guarda dados do login no site
# url_for = monta o endereço de uma rota ou arquivo estático
from flask import Flask, render_template, request, jsonify, redirect, session, url_for
# Conector para falar com o banco MySQL
import mysql.connector
# os = mexe com pastas e caminhos de arquivos
import os
# bcrypt = criptografa senhas (nunca se guarda a senha pura no banco)
import bcrypt
# secure_filename = limpa o nome de um arquivo enviado (evita nomes perigosos)
from werkzeug.utils import secure_filename

# Cria a aplicação Flask
app = Flask(__name__)
# Chave usada para assinar a sessão (cookie de login) do site
app.secret_key = "brasil"



# SENHAS (BCRYPT)


# GERAR SENHA BCRYPT
# Recebe a senha em texto e devolve o hash que será salvo no banco
def gerar_hash(senha_texto):
    # bcrypt trabalha com bytes, então converte o texto (encode)
    senha_bytes = senha_texto.encode('utf-8')
    # salt = valor aleatório misturado na senha (duas senhas iguais geram hashes diferentes)
    salt = bcrypt.gensalt()
    senha_hash = bcrypt.hashpw(senha_bytes, salt)
    # Converte de volta para texto (decode) para poder gravar no banco
    return senha_hash.decode('utf-8')  

# Compara a senha digitada com o hash guardado no banco.
# Devolve True se bater e False se não bater
def verificar_senha(senha_digitada, hash_armazenado):
    # Se não existir hash guardado, não há como validar
    if not hash_armazenado:
        return False
    senha_bytes = senha_digitada.encode('utf-8')
    hash_bytes = hash_armazenado.encode('utf-8')
    # checkpw refaz o cálculo e compara com o hash armazenado
    return bcrypt.checkpw(senha_bytes, hash_bytes)


# CONEXÃO COM O BANCO


# CONEXÃO
# Cada vez que é chamada, abre uma nova conexão com o MySQL.
# Por isso, depois de usar, o código sempre fecha (cursor.close e conexao.close)
def get_db():
    return mysql.connector.connect(
        host="almoxarifado-mysql", # Mudei pra rodar no Docker, mas era 127.0.0.1
                                   # (no Docker, o host é o nome do container do MySQL)
        user='root',
        password='',
        database='almoxarifado',
        charset='utf8mb4', # aceita acentos e emojis
    )


# AUTORIZAÇÃO (usada nas rotas do SITE)

# True se o usuário já fez login (existe 'usuario' na sessão)
def login_required():
    return 'usuario' in session

# True se o usuário logado for administrador
def admin_required():
    return session.get('tipo') == 'admin'


# ROTAS DO SITE

# HOME
# Página inicial do site
@app.route('/')
def home():
    return render_template('index.html')

# LOGIN
# Recebe o formulário de login do site (dados em request.form)
@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    senha = request.form.get('senha')

    conexao = get_db()
    cursor = conexao.cursor()

    # Busca o usuário pelo e-mail.
    # O %s com a tupla (email,) evita SQL Injection (nunca monte SQL concatenando texto)
    cursor.execute("""
        SELECT * FROM usuarios
        WHERE email = %s
    """, (email,))

    # fetchone devolve uma linha (tupla) ou None se não achar
    user = cursor.fetchone()
    print(user) # depuração (imprime no terminal)

    cursor.close()
    conexao.close()

    # user[4] é a coluna da senha (hash). Se o usuário existe e a senha confere,
    # guarda os dados na sessão (isso é o "estar logado") e vai para a tabela
    if user and verificar_senha(senha, user[4]):
        session['usuario'] = user[1]
        session['email'] = user[2]
        session['tipo'] = user[3]
        return redirect('/tabela')

    # Se errou, mostra a página de login com a mensagem de erro
    return render_template ('login_erro.html', erro=True)

# LOGIN INCORRETO
@app.route('/login_erro.html')
def login_erro():
    return render_template('login_erro.html')


# LOGIN DO APLICATIVO (devolve JSON, não usa sessão)


# LOGIN DO APLICATIVO
@app.route('/login_app', methods=['POST'])
def login_app():

    # O app envia JSON (Content-Type: application/json), então lê com get_json
    dados = request.get_json()

    # Se não chegou nada, devolve erro 400 (requisição inválida)
    if not dados:
        return jsonify({
            'mensagem': 'Nenhum dado recebido'
        }), 400

    email = dados.get('email')
    senha = dados.get('senha')

    # E-mail e senha são obrigatórios
    if not email or not senha:
        return jsonify({
            'mensagem': 'Email e senha são obrigatórios'
        }), 400

    conexao = get_db()
    cursor = conexao.cursor()

    # Seleciona só as colunas necessárias (a ordem define os índices abaixo):
    # [0]=id, [1]=user, [2]=email, [3]=tipo, [4]=senha
    cursor.execute("""
        SELECT id, user, email, tipo, senha
        FROM usuarios
        WHERE email = %s
    """, (email,))

    usuario = cursor.fetchone()

    cursor.close()
    conexao.close()

    # Usuário não encontrado.
    # Status 401 = não autorizado. A mensagem é a mesma do erro de senha
    # de propósito, para não revelar se o e-mail existe
    if not usuario:
        return jsonify({
            'mensagem': 'Email ou senha incorretos'
        }), 401

    # Verifica a senha usando bcrypt
    if not verificar_senha(senha, usuario[4]):
        return jsonify({
            'mensagem': 'Email ou senha incorretos'
        }), 401

    # Login correto: devolve os dados que o app grava no AsyncStorage
    # (tipo, usuario e email são lidos na tela de Login do app)
    return jsonify({
        'mensagem': 'Login realizado com sucesso',
        'id': usuario[0],
        'usuario': usuario[1],
        'email': usuario[2],
        'tipo': usuario[3]
    }), 200

# LOGOUT
# Apaga a sessão e volta para a página inicial
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

# TABELA
# Página do estoque no site (só para quem está logado)
@app.route('/tabela')
def tabela():
    # Se não estiver logado, volta para a home
    if not login_required():
        return redirect('/')

    conexao = get_db()
    cursor = conexao.cursor()

    cursor.execute("SELECT * FROM estoque")
    # fetchall devolve todas as linhas (lista de tuplas)
    resultado = cursor.fetchall()

    cursor.close()
    conexao.close()

    # Manda a lista para o HTML, que monta a tabela
    return render_template('tabela.html', resultado=resultado)

# ENTRADA / SAÍDA DE ESTOQUE (versão do SITE)

# ENTRADA / SAÍDA ESTOQUE

@app.route('/entrada', methods=['POST'])
def entrada():

    # Lê os campos do formulário (texto vem em request.form, arquivos em request.files)
    nome = request.form.get('nome')
    categoria = request.form.get('categoria')
    qtde = request.form.get('qtde')
    responsavel = request.form.get('responsavel')
    estoque_min = request.form.get('estoque_min')
    preco = request.form.get('preco')
    descricao = request.form.get('descricao')
    tipo = request.form.get('tipo') # 'entrada' ou 'saida'
    imagem = request.files.get("imagem")

    # Se o usuário enviou uma imagem, salva na pasta static/uploads
    if imagem:
        # Limpa o nome do arquivo
        nome_arquivo = secure_filename(imagem.filename)

        pasta = os.path.join("static", "uploads")
        # exist_ok=True: não dá erro se a pasta já existir
        os.makedirs(pasta, exist_ok=True)

        caminho_salvar = os.path.join(pasta, nome_arquivo)
        imagem.save(caminho_salvar)

        # Caminho que será gravado no banco (ex.: /static/uploads/foto.png)
        caminho_imagem = url_for('static', filename=f'uploads/{nome_arquivo}')
    else:
        # Sem imagem nova: reaproveita a imagem que o produto já tem no banco
        conexao = get_db()
        cursor = conexao.cursor()

        cursor.execute("SELECT imagem FROM estoque WHERE nome = %s", (nome,))
        foto = cursor.fetchone()
        # ATENÇÃO: se o produto ainda não existir, foto é None e foto[0] gera erro
        caminho_imagem = foto[0]
        cursor.close()
        conexao.close()

    # Campos obrigatórios
    if not nome or not qtde or not responsavel or not tipo:
        return jsonify({"success": False, "erro": "Campos obrigatórios"}), 400
    # Converte a quantidade (texto) para inteiro
    qtde = int(qtde)

    conexao = get_db()
    cursor = conexao.cursor()

    # Verifica se o produto já existe no estoque (pelo nome)
    cursor.execute("SELECT qtde, preco FROM estoque WHERE nome = %s", (nome,))
    item = cursor.fetchone()


    # Se o produto já existe, completa os campos que vieram vazios
    # com os valores que já estão no banco
    if item:

        cursor.execute("""
            SELECT categoria, estoque_min, descricao, preco
            FROM estoque
            WHERE nome = %s
        """, (nome,))

        dados = cursor.fetchone()

        # Desempacota a tupla em 4 variáveis
        categoria_atual, estoque_min_atual, descricao_atual, preco_atual = dados

        # "A if condição else B": usa o valor novo se foi preenchido, senão o atual
        categoria = categoria if categoria else categoria_atual

        estoque_min = (
            int(estoque_min)
            if estoque_min
            else estoque_min_atual
        )

        descricao = descricao if descricao else descricao_atual

        # Converte o preço (texto) para decimal; se vazio, usa 0
        if preco:
            preco = float(preco)
        else:
            preco = 0

# ENTRADA (SOMA)
    if tipo == "entrada":

        if item:
            # Desempacota a quantidade e o preço que estão no banco
            qtde_atual, preco_atual = item

            # Entrada soma a quantidade e o preço
            nova_qtde = qtde_atual + qtde
            novo_preco = float(preco_atual) + float(preco)
            
            # Atualiza o produto existente
            cursor.execute("""
                UPDATE estoque
                SET qtde = %s,
                    estoque_min = %s,
                    categoria = %s,
                    preco = %s,
                    descricao = %s,
                    imagem = %s
                WHERE nome = %s
            """, (nova_qtde, estoque_min, categoria, novo_preco, descricao, caminho_imagem, nome))
            conexao.commit()
        else:
            # Produto novo: cria uma linha no estoque
            cursor.execute("""
                INSERT INTO estoque
                (responsavel, nome, categoria, qtde, estoque_min, descricao, preco, imagem)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (responsavel, nome, categoria, qtde, estoque_min, descricao, preco, caminho_imagem))

        # commit grava as alterações de verdade no banco
        conexao.commit()

# SAÍDA (SUBTRAI)
    elif tipo == "saida":

        cursor.execute(
            "SELECT qtde, preco FROM estoque WHERE nome = %s",
            (nome,)
        )

        produto = cursor.fetchone()

        # Não dá para dar saída de um produto que não existe (404 = não encontrado)
        if not produto:
            return jsonify({
                "success": False,
                "erro": "Produto não encontrado"
            }), 404

        qtde_atual, preco_atual = produto

        # Não pode tirar mais do que existe no estoque
        if qtde_atual < qtde:
            return jsonify({
                "success": False,
                "erro": "Estoque insuficiente"
            }), 400

        # Saída subtrai a quantidade e o preço
        nova_qtde = qtde_atual - qtde
        novo_preco = float(preco_atual) - float(preco)

        # O preço não pode ficar negativo
        if novo_preco < 0:
            novo_preco = 0

        cursor.execute("""
            UPDATE estoque
            SET qtde = %s,
                estoque_min = %s,
                categoria = %s,
                preco = %s,
                descricao = %s,
                imagem = %s
            WHERE nome = %s
        """, (
            nova_qtde,
            estoque_min,
            categoria,
            novo_preco,
            descricao,
            caminho_imagem,
            nome
        ))

        conexao.commit()

    else:
        # Se o tipo não for 'entrada' nem 'saida'
        return jsonify({"success": False, "erro": "Tipo inválido"}), 400

    cursor.close()
    conexao.close()

    return jsonify({"success": True}), 200


# ENTRADA / SAÍDA DO APLICATIVO
# É a rota que a tela Editar do app chama (/entrada_app).
# Faz o mesmo que /entrada, mas com mais validações e tratamento de erros


# ENTRADA DO APLICATIVO
@app.route('/entrada_app', methods=['POST'])
def entrada_app():

    # Lê os campos enviados pelo FormData do app
    nome = request.form.get('nome')
    categoria = request.form.get('categoria')
    qtde = request.form.get('qtde')
    responsavel = request.form.get('responsavel')
    estoque_min = request.form.get('estoque_min')
    preco = request.form.get('preco')
    descricao = request.form.get('descricao')
    tipo = request.form.get('tipo')
    imagem = request.files.get('imagem')

    # strip() remove espaços do começo e do fim do texto
    # (o "if" evita erro quando o valor é None)
    if nome:
        nome = nome.strip()
    if categoria:
        categoria = categoria.strip()
    if responsavel:
        responsavel = responsavel.strip()
    if descricao:
        descricao = descricao.strip()

    # Campos obrigatórios
    if not nome or not qtde or not responsavel or not tipo:
        return jsonify({
            "success": False,
            "erro": "Campos obrigatórios"
        }), 400

    # Converte os números. Se algum for inválido, o except devolve erro 400
    try:
        qtde = int(qtde)

        # Não aceita quantidade zero ou negativa
        if qtde <= 0:
            return jsonify({
                "success": False,
                "erro": "Quantidade deve ser maior que zero"
            }), 400

        # Se vier vazio, usa 0 como padrão
        estoque_min = int(estoque_min) if estoque_min else 0
        preco = float(preco) if preco else 0.0

    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "erro": "Quantidade, preço ou estoque mínimo inválido"
        }), 400

    # Começa sem imagem (None). Só muda se o app enviar uma
    caminho_imagem = None

    if imagem:
        nome_arquivo = secure_filename(imagem.filename)

        # app.root_path = pasta onde está o app.py (caminho absoluto, mais seguro)
        pasta = os.path.join(
            app.root_path,
            'static',
            'uploads'
        )

        os.makedirs(pasta, exist_ok=True)

        imagem.save(
            os.path.join(pasta, nome_arquivo)
        )

        # Caminho gravado no banco. O app junta o endereço do servidor na frente
        # para exibir a imagem no popup da tela Estoque
        caminho_imagem = url_for(
            'static',
            filename=f'uploads/{nome_arquivo}'
        )

    # Começam como None para o "finally" saber se precisa fechar
    conexao = None
    cursor = None

    try:
        conexao = get_db()
        cursor = conexao.cursor()

        # Procura o produto pelo nome. TRIM ignora espaços sobrando
        # e LIMIT 1 garante no máximo uma linha.
        # Índices: [0]=qtde, [1]=preco, [2]=categoria, [3]=estoque_min,
        #          [4]=descricao, [5]=imagem
        cursor.execute("""
            SELECT qtde, preco, categoria, estoque_min, descricao, imagem
            FROM estoque
            WHERE TRIM(nome) = TRIM(%s)
            LIMIT 1
        """, (nome,))

        produto = cursor.fetchone()

        # ENTRADA (SOMA)
        if tipo == "entrada":

            if produto:

                # "or 0" evita erro se o valor no banco for NULL
                qtde_atual = int(produto[0] or 0)
                preco_atual = float(produto[1] or 0)

                nova_qtde = qtde_atual + qtde
                novo_preco = preco_atual + preco

                # Usa o valor novo se foi preenchido, senão mantém o do banco
                categoria_final = categoria if categoria else produto[2]
                estoque_min_final = estoque_min if estoque_min else produto[3]
                descricao_final = descricao if descricao else produto[4]

                # Mantém a imagem antiga se não escolher outra
                imagem_final = caminho_imagem if caminho_imagem else produto[5]

                cursor.execute("""
                    UPDATE estoque
                    SET qtde = %s,
                        preco = %s,
                        categoria = %s,
                        estoque_min = %s,
                        descricao = %s,
                        responsavel = %s,
                        imagem = %s
                    WHERE TRIM(nome) = TRIM(%s)
                """, (
                    nova_qtde,
                    novo_preco,
                    categoria_final,
                    estoque_min_final,
                    descricao_final,
                    responsavel,
                    imagem_final,
                    nome
                ))

            else:
                # Produto novo: cria a linha no estoque
                cursor.execute("""
                    INSERT INTO estoque
                    (responsavel, nome, categoria, qtde,
                     estoque_min, descricao, preco, imagem)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    responsavel,
                    nome,
                    categoria,
                    qtde,
                    estoque_min,
                    descricao,
                    preco,
                    caminho_imagem
                ))

                # Guarda os valores para devolver na resposta
                nova_qtde = qtde
                novo_preco = preco

        # SAÍDA (SUBTRAI)
        elif tipo == "saida":

            # Não dá para dar saída de um produto que não existe
            if not produto:
                return jsonify({
                    "success": False,
                    "erro": "Produto não encontrado"
                }), 404

            qtde_atual = int(produto[0] or 0)
            preco_atual = float(produto[1] or 0)

            # Não pode tirar mais do que existe (a mensagem informa quanto há disponível)
            if qtde_atual < qtde:
                return jsonify({
                    "success": False,
                    "erro": f"Estoque insuficiente. Disponível: {qtde_atual}"
                }), 400

            nova_qtde = qtde_atual - qtde
            novo_preco = preco_atual - preco

            # O preço não pode ficar negativo
            if novo_preco < 0:
                novo_preco = 0

            categoria_final = categoria if categoria else produto[2]
            estoque_min_final = estoque_min if estoque_min else produto[3]
            descricao_final = descricao if descricao else produto[4]
            imagem_final = caminho_imagem if caminho_imagem else produto[5]

            cursor.execute("""
                UPDATE estoque
                SET qtde = %s,
                    preco = %s,
                    categoria = %s,
                    estoque_min = %s,
                    descricao = %s,
                    responsavel = %s,
                    imagem = %s
                WHERE TRIM(nome) = TRIM(%s)
            """, (
                nova_qtde,
                novo_preco,
                categoria_final,
                estoque_min_final,
                descricao_final,
                responsavel,
                imagem_final,
                nome
            ))

        else:
            # Se o tipo não for 'entrada' nem 'saida'
            return jsonify({
                "success": False,
                "erro": "Tipo inválido"
            }), 400

        # commit grava as alterações de verdade no banco
        conexao.commit()

        # Sucesso: devolve também os novos valores
        return jsonify({
            "success": True,
            "mensagem": "Operação realizada com sucesso",
            "nova_quantidade": nova_qtde,
            "novo_preco": novo_preco,
            "imagem": caminho_imagem
        }), 200

    except Exception as erro:

        # Qualquer erro inesperado cai aqui
        print("ERRO ENTRADA:", repr(erro))

        # rollback desfaz as alterações feitas desde o último commit
        if conexao:
            conexao.rollback()

        # 500 = erro interno do servidor
        return jsonify({
            "success": False,
            "erro": str(erro)
        }), 500

    finally:

        # O finally roda sempre (deu certo ou errado, mesmo com return):
        # garante que o cursor e a conexão sejam fechados
        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

# TABELA DO APLICATIVO (a tela Estoque do app chama esta rota)
# TABELA DO APLICATIVO
@app.route('/tabela_app', methods=['GET'])
def tabela_app():

    conexao = None
    cursor = None

    try:
        conexao = get_db()
        cursor = conexao.cursor()

        # Lista as colunas na ordem dos índices usados mais abaixo:
        # [0]=id, [1]=responsavel, [2]=nome, [3]=categoria, [4]=qtde,
        # [5]=estoque_min, [6]=preco, [7]=descricao, [8]=imagem
        cursor.execute("""
            SELECT
                id,
                responsavel,
                nome,
                categoria,
                qtde,
                estoque_min,
                preco,
                descricao,
                imagem
            FROM estoque
            ORDER BY id ASC
        """)

        resultado = cursor.fetchall()

        # Converte cada linha (tupla) em um dicionário, que o jsonify transforma em JSON
        produtos = []

        for item in resultado:

            produtos.append({
                "id": item[0],
                "responsavel": item[1],
                "nome": item[2],
                "categoria": item[3],
                "qtde": item[4],
                "estoque_min": item[5],
                # float() converte o Decimal do MySQL para número; se for NULL, usa 0
                "preco": float(item[6]) if item[6] is not None else 0,
                # ATENÇÃO: aqui deveria ser item[7]. Com item[6], a DESCRIÇÃO
                # que o app mostra é, na verdade, o preço
                "descricao": item[6],
                "imagem": item[8]
            })

        return jsonify({
            "success": True,
            "produtos": produtos
        }), 200

    except Exception as erro:

        print("ERRO TABELA APP:", repr(erro))

        return jsonify({
            "success": False,
            "erro": "Erro ao buscar produtos"
        }), 500

    finally:

        # Sempre fecha cursor e conexão
        if cursor:
            cursor.close()

        if conexao:
            conexao.close()

# EXCLUIR ITEM
# <int:id> na URL captura o número e entrega para a função (ex.: DELETE /excluir/5).
# O app chama esta rota ao clicar na lixeira da tela Estoque
@app.route('/excluir/<int:id>', methods=['DELETE'])
def excluir(id):

    conexao = get_db()
    cursor = conexao.cursor()

    cursor.execute("DELETE FROM estoque WHERE id = %s", (id,))
    conexao.commit()

    cursor.close()
    conexao.close()

    return jsonify({"success": True})

# EDITAR
# Página de edição do site (só para quem está logado)
@app.route('/editar')
def editar():
    if not login_required():
        return redirect('/')

    return render_template('editar.html')

# ACESSO
# Página com a lista de usuários no site (só para administrador)
@app.route('/acesso')
def acesso():
    if not login_required():
        return redirect('/')

    # Logado, mas não é admin: bloqueia
    if not admin_required():
        return "Acesso negado"

    conexao = get_db()
    cursor = conexao.cursor()

    cursor.execute("SELECT * FROM usuarios")
    resultado = cursor.fetchall()

    cursor.close()
    conexao.close()

    return render_template('acesso.html', resultado=resultado)

# EXCLUIR USUÁRIO
# Chamada pela lixeira da tela Contas do app (DELETE /excluirUsuario/3)
@app.route('/excluirUsuario/<int:id>', methods=['DELETE'])
def excluir_usuario(id):

    conexao = get_db()
    cursor = conexao.cursor()

    cursor.execute("DELETE FROM usuarios WHERE id = %s", (id,))

    conexao.commit()

    cursor.close()
    conexao.close()

    return jsonify({"success": True})

# CADASTRO
# Cadastro de usuário pelo SITE (só admin).
# Aceita GET (mostra o formulário) e POST (recebe os dados)
@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():

    if not login_required():
        return redirect('/')

    if not admin_required():
        return "Acesso negado"

    # GET: apenas mostra a página com o formulário
    if request.method == 'GET':
        return render_template('cadastro.html')

    # POST: lê os campos do formulário
    usuario = request.form.get('user')
    email = request.form.get('email')
    senha = request.form.get('senha')
    perfil = request.form.get('perfil') # 'admin' ou 'usuario'

    # Criptografa a senha antes de gravar
    senha_criptografada = gerar_hash(senha)

    conexao = get_db()
    cursor = conexao.cursor()

    cursor.execute("""
        INSERT INTO usuarios (user, email, senha, tipo)
        VALUES (%s, %s, %s, %s)
    """, (usuario, email, senha_criptografada, perfil))

    conexao.commit()
    cursor.close()
    conexao.close()

    return redirect('/acesso')

# CADASTRO DO APP
# A tela Cadastro do app chama esta rota
@app.route('/cadastro_app', methods=['POST'])
def cadastro_app():

    try:
        dados = request.get_json()

        usuario = dados.get('user')
        email = dados.get('email')
        senha = dados.get('senha')
        # Quem se cadastra pelo app sempre vira usuário comum
        perfil = "usuario"

        if not usuario or not email or not senha:
            # ATENÇÃO: aqui as chaves { } criam um "set" com um texto só, e não um dicionário.
            # Isso não vira JSON e gera erro (cai no except e devolve 500).
            # O correto seria: {'mensagem': 'Preencha todos os campos'}
            return jsonify({
                'mensagem: Preencha todos os campos'
            }), 400
        
        senha_criptografada = gerar_hash(senha)

        conexao = get_db()
        cursor = conexao.cursor()

        # Antes de cadastrar, verifica se o e-mail já existe
        cursor.execute(
            "SELECT id FROM usuarios WHERE email = %s",
            (email,)
        )

        usuario_existente = cursor.fetchone()

        if usuario_existente:
            cursor.close()
            conexao.close()

            return jsonify({
                'mensagem': 'Este email já está cadastrado'
            }), 400

        # Cadastra o usuário
        cursor.execute("""
            INSERT INTO usuarios (user, email, senha, tipo)
            VALUES (%s, %s, %s, %s)
        """, (usuario, email, senha_criptografada, perfil))

        conexao.commit()

        cursor.close()
        conexao.close()

        # 201 = criado com sucesso
        return jsonify({
            'mensagem': 'Usuário cadastrado com sucesso'
        }), 201

    except Exception as erro:
        print('ERRO NO CADASTRO:', repr(erro))

        return jsonify({
            'mensagem': 'Erro ao cadastrar usuário',
            'erro': str(erro)
        }), 500

# CONTAS DO APP
# A tela Contas do app chama esta rota para listar os usuários
@app.route('/contas_app', methods=['GET'])
def contas_app():

    conexao = None
    cursor = None

    try:
        conexao = get_db()
        cursor = conexao.cursor()

        # Não seleciona a coluna da senha: o hash nunca deve sair do servidor
        cursor.execute("""
            SELECT id, user, email, tipo
            FROM usuarios
            ORDER BY id ASC
        """)

        resultado = cursor.fetchall()

        # Converte cada linha em dicionário. A chave "nome" é a que a tela Contas do app lê
        usuarios = []

        for item in resultado:
            usuarios.append({
                "id": item[0],
                "nome": item[1],
                "email": item[2],
                "tipo": item[3]
            })

        return jsonify({
            "success": True,
            "usuarios": usuarios
        }), 200

    except Exception as erro:

        print("ERRO CONTAS APP:", repr(erro))

        return jsonify({
            "success": False,
            "erro": "Erro ao buscar usuários"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if conexao:
            conexao.close()
            
# RODAR
# Só executa quando o arquivo é rodado direto (python app.py).
# debug=True reinicia o servidor a cada alteração e mostra erros detalhados.
# host="0.0.0.0" deixa o servidor acessível por outros aparelhos da rede (o celular)
# e port=5000 é a porta usada pelo app (http://IP:5000)
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)